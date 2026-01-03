export interface Song {
  id: string; // Unique ID (hash or file URI based)
  title: string;
  artist: string; // This is the Song Artist or Singer
  composer?: string; // This is the Music Director
  album?: string; // This is the Movie Name
  duration: number; // In milliseconds
  uri: string;
  filename: string;
  
  // Metadata status
  isEnhanced: boolean;
  confidenceScore: number;
  metadataSource?: 'LOCAL' | 'INTERNET' | 'MANUAL';
  
  // Extended Metadata
  artworkUri?: string;
  coverUri?: string;
  folder?: string;
  albumId?: string;
  lyrics?: string;
  
  // Raw file stats
  size: number;
  modificationTime: number;
}

export interface Movie {
  name: string; // Album Name
  displayTitle: string; // Normalized display name
  songs: Song[];
  year?: string;
  artworkUri?: string;
}

export interface MusicDirector {
  name: string; // Composer Name
  displayTitle: string; 
  movies: Movie[]; // Grouped by Album
  photoUri?: string;
}

export interface MetadataResult {
  title: string;
  artist: string;
  album: string;
  composer: string;
  duration: number;
  source: string;
  score: number;
  artworkUri?: string;
  lyrics?: string;
}

export interface VerificationResult {
  isMatch: boolean;
  totalScore: number;
  breakdown: {
    title: number;
    duration: number;
    album: number;
    artist: number;
  };
}

export type MetadataSourceType = 'MusicBrainz' | 'Spotify' | 'LastFM' | 'iTunes';
