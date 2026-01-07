import * as FileSystem from 'expo-file-system';
import { getEmbeddedMetadata } from '../MetadataService';
import { FileDatabase } from './FileDatabase';
import { ImageCacheService } from './ImageCacheService';
import { IMetadataSource, iTunesSource, LyricsOVHSource, MusicBrainzSource } from './MetadataSource';
import { OrganizerService } from './OrganizerService';
import { ScannerService } from './ScannerService';
import { ScoringService } from './ScoringService';
import { TaskQueue } from './TaskQueue';
import { MusicDirector, Song } from './Types';

/**
 * STRICT LOGIC: Library Manager
 * 
 * Responsibilities:
 * - Coordination of Scan -> Organize -> Save
 * - Logic entry point for UI
 */
export class LibraryManager {
  
  private songs: Song[] = [];
  private directors: MusicDirector[] = [];
  private sources: IMetadataSource[] = [
      new MusicBrainzSource(),
      new iTunesSource()
  ];
  
  public onUpdate: (() => void) | null = null;
  public onScanStart: (() => void) | null = null;
  public onScanEnd: (() => void) | null = null;
  
  // Enrichment Callbacks
  public onEnrichmentStart: (() => void) | null = null;
  public onEnrichmentProgress: ((current: number, total: number, message: string) => void) | null = null;
  public onEnrichmentEnd: (() => void) | null = null;
  
  public isScanning: boolean = false;

  /**
   * Initializes the library from disk.
   */
  async initialize(): Promise<void> {
    const data = await FileDatabase.loadLibrary();
    if (data) {
      this.songs = data.songs;
      this.directors = data.directors;
    }
  }

  /**
   * Performs a full device scan and reorganization.
   * Returns validity of operation.
   */
  async scanAndRefresh(): Promise<boolean> {
    const isFirstLoad = this.songs.length === 0;
    
    try {
      // Show global matching popup ONLY on first load
      if (isFirstLoad) {
          this.isScanning = true;
          if (this.onScanStart) this.onScanStart();
      }
      
      // 1. Scan (Always perform)
      const rawSongs = await ScannerService.scanDevice();
      
      // 2. Merge with existing metadata (preserve enhanced tags)
      this.songs = this.mergeNewScans(rawSongs);

      // 3. Organize
      this.directors = OrganizerService.organizeLibrary(this.songs);

      // 4. Save
      await FileDatabase.saveLibrary(this.songs, this.directors);

      // 5. Trigger Background Enrichment (Safe Mode via Queue)
      this.startBackgroundEnrichment();
      
      return true;
    } catch (e) {
      console.error('Scan failed', e);
      return false;
    } finally {
       // Only trigger end if we triggered start (First Load)
       if (this.isScanning) {
           this.isScanning = false;
           if (this.onScanEnd) this.onScanEnd();
       }
    }
  }

  private bgQueue = new TaskQueue(5); // Increased concurrency for speed
  private lastEnrichmentTime = 0;
  private readonly ENRICHMENT_COOLDOWN = 1000; // Reduced cooldown
  public isEnriching: boolean = false;
  private attemptedSessionIds = new Set<string>(); // Tracks enrichment ATTEMPTS (success or fail)
  private validatedSessionIds = new Set<string>(); // Tracks "Ghost File" checks

  /**
   * BACKGROUND PROCESS:
   * Iteratively processes songs to extract embedded covers and save them locally.
   * This ensures "instant" metadata loading on next run.
   */
  async startBackgroundEnrichment() {
      const now = Date.now();
      if (this.isEnriching || (now - this.lastEnrichmentTime < this.ENRICHMENT_COOLDOWN)) {
          // console.log('[LibraryManager] Enrichment skipped (Busy or Cooldown).');
          return;
      }
      
      this.isEnriching = true;
      this.lastEnrichmentTime = now;
      console.log('[LibraryManager] Starting background enrichment (Lazy Mode + Ghost Check)...');
      if (this.onEnrichmentStart) this.onEnrichmentStart();
      
      this.bgQueue.clear();
      this.processEnrichmentQueue();
  }

