import { SharedValue } from 'react-native-reanimated';

export interface Song {
  id: string;
  filename: string;
  uri: string;
  duration: number;
  title: string;
  artist: string;
  albumId?: string;
  modificationTime: number;
  coverUri?: string;
  folder?: string;
  director?: string;
  album?: string;
  artworkUri?: string;
  lyrics?: string;
}

export interface DirectorCard {
  id: string;
  title: string;
  songs: Song[];
}

export interface Playlist {
  id: string;
  title: string;
  songs: Song[];
  createdAt: number;
}

export interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  position: number;
  positionShared: SharedValue<number>;
  duration: number;
  songs: Song[];
  directorCards: DirectorCard[];
  playlists: Playlist[];
  play: (song?: Song) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  seek: (millis: number) => Promise<void>;
  loadSongs: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  importTestSong: () => Promise<void>;
  createPlaylist: (name: string, selectedSongs: Song[]) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addSongToPlaylist: (playlistId: string, song: Song) => Promise<void>;
  likedSongs: string[];
  toggleLike: (songId: string) => Promise<void>;
  repeatMode: 'off' | 'all' | 'one';
  isShuffle: boolean;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  // User Profile Global State
  userName: string;
  setUserName: (name: string) => Promise<void>;
  avatarId: string;
  setAvatarId: (id: string) => Promise<void>;
  accentColor: string;
  setAccentColor: (color: string) => void;
}
