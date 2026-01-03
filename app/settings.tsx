import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, SlideInDown, SlideOutDown, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '../components/ThemeContext';

export default function SettingsScreen() {
  const { colors, theme, toggleTheme, isDark } = useTheme();
  const router = useRouter();

  // Animation values
  const backgroundColor = useSharedValue(isDark ? '#0F0F1A' : '#FFFFFF');
  const textColor = useSharedValue(isDark ? '#FFFFFF' : '#000000');
  
  // Icon rotations
  const sunRotation = useSharedValue(isDark ? -90 : 0);
  const moonRotation = useSharedValue(isDark ? 0 : 90);

  useEffect(() => {
    backgroundColor.value = withTiming(colors.background, { duration: 300 });
    textColor.value = withTiming(colors.text, { duration: 300 });
    
    sunRotation.value = withSpring(isDark ? -90 : 0);
    moonRotation.value = withSpring(isDark ? 0 : 90);
  }, [theme, isDark, colors.background, colors.text, backgroundColor, textColor, sunRotation, moonRotation]);

  const animatedStyles = useAnimatedStyle(() => {
    return {
      backgroundColor: backgroundColor.value,
    };
  });

  const animatedText = useAnimatedStyle(() => {
    return {
      color: textColor.value,
    };
  });

  const sunStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${sunRotation.value}deg` }],
      opacity: withTiming(isDark ? 0 : 1),
    };
  });

  const moonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${moonRotation.value}deg` }],
      opacity: withTiming(isDark ? 1 : 0),
    };
  });

  return (
    <Animated.View 
      entering={SlideInDown.duration(400).easing(Easing.out(Easing.cubic))}
      exiting={SlideOutDown.duration(300).easing(Easing.out(Easing.cubic))}
      style={[styles.container, animatedStyles, { backgroundColor: 'transparent' }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Animated.Text style={[styles.headerTitle, animatedText]}>Settings</Animated.Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
            <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
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
              <Animated.Text style={[styles.rowLabel, animatedText]}>
                Dark Mode
              </Animated.Text>
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
            ios_backgroundColor="#3e3e3e"
            style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
          />
        </View>
      </View>



      {/* About Section */}
      <View style={[styles.section, { marginTop: 10 }]}>
         <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ABOUT</Text>
        </View>
        <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]}>
             <Animated.Text style={[styles.rowLabel, animatedText]}>Version</Animated.Text>
             <Text style={[styles.rowValue, { color: colors.textSecondary }]}>1.0.0 (Beta)</Text>
        </TouchableOpacity>
         <TouchableOpacity style={[styles.row, { borderBottomColor: 'transparent' }]}>
             <Animated.Text style={[styles.rowLabel, animatedText]}>Developer</Animated.Text>
             <Text style={[styles.rowValue, { color: colors.textSecondary }]}>Ps Joe</Text>
        </TouchableOpacity>
      </View>

      </ScrollView>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
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
  },
  rowSubLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 78, 0, 0.2)',
  },
  exitButtonText: {
    color: '#FF4E00',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
