import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';

type AudioState = 'IDLE' | 'LOADING' | 'READY' | 'PLAYING' | 'PAUSED' | 'ERROR';

class AudioService {
    sound: Audio.Sound | null = null;
    currentUri: string | null = null;
    
    // Observable State
    state: AudioState = 'IDLE';
    duration: number = 0;
    position: number = 0;
    error: string | null = null;
    
    // Listeners
    onStatusUpdate: ((status: any) => void) | null = null;
    
    // Internal Lock for concurrency
    private _mutex: Promise<void> = Promise.resolve();
    private currentRequestId: number = 0;

    constructor() {
        this.configureAudioMode();
    }

    /**
     * Configures the native audio session.
     * vital for background playback and preventing interruptions.
     */
    async configureAudioMode() {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                staysActiveInBackground: true,
                playsInSilentModeIOS: true,
                interruptionModeIOS: 1, // DoNotMix
                interruptionModeAndroid: 1, // DoNotMix
                playThroughEarpieceAndroid: false,
                shouldDuckAndroid: true,
            });

            // Notification Permission is now handled in PermissionScreen.tsx
            // Only strictly necessary native configuration here.
        } catch (error) {
            console.error('[AudioService] Error configuring audio mode', error);
        }
    }

    private setState(newState: AudioState) {
        this.state = newState;
        // Broadcast state change if needed (could extend with an event emitter)
        console.log(`[AudioService] State -> ${newState}`);
    }

    async resume() {
        if (this.sound) await this.sound.playAsync().catch(() => {});
    }

    /**
     * Loads a sound file with robust lifecycle management.
     * Prevents race conditions and handles M4A/Large file nuances.
     */
    async loadSound(uri: string, shouldPlay: boolean = true, songId?: string, filename?: string): Promise<boolean> {
        // 1. Validated Request ID
        this.currentRequestId++;
        const requestId = this.currentRequestId;

        // 2. Acquire Mutex Lock (Strict Queue)
        const release = await this.acquireMutex();
        
        try {
            // Check if superseded while waiting for lock
            if (this.currentRequestId !== requestId) {
                 console.log(`[AudioService] Request #${requestId} aborted (Stale).`);
                 return false;
            }

            this.setState('LOADING');
            this.error = null;

            // 3. Unload existing
            await this.unloadInternal();
            
            this.currentUri = uri;
            const decodedUri = decodeURIComponent(uri);
            const contextLabel = filename || songId || 'Unknown Asset';

            console.log(`[AudioService] Request #${requestId}: Loading: ${decodedUri} (${contextLabel})`);

            let sourceUri = decodedUri;
            const isContent = uri.startsWith('content://');
            const isM4A = (uri.toLowerCase().endsWith('.m4a') || uri.toLowerCase().includes('.m4a'));

            // STRATEGY:
            // 1. 'content://' URIs (Scoped Storage) often fail seeking/duration on Android Exoplayer
            // 2. M4A files: MUST be transcoded to MP3 for stable playback (fixes freezing at 0:00)
                    if ((isM4A || isContent) && sourceUri === decodedUri) {
                        try {
                            console.log(`[AudioService] VLOG: ${isM4A ? 'M4A' : 'Content'} detected. Processing via prewarmUri...`);
                            
                            // PRE-CHECK: If we already have a cached/transcoded version, use it immediately
                            sourceUri = await this.prewarmUri(uri);
                            
                            // CHECK STALENESS AFTER ASYNC OP
                            if (this.currentRequestId !== requestId) {
                                console.log(`[AudioService] Request #${requestId} aborted after transcoding.`);
                                return false; 
                            }
                        } catch (err) {
                            console.warn('[AudioService] VLOG: Pre-load processing failed:', err);
                        }
                    } else {
                        console.log('[AudioService] VLOG: Standard file detected. Playing directly.');
                    }
            
             // 4. Prepare Source
             const source = { uri: sourceUri };
 
             try {
                 const { sound, status } = await Audio.Sound.createAsync(
                     source,
                     { 
                         shouldPlay: true, // AUTO-PLAY: Restore standard behavior
                         progressUpdateIntervalMillis: 250,
                         positionMillis: 0, 
                         shouldCorrectPitch: false, // KEEP FALSE: High-res audio often crashes with pitch correction
                         isLooping: false,
                         volume: 1.0,
                     }, 
                     this._onPlaybackStatusUpdate
                 );
                 this.sound = sound;
                 
                 if (status.isLoaded) {
                     this.duration = status.durationMillis || 0;
                     this.position = status.positionMillis;
                     this.setState('READY');
                     
                     // console.log('[AudioService] VLOG: Asset loaded. Auto-play should handle start.');
                     return true;
                 }
             } catch (initialError: any) {
                 // RETRY STRATEGY: If direct/initial load failed, and we haven't tried copying yet (or it failed silently), try again hard.
                 console.warn(`[AudioService] VLOG: Initial load failed for ${sourceUri}:`, initialError.message);
                 
                 if ((isM4A || isContent) && sourceUri === decodedUri) {
                     console.log('[AudioService] VLOG: Retrying M4A with local cache copy...');
                     try {
                         sourceUri = await this.prewarmUri(uri);
                         const { sound, status } = await Audio.Sound.createAsync(
                              { uri: sourceUri },
                             { 
                                 shouldPlay: false,
                                 progressUpdateIntervalMillis: 250,
                                 positionMillis: 0,
                                 shouldCorrectPitch: false,
                                 isLooping: false, // Ensure loop is off by default
                                 volume: 1.0, // Ensure nominal volume
                             },
                             this._onPlaybackStatusUpdate
                        );
                        this.sound = sound;
                        if (status.isLoaded) {
                            this.setState('READY');
                            if (shouldPlay) {
                                // console.log('[AudioService] VLOG: Asset loaded. Starting playback...');
                                // Short delay to ensure native player is stable
                                await new Promise(r => setTimeout(r, 250));
                                
                                // ROBUST START: Force seek to 200ms to skip bad frames
                                // SIMPLIFICATION: usage of playFromPositionAsync caused buffering lock.
                                console.log('[AudioService] Retry: Starting playback (Standard playAsync)');
                                await sound.playAsync();
                            }
                            return true;
                        }
                    } catch (retryErr: any) {
                        console.error('[AudioService] Retry failed:', retryErr.message);
                        throw retryErr; // Throw original or retry error
                    }
                } else {
                    throw initialError;
                }
            }

            throw new Error('Asset loaded but status is unloaded?');

        } catch (error: any) {
             const msg = error.message || '';
             console.warn('[AudioService] Fatal Load Error:', msg);
             
             if (msg.includes('MediaCodecDecoderException')) {
                 this.error = "Format Not Supported (e.g. 24-bit ALAC)";
             } else {
                 this.error = "Playback Failed";
             }
             this.setState('ERROR');
             return false;
        } finally {
            release();
        }
    }

    /**
     * Unload current sound safely.
     */
    async unload() {
        const release = await this.acquireMutex();
        try {
            await this.unloadInternal();
            this.setState('IDLE');
        } finally {
            release();
        }
    }

    async cleanup() {
        await this.unload();
    }

    private async unloadInternal() {
        if (this.sound) {
            try {
                // Remove listener first to avoid state pollution
                this.sound.setOnPlaybackStatusUpdate(null); 
                const status = await this.sound.getStatusAsync();
                if (status.isLoaded) {
                    await this.sound.stopAsync().catch(() => {});
                    await this.sound.unloadAsync().catch(() => {});
                }
            } catch (ignore) {
                 // Player might be dead already
            }
            this.sound = null;
        }
    }

    /**
     * Callback from expo-av
     */
    private _onPlaybackStatusUpdate = (status: any) => {
        // Isolation check: In a real class instance, 'this.sound' matches.
        // We trust the listener binding is correct.

        if (status.isLoaded) {
            this.position = status.positionMillis;
            this.duration = status.durationMillis || 0;
            
            // Sync internal state
            if (status.isPlaying) {
                if (this.state !== 'PLAYING') this.setState('PLAYING');
            } else {
                // If we were playing and now we aren't, we are paused or ended
                if (status.didJustFinish) {
                     // Handled by Context or UI checking didJustFinish
                } else if (!status.shouldPlay) {
                     // Explicit pause
                     if (this.state !== 'PAUSED') this.setState('PAUSED');
                } else if (status.isBuffering) {
                     console.log(`[AudioService] Buffering... (Buffered: ${status.playableDurationMillis}ms)`);
                     if (this.state !== 'LOADING') this.setState('LOADING');
                }
            }
        } else if (status.error) {
            console.warn('[AudioService] Playback Error', status.error);
            this.setState('ERROR');
        }

        if (this.onStatusUpdate) {
            this.onStatusUpdate(status);
        }
        
        // VLOG: Periodic State Dump for Debugging
        // if (Math.random() < 0.05) console.log(`[AudioService] VLOG: State Dump -> Internal: ${this.state}, Native: ${status.isPlaying ? 'PLAYING' : 'PAUSED'}`);
    }

    // Controls
    async play() {
        console.log('[AudioService] play() called');
        if (this.sound) {
            try {
                await this.sound.playAsync();
            } catch (e: any) {
                console.warn('[AudioService] play() error:', e);
                // SELF-HEALING: If native player is dead, resurrect it.
                if (e.message && (e.message.includes('Player does not exist') || e.message.includes('released'))) {
                    console.log('[AudioService] 🚑 Detecting Dead Player. Attempting Resurrection...');
                    if (this.currentUri) {
                        try {
                             await this.loadSound(this.currentUri, true);
                        } catch (reloadErr) {
                             console.error('[AudioService] Resurrection failed:', reloadErr);
                        }
                    }
                }
            }
        } else {
            console.warn('[AudioService] play() ignored: No sound instance. Trying to reload currentUri...');
            // Fallback: If no sound instance but we have a URI, try to load it
            if (this.currentUri) {
                 await this.loadSound(this.currentUri, true).catch(err => console.error('Fallback load failed', err));
            }
        }
    }

    async pause() {
         console.log('[AudioService] pause() called');
        if (this.sound) {
            await this.sound.pauseAsync().catch(e => console.warn('[AudioService] pause() error:', e));
        } else {
            console.warn('[AudioService] pause() ignored: No sound instance');
        }
    }

    async togglePlayPause() {
        if (this.sound) {
            try {
                const status = await this.sound.getStatusAsync();
                console.log(`[AudioService] togglePlayPause called. Internal State: ${this.state}, Native IsPlaying: ${status.isLoaded ? status.isPlaying : 'N/A'}`);
                
                if (status.isLoaded) {
                    if (status.isPlaying) {
                        console.log('[AudioService] Decided to PAUSE');
                        await this.pause();
                    } else {
                        console.log('[AudioService] Decided to PLAY');
                        await this.play();
                    }
                } else {
                   console.warn('[AudioService] togglePlayPause: Sound is not loaded.'); 
                }
            } catch (e) {
                console.error('[AudioService] togglePlayPause error:', e);
            }
        } else {
            console.warn('[AudioService] togglePlayPause: No sound instance.');
        }
    }

    async seekTo(millis: number) {
        if (this.sound) {
            await this.sound.setPositionAsync(millis).catch(() => {});
        }
    }

    // True Mutex Lock
    private acquireMutex(): Promise<() => void> {
        let release: () => void;
        const newLock = new Promise<void>(resolve => release = resolve);
        
        // Append to the end of the chain
        const previousLock = this._mutex;
        this._mutex = previousLock.then(() => newLock);
        
        return previousLock.then(() => {
            return release;
        });
    }

    // Fallback Cache for Stubborn M4A/Content URIs
    // NOW ENHANCED WITH TRANSCODING
    // PUBLIC API: Allow LibraryManager to pre-transcode files in background
    public async prewarmUri(uri: string): Promise<string> {
        // Create a simple deterministic hash from the URI to ensure we reuse the same cache file
        const simpleHash = uri.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
        const safeHash = Math.abs(simpleHash).toString(16);
        
        const filename = uri.split('/').pop() || `temp_${safeHash}`;
        
        // Target is ALWAYS .m4a now because libmp3lame is missing on some android builds
        // We transcode ALAC/Other M4A -> AAC-LC (M4A) which plays perfectly on Android.
        let ext = '.m4a';
        const lowerName = filename.toLowerCase();
        const lowerUri = uri.toLowerCase();
        let needsTranscoding = false;

        // Force transcode for M4A/ALAC to ensure AAC-LC (Android-friendly)
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

        // DETERMINISTIC DESTINATION
        const dest = `${FileSystem.cacheDirectory}cached_${safeHash}${ext}`; 
        
        // CHECK CACHE HIT
        try {
            const info = await FileSystem.getInfoAsync(dest);
            if (info.exists && info.size > 0) {
                 console.log(`[AudioService] VLOG: Cache HIT. Skipping copy/transcode for: ${dest}`);
                 return dest;
            }
        } catch (e) {
            // ignore check error
        }

        console.log(`[AudioService] VLOG: Cache MISS. Preparing... Dest: ${dest}`);

        if (needsTranscoding) {
            console.log('[AudioService] 🛠️ Starting FFmpeg Transcoding (ALAC -> AAC)...');
            const startTime = Date.now();
            
            // FFmpeg Protection: Always copy to a safe temp file. 
            // This bypasses issues with spaces, special characters, and native permission scopes.
            const tempInput = `${FileSystem.cacheDirectory}ffmpeg_in_${safeHash}.m4a`;
            let inputPath = uri;

            try {
                // Formatting source for FileSystem.copyAsync
                let copySource = uri;
                if (!uri.startsWith('file://') && !uri.startsWith('content://') && uri.startsWith('/')) {
                    copySource = `file://${uri}`;
                }

                await FileSystem.deleteAsync(tempInput, { idempotent: true }).catch(() => {});
                await FileSystem.copyAsync({ from: copySource, to: tempInput });
                
                // Successful copy -> Use safe path
                inputPath = tempInput;
                console.log(`[AudioService] Safe input created: ${tempInput}`);
            } catch (copyErr) {
                console.warn('[AudioService] Safe copy failed, attempting direct path...', copyErr);
                // Fallback to original uri (inputPath is already uri)
            }

            // COMMAND: -i input -c:a aac -q:a 2 output
            // -y overwrite - FFmpeg usually needs raw paths (no file:// prefix)
            try {
                if (!FFmpegKit) {
                    console.warn('[AudioService] FFmpegKit logic is present but native module is missing.');
                    return inputPath;
                }

                const ffmpegInput = inputPath.replace('file://', '');
                const ffmpegOutput = dest.replace('file://', '');
                
                console.log(`[AudioService] FFmpeg CMD: -i "${ffmpegInput}" -vn ... "${ffmpegOutput}"`);
                // ADDED -vn to ignore embedded album art (video stream)
                // CHANGED -c:a libmp3lame -> -c:a aac (Native Encoder) because libmp3lame is missing
                const session = await FFmpegKit.execute(`-y -i "${ffmpegInput}" -vn -c:a aac -b:a 192k "${ffmpegOutput}"`);
                const returnCode = await session.getReturnCode();
                
                if (ReturnCode.isSuccess(returnCode)) {
                    const duration = Date.now() - startTime;
                    console.log(`[AudioService] ✅ Transcoding SUCCESS in ${duration}ms. File: ${ffmpegOutput}`);
                    return dest;
                } else {
                     const state = await session.getState();
                     const logs = await session.getLogs();
                     console.error(`[AudioService] ❌ Transcoding FAILED (Code: ${returnCode}, State: ${state}).`);
                     console.error(`[AudioService] Input: ${ffmpegInput}`);
                     console.error(`[AudioService] Output: ${ffmpegOutput}`);
                     if (logs.length > 0) {
                         console.error(`[AudioService] Last Log: ${logs[logs.length - 1].getMessage()}`);
                     }
                     return inputPath;
                }
            } catch (ffmpegErr) {
                 console.error('[AudioService] FFmpeg Critical Error:', ffmpegErr);
                 return uri;
            }

        } else {
             // Standard Copy
             console.log(`[AudioService] VLOG: Standard Copy to: ${dest}`);
             await FileSystem.copyAsync({ from: uri, to: dest });
             return dest;
        }
    }
    
}

export default new AudioService();
