import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeIn, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import TextTicker from 'react-native-text-ticker';
import { useImageColors } from '../hooks/useImageColors';
import AddToPlaylistModal from './AddToPlaylistModal';
import { usePlayer } from './PlayerContext';
import { useTheme } from './ThemeContext';

export default function MiniPlayer() {
  const { currentSong, isPlaying, togglePlayPause, next, position, duration } = usePlayer();
  const { colors, isDark } = useTheme();
  /* New Hook for Dynamic Colors */
  // Use a fallback that matches the 'default_music_cover.png' (assuming it's dark/blue/purple)
  const { colors: imageColors } = useImageColors(currentSong?.coverUri || currentSong?.artworkUri, {
      primary: '#1A1A2E',
      secondary: '#E94560', 
      background: '#0F0F1A',
      detail: '#FFFFFF'
  });
  
  // Use primary logic: if we have dynamic colors, use them. Else fallback to theme.
  const accentColor = imageColors?.primary || colors.primary;
  
  // Create an animated background color derived from the image
  // We'll use a standard LinearGradient for now, but we'll animate the props via reanimated in a more advanced step if needed.
  // For standard "Chameleon", swapping the colors array is enough as LinearGradient doesn't support native driver color interpolation easily without reanimated wrapper.
  // But we can wrap it or just rely on React state updates for color changes (efficient enough for track changes).

  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [imageError, setImageError] = useState(false);

  const formatTime = (millis: number) => {
    if (!millis) return "0:00";
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => {
    setImageError(false);
  }, [currentSong?.id, currentSong?.coverUri, currentSong?.artworkUri]);
  
  // 1. ROTATION (Vinyl Spin)
  const rotation = useSharedValue(0);
  // 2. PULSE (Breathing Glow)
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isPlaying) {
        // Reset to 0 to ensure smooth 0->360 loop
        rotation.value = 0;
        rotation.value = withRepeat(
            withTiming(360, { duration: 8000, easing: Easing.linear }), 
            -1  // Infinite
        );

        // Continuous Breathing
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 1500 }),
                withTiming(1.0, { duration: 1500 })
            ),
            -1,
            true // Reverse
        );
    } else {
        cancelAnimation(rotation);
        cancelAnimation(pulse);
        pulse.value = withTiming(1); // Reset scale
    }
  }, [isPlaying]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
          { rotate: `${rotation.value}deg` },
          { scale: pulse.value }
      ],
      opacity: Math.max(0.7, 2 - pulse.value), // Dim slightly when largest
    };
  });

  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
      if (pathname.includes('now-playing')) {
          setIsExpanded(false);
      }
  }, [pathname]);

  const scale = useSharedValue(1);
  const animatedScaleStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }]
  }));

  const handlePressIn = () => {
      scale.value = withTiming(0.97, { duration: 100 });
  };

  const handlePressOut = () => {
      scale.value = withTiming(1, { duration: 150 });
  };

  const handleExpand = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    } else {
      router.push('/now-playing');
    }
  };
  
  useEffect(() => {
      let timer: NodeJS.Timeout;
      if (isExpanded) {
          timer = setTimeout(() => {
              setIsExpanded(false);
          }, 5000); 
      }
      return () => clearTimeout(timer);
  }, [isExpanded]);

  const handlePlayPauseSmall = (e: any) => {
    e.stopPropagation();
    togglePlayPause();
  };

  const containerStyle = isExpanded ? styles.containerExpanded : styles.containerSmall;
  const borderRadius = containerStyle.borderRadius || 40;

  // HIDE if on Now Playing screen (prevents double player overlap)
  if (pathname.includes('now-playing')) return null;

  if (!currentSong) return null;

  return (
    <>
    <Animated.View 
      layout={LinearTransition.springify().damping(14).mass(0.6).stiffness(100)}
      style={[
        styles.container, 
        containerStyle,
        animatedScaleStyle,
        { 
            shadowColor: isDark ? accentColor : '#000000', 
            shadowOpacity: isDark ? 0.6 : 0.3, 
            shadowRadius: 25,
            // Border removed here, handled by container padding revealing the gradient
        }
    ]}>
        {/* Pulsing & Rotating Gradient Background GLOW (Behind Glass) */}
        <Animated.View 
            style={[styles.rotatingGradientContainer, animatedStyle]}
        >
             <LinearGradient
                colors={[accentColor, imageColors?.secondary || '#BD00FF', imageColors?.detail || '#00DBDE', accentColor]} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientFill}
             />
        </Animated.View>

        {/* Dynamic Island Surface - Adaptive */}
        <View 
            style={[
                styles.innerContainer, 
                { 
                    borderRadius: borderRadius, 
                    backgroundColor: isDark ? '#000000' : '#FFFFFF', // Adaptive Background
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', // Subtle rim
                    overflow: 'hidden',
                }
            ]}
        >
            {/* Re-inject content directly */}
            <View style={[styles.content, !isExpanded && styles.contentSmall]}>
                    <TouchableOpacity 
                        activeOpacity={0.9}
                        onPress={handleExpand}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        style={styles.artworkInfoArea}
                    >
                        {isExpanded ? (
                             // LARGE STATIC ARTWORK
                             <Animated.View 
                                entering={FadeIn.duration(200)} 
                                exiting={FadeOut.duration(200)}
                                style={styles.artworkLargeWrapper}
                             >
                                <View style={styles.artworkLarge}>
                                    {(currentSong?.coverUri || currentSong?.artworkUri) && !imageError ? (
                                        <Image 
                                            key={currentSong?.id}
                                            source={{ uri: currentSong.coverUri || currentSong.artworkUri }} 
                                            style={styles.coverImage} 
                                            contentFit="cover"
                                            onError={() => setImageError(true)}
                                            transition={200}
                                        />
                                    ) : (
                                        <Image 
                                            source={require('../assets/images/default_cover.png')}
                                            style={styles.coverImage} 
                                            contentFit="cover"
                                            transition={200}
                                        />
                                    )}
                                </View>
                             </Animated.View>
                        ) : (
                             // SMALL ROTATING VINYL
                             <Animated.View 
                                entering={FadeIn.duration(200)} 
                                exiting={FadeOut.duration(200)}
                                style={[styles.artworkSmallWrapper]}
                             >
                                <Animated.View style={[
                                    styles.artworkSmall, 
                                    animatedStyle,
                                    { borderWidth: 0 } 
                                ]}>
                                    {(currentSong?.coverUri || currentSong?.artworkUri) && !imageError ? (
                                        <Image 
                                            key={currentSong?.id}
                                            source={{ uri: currentSong.coverUri || currentSong.artworkUri }} 
                                            style={styles.coverImage} 
                                            contentFit="cover"
                                            onError={() => setImageError(true)}
                                            transition={200}
                                        />
                                    ) : (
                                        <Image 
                                            source={require('../assets/images/default_cover.png')}
                                            style={styles.coverImage} 
                                            contentFit="cover"
                                            transition={200}
                                        />
                                    )}
                                </Animated.View>
                             </Animated.View>
                        )}
                        
                        {isExpanded && (
                            <Animated.View entering={FadeIn.duration(150).delay(50)} exiting={FadeOut.duration(100)} style={styles.info}>
                                <View style={styles.marqueeContainer}>
                                    <TextTicker
                                        key={currentSong?.id}
                                        style={[styles.title, { color: isDark ? '#fff' : '#000' }]} 
                                        duration={12000}
                                        loop
                                        bounce={false}
                                        repeatSpacer={50}
                                        marqueeDelay={1000}
                                        animationType="scroll"
                                    >
                                        {currentSong?.title}
                                    </TextTicker>
                                </View>
                                <Text style={[styles.artist, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]} numberOfLines={1}>
                                    {currentSong?.artist}
                                    {currentSong?.director && currentSong?.director !== currentSong?.artist && ` • Dir. ${currentSong.director}`}
                                </Text>
                            </Animated.View>
                        )}

                        {!isExpanded && (
                            <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)} style={styles.smallControlsOverlay}>
                                {/* Tiny Metadata for Pill */}
                                <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
                                    <View style={{ height: 20, justifyContent: 'center', width: '100%' }}>
                                        <TextTicker
                                            style={[styles.title, { fontSize: 13, color: isDark ? '#fff' : '#000' }]} 
                                            duration={10000}
                                            loop
                                            bounce={false}
                                            repeatSpacer={50}
                                            marqueeDelay={1000}
                                            animationType="scroll"
                                        >
                                           {currentSong?.title}
                                        </TextTicker>
                                    </View>
                                    <Text style={[styles.artist, { fontSize: 10, color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]} numberOfLines={1}>
                                       {currentSong?.artist}
                                       {currentSong?.director && currentSong?.director !== currentSong?.artist && ` • Dir. ${currentSong.director}`}
                                    </Text>
                                </View>
                            </Animated.View>
                        )}
                    </TouchableOpacity>

                    {isExpanded ? (
                        <View style={styles.controls}>
                            <TouchableOpacity 
                                onPress={() => setShowPlaylistModal(true)} 
                                style={styles.iconButton}
                            >
                                <Ionicons name="heart-outline" size={22} color={isDark ? '#fff' : '#000'} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={togglePlayPause} 
                                style={[styles.playButton, { backgroundColor: colors.primary }]}
                            >
                                <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={next} 
                                style={styles.iconButton}
                            >
                                <Ionicons name="play-skip-forward" size={24} color={isDark ? '#fff' : '#000'} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity 
                            onPress={handlePlayPauseSmall} 
                            style={[
                                styles.smallPlayButton, 
                                { backgroundColor: '#FF4500', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1 } // Orange Button
                            ]} 
                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        >
                            <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Bottom Progress Bar (Inside Glass) */}
                <MiniProgressBar position={position} duration={duration} color={'#FF4500'} />
             </View>

    </Animated.View>

    <AddToPlaylistModal 
        visible={showPlaylistModal} 
        onClose={() => setShowPlaylistModal(false)} 
        song={currentSong} 
    />
    </>
  );
}

