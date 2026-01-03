import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Song } from '../types';
import { usePlayer } from './PlayerContext';
import { useTheme } from './ThemeContext';

interface QueueModalProps {
    visible: boolean;
    onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export default function QueueModal({ visible, onClose }: QueueModalProps) {
    const { colors, isDark } = useTheme();
    const { songs, currentSong, play } = usePlayer();

    // Find current index to split "history" (optional) from "up next"
    const currentIndex = songs.findIndex(s => s.id === currentSong?.id);
    
    // For this simple queue, we'll just show the whole list but highlight the current one
    // and maybe auto-scroll to it (ref implementation requires layout measurement)
    
    const flatListRef = React.useRef<FlatList>(null);

    React.useEffect(() => {
        if (visible && currentIndex !== -1) {
            // Wait for layout
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: currentIndex, animated: true, viewPosition: 0.5 });
            }, 500);
        }
    }, [visible, currentIndex]);
    
    const handlePlay = (song: Song) => {
        play(song);
        onClose();
    };

    const renderItem = ({ item, index }: { item: Song, index: number }) => {
        const isPlaying = currentSong?.id === item.id;
        const isUpNext = currentIndex !== -1 && index > currentIndex;
        
        return (
            <TouchableOpacity 
                style={[
                    styles.queueItem, 
                    isPlaying && styles.playingItem,
                    isPlaying && { backgroundColor: isDark ? 'rgba(189, 0, 255, 0.1)' : 'rgba(189, 0, 255, 0.05)' },
                    { backgroundColor: isUpNext ? (isDark ? '#0F0F1A' : '#FFFFFF') : 'transparent' } // Ensuring readable bg
                ]}
                onPress={() => handlePlay(item)}
            >
                <View style={[
                    styles.artworkBox, 
                    isPlaying && { borderColor: '#BD00FF', borderWidth: 1 },
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
                ]}>
                     {item.coverUri ? (
                        <Image source={{ uri: item.coverUri }} style={styles.artwork} />
                    ) : (
                        <View style={[styles.artwork, { backgroundColor: '#333' }]}>
                            <Ionicons name="musical-note" size={16} color="#666" />
                        </View>
                    )}
                    {isPlaying && (
                        <View style={styles.playingIndicator}>
                             <Ionicons name="stats-chart" size={12} color="#FFF" />
                        </View>
                    )}
                </View>

                <View style={styles.info}>
                    <Text style={[
                        styles.title, 
                        { color: isPlaying ? '#BD00FF' : colors.text },
                    ]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={[styles.artist, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.artist}
                    </Text>
                </View>

                {isPlaying && (
                    <Text style={styles.playingText}>Playing</Text>
                )}
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
            <View style={styles.overlay}>
                <TouchableOpacity 
                    style={StyleSheet.absoluteFill} 
                    activeOpacity={1} 
                    onPress={onClose} 
                />
                <Animatable.View 
                    animation="fadeInUpBig"
                    duration={400}
                    style={[styles.modalContainer, { backgroundColor: isDark ? '#0F0F1A' : '#FFFFFF' }]}
                >
                    <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                        <View style={[styles.headerIndicator, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }]} />
                        <View style={styles.headerContent}>
                            <Text style={[styles.headerTitle, { color: colors.text }]}>Up Next</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close-circle" size={30} color={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <FlatList
                        ref={flatListRef}
                        data={songs}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        initialScrollIndex={currentIndex > 0 ? currentIndex : 0}
                        onScrollToIndexFailed={() => {}} // basic safety
                        showsVerticalScrollIndicator={false}
                    />

                </Animatable.View>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: Math.min(width * 0.9, 500),
        height: '70%',
        borderRadius: 30,
        paddingTop: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 24,
    },
    header: {
        alignItems: 'center',
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerIndicator: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
        marginBottom: 20,
    },
    headerContent: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: 'Kanit_700Bold',
        letterSpacing: -0.5,
    },
    closeBtn: {
        padding: 4,
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    queueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 8,
        borderRadius: 12,
        paddingHorizontal: 8,
    },
    playingItem: {
        // bg handled in style prop
        borderWidth: 1,
        borderColor: 'rgba(189, 0, 255, 0.2)',
    },
    artworkBox: {
        width: 44,
        height: 44,
        borderRadius: 10,
        overflow: 'hidden',
        marginRight: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    artwork: {
        width: '100%',
        height: '100%',
    },
    playingIndicator: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontFamily: 'Kanit_600SemiBold',
        marginBottom: 2,
        textTransform: 'capitalize',
    },
    artist: {
        fontSize: 13,
        fontFamily: 'Kanit_400Regular',
        textTransform: 'capitalize',
    },
    playingText: {
        color: '#BD00FF',
        fontSize: 10,
        fontFamily: 'Kanit_700Bold',
        marginLeft: 8,
        textTransform: 'uppercase',
    }
});
