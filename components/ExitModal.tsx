import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { BackHandler, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { useTheme } from './ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ExitModal({ visible, onClose }: Props) {
  const { colors, isDark } = useTheme();

  const handleExit = () => {
    BackHandler.exitApp();
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none" // We use Animatable for custom entry
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
        <Animatable.View 
          animation="zoomIn" 
          duration={300}
          useNativeDriver
          style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {/* Header Icon */}
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 78, 0, 0.1)' }]}>
             <Ionicons name="power" size={32} color="#FF4E00" />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Leaving so soon?</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            The vibes will be waiting for your return.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
                style={[styles.button, styles.cancelButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F5F5' }]} 
                onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Stay</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.button, styles.exitButton]} 
                onPress={handleExit}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>Exit App</Text>
            </TouchableOpacity>
          </View>
        </Animatable.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    // bg handled inline
  },
  exitButton: {
    backgroundColor: '#FF4E00',
    shadowColor: "#FF4E00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  }
});
