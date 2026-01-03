import { useTheme } from '@/components/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

/**
 * GlobalBackground Component
 * Renders a smooth, looping aurora animation that adapts to Dark and Light modes.
 */
export const GlobalBackground: React.FC = () => {
    const { colors, isDark } = useTheme();
    
    // Animation shared values for a smooth loop
    const rotation = useSharedValue(0);
    const float = useSharedValue(0);

    useEffect(() => {
        // Continuous rotation for the entire container
        // Use a 0-1 shared value to avoid any potential wrapping issues with large numbers
        // Sped up slightly for a more visible effect as requested
        rotation.value = 0;
        rotation.value = withRepeat(
            withTiming(1, { 
                duration: 60000, 
                easing: (t) => {
                    'worklet';
                    return t;
                }
            }),
            -1,
            false
        );

        // Subtle oscillating float for movement
        float.value = withRepeat(
            withTiming(1, { 
                duration: 15000, 
                easing: (t) => {
                    'worklet';
                    return t * t * (3 - 2 * t);
                }
            }),
            -1,
            true
        );
    }, []);

    // Derived values for smooth transitions between modes
    const opacity = useDerivedValue(() => {
        return withTiming(isDark ? 0.5 : 0.25, { duration: 500 });
    }, [isDark]);

    const auroraStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [
                { scale: interpolate(float.value, [0, 1], [1.1, 1.3]) },
                { rotate: `${interpolate(rotation.value, [0, 1], [0, 360])}deg` },
                { translateY: interpolate(float.value, [0, 1], [-20, 20]) }
            ]
        };
    });

    return (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}>
            <Animated.View style={[styles.auroraContainer, auroraStyle]} pointerEvents="none">
                <LinearGradient
                    colors={[colors.secondary, 'transparent']} 
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.auroraBlob1}
                />
                <LinearGradient
                    colors={[colors.primary, 'transparent']} 
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.auroraBlob2}
                />
                <LinearGradient
                    colors={['#4F46E5', 'transparent']} // Indigo
                    start={{ x: 0.5, y: 1 }}
                    end={{ x: 0.5, y: 0 }}
                    style={styles.auroraBlob3}
                />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
  auroraContainer: {
      ...StyleSheet.absoluteFillObject,
      width: width * 1.5,
      height: height * 1.5,
      left: -width * 0.25,
      top: -height * 0.25,
      zIndex: -1,
  },
  auroraBlob1: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: width * 1.2,
      height: width * 1.2,
      borderRadius: width,
  },
  auroraBlob2: {
      position: 'absolute',
      top: height * 0.2,
      right: 0,
      width: width * 1.3,
      height: width * 1.3,
      borderRadius: width,
  },
  auroraBlob3: {
      position: 'absolute',
      bottom: 0,
      left: width * 0.1,
      width: width * 1.5,
      height: width * 1.5,
      borderRadius: width,
  },
});
