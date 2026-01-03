import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '../components/ThemeContext';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { colors, theme, toggleTheme, isDark } = useTheme();

  // Animation values
  const sunRotation = useSharedValue(isDark ? -90 : 0);
  const moonRotation = useSharedValue(isDark ? 0 : 90);

  React.useEffect(() => {
    sunRotation.value = withSpring(isDark ? -90 : 0);
    moonRotation.value = withSpring(isDark ? 0 : 90);
  }, [isDark]);

  const sunStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${sunRotation.value}deg` }],
      opacity: withTiming(isDark ? 0 : 1),
  }));

  const moonStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${moonRotation.value}deg` }],
      opacity: withTiming(isDark ? 1 : 0),
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
         <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
         
         <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
             {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
                <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surface }]}>
                    <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Appearance Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APPEARANCE</Text>
                    </View>
                    
                    <View style={[styles.row, { borderBottomColor: colors.border }]}>
                        <View style={styles.rowLeft}>
                            <View style={styles.iconContainer}>
                                <Animated.View style={[styles.themeIcon, sunStyle]}>
                                    <Ionicons name="sunny" size={24} color="#FFD700" />
                                </Animated.View>
                                <Animated.View style={[styles.themeIcon, moonStyle, { position: 'absolute' }]}>
                                    <Ionicons name="moon" size={22} color="#BD00FF" />
                                </Animated.View>
                            </View>
                            <View>
                                <Text style={[styles.rowLabel, { color: colors.text }]}>Dark Mode</Text>
                                <Text style={[styles.rowSubLabel, { color: colors.textSecondary }]}>
                                    {isDark ? 'On' : 'Off'}
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                             trackColor={{ false: '#767577', true: colors.primary }}
                            thumbColor={isDark ? '#fff' : '#f4f3f4'}
                             style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
                        />
                    </View>
                </View>

                {/* About Section */}
                <View style={[styles.section, { marginTop: 10 }]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ABOUT</Text>
                    </View>
                    <View style={[styles.row, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.rowLabel, { color: colors.text }]}>Version</Text>
                        <Text style={[styles.rowValue, { color: colors.textSecondary }]}>1.0.0 (Beta)</Text>
                    </View>
                    <View style={[styles.row, { borderBottomColor: 'transparent' }]}>
                        <Text style={[styles.rowLabel, { color: colors.text }]}>Developer</Text>
                        <Text style={[styles.rowValue, { color: colors.textSecondary }]}>Ps Joe</Text>
                    </View>
                </View>
            </ScrollView>
         </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modalContent: {
    borderRadius: 30,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Kanit_700Bold',
    fontWeight: '800',
  },
  closeButton: {
      padding: 8,
      borderRadius: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    fontFamily: 'Kanit_700Bold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Kanit_600SemiBold',
  },
  rowSubLabel: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Kanit_400Regular',
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Kanit_400Regular',
  },
});