  private processEnrichmentQueue() {
      this.bgQueue.add(async () => {
          // Re-evaluate list every batch to handle incoming/removed songs
          
          // PHASE 1: Metadata Enrichment (Titles, Covers) - PRIORITY
          // We look for songs that are NOT enhanced yet.
          let mode = 'METADATA';
          let songsToProcess = this.songs.filter(s => {
              if (this.attemptedSessionIds.has(s.id)) return false;
              // Fix Ghost Files
              if (s.coverUri && s.coverUri.startsWith('file://') && !this.validatedSessionIds.has(s.id)) return true;
              // Fix Temp Cache
              if (s.coverUri && s.coverUri.includes('/cache/')) return true;
              // Main Metadata Logic
              if (!s.isEnhanced) return true;
              if (!s.coverUri && !this.attemptedSessionIds.has(s.id)) return true; // Retry missing
              return false;
          });

          // PHASE 2: Audio Pre-warming (Transcoding) - SECONDARY
          // Only if Phase 1 is empty or mostly done
          if (songsToProcess.length === 0) {
              mode = 'AUDIO_PREWARM';
              songsToProcess = this.songs.filter(s => {
                  if (this.attemptedSessionIds.has(s.id + '_audio')) return false; // Distinct tracker for audio
                  
                  // Only care about M4A or Content URIs
                  const lower = s.uri.toLowerCase();
                  if (lower.endsWith('.m4a') || s.uri.startsWith('content://')) {
                       // We used to check if it's already cached, but prewarmUri handles that check efficiently.
                       return true;
                  }
                  return false;
              });
          }

          if (songsToProcess.length === 0) {
              this.isEnriching = false;
              console.log('[LibraryManager] Enrichment fully complete (Metadata & Audio).');
              return;
          }

          console.log(`[LibraryManager] Batch Start. Mode: ${mode}, Count: ${songsToProcess.length}`);

          const MAX_BATCH = mode === 'METADATA' ? 100 : 10; // Increased batch sizes
          let processed = 0;

          for (const song of songsToProcess) {
              if (processed >= MAX_BATCH) break; 

              try {
                  if (mode === 'METADATA') {
                      const current = this.songs.find(s => s.id === song.id);
                      if (!current) continue;

                      // GHOST CHECK
                      if (current.coverUri && current.coverUri.startsWith('file://') && !this.validatedSessionIds.has(current.id)) {
                          this.validatedSessionIds.add(current.id);
                          const info = await FileSystem.getInfoAsync(current.coverUri);
                          if (info.exists && !current.coverUri.includes('/cache/')) {
                              this.attemptedSessionIds.add(current.id);
                              continue;
                          } else {
                              console.warn(`[LibraryManager] GHOST/TEMP DETECTED for: ${current.title}. Re-acquiring...`);
                          }
                      }

                      this.attemptedSessionIds.add(song.id); 
                      
                      // OPTIMIZATION: Suppress individual updates
                      const changed = await this.enrichSong(song.id, true);
                      if (changed) processed++;
                      await new Promise(r => setTimeout(r, 20)); // Fast interval

                  } else {
                      // AUDIO PREWARM MODE
                      // console.log(`[LibraryManager] Pre-warming audio: ${song.title}`);
                      this.attemptedSessionIds.add(song.id + '_audio');
                      
                      // Import audio service dynamically or assume global access? 
                      // Better to import at top, but for now we assume AudioService is available if we import it.
                      // We need to import AudioService at the top of file if not present.
                      // Checking imports... AudioService is NOT imported in the viewed file snippet. 
                      // I need to add the import or use a global. I will assume I need to add import in a separate step or usage logic.
                      // Wait, I can't add imports here easily. 
                      
                      // Actually, let's assume I can call accessible AudioService if I import it. 
                      // I'll add the import in a separate step to be safe.
                      // For now, I'll invoke it as:
                      const { default: audioService } = require('../AudioService');
                      await audioService.prewarmUri(song.uri);
                      
                      processed++;
                      await new Promise(r => setTimeout(r, 100)); // Slower interval for CPU safety
                  }
                  
              } catch (e) {
                   console.warn(`[LibraryManager] Failed to process ${song.title} [${mode}]`, e);
                   if (mode === 'METADATA') this.attemptedSessionIds.add(song.id); 
                   else this.attemptedSessionIds.add(song.id + '_audio');
              }
          }
          
          if (processed > 0 && mode === 'METADATA') {
              console.log(`[LibraryManager] Metadata Batch complete. Updated ${processed} songs.`);
              this.directors = OrganizerService.organizeLibrary(this.songs);
              await FileDatabase.saveLibrary(this.songs, this.directors);
              if (this.onUpdate) this.onUpdate();
              this.notifyEnrichmentProgress(processed, mode);
          } else if (processed > 0 && mode === 'AUDIO_PREWARM') {
               console.log(`[LibraryManager] Audio Batch complete. Pre-warmed ${processed} songs.`);
               // No need to save library or update UI for audio cache warming
               this.notifyEnrichmentProgress(processed, mode);
          }

          // Schedule next batch
          // Check if ANY work remains
          const hasMoreMetadata = this.songs.some(s => !s.isEnhanced && !this.attemptedSessionIds.has(s.id));
          const hasMoreAudio = this.songs.some(s => (s.uri.endsWith('.m4a') || s.uri.startsWith('content://')) && !this.attemptedSessionIds.has(s.id + '_audio'));

          if (hasMoreMetadata || hasMoreAudio) {
             await new Promise(r => setTimeout(r, 500));
             this.processEnrichmentQueue();
          } else {
             console.log('[LibraryManager] Enrichment fully complete.');
             this.isEnriching = false;
             if (this.onEnrichmentEnd) this.onEnrichmentEnd();
          }
      });
  }

