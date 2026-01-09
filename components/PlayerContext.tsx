import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import AudioService from '../services/AudioService';
import LibraryManager from '../services/logic/LibraryManager';
import { getEmbeddedMetadata } from '../services/MetadataService';
import MusicDiscoveryService from '../services/MusicDiscoveryService';
import { DirectorCard, PlayerContextType, Playlist, Song } from '../types';

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [directorCards, setDirectorCards] = useState<DirectorCard[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [position, setPosition] = useState(0);
  const positionShared = useSharedValue(0);
  const [duration, setDuration] = useState(0);
  const [likedSongs, setLikedSongs] = useState<string[]>([]); // Array of song IDs

  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isShuffle, setIsShuffle] = useState(false);
  const [accentColor, setAccentColor] = useState('#4ade80');

  // Refs to access latest state in callbacks without re-triggering effects
  const currentSongRef = useRef<Song | null>(null);
  const songsRef = useRef<Song[]>([]);
  const repeatModeRef = useRef<'off' | 'all' | 'one'>('off');
  const isShuffleRef = useRef(false);
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const lastNotificationUpdateRef = useRef(0);

  const formatTime = (millis: number) => {
    const totalSeconds = millis / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  useEffect(() => {
      loadPlaylists();
      loadLikedSongs();
      
      // Subscribe to library updates (artwork enrichment etc)
      LibraryManager.onUpdate = () => {
          console.log("[PlayerContext] Library updated! Syncing UI...");
          setSongs([...LibraryManager.getAllSongs()]);
          setDirectorCards(mapDirectorsToCards(LibraryManager.getDirectors()));
          
          // If current song was updated, refresh it too
          const cSong = currentSongRef.current;
          if (cSong) {
              const fresh = LibraryManager.getAllSongs().find(s => s.id === cSong.id);
              if (fresh) setCurrentSong(fresh);
          }
      };

      // Notification setup moved to separate useEffect with proper action listeners
  }, []);

  const setupTrackPlayer = useCallback(async () => {
    await AudioService.configureAudioMode();
  }, []);

  useEffect(() => {
    setupTrackPlayer();
  }, [setupTrackPlayer]);

  const seek = useCallback(async (millis: number) => await AudioService.seekTo(millis), []);

  const play = useCallback(async (song?: Song) => {
    const sList = songsRef.current;
    const cSong = currentSongRef.current;

    if (!song) {
            await AudioService.resume();
        if(sList.length > 0) {
            await play(sList[0]);
            return;
        }
        return;
    }

    if (cSong?.id === song.id) {
      await AudioService.resume();
    } else {
      setCurrentSong(song);
      setPosition(0);
      setDuration(song.duration || 0);

      const currentId = song.id;
      const loadAudio = async () => {
          try {
            await AudioService.loadSound(
                song.uri, 
                true, 
                song.id, 
                song.filename,
                {
                    title: song.title,
                    artist: song.artist || song.director,
                    artwork: song.coverUri,
                    duration: song.duration
                }
            );
          } catch (err) {
            console.error("[PlayerContext] Failed to load sound:", err);
          }
      };

      const fetchMetadata = async () => {
           try {
              if (!song.coverUri || song.coverUri.startsWith('content://')) {
                  const deepMeta = await getEmbeddedMetadata(song.uri);
                  if(deepMeta?.artwork && currentSongRef.current?.id === currentId) {
                      setCurrentSong(prev => prev && prev.id === currentId ? { ...prev, coverUri: deepMeta.artwork } : prev);
                  }
              }
          } catch (metadataErr) {
              console.error("[PlayerContext] Deep metadata error:", metadataErr);
          }
      };

      loadAudio();
      setTimeout(() => {
          fetchMetadata();
      }, 1000);
    }
  }, []);

  const next = useCallback(async () => {
    const sList = songsRef.current;
    const cSong = currentSongRef.current;
    const rMode = repeatModeRef.current;
    const shuffle = isShuffleRef.current;

    if (!cSong || sList.length === 0) return;

    if (rMode === 'one') {
        await seek(0);
        await AudioService.resume();
        return;
    }

    let nextIndex;
    if (shuffle) {
        let newIndex = Math.floor(Math.random() * sList.length);
        const currentIndex = sList.findIndex(s => s.id === cSong.id);
        if (sList.length > 1 && newIndex === currentIndex) {
             newIndex = (newIndex + 1) % sList.length;
        }
        nextIndex = newIndex;
    } else {
        const currentIndex = sList.findIndex(s => s.id === cSong.id);
        nextIndex = (currentIndex + 1) % sList.length;
    }

    await play(sList[nextIndex]);
  }, [play, seek]);

  const prev = useCallback(async () => {
    const sList = songsRef.current;
    const cSong = currentSongRef.current;
    
    if (!cSong || sList.length === 0) return;
    
    if (position > 3000) {
        await seek(0);
        return;
    }
    
    const currentIndex = sList.findIndex(s => s.id === cSong.id);
    const prevIndex = (currentIndex - 1 + sList.length) % sList.length;
    await play(sList[prevIndex]);
  }, [play, position, seek]);

  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
        await AudioService.pause();
    } else {
        if (currentSongRef.current) {
            await AudioService.resume();
        } else if (songsRef.current.length > 0) {
            await play(songsRef.current[0]);
        }
    }
  }, [play, isPlaying]);



  const toggleRepeat = useCallback(() => {
      setRepeatMode(prev => {
          if (prev === 'off') return 'all';
          if (prev === 'all') return 'one';
          return 'off';
      });
  }, []);

  const toggleShuffle = useCallback(() => {
      setIsShuffle(prev => !prev);
  }, []);

  // ... (keeping existing loadLikedSongs, toggleLike, playlist methods) ...
  const loadLikedSongs = async () => {
      try {
          const json = await AsyncStorage.getItem('user_liked_songs');
          if (json) {
              setLikedSongs(JSON.parse(json));
          }
      } catch (e) {
          console.error("Failed to load liked songs", e);
      }
  };

  const toggleLike = useCallback(async (songId: string) => {
      setLikedSongs(prev => {
          const isLiked = prev.includes(songId);
          const updated = isLiked ? prev.filter(id => id !== songId) : [...prev, songId];
          AsyncStorage.setItem('user_liked_songs', JSON.stringify(updated));
          return updated;
      });
  }, []);

  const loadPlaylists = async () => {
      try {
          const json = await AsyncStorage.getItem('user_playlists');
          if (json) {
              setPlaylists(JSON.parse(json));
          }
      } catch (e) {
          console.error("Failed to load playlists", e);
      }
  };

  const savePlaylists = async (newPlaylists: Playlist[]) => {
      try {
        setPlaylists(newPlaylists);
        await AsyncStorage.setItem('user_playlists', JSON.stringify(newPlaylists));
      } catch (e) {
          console.error("Failed to save playlists", e);
      }
  };

  const createPlaylist = async (name: string, selectedSongs: Song[]) => {
      const newPlaylist: Playlist = {
          id: Date.now().toString(),
          title: name,
          songs: selectedSongs,
          createdAt: Date.now(),
      };
      const updated = [...playlists, newPlaylist];
      await savePlaylists(updated);
  };

  const deletePlaylist = async (id: string) => {
      const updated = playlists.filter(p => p.id !== id);
      await savePlaylists(updated);
  };

  const addSongToPlaylist = async (playlistId: string, song: Song) => {
      const playlistIndex = playlists.findIndex(p => p.id === playlistId);
      if (playlistIndex < 0) return;
      
      const playlist = playlists[playlistIndex];
      const updatedPlaylist = { ...playlist, songs: [...playlist.songs, song] };
      const updatedPlaylists = [...playlists];
      updatedPlaylists[playlistIndex] = updatedPlaylist;
      
      await savePlaylists(updatedPlaylists);
  };

  const mapDirectorsToCards = (directors: any[]): DirectorCard[] => {
      return directors.map(d => ({
          id: d.name,
          title: d.displayTitle,
          songs: d.movies ? d.movies.flatMap((m: any) => m.songs) : []
      }));
  };

  const loadSongs = async () => {
    // 1. Initialize from cache (fast load)
    await LibraryManager.initialize();
    setSongs(LibraryManager.getAllSongs());
    setDirectorCards(mapDirectorsToCards(LibraryManager.getDirectors()));

    // 2. Background Scan & Refresh
    const fresh = await LibraryManager.scanAndRefresh();
    if(fresh) {
        setSongs(LibraryManager.getAllSongs());
        setDirectorCards(mapDirectorsToCards(LibraryManager.getDirectors()));
        
        // AUTO-PLAY: First Run Simulation
        const all = LibraryManager.getAllSongs();
        // Only if library WAS empty before this scan
        if (all.length > 0 && songsRef.current.length === 0) {
             console.log("[PlayerContext] First Run: Auto-playing after scan...");
             // Small delay to allow UI to settle after popup hide
             setTimeout(() => {
                 play(all[0]);
             }, 1000);
        }
    }
  };

  useEffect(() => {
    loadSongs();
    return () => {
        console.log("[PlayerContext] App unmounting, cleaning up audio service...");
        AudioService.cleanup();
    };
  }, []);

  useEffect(() => {
    AudioService.onStatusUpdate = (status: any) => {
      if (status.isLoaded) {
        setIsPlaying(status.isPlaying);
        positionShared.value = status.positionMillis;

        const shouldUpdateState = !status.isPlaying || 
                                  Math.abs(status.positionMillis - positionRef.current) >= 1000 ||
                                  status.didJustFinish;

        if (shouldUpdateState) {
            setPosition(status.positionMillis);
            positionRef.current = status.positionMillis;
        }
        
        if (status.durationMillis > 0) {
            setDuration(status.durationMillis);
            durationRef.current = status.durationMillis;
        }
        
        if (status.didJustFinish) {
          next();
        }
      } else if (status.error) {
          console.warn("[PlayerContext] Playback error detected, skipping track:", status.error);
          setTimeout(() => next(), 1000);
      }
    };

    // Connect Remote Events from AudioService to Context Logic
    AudioService.onNext = () => next();
    AudioService.onPrevious = () => prev();

  }, [next, prev, accentColor]);

  const watchdogRetries = useRef(0);
  
  useEffect(() => {
      watchdogRetries.current = 0;
  }, [currentSong?.id]);

  useEffect(() => {
     if (!isPlaying || !currentSong) return;

     const lastPos = position;
     // Relaxed Watchdog: 10s timeout to allow for buffering/loading
     const checkStuck = setTimeout(async () => {
         // Only trigger if we are allegedly playing but position hasn't moved
         // AND we are at the start of the song (< 2000ms)
         if (isPlaying && position === lastPos && position < 2000) {
             if (watchdogRetries.current >= 3) {
                 console.log("[PlayerContext] Watchdog gave up after 3 retries.");
                 return;
             }
             
             console.log("[PlayerContext] Watchdog detected stuck playback. Logging only (Auto-reload disabled).");
             
             // watchdogRetries.current += 1;
             // const songToReload = currentSongRef.current;
             // if (songToReload) {
             //      await AudioService.loadSound(songToReload.uri, true, songToReload.id, songToReload.filename);
             // }
         }
     }, 10000);

     return () => clearTimeout(checkStuck);
  }, [isPlaying, position, currentSong]);

  const pause = async () => {
      await AudioService.pause();
  };

  const resume = async () => await AudioService.resume();


  const importTestSong = async () => {
    const song = await MusicDiscoveryService.importSong();
    if (song) {
        // 1. Add to main song list
        setSongs(prev => [song, ...prev]);
        
        // 2. Add to "Imported" Playlist (for Profile Page visibility)
        setPlaylists(prev => {
            const importedIndex = prev.findIndex(p => p.title === 'Imported');
            if (importedIndex >= 0) {
                const updatedPlaylists = [...prev];
                updatedPlaylists[importedIndex] = {
                    ...updatedPlaylists[importedIndex],
                    songs: [song, ...updatedPlaylists[importedIndex].songs]
                };
                savePlaylists(updatedPlaylists); // Persist
                return updatedPlaylists;
            } else {
                const newPlaylist: Playlist = {
                    id: 'imported-vibe',
                    title: 'Imported',
                    songs: [song],
                    createdAt: Date.now()
                };
                const updatedPlaylists = [newPlaylist, ...prev];
                savePlaylists(updatedPlaylists); // Persist
                return updatedPlaylists;
            }
        });

        // 3. Add to Director Cards (for Home Page)
        setDirectorCards(prev => {
            const importedIndex = prev.findIndex(c => c.title === 'Imported');
            if (importedIndex >= 0) {
                const updatedCards = [...prev];
                updatedCards[importedIndex] = {
                    ...updatedCards[importedIndex],
                    songs: [song, ...updatedCards[importedIndex].songs]
                };
                return updatedCards;
            } else {
                return [{
                    id: 'imported',
                    title: 'Imported',
                    songs: [song]
                }, ...prev];
            }
        });

        await play(song);
    }
  };

  // User Profile State
  const [userName, setUserNameState] = useState('User');
  const [avatarId, setAvatarIdState] = useState('1');

  useEffect(() => {
      loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
      try {
          const savedName = await AsyncStorage.getItem('user_name');
          const savedAvatar = await AsyncStorage.getItem('user_avatar');
          if (savedName) setUserNameState(savedName);
          if (savedAvatar) setAvatarIdState(savedAvatar);
      } catch (e) {
          console.error("Failed to load user profile", e);
      }
  };

  const setUserName = async (name: string) => {
      setUserNameState(name);
      await AsyncStorage.setItem('user_name', name);
  };

  const setAvatarId = async (id: string) => {
      setAvatarIdState(id);
      await AsyncStorage.setItem('user_avatar', id);
  };

  return (
    <PlayerContext.Provider value={{
      currentSong,
      isPlaying,
      position,
      positionShared,
      duration,
      songs,
      directorCards,
      play,
      pause,
      resume,
      next,
      prev,
      seek,
      loadSongs,
      togglePlayPause,
      importTestSong,
      playlists,
      createPlaylist,
      deletePlaylist,
      addSongToPlaylist,
      likedSongs,
      toggleLike,
      repeatMode,
      isShuffle,
      toggleRepeat,
      toggleShuffle,
      userName,
      setUserName,
      avatarId,
      setAvatarId,
      accentColor,
      setAccentColor
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = React.useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
