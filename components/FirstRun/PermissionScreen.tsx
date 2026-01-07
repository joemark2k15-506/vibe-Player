import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import React from 'react';
import { BackHandler, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface PermissionScreenProps {
  onPermissionGranted: () => void;
}

export default function PermissionScreen({ onPermissionGranted }: PermissionScreenProps) {
  
  const handleGrant = async () => {
    try {
      // 1. Media Library
      const media = await MediaLibrary.requestPermissionsAsync();
      
      // 2. Microphone (Voice Search)
      const audio = await Audio.requestPermissionsAsync();

      // 3. Notifications (Background Tasks/Updates)
      const notif = await Notifications.requestPermissionsAsync();

      if (media.status === 'granted') {
          // Additional permissions are optional but requested
          onPermissionGranted();
      } else {
        alert('Permission is mandatory to scan your music library.');
      }
    } catch (e) {
      console.error('Permission request failed', e);
      alert('An error occurred while requesting permissions.');
    }
  };

  const handleExit = () => {
    BackHandler.exitApp();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F2027', '#203A43', '#2C5364']}
        style={StyleSheet.absoluteFill}
      />
      
      <Animated.View entering={FadeInDown.delay(200)} style={styles.content}>
        <View style={styles.iconContainer}>
            <Ionicons name="musical-notes" size={60} color="#4ade80" />
        </View>

        <Text style={styles.title}>Let's Get Started</Text>
        <Text style={styles.subtitle}>
          Vibe Player needs access to your local storage to find and play your music.
        </Text>

        <View style={styles.list}>
            <View style={styles.listItem}>
                <Ionicons name="folder-open-outline" size={24} color="#fff" />
                <Text style={styles.listText}>Scan storage for music</Text>
            </View>
            <View style={styles.listItem}>
                <Ionicons name="mic-outline" size={24} color="#fff" />
                <Text style={styles.listText}>Voice Search commands</Text>
            </View>
            <View style={styles.listItem}>
                <Ionicons name="notifications-outline" size={24} color="#fff" />
                <Text style={styles.listText}>Playback controls & alerts</Text>
            </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleGrant}>
            <Text style={styles.buttonText}>Allow Access</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleExit}>
            <Text style={styles.secondaryButtonText}>Exit App</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: width * 0.9,
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Kanit_700Bold',
    fontSize: 28,
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Kanit_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  list: {
    width: '100%',
    marginBottom: 40,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 12,
  },
  listText: {
    fontFamily: 'Kanit_400Regular',
    fontSize: 15,
    color: '#fff',
    marginLeft: 15,
  },
  button: {
    width: '100%',
    backgroundColor: '#4ade80',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    fontFamily: 'Kanit_600SemiBold',
    fontSize: 18,
    color: '#000',
  },
  secondaryButton: {
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontFamily: 'Kanit_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  }
});