const MiniProgressBar = React.memo(({ position, duration, color }: { position: number, duration: number, color: string }) => {
  const progress = duration > 0 ? (position / duration) : 0;
  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)} style={styles.progressContainer}>
      <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50, 
    elevation: 8,
    zIndex: 100,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 30,
    overflow: 'hidden',
    padding: 2, // <--- REVEALS THE ROTATING GRADIENT AS A BORDER
  },
  rotatingGradientContainer: {
    position: 'absolute',
    top: '-50%',
    left: '-25%',
    width: '150%', 
    height: '200%',
    zIndex: -1,
  },
  gradientFill: {
      width: '100%',
      height: '100%',
  },
  containerExpanded: {
    left: 16,
    right: 16,
    height: 80,
    borderRadius: 40, // Fully rounded ends
  },
  containerSmall: {
    alignSelf: 'center', 
    width: 175, // Compact "Island" size
    height: 60, // Compact height
    borderRadius: 30, // Full pill match
  },
  innerContainer: {
    flex: 1,
    overflow: 'hidden',
    zIndex: 5, 
    justifyContent: 'center', // Center content vertically
  },
  progressContainer: {
    position: 'absolute',
    top: 2,
    left:0, 
    right: 0,
    height: 5, // Thinner, sleek top bar
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginTop: 0, // Flush with top edge
  },
  progressFill: {
    height: 3,
    borderRadius: 1.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'space-between', 
    zIndex: 10, // Ensure content captures touches
  },
  contentSmall: {
    paddingHorizontal: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  artworkInfoArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  // Large Artwork
  artworkLargeWrapper: {
      justifyContent: 'center',
      alignItems: 'center',
  },
  artworkLarge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#333',
    overflow: 'hidden',
  },
  // Small Artwork (Vinyl)
  artworkSmallWrapper: {
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
  },
  artworkSmall: {
    width: 40, 
    height: 40,
    borderRadius: 20, 
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  smallControlsOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    flex: 1, 
    justifyContent: 'center', 
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  marqueeContainer: {
    width: '100%',
    height: 24, // Tighter height
    justifyContent: 'center',
    overflow: 'hidden',
  },
  title: {
    fontFamily: 'Kanit_700Bold',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  artist: {
    fontFamily: 'Kanit_400Regular',
    fontSize: 11,
    opacity: 0.8,
    textTransform: 'capitalize',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 4,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    zIndex: 20, // Ensure clickable above everything
  },
  iconButton: {
    padding: 6,
  },
  timePill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 0, 
      justifyContent: 'center',
  },
  timeText: {
      fontFamily: 'Kanit_600SemiBold', 
      fontSize: 11, 
      fontVariant: ['tabular-nums'], 
  },
});
