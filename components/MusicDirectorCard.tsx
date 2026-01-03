import { useTheme } from '@/components/ThemeContext';
import { Fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import { DirectorCard, Song } from '../types';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface Props {
  card: DirectorCard;
  onPress: (song: Song) => void;
  activeSongId?: string;
}

export default function MusicDirectorCard({ card, onPress, activeSongId }: Props) {
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const allSongs = [...card.songs];
  const displayedSongs = expanded ? allSongs : allSongs.slice(0, 3);
  const hiddenCount = allSongs.length - displayedSongs.length;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={[styles.containerShadow, { shadowColor: colors.primary }]}>
        <LinearGradient
            colors={[colors.surface, 'rgba(255,255,255,0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.container, { borderColor: colors.border }]}
        >
          {/* Header */}
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={toggleExpand}
            style={styles.header}
          >
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                <Ionicons name="person" size={20} color={colors.text} />
            </View>
            
            <View style={styles.headerContent}>
                 <Text style={[styles.directorName, { color: colors.text }]}>
                    {card.title === 'Unknown Director' ? 'VARIOUS ARTISTS' : card.title}
                 </Text>
                 <Text style={[styles.trackCount, { color: colors.textSecondary }]}>
                    {card.songs.length} TRACKS
                 </Text>
            </View>
            
            <View style={[styles.expandButton, { borderColor: colors.border }]}>
                 <Ionicons 
                    name={expanded ? "chevron-up" : "chevron-down"} 
                    size={18} 
                    color={colors.textSecondary} 
                />
            </View>
          </TouchableOpacity>
    
          {/* Songs List */}
          <View style={styles.listContainer}>
            {displayedSongs.map((song, index) => {
                 const isActive = activeSongId === song.id;
                 return (
                     <Animated.View 
                        key={song.id} 
                        layout={Layout.springify()}
                        entering={FadeIn.duration(300).delay(index * 30)}
                     >
                        <TouchableOpacity 
                            style={[
                                styles.songRow, 
                                isActive && { backgroundColor: 'rgba(0, 228, 255, 0.15)' }
                            ]}
                            onPress={() => onPress(song)}
                        >
                             {/* Glossy Bullet Point */}
                             <View style={[
                                 styles.bullet, 
                                 { backgroundColor: isActive ? colors.primary : (isDark ? colors.border : '#CBD5E1') }
                             ]} />
    
                            <View style={styles.songInfo}>
                                <Text style={[
                                    styles.songTitle, 
                                    { textTransform: 'capitalize' },
                                    { color: isActive ? (isDark ? '#FFFFFF' : colors.primary) : colors.text }
                                ]} numberOfLines={1}>
                                    {song.title}
                                </Text>
                                <Text style={[styles.songMeta, { color: colors.textSecondary }]}>
                                    {song.album}
                                </Text>
                            </View>
                        </TouchableOpacity>
                     </Animated.View>
                 );
            })}
            
            {hiddenCount > 0 && (
                <TouchableOpacity onPress={toggleExpand} style={styles.footer}>
                    <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                        Show {hiddenCount} More
                    </Text>
                </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  containerShadow: {
    marginHorizontal: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  container: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: {
      flex: 1,
  },
  directorName: {
      fontFamily: Fonts.kanitBold, 
      fontSize: 18,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
  },
  trackCount: {
      fontFamily: Fonts.montserratSemiBold,
      fontSize: 10,
      letterSpacing: 2,
  },
  expandButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.2)',
  },
  listContainer: {
      paddingBottom: 16,
      paddingHorizontal: 8,
  },
  songRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: 4,
  },
  bullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 12,
  },
  songInfo: {
      flex: 1,
  },
  songTitle: {
      fontFamily: Fonts.kanitSemiBold,
      fontSize: 15,
      marginBottom: 2,
      letterSpacing: 0.2,
  },
  songMeta: {
      fontFamily: Fonts.montserrat,
      fontSize: 11,
      opacity: 0.7,
  },
  footer: {
      alignItems: 'center',
      paddingTop: 8,
  },
  footerText: {
      fontFamily: Fonts.montserratSemiBold,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
      opacity: 0.8,
  }
});
