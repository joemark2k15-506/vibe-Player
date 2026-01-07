import SettingsModal from '@/components/SettingsModal';
import { useTheme } from '@/components/ThemeContext';
import { AVATARS, DEFAULT_AVATAR } from '@/constants/avatars';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Dimensions, Image, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const COLUMN_Gap = 12;
const COLUMN_WIDTH = (width - 40 - COLUMN_Gap) / 2;

// --- Components ---

interface ServiceCardProps {
    name: string;
    icon: any;
    color: readonly [string, string, ...string[]]; 
    isConnected: boolean;
    onConnect: () => void;
    stats?: { label: string; value: string }[];
    isDark: boolean;
}

const ServiceCard = ({ name, icon, color, isConnected, onConnect, stats, isDark }: ServiceCardProps) => {
    const scale = useSharedValue(1);
    
    // Breathing glow effect
    const glowOpacity = useSharedValue(0.5);

    React.useEffect(() => {
        if (isConnected) {
            glowOpacity.value = withRepeat(
                withSequence(withTiming(0.8, { duration: 1500 }), withTiming(0.4, { duration: 1500 })),
                -1,
                true
            );
        } else {
            glowOpacity.value = withTiming(0);
        }
    }, [isConnected]);
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    const handlePressIn = () => { scale.value = withSpring(0.98); };
    const handlePressOut = () => { scale.value = withSpring(1); };

    const disconnectedColors: readonly [string, string, ...string[]] = isDark 
        ? ['#1A1A1A', '#0D0D0D'] 
        : ['#FFFFFF', '#F0F0F0'];
    
    const textColor = isConnected ? '#fff' : (isDark ? '#fff' : '#000');
    const subTextColor = isConnected ? 'rgba(255,255,255,0.8)' : (isDark ? 'rgba(255,255,255,0.5)' : '#666');
    const iconColor = isConnected ? '#fff' : (isDark ? '#fff' : '#444');

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onConnect}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <Animated.View style={[styles.cardContainer, animatedStyle]}>
                {/* Outer Glow for Connected State */}
                {isConnected && (
                    <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 24, zIndex: -1 }, glowStyle]}>
                         <LinearGradient
                            colors={color}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ flex: 1, borderRadius: 24, opacity: 0.6, margin: -2 }}
                        />
                    </Animated.View>
                )}

                <LinearGradient
                    colors={isConnected ? color : disconnectedColors} 
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.cardGradient, !isDark && !isConnected && styles.lightCardBorder]}
                >
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: isConnected ? 'rgba(255,255,255,0.2)' : (isDark ? '#333' : '#EEE') }]}>
                            <Ionicons name={icon} size={24} color={iconColor} />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={[styles.serviceName, { color: textColor }]}>{name}</Text>
                            <Text style={[styles.statusText, { color: subTextColor }]}>
                                {isConnected ? 'Active' : 'Connect'}
                            </Text>
                        </View>
                        <Switch
                            value={isConnected}
                            onValueChange={onConnect}
                            trackColor={{ false: isDark ? '#333' : '#E0E0E0', true: 'rgba(255,255,255,0.3)' }}
                            thumbColor={'#fff'}
                        />
                    </View>

                    {isConnected && stats && (
                        <View style={styles.statsRow}>
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

const PowerToolCard = ({ icon, label, description, color, isDark, index }: any) => {
    // Glassmorphism background
    const bg = isDark ? 'rgba(30,30,40,0.8)' : '#FFFFFF';
    const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
    
    const handlePress = () => {
        Alert.alert(
            "Coming Soon", 
            `${label} is currently under development. Stay tuned!`,
            [{ text: "OK", style: "default" }]
        );
    };

    return (
        <Animated.View entering={FadeInDown.delay(300 + (index * 100)).springify()}>
            <TouchableOpacity 
                style={[
                    styles.powerCard, 
                    { backgroundColor: bg, borderColor: border },
                    !isDark && styles.lightShadow
                ]}
                onPress={handlePress}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={[color, 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill, { opacity: 0.1 }]}
                    locations={[0, 0.8]}
                />
                
                <View style={[styles.powerIconCircle, { backgroundColor: color }]}>
                    <Ionicons name={icon} size={28} color="#fff" />
                </View>

                <View style={styles.powerContent}>
                    <Text style={[styles.powerTitle, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>{label}</Text>
                    <Text style={[styles.powerDesc, { color: isDark ? 'rgba(255,255,255,0.5)' : '#666' }]} numberOfLines={2}>
                        {description}
                    </Text>
                </View>
                
                <View style={styles.cardArrow}>
                    <Ionicons name="arrow-forward" size={16} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    )
}

export default function CrossVibeScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  
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

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>

        {/* 1. Header */}
       <Animated.View 
            entering={FadeInDown.delay(100).springify()} 
            style={[
                styles.header, 
                { paddingTop: insets.top + 70 }
            ]}
       >
             <TouchableOpacity 
                onPress={() => router.push('/profile')}
                style={[styles.avatarContainer, { borderColor: colors.primary }]}
            >
                <Image 
                    source={AVATARS[avatarId] || DEFAULT_AVATAR} 
                    style={styles.avatarImage}
                />
            </TouchableOpacity>

            <View style={{ flex: 1, paddingHorizontal: 16 }}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>Cross Vibe</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Nexus Control Center
                </Text>
            </View>

            <TouchableOpacity 
                style={[styles.settingsButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0' }]}
                onPress={() => setIsSettingsVisible(true)}
            >
                <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
            </TouchableOpacity>
       </Animated.View>

       {/* 2. Scroll Content */}
       <View style={{ flex: 1, marginTop: insets.top + 140 }}>
          <Animated.ScrollView 
               contentContainerStyle={styles.scrollContent} 
               showsVerticalScrollIndicator={false}
               onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
               scrollEventThrottle={16}
           >
            
            {/* Integrations Section */}
            <View style={styles.section}>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>Service Status</Text>
                
                <Animated.View entering={FadeInRight.delay(200).springify()}>
                    <ServiceCard 
                        name="Spotify"
                        icon="musical-notes"
                        color={['#1DB954', '#1ed760']}
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
                        color={['#FF0000', '#FF4E50']}
                        isConnected={ytMusicConnected}
                        onConnect={() => setYtMusicConnected(!ytMusicConnected)}
                        stats={[
                            { label: 'Mixes', value: '4' },
                            { label: 'Subs', value: '120' },
                        ]}
                        isDark={isDark}
                    />
                </Animated.View>
            </View>

            {/* Power Tools Grid */}
            <View style={styles.section}>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>Power Tools</Text>
                
                <View style={styles.gridContainer}>
                     <PowerToolCard 
                        index={0}
                        icon="sync" 
                        label="Sync Library" 
                        description="Auto-sync playlists across platforms."
                        color="#4A90E2"
                        isDark={isDark}
                    />
                     <PowerToolCard 
                        index={1}
                        icon="swap-horizontal" 
                        label="Transfer" 
                        description="Move songs between apps instantly."
                        color="#F5A623"
                        isDark={isDark}
                    />
                     <PowerToolCard 
                        index={2}
                        icon="search" 
                        label="Universal Search" 
                        description="Find any track, anywhere."
                        color="#BD10E0"
                        isDark={isDark}
                    />
                     <PowerToolCard 
                        index={3}
                        icon="flash" 
                        label="Vibe Match" 
                        description="AI-generated playlists for your mood."
                        color="#00E676"
                        isDark={isDark}
                    />
                </View>
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
      paddingBottom: 120,
      paddingTop: 20,
  },
  header: {
      position: 'absolute',
      top: 0, 
      left: 0,
      right: 0,
      zIndex: 90,
      flexDirection: 'row',
      alignItems: 'center', 
      paddingHorizontal: 20,
      paddingBottom: 20,
  },
  title: {
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: 0.5,
      fontFamily: 'Kanit_700Bold',
  },
  subtitle: {
      fontSize: 14,
      opacity: 0.7,
      marginTop: 2,
      fontFamily: 'Kanit_400Regular',
  },
  avatarContainer: {
      width: 50,
      height: 50,
      borderRadius: 18,
      borderWidth: 2,
      overflow: 'hidden',
  },
  avatarImage: {
      width: '100%',
      height: '100%',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
      marginBottom: 30,
      paddingHorizontal: 20,
  },
  sectionHeading: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 16,
      opacity: 0.9,
      fontFamily: 'Kanit_700Bold',
  },
  
  // Card Styles
  cardContainer: {
      marginBottom: 20,
      borderRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 5,
  },
  cardGradient: {
      padding: 16,
      borderRadius: 24,
      minHeight: 90,
  },
  lightCardBorder: {
      borderWidth: 1,
      borderColor: '#E0E0E0',
  },
  cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
  },
  textContainer: {
      flex: 1,
  },
  serviceName: {
      fontSize: 18,
      fontWeight: '700',
      fontFamily: 'Kanit_700Bold',
  },
  statusText: {
      fontSize: 12,
      fontWeight: '500',
  },
  statsRow: {
      flexDirection: 'row',
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.2)',
  },
  statItem: {
      marginRight: 24,
  },
  statValue: {
      fontSize: 20,
      fontWeight: '800',
      color: '#fff',
      fontFamily: 'Kanit_700Bold',
  },
  statLabel: {
      fontSize: 10,
      color: 'rgba(255,255,255,0.7)',
      textTransform: 'uppercase',
      fontWeight: '600',
      marginTop: 2,
  },
  
  // Grid Styles
  gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: COLUMN_Gap,
  },
  powerCard: {
      width: COLUMN_WIDTH,
      height: COLUMN_WIDTH * 1.1, 
      borderRadius: 24,
      padding: 16,
      justifyContent: 'space-between',
      borderWidth: 1,
      overflow: 'hidden',
  },
  lightShadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
      backgroundColor: '#fff',
      borderWidth: 0,
  },
  powerIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
  },
  powerContent: {
      flex: 1,
      justifyContent: 'center',
  },
  powerTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 4,
      fontFamily: 'Kanit_700Bold',
  },
  powerDesc: {
      fontSize: 11,
      lineHeight: 14,
      fontFamily: 'Kanit_400Regular',
  },
  cardArrow: {
      position: 'absolute',
      top: 16,
      right: 16,
  }
});

