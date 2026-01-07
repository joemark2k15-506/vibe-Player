import { usePlayer } from '@/components/PlayerContext';
import SettingsModal from '@/components/SettingsModal';
import { useTheme } from '@/components/ThemeContext';
import { AVATARS, DEFAULT_AVATAR } from '@/constants/avatars';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Dimensions, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CreateVibeModal from '../../components/CreateVibeModal';

const { width } = Dimensions.get('window');

  export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const player = usePlayer();
  const play = player?.play || (async () => {});
  const { songs, playlists, likedSongs, importTestSong, userName, setUserName, avatarId, setAvatarId } = player;

  const [isVibeModalVisible, setIsVibeModalVisible] = React.useState(false);
  const [isAvatarModalVisible, setIsAvatarModalVisible] = React.useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = React.useState(false);

  const handlePlay = async () => {
    await play();
  };

  // Name and Avatar come from Context now
  const [bio, setBio] = React.useState('Exploring the sonic universe 🌌');
  
  const [isEditing, setIsEditing] = React.useState(false);
  const [tempUsername, setTempUsername] = React.useState('');
  const [tempBio, setTempBio] = React.useState('');

  React.useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Name and Avatar handled by PlayerContext
      const savedBio = await AsyncStorage.getItem('user_bio');
      if (savedBio) setBio(savedBio);
    } catch {
      console.error('Failed to load profile');
    }
  };

  const handleCreateVibe = () => {
    setIsVibeModalVisible(true);
  };

  const startEditing = () => {
      setTempUsername(userName);
      setTempBio(bio);
      setIsEditing(true);
  };

  const saveProfile = async () => {
      if (!tempUsername.trim()) {
          Alert.alert("Required", "Username cannot be empty");
          return;
      }
      try {
          await setUserName(tempUsername); // Updates Global Context & Storage
          await AsyncStorage.setItem('user_bio', tempBio);
          setBio(tempBio);
          setIsEditing(false);
      } catch {
          Alert.alert("Error", "Could not save profile");
      }
  };

  const handleAvatarSelect = async (id: string) => {
      await setAvatarId(id); // Updates Global Context & Storage
      setIsAvatarModalVisible(false);
      // Alert.alert("Avatar Updated", "Your new vibe connects!"); // Optional feedback
  };

  // Floating animation for avatar
  const floatY = useSharedValue(0);
  React.useEffect(() => {
      floatY.value = withRepeat(
          withTiming(15, { duration: 2000 }),
          -1,
          true
      );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: floatY.value }]
  }));

  // Scroll Animation: Header Blur

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View style={{ 
          flex: 1, 
          marginTop: insets.top + 10, 
          overflow: 'hidden',
          backgroundColor: 'transparent' 
      }}>
        <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
          
          {/* Static Header with Transparent Background */}
          <View style={[styles.staticHeader, { backgroundColor: 'transparent' }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>My Profile</Text>
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

      <View style={{ flex: 1, marginTop: 120, overflow: 'hidden' }}>
        <Animated.ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
        {/* Hero Section with Avatar */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.heroSection}>
            <Animated.View style={{ width: '100%', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setIsAvatarModalVisible(true)}>
                    <Animated.View style={[styles.avatarWrapper, floatStyle]}>
                        <LinearGradient
                            colors={['#FF0099', '#493240']}
                            style={styles.avatarGradientBg}
                        />
                        <Image 
                            source={AVATARS[avatarId] || DEFAULT_AVATAR} 
                            style={styles.avatarImage}
                            contentFit="cover"
                            transition={500}
                        />
                        <View style={styles.editIconBadge}>
                            <Ionicons name="camera" size={16} color="#fff" />
                        </View>
                    </Animated.View>
                </TouchableOpacity>
                
                <View style={styles.infoContainer}>
                    {isEditing ? (
                        <View style={styles.editForm}>
                            <TextInput
                                value={tempUsername}
                                onChangeText={setTempUsername}
                                style={[styles.editInput, { color: colors.text, borderColor: colors.primary, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                                placeholder="Username"
                                placeholderTextColor={colors.textSecondary}
                            />
                            <TextInput
                                value={tempBio}
                                onChangeText={setTempBio}
                                style={[styles.editInput, { color: colors.textSecondary, borderColor: colors.primary, fontSize: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'  }]}
                                placeholder="Vibe Signature"
                                placeholderTextColor={colors.textSecondary}
                            />
                            <View style={styles.editActions}>
                                <TouchableOpacity onPress={() => setIsEditing(false)} style={[styles.cancelButton, {borderColor: colors.textSecondary}]}>
                                    <Text style={[styles.cancelButtonText, {color: colors.textSecondary}]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={saveProfile} style={[styles.saveButton, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.saveButtonText}>Save Changes</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center' }}>
                             <TouchableOpacity onPress={startEditing} style={styles.nameRow}>
                                <Text style={[styles.username, { color: colors.text }]}>{userName}</Text>
                                <Ionicons name="pencil-outline" size={16} color={colors.primary} style={{ marginLeft: 6, marginTop: 4 }} />
                            </TouchableOpacity>
                            <Text style={[styles.bioText, { color: colors.textSecondary }]}>{bio}</Text>
                        </View>
                    )}
                </View>
            </Animated.View>

            {/* Premium Stats Cards */}
            <Animated.View style={styles.statsContainer}>
                <View style={[styles.statCard, { backgroundColor: isDark ? '#2A2A35' : '#fff', shadowColor: colors.text }]}>
                    <Text style={[styles.statNumber, { color: colors.primary }]}>{songs.length}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tracks</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: isDark ? '#2A2A35' : '#fff', shadowColor: colors.text }]}>
                    <Text style={[styles.statNumber, { color: '#00DBDE' }]}>{playlists.length}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Vibes</Text>
                </View>
                 <View style={[styles.statCard, { backgroundColor: isDark ? '#2A2A35' : '#fff', shadowColor: colors.text }]}>
                    <Text style={[styles.statNumber, { color: '#FF9F00' }]}>{songs.length * 12 + playlists.length * 50}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Vibe Score</Text>
                </View>
            </Animated.View>
        </Animated.View>

        {/* Feature Buttons Grid */}
        <Animated.View entering={FadeInRight.delay(400).springify()} style={styles.featuresGrid}>
            <TouchableOpacity 
                style={[styles.featureCard, { backgroundColor: isDark ? '#2A2A35' : '#fff' }]} 
                onPress={() => {
                   Alert.alert("Liked Songs", `You have ${likedSongs.length} liked songs.`);
                }}
            >
                <LinearGradient 
                    colors={['rgba(255, 107, 107, 0.2)', 'transparent']} 
                    style={StyleSheet.absoluteFill} 
                    start={{x:0, y:0}} end={{x:1, y:1}}
                />
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
                    <Ionicons name="heart" size={24} color="#FF6B6B" />
                </View>
                <Text style={[styles.featureTitle, { color: colors.text }]}>Liked Songs</Text>
                <Text style={[styles.featureSubtitle, { color: colors.textSecondary }]}>Your favorites</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.featureCard, { backgroundColor: isDark ? '#2A2A35' : '#fff' }]} 
                onPress={async () => {
                    try {
                        await importTestSong();
                    } catch (e) {
                         Alert.alert("Import Failed", "Could not import music.");
                    }
                }}
            >
                <LinearGradient 
                    colors={['rgba(78, 205, 196, 0.2)', 'transparent']} 
                    style={StyleSheet.absoluteFill} 
                    start={{x:0, y:0}} end={{x:1, y:1}}
                />
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(78, 205, 196, 0.1)' }]}>
                     <Ionicons name="musical-notes" size={24} color="#4ECDC4" />
                </View>
                 <Text style={[styles.featureTitle, { color: colors.text }]}>Import Music</Text>
                 <Text style={[styles.featureSubtitle, { color: colors.textSecondary }]}>Add local files</Text>
            </TouchableOpacity>
        </Animated.View>

        {/* Your Vibes Section */}
        <View style={styles.vibesSection}>
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Vibes</Text>
                <TouchableOpacity onPress={handleCreateVibe}>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>+ New</Text>
                </TouchableOpacity>
            </View>

            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.vibesList}
            >
                {/* Create New Card */}
                <TouchableOpacity 
                    style={[styles.createVibeCard, { borderColor: colors.primary }]}
                    onPress={handleCreateVibe}
                >
                    <Ionicons name="add" size={32} color={colors.primary} />
                    <Text style={[styles.createVibeText, { color: colors.primary }]}>Create</Text>
                </TouchableOpacity>

                {playlists.map((playlist, index) => (
                    <Animated.View 
                        key={playlist.id} 
                        entering={FadeInRight.delay(index * 100 + 500)}
                    >
                        <TouchableOpacity 
                            style={styles.vibeCard}
                            onPress={() => {
                                if (playlist.songs.length > 0) {
                                    play(playlist.songs[0]);
                                    Alert.alert('Vibing', `Playing ${playlist.title}`);
                                } else {
                                    Alert.alert('Empty', 'This vibe has no songs.');
                                }
                            }}
                        >
                            <Image 
                                source={{ uri: `https://source.unsplash.com/random/200x200?abstract,${index}` }} 
                                style={StyleSheet.absoluteFill}
                                contentFit="cover"
                            />
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.8)']}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.vibeCardContent}>
                                <Text style={styles.vibeCardTitle} numberOfLines={1}>{playlist.title}</Text>
                                <Text style={styles.vibeCardSubtitle}>{playlist.songs.length} Tracks</Text>
                            </View>
                            <View style={styles.playIconOverlay}>
                                <Ionicons name="play-circle" size={32} color="#fff" />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </ScrollView>
        </View>

        <CreateVibeModal 
            visible={isVibeModalVisible} 
            onClose={() => setIsVibeModalVisible(false)} 
        />

      </Animated.ScrollView>
      </View>

      {/* Avatar Selection Modal */}
      <Modal
          visible={isAvatarModalVisible}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setIsAvatarModalVisible(false)}
      >
          <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Your Vibe</Text>
                  
                  <View style={styles.avatarGrid}>
                      {Object.keys(AVATARS).map((id, index) => (
                          <Animated.View 
                            key={id}
                            entering={FadeInDown.delay(index * 50).springify()}
                          >
                            <TouchableOpacity 
                                onPress={() => handleAvatarSelect(id)}
                                style={[
                                    styles.avatarOption, 
                                    avatarId === id && { borderColor: '#2ECC71', borderWidth: 3 }
                                ]}
                                activeOpacity={0.7}
                            >
                                <Image 
                                    source={AVATARS[id]} 
                                    style={styles.avatarOptionImage} 
                                    contentFit="cover" 
                                    pointerEvents="none" 
                                    transition={200}
                                />
                            </TouchableOpacity>
                          </Animated.View>
                      ))}
                  </View>

                  <Animated.View entering={FadeInDown.delay(200).springify()} style={{ width: '100%' }}>
                      <TouchableOpacity 
                          style={[styles.closeModalButton, { backgroundColor: '#2ECC71' }]} // Green color
                          onPress={() => setIsAvatarModalVisible(false)}
                      >
                          <Text style={{ color: '#fff', fontFamily: 'Kanit_700Bold', fontSize: 16 }}>Save Vibe</Text>
                      </TouchableOpacity>
                  </Animated.View>
              </View>
          </View>
      </Modal>

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
  scrollContent: {
      paddingBottom: 160,
      paddingTop: 10, // Reduced padding since margin defines offset
      paddingHorizontal: 0, 
  },
  staticHeader: {
      position: 'absolute',
      top: 0, // Top of clipping container
      left: 0,
      right: 0,
      height: 120, 
      paddingTop: 60, // Increased padding
      paddingHorizontal: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 100, 
  },
  headerTitle: {
      fontSize: 32,
      fontFamily: 'Kanit_700Bold', 
      fontWeight: '800', 
  },
  settingsButton: {
      padding: 8,
      borderRadius: 20,
      // backgroundColor set dynamically
  },
  heroSection: {
      alignItems: 'center',
      marginTop: 20, 
      marginBottom: 30,
  },
  avatarWrapper: {
      width: 140,
      height: 140,
      borderRadius: 70,
      marginBottom: 20,
      position: 'relative',
      shadowColor: '#BD00FF',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 2, 
  },
  avatarGradientBg: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: 70,
      opacity: 0.8,
  },
  avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 70,
      borderWidth: 4,
      borderColor: '#fff',
  },
  editIconBadge: {
      position: 'absolute',
      bottom: 5,
      right: 5,
      backgroundColor: '#000',
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#fff',
  },
  infoContainer: {
      width: '100%',
      paddingHorizontal: 40,
      alignItems: 'center',
      marginBottom: 24,
  },
  nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  username: {
      fontSize: 24,
      fontFamily: 'Kanit_700Bold',
      fontWeight: '700',
  },
  bioText: {
      fontSize: 14,
      marginTop: 4,
      textAlign: 'center',
      fontFamily: 'Kanit_400Regular',
  },
  editForm: {
      width: '100%',
      gap: 12,
  },
  editInput: {
      width: '100%',
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 16,
      fontSize: 16,
      fontFamily: 'Kanit_400Regular',
  },
  editActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
  },
  saveButton: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
  },
  saveButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontFamily: 'Kanit_700Bold',
  },
  cancelButton: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
  },
  cancelButtonText: {
      fontWeight: '600',
      fontFamily: 'Kanit_400Regular',
  },
  statsContainer: {
      flexDirection: 'row',
      width: '100%',
      paddingHorizontal: 20,
      justifyContent: 'space-between',
      gap: 12,
  },
  statCard: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 20,
      alignItems: 'center',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
  },
  statNumber: {
      fontSize: 20,
      fontWeight: '800',
      fontFamily: 'Kanit_700Bold',
  },
  statLabel: {
      fontSize: 12,
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: '600',
      fontFamily: 'Kanit_400Regular',
  },
  featuresGrid: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      gap: 15,
      marginBottom: 30,
  },
  featureCard: {
      flex: 1,
      height: 120,
      borderRadius: 24,
      padding: 16,
      justifyContent: 'flex-end',
      position: 'relative',
      overflow: 'hidden',
  },
  iconCircle: {
      position: 'absolute',
      top: 16,
      left: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
  },
  featureTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 2,
      fontFamily: 'Kanit_700Bold',
  },
  featureSubtitle: {
      fontSize: 12,
      opacity: 0.8,
      fontFamily: 'Kanit_400Regular',
  },
  vibesSection: {
      width: '100%',
  },
  sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      marginBottom: 16,
  },
  sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      fontFamily: 'Kanit_700Bold',
  },
  vibesList: {
      paddingHorizontal: 24,
      paddingBottom: 20,
      gap: 16,
  },
  createVibeCard: {
      width: 80,
      height: 120,
      borderRadius: 20,
      borderWidth: 2,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
  },
  createVibeText: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Kanit_700Bold',
  },
  vibeCard: {
      width: 120,
      height: 120,
      borderRadius: 20,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: '#333',
  },
  vibeCardContent: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 10,
      zIndex: 2,
  },
  vibeCardTitle: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 14,
      fontFamily: 'Kanit_700Bold',
  },
  vibeCardSubtitle: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 10,
      fontFamily: 'Kanit_400Regular',
  },
  playIconOverlay: {
      position: 'absolute',
      top: 10,
      right: 10,
      opacity: 0.9,
  },
  modalOverlay: {
      ...StyleSheet.absoluteFillObject, // Force full screen coverage
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
  },
  modalContent: {
      borderRadius: 30,
      padding: 24,
      width: '90%', 
      maxWidth: 400,
      maxHeight: '60%', 
      borderWidth: 1,
      alignSelf: 'center', // Extra safety
      flexGrow: 0, // Prevent taking up more space than needed
  },
  modalTitle: {
      fontSize: 24,
      fontFamily: 'Kanit_700Bold',
      textAlign: 'center',
      marginBottom: 20,
  },
  avatarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 12, // Reduced gap
      paddingBottom: 20,
  },
  avatarOption: {
      width: 70, // Reduced size
      height: 70, // Reduced size
      borderRadius: 35,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarOptionImage: {
      width: '100%',
      height: '100%',
  },
  closeModalButton: {
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
      marginTop: 10,
  }
});