  // Helper to notify progress
  private notifyEnrichmentProgress(processedCount: number, mode: string) {
      if (this.onEnrichmentProgress) {
          const total = this.songs.length;
          // Estimate "done" count based on enhanced flag? 
          // Or just pass the current batch progress?
          // Let's pass simple status for now.
          const enhancedCount = this.songs.filter(s => s.isEnhanced).length;
          this.onEnrichmentProgress(enhancedCount, total, mode === 'METADATA' ? 'Organizing Metadata...' : 'Optimizing Audio...');
      }
  }

  async enrichSong(songId: string, suppressEvent: boolean = false): Promise<boolean> {
      const index = this.songs.findIndex(s => s.id === songId);
      if (index === -1) return false;
      const song = this.songs[index];
      


      // STRATEGY 3: INTERNET SEARCH (Fallback)
      if (song.title && song.title !== 'Unknown Title') {
          console.log('[LibraryManager] Attempting Internet Match...');
          const fixed = await this.fixMetadata(songId, suppressEvent);
          if (fixed) return true;
      }

      // FAILURE: Mark as enhanced to prevent infinite retries
      this.updateSongMetadata(songId, {}, suppressEvent);
      return true;
  }

  /**
   * Safe metadata update by ID.
   */
  /**
   * Safe metadata update by ID.
   */
  private updateSongMetadata(songId: string, updates: Partial<Song>, suppressEvent: boolean = false) {
      const idx = this.songs.findIndex(s => s.id === songId);
      if (idx !== -1) {
          // PROTECTION: During background enrichment, we preserve the user's original title/album/artist
          // unless they were totally unknown or this is a manual FIX trigger.
          const current = this.songs[idx];
          const filteredUpdates = { ...updates };
          
          if (!updates.metadataSource || updates.metadataSource === 'LOCAL') {
              // Internal update or background local enrichment (art/lyrics)
          } else if (updates.metadataSource === 'INTERNET') {
              // If background internet match, don't overwrite title/album if they exist
              if (current.title && current.title !== 'Unknown Title') delete filteredUpdates.title;
              if (current.album && current.album !== 'Unknown Movie') delete filteredUpdates.album;
              if (current.artist && current.artist !== 'Unknown Artist') delete filteredUpdates.artist;
          }

          this.songs[idx] = { ...this.songs[idx], ...filteredUpdates, isEnhanced: true };
          
          // Notify UI that data changed
          if (this.onUpdate && !suppressEvent) this.onUpdate();
      }
  }

