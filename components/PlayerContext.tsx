import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
  const [duration, setDuration] = useState(0);
  const [likedSongs, setLikedSongs] = useState<string[]>([]); // Array of song IDs

  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isShuffle, setIsShuffle] = useState(false);

  // Refs to access latest state in callbacks without re-triggering effects
  const currentSongRef = useRef<Song | null>(null);
  const songsRef = useRef<Song[]>([]);
  const repeatModeRef = useRef<'off' | 'all' | 'one'>('off');
  const isShuffleRef = useRef(false);

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
  }, []);

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
    }
  };

  const seek = useCallback(async (millis: number) => await AudioService.seekTo(millis), []);

  const play = useCallback(async (song?: Song) => {
    const sList = songsRef.current;
    const cSong = currentSongRef.current;

    if (!song) {
        if(cSong) {
            await AudioService.play();
            return;
        }
        if(sList.length > 0) {
            await play(sList[0]);
            return;
        }
        return;
    }

    if (cSong?.id === song.id) {
      await AudioService.play();
    } else {
      // Optimistic set
      setCurrentSong(song);
      
      // Instant UI Feedback
      setPosition(0);
      setDuration(song.duration || 0);

      const currentId = song.id;

      // 1. Start Audio Loading (Parallel)
      const loadAudio = async () => {
          try {
            await AudioService.loadSound(song.uri, true, song.id, song.filename);
          } catch (err) {
            console.error("[PlayerContext] Failed to load sound:", err);
          }
      };

      // 2. Start Metadata Fetching (Parallel - NO DELAY)
      const fetchMetadata = async () => {
           try {
              // 1. Try embedded cover (Prioritize localized high-res)
              if (!song.coverUri || song.coverUri.startsWith('content://')) {
                  const deepMeta = await getEmbeddedMetadata(song.uri);
                  if(deepMeta?.artwork && currentSongRef.current?.id === currentId) {
                      console.log("[PlayerContext] Found deep cover for matching ID:", currentId);
                      setCurrentSong(prev => prev && prev.id === currentId ? { ...prev, coverUri: deepMeta.artwork } : prev);
                  } else if (deepMeta?.artwork) {
                      console.log("[PlayerContext] Discarding cover for stale ID:", song.id);
                  }
              }

              // 2. Intelligence: Fix missing metadata if needed
              // DISABLE for Performance/Stability: 
              // Automatic network calls during playback cause lag/crashes on weak devices.
              // if ((!song.artworkUri && !song.lyrics) && currentSongRef.current?.id === currentId) {
              //    const fixed = await LibraryManager.fixMetadata(song.id);
              //    if (fixed && currentSongRef.current?.id === currentId) {
              //        const updated = LibraryManager.getAllSongs().find(s => s.id === song.id);
              //        if (updated) {
              //            setCurrentSong(updated);
              //        }
              //        setSongs(LibraryManager.getAllSongs());
              //        setDirectorCards(mapDirectorsToCards(LibraryManager.getDirectors()));
              //    }
              // }
          } catch (metadataErr) {
              console.error("[PlayerContext] Deep metadata error:", metadataErr);
          }
      };

      // Execute audio loading immediately
      loadAudio();

      // Defer metadata fetching to prevent UI/Audio thread blocking during transition
      // This ensures the "click to play" feel is instant
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
        // Replay current song
        await seek(0);
        await AudioService.play(); // seek doesn't always perform play, force it
        return;
    }

    let nextIndex;
    if (shuffle) {
        // Pick random index different from current
        // Basic shuffle (stateless chaos!)
        let newIndex = Math.floor(Math.random() * sList.length);
        const currentIndex = sList.findIndex(s => s.id === cSong.id);
        
        // Try to find a different song if list > 1
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
    // For Prev, standard behavior is usually previous logic or restart if > 3s
    // Ignoring shuffle history for now (simple previous)
    
    if (!cSong || sList.length === 0) return;
    
    // If we've played more than 3 seconds, restart song
    if (position > 3000) {
        await seek(0);
        return;
    }
    
    const currentIndex = sList.findIndex(s => s.id === cSong.id);
    const prevIndex = (currentIndex - 1 + sList.length) % sList.length;
    await play(sList[prevIndex]);
  }, [play, position, seek]); // Added position to dependencies for accurate restart logic

  useEffect(() => {
    loadSongs();
    
    // Cleanup on unmount (refresh/close)
    return () => {
        console.log("[PlayerContext] App unmounting, cleaning up audio service...");
        AudioService.cleanup();
    };
  }, []); // Only load once on mount
  
  useEffect(() => {
    // Setup status listener
    AudioService.onStatusUpdate = (status: any) => {
      if (status.isLoaded) {
        setIsPlaying(status.isPlaying);
        setPosition(status.positionMillis);
        
        // Detailed log for debugging stuck playback
        if (status.isPlaying && status.positionMillis === 0) {
            // console.log("[PlayerContext] status is playing but position is 0...");
        }

        // Only update duration if the audio engine reports a valid, non-zero duration.
        // This prevents overwriting our optimistic metadata duration with '0' during buffering.
        if (status.durationMillis > 0) {
            setDuration(status.durationMillis);
        }
        
        if (status.didJustFinish) {
          next();
        }
      } else if (status.error) {
          console.warn("[PlayerContext] Playback error detected, skipping track:", status.error);
          // Show a toast or log
          // Delay briefly then skip
          setTimeout(() => next(), 1000);
      }
    };
  }, [next]);

  // PLAYBACK WATCHDOG: Fix "LOAD SUCCESSFUL but no sound/frozen 0:00"
  // Retry counter to prevent infinite loops
  const watchdogRetries = useRef(0);
  
  // Reset retry count on song change
  useEffect(() => {
      watchdogRetries.current = 0;
  }, [currentSong?.id]);

  useEffect(() => {
     if (!isPlaying || !currentSong) return;

     const lastPos = position;
     const checkStuck = setTimeout(async () => {
         // If after 3 seconds, we are still at the same position (and it's 0 or near 0)
         if (isPlaying && position === lastPos && position < 2000) {
             console.log(`[PlayerContext] WATCHDOG: Playback stuck at 0:00. Attempt ${watchdogRetries.current + 1}/3`);
             
             if (watchdogRetries.current >= 3) {
                 console.warn("[PlayerContext] WATCHDOG: Max retries reached. Giving up on this song.");
                 return;
             }
             
             watchdogRetries.current += 1;
             console.log("[PlayerContext] WATCHDOG: Triggering EMERGENCY RELOAD...");
             
             // 1. Force Reload (Blind Kick failed, we need a full reload)
             // We access currentSongRef to ensure we are reloading the correct track
             const songToReload = currentSongRef.current;
             if (songToReload) {
                  await AudioService.loadSound(songToReload.uri, true, songToReload.id, songToReload.filename);
             }
         }
     }, 4000); // Give it 4 seconds to be sure

     return () => clearTimeout(checkStuck);
  }, [isPlaying, position, currentSong]);

  const pause = async () => {
      console.log("[PlayerContext] pause() called - forwarding to AudioService");
      await AudioService.pause();
  };

  const resume = async () => await AudioService.resume();

  const togglePlayPause = async () => {
    console.log(`[PlayerContext] togglePlayPause UI Action. Current isPlaying: ${isPlaying}`);
    if (isPlaying) {
        console.log("[PlayerContext] Calling pause()...");
        await pause();
    } else {
        console.log("[PlayerContext] Calling play()...");
        await play();
    }
  };

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

  return (
    <PlayerContext.Provider value={{
      currentSong,
      isPlaying,
      position,
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
      toggleShuffle
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
