import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Song } from '../types';
import { usePlayer } from './PlayerContext';
import { useTheme } from './ThemeContext';

const SongItem = ({ song, onPress, isPlaying }: { song: Song, onPress: () => void, isPlaying: boolean }) => {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.songItem, 
        { 
          backgroundColor: isDark ? 'rgba(20, 20, 30, 0.6)' : 'rgba(255, 255, 255, 0.7)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          shadowColor: isDark ? "#000" : "#888",
        },
        isPlaying && {
          backgroundColor: isDark ? 'rgba(189, 0, 255, 0.1)' : 'rgba(189, 0, 255, 0.05)',
          borderColor: isDark ? 'rgba(189, 0, 255, 0.4)' : 'rgba(189, 0, 255, 0.2)',
        }
      ]}
    >
      <View style={styles.artworkContainer}>
        {song.coverUri ? (
             <Image source={{ uri: song.coverUri }} style={styles.artworkImage} />
        ) : (
            <LinearGradient
                colors={isPlaying ? ['#FF0099', '#493240'] : isDark ? ['#1E1E2C', '#2A2A35'] : ['#F0F0F5', '#E1E1E6']}
                style={styles.artwork}
            >
                <Ionicons 
                    name="musical-note" 
                    size={22} 
                    color={isPlaying ? "#FFF" : isDark ? "#A0A0B0" : "#8E8E93"} 
                />
            </LinearGradient>
        )}
        
        {isPlaying && (
            <View style={[styles.artworkGlow, { backgroundColor: colors.primary }]} />
        )}
      </View>

      <View style={styles.info}>
        <Text 
            style={[
                styles.title, 
                { color: colors.text },
                isPlaying && { color: colors.primary, fontWeight: '800' }
            ]} 
            numberOfLines={1}
        >
            {song.title}
        </Text>
        <Text style={[styles.artist, { color: colors.textSecondary }]} numberOfLines={1}>
            {song.artist || 'Unknown Artist'}
            {song.director && song.director !== song.artist && ` • Dir. ${song.director}`}
        </Text>
      </View>

      <View style={styles.rightAction}>
        {isPlaying ? (
          <Animatable.View animation="pulse" iterationCount="infinite">
            <Ionicons name="stats-chart" size={18} color={colors.primary} />
          </Animatable.View>
        ) : (
             <Ionicons name="play-circle-outline" size={20} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function SongList() {
  const { songs, play, currentSong } = usePlayer();
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
            <SongItem 
            song={item} 
            onPress={() => play(item)}
            isPlaying={currentSong?.id === item.id}
            />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        windowSize={5}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No songs found</Text>
            </View>
        }
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  artworkContainer: {
    position: 'relative',
    marginRight: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  artworkGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 16,
    zIndex: -1,
    opacity: 0.4,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  artist: {
    fontSize: 13,
    fontWeight: '500',
  },
  rightAction: {
    paddingLeft: 12,
  },
  emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 50,
  },
  emptyText: {
      fontSize: 16,
  }
});
