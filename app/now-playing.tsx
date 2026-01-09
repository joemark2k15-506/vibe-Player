import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
// Removed react-native-animatable to fix performance lag
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    FadeInLeft,
    FadeInUp,
    ZoomIn,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TextTicker from 'react-native-text-ticker';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import ParallaxAlbumArt from '../components/ParallaxAlbumArt';
import { usePlayer } from '../components/PlayerContext';
import QueueModal from '../components/QueueModal';
import { useTheme } from '../components/ThemeContext';
import { useImageColors } from '../hooks/useImageColors';

const { width, height } = Dimensions.get('window');

const formatTime = (millis: number) => {
  if (!millis) return '0:00';
  const minutes = Math.floor(millis / 60000);
  const seconds = Math.floor((millis % 60000) / 1000);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

// EQ Presets
const EQ_PRESETS = [
  { id: 'normal', name: 'Normal', icon: 'musical-note', values: [0, 0, 0] },
  { id: 'bass-boost', name: 'Bass Boost', icon: 'pulse', values: [8, 0, -2] },
  { id: 'treble', name: 'Treble', icon: 'trending-up', values: [-2, 0, 8] },
  { id: 'vocal', name: 'Vocal', icon: 'mic', values: [-2, 6, 2] },
  { id: 'acoustic', name: 'Acoustic', icon: 'radio', values: [4, 2, 4] },
  { id: 'electronic', name: 'Electronic', icon: 'flash', values: [6, 0, 6] },
  { id: 'rock', name: 'Rock', icon: 'planet', values: [6, -2, 5] },
  { id: 'jazz', name: 'Jazz', icon: 'musical-notes', values: [3, 0, 4] },
];

export default function NowPlayingScreen() {
  const { currentSong, isPlaying, duration, position, positionShared, togglePlayPause, next, prev, seek, songs, likedSongs, toggleLike, isShuffle, toggleShuffle, repeatMode, toggleRepeat } = usePlayer();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  

  const [imageError, setImageError] = useState(false);
  const [dominantColor, setDominantColor] = useState<string>(isDark ? '#1a0f28' : '#e2e8f0');

  // Dynamic Colors Hook
  const { colors: imageColors } = useImageColors(currentSong?.coverUri || currentSong?.artworkUri);
  // Use extracted color or fallback to theme primary
  // Use extracted color or fallback to theme primary
  // Use extracted color or fallback to theme primary
  const dynamicPrimary = imageColors?.primary || colors.primary;
  
  // Dynamic Background: Now trusted to be correct from useImageColors (which handles Light/Dark logic)
  const dynamicBackground = imageColors?.background || (isDark ? '#1a0f28' : '#F2F2F7');

  useEffect(() => {
    setImageError(false);
    if (imageColors?.background) {
        setDominantColor(imageColors.background);
    }
  }, [currentSong?.id, imageColors]);

  const [showEQModal, setShowEQModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [selectedEQ, setSelectedEQ] = useState('normal');
  const [customEQ, setCustomEQ] = useState([0, 0, 0]); 
  const [eqEnabled, setEqEnabled] = useState(true);
  
  const isLiked = currentSong ? likedSongs.includes(currentSong.id) : false;

  // Heart Animation
  const heartScale = useSharedValue(1);

  // Rotation animation value
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Optimization: Disable expensive continuous rotation on Android
    if (Platform.OS === 'ios') {
        rotation.value = withRepeat(
          withTiming(360, { duration: 20000, easing: Easing.linear }),
          -1
        );
    }
    // Android stays static properties or just simple transition if needed, but 0 is fine for background
    return () => {
        cancelAnimation(rotation);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps 

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });
  
  const heartAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: heartScale.value }]
    };
  });

  const handleSlidingComplete = async (value: number) => {
    await seek(value);
  };



  const openEQModal = () => setShowEQModal(true);
  const closeEQModal = () => setShowEQModal(false);

  const selectEQPreset = (presetId: string) => {
    setSelectedEQ(presetId);
    const preset = EQ_PRESETS.find(p => p.id === presetId);
    if (preset) setCustomEQ(preset.values);
  };

  const updateEQBand = (index: number, value: number) => {
    const newEQ = [...customEQ];
    newEQ[index] = value;
    setCustomEQ(newEQ);
    setSelectedEQ('custom');
  };

  const toggleEQ = () => setEqEnabled(!eqEnabled);
  
  const handleHeartPress = () => {
      console.log("[NowPlaying] Heart pressed - opening playlist modal");
      // "Next Level" Animation: Pop + Wiggle
      heartScale.value = withSequence(
          withSpring(1.5, { damping: 10, stiffness: 200 }),
          withTiming(0.8, { duration: 100 }),
          withSpring(1.2, { damping: 10 }),
          withSpring(1)
      );
      setShowPlaylistModal(true);
  };

  if (!currentSong) {
      return (
          <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
              <Text style={[styles.text, { color: colors.text }]}>No song playing</Text>
          </View>
      )
  }

  // Dynamic Background Gradient
  // Use dominant color to generate a gradient
  // Lighten/Darken it or mix with black
  const bgGradientColors = isDark 
    ? [`${dynamicBackground}CC`, `${dynamicBackground}AA`, `${dynamicBackground}FF`] 
    : [`${dynamicBackground}CC`, `${dynamicBackground}AA`, `${dynamicBackground}`]; // Use dynamic color in Light Mode too

  return (
    <View style={[styles.container, { backgroundColor: dynamicBackground }]}>
      <StatusBar style="light" animated translucent backgroundColor="transparent" />
      
      {/* Dynamic Blurred Background */}
      {(currentSong.coverUri || currentSong.artworkUri) && (
        <Image
          key={currentSong.id}
          source={{ uri: currentSong.coverUri || currentSong.artworkUri }}
          style={StyleSheet.absoluteFillObject}
          blurRadius={Platform.OS === 'android' ? 12 : 40} 
        />
      )}

      {/* Overlay Gradient for Readability - ALWAYS DARK for Immersive White Text */}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']} 
        style={StyleSheet.absoluteFillObject}
      />

      <LinearGradient
        colors={bgGradientColors as any} // Cast to any to accept dynamic colors if types are strict
        style={[styles.gradient, { paddingTop: insets.top + 10 }]}
      >
        {/* Header */}
        <Animated.View 
          entering={FadeInDown.duration(600)}
          style={styles.header}
        >
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
               <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: "rgba(255,255,255,0.7)" }]}>VIBING NOW 🎵</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={() => setShowPlaylistModal(true)} style={styles.eqButton}>
                  <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowQueueModal(true)} style={styles.eqButton}>
                  <Ionicons name="list" size={24} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={openEQModal} style={styles.eqButton}>
                  <Ionicons name="options-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>
        </Animated.View>

        {/* Artwork Section with Rotating Gradient Border and Parallax 3D Effect */}
        <Animated.View 
          entering={ZoomIn.duration(800).delay(200)}
          style={styles.artworkWrapper}
        >
          {/* 1. Large Rotating Background (The Moving Colors) */}
          <Animated.View style={[styles.rotatingBackground, animatedStyle]}>
             <LinearGradient
                // Neon Cyber Palette: Hot Pink, Purple, Cyan, Orange, Hot Pink
                // In Light Mode: Use softer pastels or keep neon but add opacity
                colors={isDark 
                    ? [imageColors?.primary || '#FF0099', imageColors?.secondary || '#BD00FF', '#00DBDE', imageColors?.detail || '#FF4E00', imageColors?.primary || '#FF0099']
                    : [imageColors?.primary || '#FF0099', imageColors?.secondary || '#BD00FF', '#00DBDE', imageColors?.detail || '#FF4E00', imageColors?.primary || '#FF0099'] // Keep neon pop even in light mode, it's the brand
                } 
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={[styles.gradientFill, !isDark && { opacity: 0.8 }]}
             />
          </Animated.View>

          {/* 2. Parallax 3D Card (Replaces static inner card) */}
          <View style={{ width: '96%', height: '96%', zIndex: 10, borderRadius: 24, overflow: 'hidden' }}>
             <ParallaxAlbumArt uri={currentSong.coverUri || currentSong.artworkUri} size={width * 0.82} />
          </View>
        </Animated.View>

        {/* Info Area */}
        <Animated.View 
          entering={FadeInLeft.duration(600).delay(400)}
          style={styles.infoArea}
        >
            {/* Up Next Pill */}
            {(() => {
                const currentIndex = songs.findIndex(s => s.id === currentSong.id);
                const nextSong = songs[currentIndex + 1];
                if (nextSong) {
                    return (
                        <TouchableOpacity onPress={() => setShowQueueModal(true)} style={[styles.upNextPill, { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255,255,255,0.05)' }]}>
                            <Text style={styles.upNextLabel}>UP NEXT</Text>
                            <Text style={[styles.upNextTitle, { color: '#FFFFFF' }]} numberOfLines={1}>{nextSong.title}</Text>
                        </TouchableOpacity>
                    );
                }
                return (
                     <TouchableOpacity onPress={() => setShowQueueModal(true)} style={[styles.upNextPill, { opacity: 0.5 }]}>
                        <Text style={styles.upNextLabel}>QUEUE</Text>
                        <Text style={styles.upNextTitle} numberOfLines={1}>End of Playlist</Text>
                    </TouchableOpacity>
                );
            })()}

            <View style={styles.songInfo}>
              <View style={styles.songTextContainer}>
                <View style={styles.marqueeContainer}>
                  <TextTicker
                    key={currentSong.id}
                    style={[styles.songTitle, { color: '#FFFFFF' }]}
                    duration={15000}
                    loop
                    bounce={false}
                    repeatSpacer={80}
                    marqueeDelay={2000}
                    animationType="scroll"
                  >
                    {currentSong.title}
                  </TextTicker>
                </View>
                
                {(!currentSong.artist || currentSong.artist === '<unknown>' || currentSong.artist === 'Unknown Artist') && currentSong.director ? (
                     <Text style={[styles.songArtist, { color: colors.primary, fontWeight: '700' }]} numberOfLines={1}>
                        Dir. {currentSong.director}
                     </Text>
                ) : (
                    <>
                        <Text style={[styles.songArtist, { color: "rgba(255,255,255,0.8)" }]} numberOfLines={1}>{currentSong.artist || 'Unknown Artist'}</Text>
                        {/* Only show director if it's different from the Artist name to avoid duplication */}
                        {currentSong.director && currentSong.director !== currentSong.artist && (
                        <Text style={[styles.songDirector, { color: colors.primary }]} numberOfLines={1}>
                            Dir. {currentSong.director}
                        </Text>
                        )}
                    </>
                )}
              </View>

    

              <TouchableOpacity 
                style={styles.heartButton}
                onPress={handleHeartPress}
                activeOpacity={0.7}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Animated.View style={heartAnimatedStyle}>
                  <Ionicons 
                    name="heart-outline" 
                    size={30} 
                    color={colors.primary} 
                  />
                </Animated.View>
              </TouchableOpacity>
            </View>
        </Animated.View>

        {/* Progress Section */}
        <Animated.View 
          entering={FadeIn.duration(600).delay(500)}
          style={styles.progressSection}
        >
            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarBackground, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                    <ProgressBarFill positionShared={positionShared} duration={duration} />
                </View>
                <Slider
                    style={styles.sliderOverlay}
                    minimumValue={0}
                    maximumValue={duration}
                    value={position}
                    minimumTrackTintColor="transparent"
                    maximumTrackTintColor="transparent"
                    thumbTintColor="transparent"
                    onSlidingComplete={handleSlidingComplete}
                />
            </View>
            <View style={styles.timeLabels}>
                <Text style={[styles.timeText, { color: "rgba(255,255,255,0.7)" }]}>{formatTime(position)}</Text>
                <Text style={[styles.timeText, { color: "rgba(255,255,255,0.7)" }]}>{formatTime(duration)}</Text>
            </View>
        </Animated.View>

        {/* Playback Controls */}
        <Animated.View 
          entering={FadeInUp.duration(700).delay(600)}
          style={styles.controlsRow}
        >
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={toggleShuffle}
            >
              <Ionicons 
                name={isShuffle ? "shuffle" : "shuffle-outline"} 
                size={24} 
                color={isShuffle ? "#FF4E00" : "#FFFFFF"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={prev} style={styles.subControl}>
                 <Ionicons name="play-skip-back" size={36} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity 
                onPress={togglePlayPause}
                style={[styles.mainPlayButton, { backgroundColor: colors.secondary, shadowColor: colors.secondary }]}
            >
                {/* Visualizer behind the button */}
                <View style={styles.visualizerContainer}>
                   {/* <LiquidVisualizer 
                      color={dynamicPrimary} 
                      isPlaying={isPlaying} 
                      size={140} 
                   /> */}
                </View>

                <View // Replaced Animatable pulse with standard view for stability, can add reanimated pulse later
                >
                  <Ionicons 
                      name={isPlaying ? "pause" : "play"} 
                      size={44} 
                      color="white" 
                      style={{ marginLeft: isPlaying ? 0 : 4 }}
                  />
                </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={next} style={styles.subControl}>
                <Ionicons name="play-skip-forward" size={36} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButton}
              onPress={toggleRepeat}
            >
              <Ionicons 
                name={repeatMode === 'one' ? "repeat-outline" : "repeat"} 
                size={24} 
                 color={repeatMode !== 'off' ? "#FF4E00" : "#FFFFFF"} 
              />
              {repeatMode === 'one' && (
                <View style={styles.repeatBadge}>
                  <Text style={styles.repeatBadgeText}>1</Text>
                </View>
              )}
            </TouchableOpacity>
        </Animated.View>

      </LinearGradient>

      {/* EQ Modal */}
      <Modal
        visible={showEQModal}
        transparent
        animationType="fade"
        onRequestClose={closeEQModal}
        statusBarTranslucent={true}
      >
        <View style={styles.eqModalOverlay}>
          {/* Background overlay to close modal on tap */}
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={closeEQModal} 
          />
          
          <View style={[styles.eqModalContent, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}>
              <View style={styles.eqBlur}>
                  <View style={styles.eqHeader}>
                      <Text style={[styles.eqTitle, { color: colors.text }]}>Equalizer</Text>
                      <View style={[styles.toggleContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>ON</Text>
                        <Switch
                            value={eqEnabled}
                            onValueChange={toggleEQ}
                            trackColor={{ false: '#D1D5DB', true: colors.primary }}
                            thumbColor="#fff"
                            ios_backgroundColor="#D1D5DB"
                        />
                      </View>
                      <TouchableOpacity style={styles.closeButton} onPress={closeEQModal}>
                          <Ionicons name="close" size={28} color={colors.text} />
                      </TouchableOpacity>
                  </View>

                  <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.presetsScroll}
                      contentContainerStyle={styles.presetsScrollContent}
                  >
                      {EQ_PRESETS.map((preset) => (
                      <TouchableOpacity
                          key={preset.id}
                          style={[
                          styles.presetChip,
                          { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', borderColor: colors.border },
                          selectedEQ === preset.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                          ]}
                          onPress={() => selectEQPreset(preset.id)}
                      >
                          <Text style={[
                          styles.presetChipText,
                          { color: colors.textSecondary },
                          selectedEQ === preset.id && { color: '#fff' }
                          ]}>
                          {preset.name}
                          </Text>
                      </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                      style={[
                          styles.presetChip,
                          { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', borderColor: colors.border },
                          selectedEQ === 'custom' && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      >
                      <Text style={[
                          styles.presetChipText,
                          { color: colors.textSecondary },
                          selectedEQ === 'custom' && { color: '#fff' }
                      ]}>
                          Custom
                      </Text>
                      </TouchableOpacity>
                  </ScrollView>

                  <View style={styles.eqSlidersContainer}>
                      <View style={styles.dbScale}>
                      <Text style={[styles.dbScaleText, { color: colors.textSecondary }]}>+15db</Text>
                      <Text style={[styles.dbScaleText, { color: colors.textSecondary }]}>0db</Text>
                      <Text style={[styles.dbScaleText, { color: colors.textSecondary }]}>−15db</Text>
                      </View>
                      <View style={styles.slidersArea}>
                      {['LOW', 'MID', 'HIGH'].map((label, index) => (
                          <View key={index} style={styles.sliderContainer}>
                          <View style={styles.sliderTrack}>
                              <Slider
                              style={styles.verticalEQSlider}
                              minimumValue={-15}
                              maximumValue={15}
                              value={customEQ[index]}
                              minimumTrackTintColor="transparent"
                              maximumTrackTintColor="transparent"
                              thumbTintColor={colors.primary}
                              onValueChange={(value) => updateEQBand(index, value)}
                              vertical
                              disabled={!eqEnabled}
                              />
                              <View style={[styles.centerLine, { backgroundColor: colors.border }]} />
                              <View style={[styles.trackBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
                          </View>
                          <Text style={[styles.frequencyText, { color: colors.text }]}>{label}</Text>
                          </View>
                      ))}
                      </View>
                  </View>
              </View>
          </View>
        </View>
      </Modal>

      <AddToPlaylistModal 
        visible={showPlaylistModal} 
        onClose={() => setShowPlaylistModal(false)}
        song={currentSong} 
      />

       <QueueModal 
        visible={showQueueModal} 
        onClose={() => setShowQueueModal(false)} 
      />
    </View>
  );
}

const ProgressBarFill = React.memo(({ positionShared, duration }: { positionShared: any, duration: number }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = duration > 0 ? (positionShared.value / duration) : 0;
    return {
      width: `${Math.min(1, Math.max(0, progress)) * 100}%`,
    };
  });

  return (
    <Animated.View style={[styles.progressBarFill, animatedStyle]}>
        <LinearGradient
            colors={['#FF4E00', '#BD00FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
        />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    zIndex: 1000,
    elevation: 20,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
    height: 60,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 4,
  },
  eqButton: {
    padding: 8,
  },
  // New Artwork Architecture
  artworkWrapper: {
    width: width * 0.85,
    height: width * 0.85,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    borderRadius: 28, // Outer rounded corners
    overflow: 'hidden', // Clips the rotating background
    position: 'relative',
    borderWidth: 1, 
    borderColor: 'rgba(120,120,120,0.2)', // Subtle rim adaptive (works for both usually)
  },
  rotatingBackground: {
    position: 'absolute',
    width: '150%', // Much larger than container
    height: '150%',
    top: '-25%',
    left: '-25%',
    zIndex: -1,
  },
  gradientFill: {
    width: '100%',
    height: '100%',
  },
  artworkInner: {
    width: '96%', // Slightly more space for the rotating border
    height: '96%',
    borderRadius: 24,
    zIndex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000', // Black background for contain fallback
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoArea: { width: '100%', marginBottom: 5 },
  upNextPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 20,
      marginBottom: 20,
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
  },
  upNextLabel: {
      color: '#BD00FF',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
      marginRight: 8,
  },
  upNextTitle: {
      color: '#FFFFFF', 
      fontSize: 12,
      fontFamily: 'Kanit_600SemiBold', 
      fontWeight: '600',
      maxWidth: 150,
      textTransform: 'capitalize', // First letter caps
  },
  songInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  songTextContainer: { flex: 1, marginRight: 15 },
  marqueeContainer: { width: '100%', height: 36, marginBottom: 4, overflow: 'hidden' },
  songTitle: { 
    fontFamily: 'Kanit_700Bold', 
    fontSize: 22, 
    letterSpacing: -0.5,
    textTransform: 'capitalize',
  },
  songArtist: { 
    fontFamily: 'Kanit_400Regular',
    fontSize: 16, 
    textTransform: 'capitalize',
  },
  songDirector: { 
    fontFamily: 'Kanit_400Regular',
    fontSize: 14, 
    marginTop: 4, 
    letterSpacing: 0.5,
    textTransform: 'capitalize',
    fontWeight: '700'
  },
  heartButton: { padding: 8 },
  progressSection: { width: '100%', marginTop: 20, marginBottom: 10 },
  progressBarContainer: { width: '100%', height: 40, justifyContent: 'center', position: 'relative' },
  progressBarBackground: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  sliderOverlay: { position: 'absolute', width: '100%', height: 40, top: 0 },
  timeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -8 },
  timeText: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', width: '100%', marginTop: 20 },
  mainPlayButton: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  subControl: { padding: 12 },
  controlButton: { padding: 12, position: 'relative' },
  repeatBadge: { position: 'absolute', top: 8, right: 8, width: 14, height: 14, backgroundColor: '#FF4E00', borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff' },
  repeatBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  text: {},
  // EQ Modal Styles
  eqModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.85)', // Keep dark overlay even in light mode for focus, or make it dynamic
    padding: 24 
  },
  eqModalContent: { 
    width: Math.min(width * 0.9, 500), 
    borderRadius: 32, 
    overflow: 'hidden', 
    paddingBottom: 20 
  },
  eqBlur: { padding: 24 },
  closeButton: { padding: 8 },
  eqHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 30, 
    marginTop: 8,
    width: '100%',
    paddingRight: 10
  },
  eqTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  toggleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  toggleLabel: { fontSize: 13, fontWeight: '700' },
  presetsScroll: { marginBottom: 32 },
  presetsScrollContent: { gap: 10, paddingRight: 20 },
  presetChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, borderWidth: 1 },
  presetChipText: { fontSize: 14, fontWeight: '600' },
  eqSlidersContainer: { flexDirection: 'row', alignItems: 'stretch', height: 200 },
  dbScale: { justifyContent: 'space-between', paddingVertical: 0, marginRight: 10, width: 40 },
  dbScaleText: { fontSize: 12, fontWeight: '600', textAlign: 'right' },
  slidersArea: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  sliderContainer: { alignItems: 'center', flex: 1 },
  sliderTrack: { flex: 1, width: 60, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  trackBg: { position: 'absolute', width: 6, height: '100%', borderRadius: 3, zIndex: -2 },
  centerLine: { position: 'absolute', width: 16, height: 2, zIndex: -1 },
  verticalEQSlider: { width: 200, height: 40, transform: [{ rotate: '-90deg' }] },
  frequencyText: { fontSize: 14, fontWeight: '700', marginTop: 12 },
  visualizerContainer: {
    position: 'absolute',
    top: -30,
    left: -30,
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
  },
});
