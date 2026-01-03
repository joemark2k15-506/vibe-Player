import { usePlayer } from '@/components/PlayerContext';
import { useTheme } from '@/components/ThemeContext';
import { AVATARS, DEFAULT_AVATAR } from '@/constants/avatars';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import SettingsModal from '@/components/SettingsModal';

export default function SearchScreen() {
  const { colors, isDark } = useTheme();
  const { songs, play, currentSong } = usePlayer();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState('All');
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

  // "Vibe Tags" (Filters)
  const tags = ['All', 'Chill', 'Workout', 'Bass', 'Vocal'];

  // Filter Logic
  const filteredSongs = useMemo(() => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    return songs.filter(song => 
      song.title.toLowerCase().includes(lowerQuery) || 
      song.artist.toLowerCase().includes(lowerQuery)
    );
  }, [query, songs]);

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* 1. Fixed Header below navbar */}
      <View style={[styles.fixedHeaderOuter, { top: insets.top + 10, height: 100 }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
          <View style={styles.header}>
            
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

            {/* Title */}
            <View style={{ flex: 1, paddingHorizontal: 12, justifyContent: 'center' }}>
                 <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>Search</Text>
            </View>

            {/* Settings */}
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
          </View>
        </SafeAreaView>
      </View>

      {/* 2. Clipping Zone starts BELOW fixed header */}
      <View style={{ 
          flex: 1, 
          marginTop: insets.top + 100, 
          overflow: 'hidden',
          backgroundColor: 'transparent' 
      }}>
        <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
          <View style={styles.contentContainer}>
        {/* Search Input */}
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Search songs, artists..."
                placeholderTextColor={colors.textSecondary}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
            />
            {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            )}
        </View>

        {/* Vibe Tags */}
        <View style={styles.tagContainer}>
            {tags.map((tag) => (
                <TouchableOpacity 
                    key={tag} 
                    onPress={() => setActiveTag(tag)}
                    style={[
                        styles.tag, 
                        activeTag === tag ? 
                            { backgroundColor: colors.primary } : 
                            { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }
                    ]}
                >
                    <Text style={[
                        styles.tagText, 
                        activeTag === tag ? { color: '#fff' } : { color: colors.textSecondary }
                    ]}>
                        {tag}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>

        {/* Results List */}
        <FlatList
            data={filteredSongs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    {query.length > 0 ? (
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No songs found.</Text>
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <Ionicons name="musical-notes-outline" size={48} color={colors.border} />
                            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                                Type to find your vibe.
                            </Text>
                        </View>
                    )}
                </View>
            }
            renderItem={({ item, index }) => {
                const isActive = currentSong?.id === item.id;
                return (
                    <Animatable.View animation="fadeInUp" duration={500} delay={index * 50}>
                        <TouchableOpacity 
                            style={[
                                styles.resultItem, 
                                { backgroundColor: colors.surface },
                                isActive && { 
                                    borderColor: colors.primary, 
                                    borderWidth: 1,
                                    backgroundColor: isDark ? 'rgba(255, 78, 0, 0.1)' : 'rgba(255, 78, 0, 0.05)'
                                }
                            ]} 
                            onPress={() => play(item)}
                        >
                            <View style={[
                                styles.iconBox, 
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
                            ]}>
                                <Ionicons name="musical-note" size={20} color={isActive ? colors.primary : colors.textSecondary} />
                            </View>
                            <View style={styles.info}>
                                <Text style={[styles.songTitle, { color: colors.text, textTransform: 'capitalize' }, isActive && { color: colors.primary }]} numberOfLines={1}>
                                    {item.title}
                                </Text>
                                <Text style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {item.artist}
                                </Text>
                            </View>
                            {isActive && (
                                <Ionicons name="stats-chart" size={16} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    </Animatable.View>
                );
            }}
        />
      </View>
      <SettingsModal visible={isSettingsVisible} onClose={() => setIsSettingsVisible(false)} />
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeaderOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 200,
  },
  header: {
    paddingTop: 70,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
    paddingBottom: 0,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 20,
  },
  contentContainer: {
    marginTop: 50,
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
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
    padding: 14,
    borderRadius: 16,
    gap: 10,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  tagContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  tag: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 160, // Ensure clear of MiniPlayer
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  placeholderContainer: {
    alignItems: 'center',
    gap: 10,
    opacity: 0.7,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  songArtist: {
    fontSize: 12,
    marginTop: 2,
  },
});