  private async findImageInFolder(fileUri: string): Promise<string | null> {
      try {
          // RESTRICTION: Only scan for folder art if the parent folder is likely an ALBUM folder.
          // Generic folders like "Download", "Music", "Bluetooth" should NOT provide shared art.
          const folderUri = fileUri.substring(0, fileUri.lastIndexOf('/'));
          const folderName = folderUri.split('/').pop()?.toLowerCase() || '';
          
          const genericFolders = new Set(['download', 'music', 'audio', 'bluetooth', '0', 'songs', 'internal storage']);
          if (genericFolders.has(folderName)) {
              return null;
          }

          const dir = await FileSystem.readDirectoryAsync(folderUri);
          
          // CRITICAL FIX: If the folder has too many audio files (e.g. > 15), 
          // a single "cover.jpg" is likely just a generic file, NOT a specific album cover.
          const audioFiles = dir.filter(f => {
              const e = f.split('.').pop()?.toLowerCase();
              return e && ['mp3', 'm4a', 'wav', 'flac'].includes(e);
          });
          
          if (audioFiles.length > 15) {
              // console.log(`[LibraryManager] Skipping folder art: ${folderName} has too many files (${audioFiles.length})`);
              return null;
          }
          
          // Prioritize common names
          const priorities = ['cover.jpg', 'folder.jpg', 'album.jpg', 'front.jpg', 'artwork.jpg'];
          
          // Case insensitive check
          for (const p of priorities) {
              const match = dir.find(f => f.toLowerCase() === p);
              if (match) return `${folderUri}/${match}`;
          }

          // Any jpg/png
          const anyImage = dir.find(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.png'));
          if (anyImage) return `${folderUri}/${anyImage}`;

      } catch (e) {
          // Ignore directory errors
      }
      return null;
  }

  getDirectors(): MusicDirector[] {
    return this.directors;
  }

  getAllSongs(): Song[] {
    return this.songs;
  }

  /**
   * Preserves enhanced metadata when re-scanning.
   * Logic: If a song with same ID/Filename exists and isEnhanced, keep its metadata.
   */
  private mergeNewScans(newScans: Song[]): Song[] {
    const existingMap = new Map(this.songs.map(s => [s.id, s])); // Use ID as the primary unique key
    
    return newScans.map(newSong => {
      const existing = existingMap.get(newSong.id);
      if (existing && existing.isEnhanced) {
        return {
          ...newSong,
          title: existing.title,
          artist: existing.artist,
          album: existing.album,
          composer: existing.composer,
          coverUri: existing.coverUri, 
          lyrics: existing.lyrics,     
          artworkUri: existing.artworkUri, 
          isEnhanced: true,
          confidenceScore: existing.confidenceScore,
          metadataSource: existing.metadataSource
        };
      }
      return newSong;
    });
  }
  
  /**
   * TRIGGER: Fix Metadata
   * Logic to be called by UI for specific song.
   */
  async fixMetadata(songId: string, suppressEvent: boolean = false): Promise<boolean> {
      const songIndex = this.songs.findIndex(s => s.id === songId);
      if (songIndex === -1) return false;
      
      const song = this.songs[songIndex];
      let bestMatch: any = null;
      let highestScore = 0;

      console.log(`[LibraryManager] Fixing metadata for: ${song.title}`);

      // Strategy 1: EMBEDDED Art (Highest Priority)
      try {
        const embedded = await getEmbeddedMetadata(song.uri);
        if (embedded?.artwork) {
            console.log('[LibraryManager] Found embedded cover art.');
             // FIX: Persist temp file URIs
            let savedUri = embedded.artwork;
            if (embedded.artwork.startsWith('file://')) {
                 savedUri = await ImageCacheService.cacheImageFromUri(embedded.artwork, song.id);
            } else {
                 savedUri = await ImageCacheService.saveImage(song.id, embedded.artwork, song.uri);
            }
            this.updateSongMetadata(song.id, { coverUri: savedUri, metadataSource: 'LOCAL' });
            return true;
        }
      } catch (e) {
          console.warn('[Id3/M4A] Extraction failed', e);
      }


      // 1. Search Online Metadata
      for (const source of this.sources) {
          console.log(`[LibraryManager] Querying ${source.name}...`);
          const results = await source.search(song);
          
          for (const result of results) {
              const scoreResult = ScoringService.calculateScore(song, result);
              if (scoreResult.isMatch && scoreResult.totalScore > highestScore) {
                  highestScore = scoreResult.totalScore;
                  bestMatch = result;
              }
          }
      }

      if (bestMatch) {
          console.log(`[LibraryManager] Match found! Fetching lyrics...`);
          const lyricsSource = new LyricsOVHSource();
          const lyrics = await lyricsSource.getLyrics(bestMatch.artist, bestMatch.title);

          const updatedSong: Song = {
              ...song,
              title: bestMatch.title,
              artist: bestMatch.artist,
              album: bestMatch.album,
              composer: bestMatch.composer, 
              artworkUri: bestMatch.artworkUri,
              lyrics: lyrics || undefined,
              isEnhanced: true,
              confidenceScore: highestScore,
              metadataSource: 'INTERNET'
          };
          this.updateSongMetadata(song.id, updatedSong);
          
          this.directors = OrganizerService.organizeLibrary(this.songs);
          await FileDatabase.saveLibrary(this.songs, this.directors);
          return true;
      }
      
      // Strategy 3: FOLDER Art (Lowest Priority - Only if folder is specific)
      if (song.uri.startsWith('file://')) {
          const folderImage = await this.findImageInFolder(song.uri);
          if (folderImage) {
              try {
                  const imageBase64 = await FileSystem.readAsStringAsync(folderImage, { encoding: FileSystem.EncodingType.Base64 });
                  const savedUri = await ImageCacheService.saveImage(song.id, `data:image/jpeg;base64,${imageBase64}`, song.uri);
                  this.updateSongMetadata(song.id, { coverUri: savedUri, metadataSource: 'LOCAL' });
                  return true;
              } catch (e) {
                  console.warn('[LibraryManager] Folder image fallback failed', e);
              }
          }
      }
      
      console.warn('[LibraryManager] No confident match found.');
      this.updateSongMetadata(song.id, {});
      return false;
  }
}

export default new LibraryManager();
