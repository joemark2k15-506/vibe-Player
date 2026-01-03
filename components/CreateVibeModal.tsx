import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Song } from '../types';
import { usePlayer } from './PlayerContext';
import { useTheme } from './ThemeContext';

interface CreateVibeModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function CreateVibeModal({ visible, onClose }: CreateVibeModalProps) {
    const { colors, isDark } = useTheme();
    const { songs, createPlaylist } = usePlayer();
    
    const [vibeName, setVibeName] = useState('');
    const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (visible) {
            setVibeName('');
            setSelectedSongIds(new Set());
            setSearchQuery('');
        }
    }, [visible]);

    const filteredSongs = songs.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleSong = (id: string) => {
        const newSet = new Set(selectedSongIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedSongIds(newSet);
    };

    const handleCreate = async () => {
        if (!vibeName.trim()) {
            Alert.alert('Missing Name', 'Please give your vibe a name!');
            return;
        }
        if (selectedSongIds.size === 0) {
            Alert.alert('Empty Vibe', 'Select at least one song to vibe with.');
            return;
        }

        const selectedSongs = songs.filter(s => selectedSongIds.has(s.id));
        await createPlaylist(vibeName, selectedSongs);
        onClose();
        Alert.alert('Vibe Created', `"${vibeName}" is ready to play!`);
    };

    const renderSongItem = ({ item }: { item: Song }) => {
        const isSelected = selectedSongIds.has(item.id);
        return (
            <TouchableOpacity 
                style={[
                    styles.songItem, 
                    { 
                        backgroundColor: isSelected ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                        borderColor: isSelected ? colors.primary : 'transparent',
                        borderWidth: 1
                    }
                ]}
                onPress={() => toggleSong(item.id)}
            >
                <Image 
                    source={item.coverUri ? { uri: item.coverUri } : require('../assets/images/icon.png')} 
                    style={styles.songCover} 
                />
                <View style={styles.songInfo}>
                    <Text style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>{item.artist}</Text>
                </View>
                <View style={[styles.checkbox, { borderColor: isSelected ? colors.primary : colors.textSecondary }]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <BlurView intensity={isDark ? 80 : 50} tint={isDark ? "dark" : "light"} style={styles.blurContainer}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: colors.text }]}>New Vibe</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Name Input */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Vibe Name</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: isDark ? '#333' : '#ddd', backgroundColor: isDark ? '#222' : '#f5f5f5' }]}
                                placeholder="e.g. Late Night Drive"
                                placeholderTextColor={colors.textSecondary}
                                value={vibeName}
                                onChangeText={setVibeName}
                                autoFocus={false}
                            />
                        </View>

                        {/* Song Selection */}
                        <View style={styles.listContainer}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Select Songs ({selectedSongIds.size})</Text>
                            <TextInput
                                style={[styles.searchInput, { color: colors.text, borderColor: isDark ? '#333' : '#ddd', backgroundColor: isDark ? '#222' : '#f5f5f5' }]}
                                placeholder="Search library..."
                                placeholderTextColor={colors.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            <FlatList
                                data={filteredSongs}
                                renderItem={renderSongItem}
                                keyExtractor={item => item.id}
                                contentContainerStyle={styles.listContent}
                                showsVerticalScrollIndicator={false}
                            />
                        </View>

                        {/* Footer / Create Button */}
                        <View style={styles.footer}>
                            <TouchableOpacity onPress={handleCreate} style={styles.createBtnWrapper}>
                                <LinearGradient
                                    colors={['#FF00CC', '#333399']}
                                    start={{x: 0, y: 0}}
                                    end={{x: 1, y: 1}}
                                    style={styles.createBtn}
                                >
                                    <Text style={styles.createBtnText}>Create Vibe</Text>
                                    <Ionicons name="sparkles" size={20} color="#fff" style={{ marginLeft: 8 }} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                    </View>
                </BlurView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center', // Centered properly
        alignItems: 'center',
        padding: 20,
    },
    blurContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)', // Fallback for blur
    },
    modalContent: {
        width: '100%',
        maxHeight: '80%',
        borderRadius: 30,
        padding: 20,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 100,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    closeBtn: {
        padding: 8,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    input: {
        height: 50,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        borderWidth: 1,
    },
    listContainer: {
        flex: 1,
    },
    searchInput: {
        height: 40,
        borderRadius: 20,
        paddingHorizontal: 16,
        fontSize: 14,
        marginBottom: 10,
        borderWidth: 0, 
    },
    listContent: {
        paddingBottom: 20,
    },
    songItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 12,
        marginBottom: 8,
    },
    songCover: {
        width: 48,
        height: 48,
        borderRadius: 6,
        marginRight: 12,
        backgroundColor: '#ccc',
    },
    songInfo: {
        flex: 1,
    },
    songTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    songArtist: {
        fontSize: 13,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        paddingTop: 20,
        paddingBottom: 20,
    },
    createBtnWrapper: {
        width: '100%',
        shadowColor: '#FF00CC',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    createBtn: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    createBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
