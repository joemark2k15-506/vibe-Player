import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Dimensions, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Playlist, Song } from '../types';
import { usePlayer } from './PlayerContext';
import { useTheme } from './ThemeContext';

interface AddToPlaylistModalProps {
    visible: boolean;
    onClose: () => void;
    song: Song | null;
}

const { width, height } = Dimensions.get('window');

type ViewMode = 'list' | 'create' | 'success';

export default function AddToPlaylistModal({ visible, onClose, song }: AddToPlaylistModalProps) {
    const { colors } = useTheme();
    const { playlists, addSongToPlaylist, createPlaylist } = usePlayer();
    
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleAddToPlaylist = async (playlist: Playlist) => {
        if (!song) return;
        
        const exists = playlist.songs.some(s => s.id === song.id);
        if (exists) {
            // Shake or show error? For now, we reuse success view but maybe with different text or just return
             setSuccessMessage(`Already in ${playlist.title}`);
             showSuccess();
             return;
        }

        await addSongToPlaylist(playlist.id, song);
        setSuccessMessage(`Added to ${playlist.title}`);
        showSuccess();
    };

    const handleCreateAndAdd = async () => {
        if (!newPlaylistName.trim()) return;
        if (!song) return;

        await createPlaylist(newPlaylistName, [song]);
        setSuccessMessage(`Created "${newPlaylistName}"`);
        showSuccess();
    };

    const showSuccess = () => {
        setViewMode('success');
        setTimeout(() => {
            resetAndClose();
        }, 1500);
    };

    const resetAndClose = () => {
        setViewMode('list');
        setNewPlaylistName('');
        setSuccessMessage('');
        onClose();
    };

    const renderItem = ({ item }: { item: Playlist }) => (
        <TouchableOpacity 
            style={styles.playlistItem}
            onPress={() => handleAddToPlaylist(item)}
        >
            <View style={styles.iconBox}>
                 <Ionicons name="musical-note" size={20} color="#FF5722" />
            </View>
            <View style={styles.info}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemSubtitle}>{item.songs.length} songs</Text>
            </View>
            <TouchableOpacity onPress={() => handleAddToPlaylist(item)}>
                <Ionicons name="add-circle-outline" size={28} color="#ccc" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderSuccessView = () => (
        <Animatable.View 
            animation="zoomIn" 
            duration={400} 
            style={styles.successContainer}
        >
            <LinearGradient
                colors={['rgba(0, 255, 127, 0.2)', 'rgba(0,0,0,0)']}
                style={styles.successGlow}
            />
            <Animatable.View animation="rubberBand" delay={300} duration={1000}>
                <Ionicons name="checkmark-circle" size={80} color="#00FF7F" />
            </Animatable.View>
            <Text style={styles.successTitle}>Vibe Check Passed! ✅</Text>
            <Text style={styles.successSub}>{successMessage}</Text>
        </Animatable.View>
    );

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={resetAndClose}
            statusBarTranslucent={true}
        >
            <View style={styles.overlay}>
                {/* Background overlay to close modal on tap */}
                <TouchableOpacity 
                    style={StyleSheet.absoluteFill} 
                    activeOpacity={1} 
                    onPress={resetAndClose} 
                />
                
                {/* The Modal Content Card */}
                <View style={styles.card}>
                    
                    {/* Header (Hide in success mode for clean look) */}
                    {viewMode !== 'success' && (
                        <>
                            <View style={styles.header}>
                                <View>
                                    <Text style={styles.title}>{viewMode === 'create' ? 'New Vibe' : 'Add to Playlist'}</Text>
                                    <Text style={styles.songName} numberOfLines={1}>
                                        {viewMode === 'create' ? 'Name your new vibe' : (song?.title || 'Unknown Song')}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={resetAndClose}>
                                    <Ionicons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.divider} />
                        </>
                    )}

                    {/* Content Switcher */}
                    {viewMode === 'success' ? (
                        renderSuccessView()
                    ) : viewMode === 'create' ? (
                        <View style={styles.createContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Vibe Name (e.g., Late Night Drive)"
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                value={newPlaylistName}
                                onChangeText={setNewPlaylistName}
                                autoFocus
                            />
                            
                            <View style={styles.createActions}>
                                <TouchableOpacity onPress={() => setViewMode('list')} style={styles.cancelBtn}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity onPress={handleCreateAndAdd} style={{ flex: 1 }}>
                                    <LinearGradient
                                        colors={['#FF4E00', '#D600CC']}
                                        style={styles.actionCreateBtn}
                                    >
                                        <Text style={styles.createBtnText}>Create & Add</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            <FlatList
                                data={playlists}
                                renderItem={renderItem}
                                keyExtractor={item => item.id}
                                style={styles.list}
                                contentContainerStyle={styles.listContent}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>No playlists yet.</Text>
                                    </View>
                                }
                            />

                            <TouchableOpacity onPress={() => setViewMode('create')} style={styles.createBtnContainer}>
                                <LinearGradient
                                    colors={['#FF4E00', '#D600CC', '#BD00FF']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.createBtn}
                                >
                                    <Ionicons name="add" size={24} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.createBtnText}>Create New Playlist</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    )}

                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: width,
        height: height,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: Math.min(width * 0.9, 400),
        backgroundColor: '#0F0F1A',
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        minHeight: 350, 
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    songName: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        maxWidth: 200,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginBottom: 16,
    },
    list: {
        marginBottom: 20,
    },
    listContent: {
        gap: 16,
    },
    playlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12, 
        backgroundColor: '#1E1E2C', 
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    info: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    itemSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: 'rgba(255,255,255,0.5)',
    },
    createBtnContainer: {
        width: '100%',
        shadowColor: '#BD00FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    createBtn: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // New Styles
    createContainer: {
        gap: 20,
        paddingVertical: 20,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        height: 50,
        borderRadius: 12,
        paddingHorizontal: 16,
        color: '#fff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    createActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    cancelBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
    actionCreateBtn: {
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    // Success Styles
    successContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        paddingVertical: 40,
    },
    successTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 24,
        marginBottom: 8,
    },
    successSub: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 16,
        textAlign: 'center',
    },
    successGlow: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        top: -20,
    }
});
