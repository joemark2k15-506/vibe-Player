import * as FileSystem from 'expo-file-system';

export class ImageCacheService {
  private static readonly CACHE_DIR = `${FileSystem.documentDirectory}covers/`;

  static async ensureDirectoryExists() {
    const info = await FileSystem.getInfoAsync(this.CACHE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
    }
  }

  static async saveImage(songId: string, base64Data: string, songUri?: string): Promise<string> {
    await this.ensureDirectoryExists();
    
    // Enhanced Hashing for uniqueness
    let hash1 = 0;
    let hash2 = 0;
    const input = (songUri || '') + (songId || '');
    
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash1 = ((hash1 << 5) - hash1) + char;
        hash1 |= 0;
        hash2 = ((hash2 << 7) - hash2) + char;
        hash2 |= 0;
    }
    const safeHash = `${Math.abs(hash1).toString(16)}_${Math.abs(hash2).toString(16)}`;
    
    const filename = `cover_${safeHash}.jpg`;
    const uri = this.CACHE_DIR + filename;

    // Remove data URI prefix if present (data:image/jpeg;base64,...)
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");

    await FileSystem.writeAsStringAsync(uri, cleanBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return uri;
  }

  static async clearCache() {
      try {
        await FileSystem.deleteAsync(this.CACHE_DIR, { idempotent: true });
      } catch (e) {
          console.error('[ImageCache] Failed to clear cache', e);
      }
  }
}
