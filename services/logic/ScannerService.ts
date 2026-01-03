import * as MediaLibrary from 'expo-media-library';
import { NormalizationService } from './NormalizationService';
import { Song } from './Types';

/**
 * STRICT LOGIC: Audio Scanner
 * 
 * Rules:
 * - Scan local audio
 * - Filter formats: MP3, AAC, WAV, FLAC
 * - Extract and normalize metadata
 */
export class ScannerService {
  
  static readonly ALLOWED_EXTENSIONS = new Set(['mp3', 'aac', 'wav', 'flac', 'm4a']);

  /**
   * Scans the device for audio files using Expo MediaLibrary.
   * Returns a list of normalized Song objects.
   */
  static async scanDevice(): Promise<Song[]> {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Permission denied for media library');
    }

    const allSongs: Song[] = [];
    let hasNextPage = true;
    let after: MediaLibrary.AssetRef | undefined;

    while (hasNextPage) {
      const media: MediaLibrary.PagedInfo<MediaLibrary.Asset> = await MediaLibrary.getAssetsAsync({
        mediaType: 'audio',
        first: 500, // Batching for performance
        after: after,
      });

      const chunk = media.assets
        .filter(asset => this.isAllowedFormat(asset.filename))
        .map(asset => this.mapAssetToSong(asset));
      
      allSongs.push(...chunk);
      hasNextPage = media.hasNextPage;
      after = media.endCursor;

      // Yield to UI thread to prevent freezing
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return allSongs;
  }

  private static isAllowedFormat(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? this.ALLOWED_EXTENSIONS.has(ext) : false;
  }

  private static mapAssetToSong(asset: MediaLibrary.Asset): Song {
    // Construct a SUPER-ID to prevent collisions (Hash of URI + Asset ID)
    let hash = 0;
    const uriString = asset.uri || '';
    for (let i = 0; i < uriString.length; i++) {
        hash = ((hash << 5) - hash) + uriString.charCodeAt(i);
        hash |= 0;
    }
    const uniqueId = `${asset.id}_${Math.abs(hash).toString(16)}`;

    // Basic extraction
    const filename = asset.filename;
    const title = filename ? NormalizationService.cleanFilename(filename) : 'Unknown Title';
    
    // Construct coverUri: We leave this undefined to trigger the robust background enrichment
    // which handles ID3 tags and local cover files much more accurately than the native scanner.
    const coverUri = undefined;
    
    /**
     * GUESS HIERARCHY FROM PATH
     * Logic: 
     * If path is Music/Anirudh/Coolie/Song.mp3
     * folder1 (parent) = Coolie
     * folder2 (grandparent) = Anirudh
     */
    const pathParts = asset.uri.split('/');
    // Filter out empty parts
    const cleanParts = pathParts.filter(p => p.length > 0 && !p.includes(':'));
    
    let movieName = 'Unknown Movie';
    let directorName = 'Unknown Director';

    if (cleanParts.length >= 2) {
        movieName = cleanParts[cleanParts.length - 2];
    }
    if (cleanParts.length >= 3) {
        directorName = cleanParts[cleanParts.length - 3];
    }

    // Special cases: If directorName is "Download" or "Music", it's probably not a director
    const blacklistedFolders = new Set(['download', 'music', 'audio', 'external', 'storage', 'emulated', '0', 'media']);
    if (directorName && blacklistedFolders.has(directorName.toLowerCase())) {
        directorName = 'Unknown Director';
    }
    if (movieName && blacklistedFolders.has(movieName.toLowerCase())) {
        movieName = 'Unknown Movie';
    }

    return {
      id: uniqueId,
      title: title,
      artist: 'Unknown Artist',
      composer: directorName,
      album: movieName,
      duration: asset.duration * 1000,
      uri: asset.uri,
      filename: asset.filename,
      isEnhanced: false,
      confidenceScore: 0,
      metadataSource: 'LOCAL',
      size: 0,
      modificationTime: asset.modificationTime,
      coverUri: coverUri,
      folder: movieName,
      albumId: asset.albumId
    };
  }
}
