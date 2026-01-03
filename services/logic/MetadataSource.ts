import { MetadataResult, Song } from './Types';

/**
 * STRICT LOGIC: Metadata Source Interface
 * 
 * Rules:
 * - Query sequentially (handled by Manager)
 * - Standardized return type
 * - Strict error handling
 */
export interface IMetadataSource {
  name: string;
  search(song: Song): Promise<MetadataResult[]>;
}

export class BaseMetadataSource implements IMetadataSource {
  name: string;
  
  constructor(name: string) {
    this.name = name;
  }

  async search(song: Song): Promise<MetadataResult[]> {
    throw new Error('Method not implemented.');
  }
}

// STUB IMPLEMENTATIONS (To be filled with actual API calls)

export class MusicBrainzSource extends BaseMetadataSource {
  constructor() { super('MusicBrainz'); }
  async search(song: Song): Promise<MetadataResult[]> {
    // TODO: Implement MusicBrainz API
    return [];
  }
}

export class SpotifySource extends BaseMetadataSource {
    constructor() { super('Spotify'); }
    async search(song: Song): Promise<MetadataResult[]> {
      // TODO: Implement Spotify API (requires auth token logic)
      return [];
    }
}

export class iTunesSource extends BaseMetadataSource {
    constructor() { super('iTunes'); }
    
    async search(song: Song): Promise<MetadataResult[]> {
      try {
        // Construct query: "Artist Title" or just "Title" if Artist is unknown
        const term = song.artist && song.artist !== 'Unknown Artist' 
            ? `${song.artist} ${song.title}` 
            : song.title;
        
        const encodedTerm = encodeURIComponent(term);
        const url = `https://itunes.apple.com/search?term=${encodedTerm}&media=music&entity=song&limit=5`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.results) return [];

        return data.results.map((item: any) => ({
            title: item.trackName,
            artist: item.artistName,
            album: item.collectionName,
            composer: item.artistName, // iTunes often lacks composer, default to Artist
            duration: item.trackTimeMillis,
            source: 'iTunes',
            score: 0, // Configured by ScoringService
            artworkUri: item.artworkUrl100 ? item.artworkUrl100.replace('100x100', '600x600') : undefined // Get high res
        }));
      } catch (e) {
        console.warn('iTunes Search failed', e);
        return [];
      }
    }
}

export class LyricsOVHSource {
    name = 'LyricsOVH';
    
    async getLyrics(artist: string, title: string): Promise<string | null> {
        try {
            const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
            const response = await fetch(url);
            const data = await response.json();
            return data.lyrics || null;
        } catch (e) {
            console.warn('Lyrics fetch failed', e);
            return null;
        }
    }
}
