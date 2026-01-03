import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import { DirectorCard, Song } from '../types';

class MusicDiscoveryService {
  async requestPermissions(): Promise<boolean> {
    const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
    
    if (status === 'granted') return true;
    
    if (status === 'undetermined' || canAskAgain) {
        const { status: finalStatus } = await MediaLibrary.requestPermissionsAsync();
        return finalStatus === 'granted';
    }
    
    return false;
  }

  async getSongsGrouped(): Promise<DirectorCard[]> {
    try {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
          console.warn('Permission not granted');
          return [];
        }

        let allSongs: Song[] = [];
        let hasNextPage = true;
        let after: MediaLibrary.AssetRef | undefined;
        
        // Safety Break: Stop after 5000 songs to prevent memory OOM on huge libraries
        let totalProcessed = 0; 
        const SAFETY_LIMIT = 5000;

        while (hasNextPage && totalProcessed < SAFETY_LIMIT) {
          try {
              const assets: MediaLibrary.PagedInfo<MediaLibrary.Asset> = await MediaLibrary.getAssetsAsync({
                mediaType: MediaLibrary.MediaType.audio,
                first: 100, // Reduced from 500 for stability
                after,
                sortBy: MediaLibrary.SortBy.modificationTime,
              });

              // Fetch detailed info for each asset to get metadata
              // Process in chunks to avoid blocking the UI thread (Deep Search Optimization)
              const detailedAssets: Song[] = [];
              const CHUNK_SIZE = 25; // Smaller chunks for better UI responsiveness
              
              for (let i = 0; i < assets.assets.length; i += CHUNK_SIZE) {
                  const chunk = assets.assets.slice(i, i + CHUNK_SIZE);
                  
                  // Fast Scan Logic
                  const chunkResults = chunk
                      .filter(asset => asset.duration > 10) // Filter out blips
                      .map((asset) => {
                         const pathParts = asset.uri.split('/');
                         const folderName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'Unknown folder';
                         
                         // Fast Metadata Extraction
                         const rawTitle = asset.filename.replace(/\.[^/.]+$/, "");
                         const folderArtist = folderName !== '0' ? folderName : 'Unknown Artist';

                         const coverUri = (asset.albumId && parseInt(asset.albumId) > 0) 
                                           ? `content://media/external/audio/albumart/${asset.albumId}` 
                                           : undefined;

                         return {
                            id: asset.id,
                            filename: asset.filename,
                            uri: asset.uri,
                            duration: asset.duration,
                            title: rawTitle,
                            artist: folderArtist,
                            folder: folderName,
                            director: folderArtist, 
                            modificationTime: asset.modificationTime,
                            albumId: asset.albumId,
                            coverUri: coverUri
                         };
                      });
                  
                  detailedAssets.push(...chunkResults);
                  
                  // Small delay to allow UI to breathe
                  await new Promise(resolve => setTimeout(resolve, 5));
              }
              
              detailedAssets.forEach(song => allSongs.push(song));
              totalProcessed += detailedAssets.length;

              hasNextPage = assets.hasNextPage;
              after = assets.endCursor;
          } catch (scanError) {
              console.error("Critical: Failed to read asset page", scanError);
              hasNextPage = false; // Stop scanning on error
          }
        }

        // Grouping logic
        const groups: { [key: string]: Song[] } = {};
        allSongs.forEach(song => {
          const groupKey = song.folder || 'Other';
          if (!groups[groupKey]) {
            groups[groupKey] = [];
          }
          groups[groupKey].push(song);
        });

        return Object.keys(groups).map(key => ({
          id: key,
          title: key,
          songs: groups[key]
        }));
    } catch (globalError) {
        console.error("Critical: Music Discovery Service crashed", globalError);
        return [];
    }
  }

  async getSongs(): Promise<Song[]> {
    // Legacy support or flat list
    const grouped = await this.getSongsGrouped();
    return grouped.flatMap(g => g.songs);
  }

  async importSong(): Promise<Song | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      
      return {
        id: asset.uri, // Use URI as ID for picked files
        filename: asset.name,
        uri: asset.uri,
        duration: 0, // Metadata might be missing for picked files
        title: asset.name.replace(/\.[^/.]+$/, ""),
        artist: "Imported Song",
        folder: "Imported",
        modificationTime: Date.now()
      };
    } catch (err) {
      console.error('Error picking document:', err);
      return null;
    }
  }
}

export default new MusicDiscoveryService();
