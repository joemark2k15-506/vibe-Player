import { useTheme } from '@/components/ThemeContext';
import { AVATARS, DEFAULT_AVATAR } from '@/constants/avatars';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Extrapolate, FadeInDown, FadeInRight, interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// --- Mock Data & Component Configuration ---
interface ServiceCardProps {
    name: string;
    icon: any;
    // Fix: Explicitly type compatible with LinearGradient
    color: readonly [string, string, ...string[]]; 
    isConnected: boolean;
    onConnect: () => void;
    stats?: { label: string; value: string }[];
    isDark: boolean; // Pass theme mode
}

const ServiceCard = ({ name, icon, color, isConnected, onConnect, stats, isDark }: ServiceCardProps) => {
    const scale = useSharedValue(1);
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => { scale.value = withSpring(0.98); };
    const handlePressOut = () => { scale.value = withSpring(1); };

    // Dynamic styles for Light/Dark
    const disconnectedColors: readonly [string, string, ...string[]] = isDark 
        ? ['#333', '#111'] 
        : ['#F0F0F0', '#FFFFFF'];
    
    const textColor = isConnected ? '#fff' : (isDark ? '#fff' : '#000');
    // Fix: Darker text for light mode
    const subTextColor = isConnected ? 'rgba(255,255,255,0.7)' : (isDark ? 'rgba(255,255,255,0.5)' : '#444444');
    const iconBg = isConnected ? 'rgba(255,255,255,0.2)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)');
    const iconColor = isConnected ? '#fff' : (isDark ? '#fff' : '#000');

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onConnect}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <Animated.View style={[styles.cardContainer, { 
                shadowColor: isDark ? '#000' : '#ccc',
                backgroundColor: isDark ? '#000' : '#fff' // Fallback bg
            }, animatedStyle]}>
                <LinearGradient
                    colors={isConnected ? color : disconnectedColors} 
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGradient}
                >
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                            <Ionicons name={icon} size={28} color={iconColor} />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={[styles.serviceName, { color: textColor }]}>{name}</Text>
                            <Text style={[styles.statusText, { color: subTextColor }]}>
                                {isConnected ? 'Connected' : 'Tap to Connect'}
                            </Text>
                        </View>
                        <Switch
                            value={isConnected}
                            onValueChange={onConnect}
                            trackColor={{ false: isDark ? '#555' : '#ccc', true: 'rgba(255,255,255,0.3)' }}
                            thumbColor={'#fff'}
                        />
                    </View>

                    {isConnected && stats && (
                        <View style={[styles.statsContainer, { borderTopColor: 'rgba(255,255,255,0.2)' }]}>
                            {stats.map((stat, index) => (
                                <View key={index} style={styles.statItem}>
                                    <Text style={styles.statValue}>{stat.value}</Text>
                                    <Text style={styles.statLabel}>{stat.label}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </LinearGradient>
            </Animated.View>
        </TouchableOpacity>
    );
};

const FeatureItem = ({ icon, label, description, color, isDark }: any) => {
    // Use Feature Color for Title in Light Mode for visibility & pop
    const titleColor = isDark ? '#fff' : color;
    const descColor = isDark ? 'rgba(255,255,255,0.5)' : '#000000';
    const chevronColor = isDark ? '#666' : '#222';
    // Solid white bg for Light Mode features to ensure they pop against the page
    const containerBg = isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF';
    const containerBorder = isDark ? 'rgba(255,255,255,0.05)' : '#E0E0E0';

    return (
        <View style={[
            styles.featureItem, 
            { 
                backgroundColor: containerBg, 
                borderColor: containerBorder,
                // Add shadow for light mode visibility
                shadowColor: isDark ? 'transparent' : '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0 : 0.05,
                shadowRadius: 4,
                elevation: isDark ? 0 : 2
            }
        ]}>
            <LinearGradient
                colors={[color, isDark ? '#111' : '#F5F5F5']}
                style={styles.featureIconInfo}
            >
                 <Ionicons name={icon} size={24} color="#fff" />
            </LinearGradient>
            <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: titleColor }]}>{label}</Text>
                <Text style={[styles.featureDesc, { color: descColor }]}>{description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={chevronColor} />
        </View>
    );
};

import SettingsModal from '@/components/SettingsModal';

export default function CrossVibeScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  // Removed conflicting colorScheme hook usage
  
  // State for mock connections
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [ytMusicConnected, setYtMusicConnected] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [avatarId, setAvatarId] = useState('1');

  useFocusEffect(
    useCallback(() => {
        const loadProfile = async () => {
            try {
                const savedAvatar = await AsyncStorage.getItem('user_avatar');
                if (savedAvatar) setAvatarId(savedAvatar);
            } catch (e) { console.log('Failed to load profile'); }
        };
        loadProfile();
    }, [])
  );

  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  // Fade effect for smooth clipping
  const fadeStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [0, 80],
        [1, 0],
        Extrapolate.CLAMP
      ),
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>

        {/* 1. Fixed Header */}
       <Animated.View 
            entering={FadeInDown.delay(100).springify()} 
            style={[
                styles.header, 
                { 
                    backgroundColor: 'transparent',
                    paddingTop: insets.top + 10,
                }
            ]}
       >
            {/* Avatar */}
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
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>Cross Vibe</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    Unify your music universe.
                </Text>
            </View>

            <TouchableOpacity 
                style={[styles.settingsButton, { 
                    backgroundColor: colors.surface,
                    width: 44, 
                    height: 44, 
                    borderRadius: 14, 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    borderWidth: 1, 
                    borderColor: colors.border 
                }]}
                onPress={() => setIsSettingsVisible(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
            </TouchableOpacity>
       </Animated.View>

       {/* 2. Clipping Zone */}
       <View style={{ 
           flex: 1, 
           marginTop: insets.top + 130, 
           overflow: 'hidden',
           backgroundColor: 'transparent' 
       }}>
          
          <Animated.ScrollView 
               contentContainerStyle={styles.scrollContent} 
               showsVerticalScrollIndicator={false}
               onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
               scrollEventThrottle={16}
           >
            
            {/* Service Cards */}
            <Animated.View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Integrations</Text>
                
                <Animated.View entering={FadeInRight.delay(200).springify()}>
                    <ServiceCard 
                        name="Spotify"
                        icon="musical-notes"
                        color={['#1DB954', '#191414']}
                        isConnected={spotifyConnected}
                        onConnect={() => setSpotifyConnected(!spotifyConnected)}
                        stats={[
                            { label: 'Playlists', value: '12' },
                            { label: 'Liked', value: '843' },
                        ]}
                        isDark={isDark}
                    />
                </Animated.View>

                <Animated.View entering={FadeInRight.delay(300).springify()}>
                    <ServiceCard 
                        name="YouTube Music"
                        icon="play-circle" 
                        color={['#FF0000', '#282828']}
                        isConnected={ytMusicConnected}
                        onConnect={() => setYtMusicConnected(!ytMusicConnected)}
                        stats={[
                            { label: 'Mixes', value: '4' },
                            { label: 'Subs', value: '120' },
                        ]}
                        isDark={isDark}
                    />
                </Animated.View>
            </Animated.View>

            {/* Power Features */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Power Tools</Text>
                
                <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.featuresGrid}>
                    <FeatureItem 
                        icon="sync" 
                        label="Sync Library" 
                        description="Keep playlists in sync."
                        color="#4A90E2"
                        isDark={isDark}
                    />
                    <FeatureItem 
                        icon="swap-horizontal" 
                        label="Transfer" 
                        description="Move songs between apps."
                        color="#F5A623"
                        isDark={isDark}
                    />
                     <FeatureItem 
                        icon="search" 
                        label="Universal Search" 
                        description="Find songs everywhere."
                        color="#BD10E0"
                        isDark={isDark}
                    />
                     <FeatureItem 
                        icon="flash" 
                        label="Vibe Match" 
                        description="AI playlist generator."
                        color="#50E3C2"
                        isDark={isDark}
                    />
                </Animated.View>
            </View>
       </Animated.ScrollView>
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
  scrollContent: {
      paddingBottom: 100,
      paddingTop: 30, // Reduced from 160
  },
  header: {
      position: 'absolute',
      top: 70, 
      left: 0,
      right: 0,
      zIndex: 90,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center', 
      paddingHorizontal: 20,
      paddingBottom: 30,
  },
  title: {
      fontSize: 24,
      fontWeight: '900',
      letterSpacing: 0.5,
  },
  subtitle: {
      fontSize: 13,
      opacity: 0.7,
      marginTop: 0,
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
  settingsButton: {
    padding: 8,
    borderRadius: 20,
  },
  section: {
      marginBottom: 20,
      paddingHorizontal: 20,
  },
  sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 15,
      opacity: 0.9,
  },
  cardContainer: {
      marginBottom: 25,
      borderRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 6,
  },
  cardGradient: {
      padding: 20,
      borderRadius: 24,
      minHeight: 100,
  },
  cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
  },
  textContainer: {
      flex: 1,
  },
  serviceName: {
      fontSize: 18,
      fontWeight: 'bold',
  },
  statusText: {
      fontSize: 14,
  },
  statsContainer: {
      flexDirection: 'row',
      marginTop: 20,
      borderTopWidth: 1,
      paddingTop: 15,
  },
  statItem: {
      marginRight: 30,
  },
  statValue: {
      fontSize: 20,
      fontWeight: '800',
      color: '#fff',
  },
  statLabel: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.6)',
      textTransform: 'uppercase',
      fontWeight: '600',
  },
  featuresGrid: {
      gap: 12,
  },
  featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
  },
  featureIconInfo: {
      width: 44,
      height: 44,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
  },
  featureText: {
      flex: 1,
  },
  featureTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 2,
  },
  featureDesc: {
      fontSize: 13,
  },
});
