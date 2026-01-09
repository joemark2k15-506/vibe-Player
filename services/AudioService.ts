import * as FileSystem from 'expo-file-system';
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import TrackPlayer, { AppKilledPlaybackBehavior, Capability, Event, State } from 'react-native-track-player';

type AudioState = 'IDLE' | 'LOADING' | 'READY' | 'PLAYING' | 'PAUSED' | 'ERROR';

class AudioService {
    currentUri: string | null = null;
    
    // Observable State (Mimicking expo-av structure for compatibility)
    state: AudioState = 'IDLE';
    duration: number = 0;
    position: number = 0;
    error: string | null = null;

    // Listeners
    onStatusUpdate: ((status: any) => void) | null = null;
    onNext: (() => void) | null = null;
    onPrevious: (() => void) | null = null;
    private progressInterval: NodeJS.Timeout | null = null;

    // Internal Lock for concurrency
    private _mutex: Promise<void> = Promise.resolve();
    private currentRequestId: number = 0;

    constructor() {
        this.configureAudioMode();
    }

    /**
     * initializes TrackPlayer.
     */
    async configureAudioMode() {
        try {
            await TrackPlayer.setupPlayer();
            await TrackPlayer.updateOptions({
                capabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.SkipToNext,
                    Capability.SkipToPrevious,
                    Capability.SeekTo,
                ],
                compactCapabilities: [
                    Capability.SkipToPrevious,
                    Capability.Play,
                    Capability.Pause,
                    Capability.SkipToNext,
                ],
                notificationCapabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.SkipToNext,
                    Capability.SkipToPrevious,
                ],
                android: {
                    appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification
                }
            });
            this.startStatusPolling();
            this.setupRemoteListeners();
        } catch (error) {
            // Setup often fails if already set up, which is fine.
            // console.log('[AudioService] TrackPlayer setup check:', error);
            this.startStatusPolling(); // Ensure polling starts even if setup was done previously
            this.setupRemoteListeners();
        }
    }

    private setupRemoteListeners() {
        TrackPlayer.addEventListener(Event.RemotePlay, () => this.resume());
        TrackPlayer.addEventListener(Event.RemotePause, () => this.pause());
        TrackPlayer.addEventListener(Event.RemoteStop, () => this.pause());
        TrackPlayer.addEventListener(Event.RemoteNext, () => {
            console.log('[AudioService] RemoteNext received');
            if (this.onNext) this.onNext();
        });
        TrackPlayer.addEventListener(Event.RemotePrevious, () => {
            console.log('[AudioService] RemotePrevious received');
            if (this.onPrevious) this.onPrevious();
        });
        TrackPlayer.addEventListener(Event.RemoteSeek, (event) => this.seekTo(event.position * 1000));
    }

    // Polling loop to simulate expo-av's onPlaybackStatusUpdate
    private startStatusPolling() {
        if (this.progressInterval) clearInterval(this.progressInterval);
        
        this.progressInterval = setInterval(async () => {
            if (!this.onStatusUpdate) return;

            try {
                const progress = await TrackPlayer.getProgress();
                const state = await TrackPlayer.getState();
                
                // Map TrackPlayer State to AudioState
                let isPlaying = false;
                let isBuffering = false;
                
                if (state === State.Playing) {
                    isPlaying = true;
                    this.state = 'PLAYING';
                } else if (state === State.Paused) {
                    this.state = 'PAUSED';
                } else if (state === State.Buffering || state === State.Connecting) {
                    isBuffering = true;
                    this.state = 'LOADING';
                } else if (state === State.Ended) {
                     this.state = 'IDLE';
                } else if (state === State.None || state === State.Stopped) {
                    this.state = 'IDLE';
                }

                this.position = progress.position * 1000; // Seconds -> Millis
                this.duration = progress.duration * 1000; // Seconds -> Millis

                // Construct expo-av like status object
                const status = {
                    isLoaded: true, // If we are polling, we assume player is alive
                    isPlaying: isPlaying,
                    isBuffering: isBuffering,
                    positionMillis: this.position,
                    durationMillis: this.duration,
                    didJustFinish: state === State.Ended,
                    shouldPlay: isPlaying // Approximate
                };

                this.onStatusUpdate(status);

            } catch (e) {
                // Player might be dead or not set up
            }
        }, 250);
    }

    private setState(newState: AudioState) {
        this.state = newState;
        console.log(`[AudioService] State -> ${newState}`);
    }

    async resume() {
        await TrackPlayer.play();
    }

    async loadSound(
        uri: string, 
        shouldPlay: boolean = true, 
        songId?: string, 
        filename?: string, 
        metadata?: { title?: string, artist?: string, artwork?: string, duration?: number }
    ): Promise<boolean> {
        this.currentRequestId++;
        const requestId = this.currentRequestId;
        const release = await this.acquireMutex();

        try {
            if (this.currentRequestId !== requestId) return false;

            this.setState('LOADING');
            this.error = null;
            this.currentUri = uri;

            await TrackPlayer.reset();

            const decodedUri = decodeURIComponent(uri);
            const isContent = uri.startsWith('content://');
             // Expanded check for formats that usually need transcoding on Android
            const isM4A = (uri.toLowerCase().endsWith('.m4a') || uri.toLowerCase().includes('.m4a'));
            
            let sourceUri = decodedUri;

            // Transcoding Logic (Using existing prewarmUri)
            if ((isM4A || isContent) && sourceUri === decodedUri) {
                try {
                     sourceUri = await this.prewarmUri(uri);
                } catch (err) {
                     console.warn('[AudioService] Prewarm failed, trying raw:', err);
                }
            }

            // Ensure schema for TrackPlayer
            if (!sourceUri.startsWith('http') && !sourceUri.startsWith('file://') && !sourceUri.startsWith('content://')) {
                sourceUri = `file://${sourceUri}`;
            }

            // Ensure schema for Artwork
            let finalArtwork = metadata?.artwork;
            if (finalArtwork && !finalArtwork.startsWith('http') && !finalArtwork.startsWith('file://') && !finalArtwork.startsWith('content://')) {
                finalArtwork = `file://${finalArtwork}`;
            }

            // Helper for Title Casing (First letter of each word)
            const toTitleCase = (str: string) => {
                if (!str) return 'Unknown';
                return str.replace(/\w\S*/g, (txt) => {
                    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                });
            };

            const displayTitle = metadata?.title ? toTitleCase(metadata.title) : 'Unknown Title';
            const displayArtist = metadata?.artist ? toTitleCase(metadata.artist) : 'Unknown Artist';
            const durationSeconds = (metadata?.duration || 0) / 1000;

            await TrackPlayer.add({
                id: songId || 'unknown',
                url: sourceUri,
                title: displayTitle,
                artist: displayArtist,
                artwork: finalArtwork,
                duration: durationSeconds > 0 ? durationSeconds : undefined, // Provide duration for Seek Bar
            });

            if (shouldPlay) {
                await TrackPlayer.play();
            }

            this.setState('READY');
            return true;

        } catch (error: any) {
             console.error('[AudioService] Load Failed:', error);
             this.error = error.message;
             this.setState('ERROR');
             return false;
        } finally {
            release();
        }
    }

    async unload() {
        await TrackPlayer.reset();
        this.setState('IDLE');
    }

    async cleanup() {
        if (this.progressInterval) clearInterval(this.progressInterval);
        await this.unload();
    }

    async play() {
        await TrackPlayer.play();
    }

    async pause() {
        await TrackPlayer.pause();
    }

    async togglePlayPause() {
        const state = await TrackPlayer.getState();
        if (state === State.Playing) {
            await TrackPlayer.pause();
        } else {
            await TrackPlayer.play();
        }
    }

    async seekTo(millis: number) {
        await TrackPlayer.seekTo(millis / 1000);
    }

    // Mutex Lock
    private acquireMutex(): Promise<() => void> {
        let release: () => void;
        const newLock = new Promise<void>(resolve => release = resolve);
        const previousLock = this._mutex;
        this._mutex = previousLock.then(() => newLock);
        return previousLock.then(() => release);
    }

    // Existing Transcoding Logic (Preserved)
    public async prewarmUri(uri: string): Promise<string> {
        const simpleHash = uri.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
        const safeHash = Math.abs(simpleHash).toString(16);
        const filename = uri.split('/').pop() || `temp_${safeHash}`;

        let ext = '.m4a';
        const lowerName = filename.toLowerCase();
        const lowerUri = uri.toLowerCase();
        let needsTranscoding = false;

        if (lowerName.endsWith('.m4a') || lowerUri.endsWith('.m4a') || lowerUri.includes('.m4a')) {
             ext = '.m4a';
             needsTranscoding = true; 
        } else if (lowerName.endsWith('.flac') || lowerUri.endsWith('.flac')) {
             ext = '.flac';
        } else if (lowerName.endsWith('.wav') || lowerUri.endsWith('.wav')) {
             ext = '.wav';
        } else if (lowerName.endsWith('.aac') || lowerUri.endsWith('.aac')) {
             ext = '.aac';
        }

        const dest = `${FileSystem.cacheDirectory}cached_${safeHash}${ext}`; 
        try {
            const info = await FileSystem.getInfoAsync(dest);
            if (info.exists && info.size > 0) return dest;
        } catch (e) {}

        if (needsTranscoding) {
            console.log('[AudioService] Transcoding needed...');
            const tempInput = `${FileSystem.cacheDirectory}ffmpeg_in_${safeHash}.m4a`;
            let inputPath = uri;

            try {
                let copySource = uri;
                if (!uri.startsWith('file://') && !uri.startsWith('content://') && uri.startsWith('/')) {
                    copySource = `file://${uri}`;
                }
                await FileSystem.deleteAsync(tempInput, { idempotent: true }).catch(() => {});
                await FileSystem.copyAsync({ from: copySource, to: tempInput });
                inputPath = tempInput;
            } catch (copyErr) {
                 // ignore
            }

            try {
                if (!FFmpegKit) return inputPath;

                const ffmpegInput = inputPath.replace('file://', '');
                const ffmpegOutput = dest.replace('file://', '');

                const session = await FFmpegKit.execute(`-y -i "${ffmpegInput}" -vn -c:a aac -b:a 192k "${ffmpegOutput}"`);
                const returnCode = await session.getReturnCode();

                if (ReturnCode.isSuccess(returnCode)) {
                    return dest;
                } else {
                     return inputPath;
                }
            } catch (ffmpegErr) {
                 return uri;
            }
        } else {
             await FileSystem.copyAsync({ from: uri, to: dest });
             return dest;
        }
    }

}

export default new AudioService();
