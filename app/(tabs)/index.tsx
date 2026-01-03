import MusicDirectorCard from '@/components/MusicDirectorCard';
import { usePlayer } from '@/components/PlayerContext';
import SettingsModal from '@/components/SettingsModal';
import { useTheme } from '@/components/ThemeContext';
import { AVATARS, DEFAULT_AVATAR } from '@/constants/avatars';
import { Fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import Animated, {
    Easing,
    Extrapolate,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedIcon = ({ name, color, size = 24, isDark }: { name: keyof typeof Ionicons.glyphMap, color: string, size?: number, isDark: boolean }) => {
    // Shared Values for various animation drivers
    const svMain = useSharedValue(0);  // Main rotation/movement
    const svPulse = useSharedValue(0); // Secondary pulse/glow
    const svExtra = useSharedValue(0); // Extra elements (stars/clouds)

    useEffect(() => {
        svMain.value = 0;
        svPulse.value = 0;
        svExtra.value = 0;
        
        if (name === 'sunny') {
            // SUN: Constant spin + Deep pulse
            svMain.value = withRepeat(withTiming(1, { duration: 12000, easing: Easing.linear }), -1);
            svPulse.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }), -1, true);
        } else if (name === 'moon') {
            // MOON: Gentle rock + Star twinkle
            svMain.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.quad) }),
                    withTiming(-1, { duration: 2500, easing: Easing.inOut(Easing.quad) })
                ), -1, true
            );
            svExtra.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear }), -1, true);
        } else if (name === 'cloud') {
             // CLOUD: Floating + Parallax puff
             svMain.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true);
             svExtra.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }), -1, true);
        }
    }, [name]);

    // Styles
    const styleMain = useAnimatedStyle(() => {
        if (name === 'sunny') {
            return { transform: [{ rotate: `${svMain.value * 360}deg` }] };
        } else if (name === 'moon') {
            return { transform: [{ rotate: `${svMain.value * 15}deg` }] };
        } else if (name === 'cloud') {
            return { transform: [{ translateX: svMain.value * 5 }] };
        }
        return {};
    });

    const styleGlow = useAnimatedStyle(() => {
        if (name === 'sunny') {
            return { 
                opacity: 0.3 + svPulse.value * 0.3, 
                transform: [{ scale: 1 + svPulse.value * 0.3 }] 
            };
        }
        return { opacity: 0 };
    });

    const styleExtra = useAnimatedStyle(() => {
        if (name === 'moon') {
            // Twinkling Star
            return { 
                opacity: svExtra.value, 
                transform: [{ scale: 0.5 + svExtra.value * 0.5 }] 
            };
        } else if (name === 'cloud') {
            // Secondary Cloud Moving Opposite
            return { transform: [{ translateX: svExtra.value * -10 }, { scale: 0.6 }] };
        }
        return { opacity: 0 };
    });

    // Determine specific colors for visibility
    let iconColor = color;
    let extraColor = color;

    if (name === 'sunny') {
        iconColor = '#F59E0B'; // Amber-500
    } else if (name === 'moon') {
        iconColor = isDark ? '#FEF3C7' : '#475569'; // Light Yellow vs Slate-600
    } else if (name === 'cloud') {
        iconColor = isDark ? '#E2E8F0' : '#64748B'; // Slate-200 vs Slate-500
        extraColor = isDark ? '#94A3B8' : '#94A3B8';
    }

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            {/* Layer 0: Background Glow/Extra */}
            {name === 'sunny' && (
                <Animated.View style={[StyleSheet.absoluteFill, styleGlow, { justifyContent: 'center', alignItems: 'center' }]}>
                    <View style={{ width: size * 0.6, height: size * 0.6, borderRadius: size, backgroundColor: iconColor, opacity: 0.5 }} />
                </Animated.View>
            )}
            
            {/* Layer 1: Extra Elements (Stars, Small Clouds) */}
            {name === 'moon' && (
                <Animated.View style={[StyleSheet.absoluteFill, styleExtra, { top: -2, right: -2 }]}>
                    <Ionicons name="star" size={size * 0.4} color="#FFD700" />
                </Animated.View>
            )}
            {name === 'cloud' && (
                 <Animated.View style={[StyleSheet.absoluteFill, styleExtra, { top: 4, left: -4, opacity: 0.6 }]}>
                    <Ionicons name="cloud" size={size * 0.7} color={extraColor} />
                </Animated.View>
            )}

            {/* Layer 2: Main Icon */}
            <Animated.View style={styleMain}>
                <Ionicons name={name} size={size} color={iconColor} />
            </Animated.View>
        </View>
    );
};

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const { directorCards, play, currentSong } = usePlayer();
  const { colors, isDark } = useTheme(); // Added isDark
  const router = useRouter();
  
  /* Greeting Logic - Switched to Icons as Lottie files were duplicates */
  const [greeting, setGreeting] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [userName, setUserName] = useState('Joe');
  const [avatarId, setAvatarId] = useState('1');
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [greetingIcon, setGreetingIcon] = useState<keyof typeof Ionicons.glyphMap>('sunny');

  useEffect(() => {
    const updateTime = () => {
        const now = new Date();
        const hour = now.getHours();
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
        setDateStr(now.toLocaleDateString('en-US', options).toUpperCase());

        if (hour < 12) {
            setGreeting('Good Morning');
            setGreetingIcon('sunny');
        } else if (hour < 17) {
            setGreeting('Good Afternoon');
            setGreetingIcon('cloud');
        } else if (hour < 21) {
            setGreeting('Good Evening');
            setGreetingIcon('moon'); // Or 'cloudy-night' if available
        } else {
            setGreeting('Good Night');
            setGreetingIcon('moon');
        }
    };

    updateTime(); // Run immediately
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    useCallback(() => {
        const loadProfile = async () => {
            try {
                const savedName = await AsyncStorage.getItem('user_name');
                const savedAvatar = await AsyncStorage.getItem('user_avatar');
                if (savedName) setUserName(savedName);
                if (savedAvatar) setAvatarId(savedAvatar);
            } catch (e) { console.log('Failed to load profile'); }
        };
        loadProfile();
    }, [])
  );

  const renderItem = ({ item }: { item: any }) => (
    <MusicDirectorCard 
      card={item} 
      onPress={(song) => play(song)}
      activeSongId={currentSong?.id}
    />
  );

  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  // Smooth fade/scroll effect for content
  const contentStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [0, 100],
        [1, 0],
        Extrapolate.CLAMP
      ),
    };
  });
  
  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
            
            {/* 1. Fixed Sticky Header - Pushed down to clear Floating Navbar */}
            <View style={[styles.header, { paddingTop: 110, height: 280, backgroundColor: 'transparent' }]}>
                
                {/* Row 1: Top Bar (Avatar, Greeting & Settings) */}
                <View style={styles.topRow}>
                     <TouchableOpacity 
                        onPress={() => router.push('/profile')}
                        style={[styles.avatarContainer, { borderColor: colors.primary }]}
                    >
                        <Image 
                            source={AVATARS[avatarId] || DEFAULT_AVATAR} 
                            style={styles.avatarImage}
                        />
                    </TouchableOpacity>

                    <View style={{ flex: 1, paddingHorizontal: 12, justifyContent: 'center' }}>
                         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                             <Text style={[styles.greetingText, { color: colors.text, fontSize: 22 }]} numberOfLines={1}>
                                 {greeting}
                             </Text>
                             <AnimatedIcon 
                                name={greetingIcon} 
                                size={24} 
                                color={colors.primary}
                                isDark={isDark}
                             />
                         </View>
                         <Text style={[styles.userNameText, { color: isDark ? '#00E4FF' : colors.primary, fontSize: 22, lineHeight: 26 }]} numberOfLines={1}>
                             {userName}
                         </Text>
                    </View>

                    <TouchableOpacity 
                        style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                        onPress={() => setIsSettingsVisible(true)}
                    >
                        <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Date Row */}
                <View style={styles.greetingRow}>
                    <Animatable.Text 
                        animation="fadeIn" 
                        delay={400}
                        style={[styles.dateText, { color: colors.primary, marginLeft: 64 }]}
                    >
                        {dateStr}
                    </Animatable.Text>
                </View>

            </View>

            {/* 2. Clipping Zone for Content - Adjusted margin for taller header */}
            <View style={{ flex: 1, marginTop: 210, overflow: 'hidden' }}>
                <Animated.FlatList
                    data={directorCards}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={5}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
                    scrollEventThrottle={16}
                    removeClippedSubviews={Platform.OS === 'android'}
                    // Optional: Wrap first item in animated view if needed, 
                    // or apply fade to list container, but fade works best on specific header elements.
                    // For now, applying simple clipping behavior as requested.
                />
            </View>
            
            <SettingsModal visible={isSettingsVisible} onClose={() => setIsSettingsVisible(false)} />
        </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  auroraContainer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: -1,
  },
  auroraBlob1: {
      position: 'absolute',
      top: -height * 0.2,
      left: -width * 0.2,
      width: width * 0.8,
      height: width * 0.8,
      borderRadius: width,
  },
  auroraBlob2: {
      position: 'absolute',
      top: 10,
      right: -width * 0.2,
      width: width * 0.9,
      height: width * 0.9,
      borderRadius: width,
  },
  auroraBlob3: {
      position: 'absolute',
      bottom: -height * 0.2,
      left: 0,
      width: width,
      height: width,
      borderRadius: width,
      opacity: 0.5,
  },
  listContent: {
    paddingBottom: 150,
    paddingTop: 0,
  },
  header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      paddingHorizontal: 24,
      paddingBottom: 15,
      // Removed justifyContent: 'flex-end' to allow manual spacing
      flexDirection: 'column',
  },
  topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 0,
  },
  greetingRow: {
      marginTop: -4,
  },
  iconButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
  },
  headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
      gap: 16,
  },
  headerTextContainer: {
      flex: 1,
      justifyContent: 'center',
  },
  greetingWrapper: {
      marginBottom: 4,
  },
  greetingText: {
      fontFamily: Fonts.kanitSemiBold,
      fontSize: 20, 
      letterSpacing: -0.2,
      opacity: 0.9,
  },
  userNameText: {
      marginTop: 2,
      fontFamily: Fonts.kanitBold,
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: 0.4,
  },
  dateText: {
      fontFamily: Fonts.montserratSemiBold,
      fontSize: 11,
      letterSpacing: 1,
      opacity: 0.8,
      marginTop: 5,
      textTransform: 'uppercase',
  },
  avatarContainer: {
      width: 58,
      height: 58,
      borderRadius: 22,
      borderWidth: 2,
      overflow: 'hidden',
  },
  avatarImage: {
      width: '100%',
      height: '100%',
  },
  searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
  },
  searchText: {
      fontFamily: Fonts.montserrat,
      fontSize: 14,
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      padding: 24,
  },
  modalContent: {
      padding: 24,
      borderRadius: 24,
      borderWidth: 1,
  },
  modalTitle: {
      fontFamily: Fonts.kanitBold,
      fontSize: 20,
      marginBottom: 16,
      textAlign: 'center',
  },
  input: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      fontFamily: Fonts.montserrat,
      marginBottom: 20,
  },
  modalButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
  },
  modalBtn: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 12,
  }
});
