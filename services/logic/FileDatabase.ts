import * as FileSystem from 'expo-file-system';
import { MusicDirector, Song } from './Types';

/**
 * STRICT LOGIC: File Database
 * 
 * Reasons:
 * - SQLite not installed in project.
 * - AsyncStorage has size limits.
 * - JSON file is portable and deterministic.
 */
export class FileDatabase {
  
  // eslint-disable-next-line
  private static readonly DB_PATH = `${require('expo-file-system').documentDirectory}music_db.json`;

  /**
   * Saves the entire library state to a local JSON file.
   */
  static async saveLibrary(songs: Song[], directors: MusicDirector[]): Promise<void> {
    const data = {
      timestamp: Date.now(),
      songs,
      directors
    };
    await FileSystem.writeAsStringAsync(this.DB_PATH, JSON.stringify(data));
  }

  /**
   * Loads the library state from the local JSON file.
   */
  static async loadLibrary(): Promise<{ songs: Song[], directors: MusicDirector[] } | null> {
    const info = await FileSystem.getInfoAsync(this.DB_PATH);
    if (!info.exists) return null;

    try {
      const content = await FileSystem.readAsStringAsync(this.DB_PATH);
      const data = JSON.parse(content);
      return {
        songs: data.songs || [],
        directors: data.directors || []
      };
    } catch (e) {
      console.error('Failed to load DB', e);
      return null;
    }
  }

  static async clear(): Promise<void> {
      await FileSystem.deleteAsync(this.DB_PATH, { idempotent: true });
  }
}
