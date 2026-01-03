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
    try {
      // 1. Scan
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
    }
  }

  private bgQueue = new TaskQueue(1); // Process 1 by 1 for safety
  private lastEnrichmentTime = 0;
  private readonly ENRICHMENT_COOLDOWN = 10000; // 10 seconds
  private isEnriching: boolean = false;

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
      console.log('[LibraryManager] Starting background enrichment (Lazy Mode)...');
      
      this.bgQueue.clear();
      this.processEnrichmentQueue();
  }

  private processEnrichmentQueue() {
      this.bgQueue.add(async () => {
          // Re-evaluate list every batch to handle incoming/removed songs
          // FIX: Exclude already enhanced songs to prevent infinite loop
          const songsToProcess = this.songs.filter(s => 
              !s.isEnhanced && (!s.coverUri || s.coverUri.startsWith('content://'))
          );

          if (songsToProcess.length === 0) {
              this.isEnriching = false;
              console.log('[LibraryManager] Enrichment complete.');
              return;
          }

          // console.log(`[LibraryManager] Enrichment batch. Remaining: ${songsToProcess.length}`);

          const MAX_BATCH = 50; // Increased for faster processing
          let processed = 0;

          for (const song of songsToProcess) {
              if (processed >= MAX_BATCH) break; 

              try {
                  const current = this.songs.find(s => s.id === song.id);
                  // Double check validity and enhanced status
                  if (!current || current.isEnhanced || (current.coverUri && !current.coverUri.startsWith('content://'))) continue;

                  const changed = await this.enrichSong(song.id);
                  if (changed) {
                      processed++;
                  }
                  
                  await new Promise(r => setTimeout(r, 50));
              } catch (e) {
                   console.warn(`[LibraryManager] Failed to enrich ${song.title}`, e);
              }
          }
          
          // 3. Save progress to disk after each batch
          await FileDatabase.saveLibrary(this.songs, this.directors);
          
          // Schedule next batch if we are still in enriching mode
          // Small delay to yield to UI
          if (this.isEnriching) {
             await new Promise(r => setTimeout(r, 500));
             this.processEnrichmentQueue();
          }
      });
  }

  async enrichSong(songId: string): Promise<boolean> {
      const index = this.songs.findIndex(s => s.id === songId);
      if (index === -1) return false;
      const song = this.songs[index];
      
      // console.log(`[LibraryManager] Deep Search started for: ${song.title}`);

      // STRATEGY 1: EMBEDDED ID3 (Fastest, most accurate)
      try {
        const embedded = await getEmbeddedMetadata(song.uri);
        if (embedded?.artwork) {
            console.log('[LibraryManager] Found embedded cover.');
            const savedUri = await ImageCacheService.saveImage(song.id, embedded.artwork, song.uri);
            this.updateSongMetadata(song.id, { coverUri: savedUri, metadataSource: 'LOCAL' });
            return true;
        }
      } catch (e) {
          console.warn('[LibraryManager] ID3 extraction failed', e);
      }

      // STRATEGY 2: DIRECTORY SCAN (Common in organized libraries)
      // Only works if we have a file:// URI or can resolve the path
      if (song.uri.startsWith('file://')) {
          const folderImage = await this.findImageInFolder(song.uri);
          if (folderImage) {
              console.log('[LibraryManager] Found folder image:', folderImage);
              // Copy/Cache it or just use it directly? Better to cache to ensure persistence
              // Actually, just reading it as base64 and saving is safer for consistency
               try {
                  const imageBase64 = await FileSystem.readAsStringAsync(folderImage, { encoding: FileSystem.EncodingType.Base64 });
                  const savedUri = await ImageCacheService.saveImage(song.id, `data:image/jpeg;base64,${imageBase64}`, song.uri);
                  this.updateSongMetadata(song.id, { coverUri: savedUri, metadataSource: 'LOCAL' });
                  return true;
               } catch (e) {
                   console.warn('[LibraryManager] Failed to process folder image', e);
               }
          }
      }

      // STRATEGY 3: INTERNET SEARCH (Fallback)
      if (song.title && song.title !== 'Unknown Title') {
          console.log('[LibraryManager] Attempting Internet Match...');
          const fixed = await this.fixMetadata(songId);
          if (fixed) return true;
      }

      // FAILURE: Mark as enhanced to prevent infinite retries
      this.updateSongMetadata(songId, {});
      return true;
  }

  /**
   * Safe metadata update by ID.
   */
  private updateSongMetadata(songId: string, updates: Partial<Song>) {
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
          if (this.onUpdate) this.onUpdate();
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
  async fixMetadata(songId: string): Promise<boolean> {
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
            const savedUri = await ImageCacheService.saveImage(song.id, embedded.artwork, song.uri);
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
