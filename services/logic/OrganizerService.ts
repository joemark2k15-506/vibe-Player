import { NormalizationService } from './NormalizationService';
import { MusicDirector, Song } from './Types';

/**
 * STRICT LOGIC: Library Organization
 * Hierarchy: Director -> Movie -> Songs
 */
export class OrganizerService {

  /**
   * Groups a flat list of songs into the strict Director/Movie hierarchy.
   */
  static organizeLibrary(songs: Song[]): MusicDirector[] {
    const directorsMap = new Map<string, MusicDirector>();

    for (const song of songs) {
      // 1. Resolve Director (Composer)
      const directorName = song.composer || 'Unknown Director';
      const directorKey = NormalizationService.normalize(directorName);

      if (!directorsMap.has(directorKey)) {
        directorsMap.set(directorKey, {
          name: directorName,
          displayTitle: directorName,
          movies: [],
          photoUri: undefined
        });
      }
      const director = directorsMap.get(directorKey)!;

      // 2. Resolve Movie (Album)
      const movieName = song.album && song.album !== 'Unknown Movie' ? song.album : 'Unknown Movie';
      
      let movie = director.movies.find(m => NormalizationService.normalize(m.name) === NormalizationService.normalize(movieName));
      
      if (!movie) {
        movie = {
          name: movieName,
          displayTitle: movieName,
          songs: [],
          year: undefined,
          artworkUri: undefined
        };
        director.movies.push(movie);
      }

      // 3. Add Song
      movie.songs.push(song);
      
      // Propagate artwork to movie if movie lacks it
      if (!movie.artworkUri && (song.coverUri || song.artworkUri || song.uri.startsWith('data:'))) {
          movie.artworkUri = song.coverUri || song.artworkUri || (song.uri.startsWith('data:') ? song.uri : undefined);
      }
    }

    // Convert Map to Array and Sort
    return Array.from(directorsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }
}
