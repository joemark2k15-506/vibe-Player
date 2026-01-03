import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';

interface LiquidVisualizerProps {
  color: string;
  isPlaying: boolean;
  size?: number;
}

const Blob = ({ delay, duration, scaleRange, color, size, isPlaying }: any) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isPlaying) {
      scale.value = withRepeat(
        withSequence(
          withTiming(scaleRange[1], { duration: duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(scaleRange[0], { duration: duration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
            withTiming(0.8, { duration: duration * 0.8 }),
            withTiming(0.4, { duration: duration * 0.8 })
        ),
        -1,
        true
      );
      rotation.value = withRepeat(
          withTiming(360, { duration: duration * 4, easing: Easing.linear }),
          -1
      );
    } else {
      // Idle state
      scale.value = withTiming(1, { duration: 1000 });
      opacity.value = withTiming(0.3, { duration: 1000 });
      rotation.value = withTiming(0, { duration: 1000 });
    }
  }, [isPlaying]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotation.value}deg` } // Slow spin
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[styles.blobContainer, { width: size, height: size }, animatedStyle]}>
        <LinearGradient
            colors={[color, 'transparent']}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
            style={{ width: '100%', height: '100%', borderRadius: size / 2 }}
        />
    </Animated.View>
  );
};

export default function LiquidVisualizer({ color, isPlaying, size = 200 }: LiquidVisualizerProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Layered Blobs for "Liquid" effect */}
      <Blob 
        size={size}
        color={color} 
        duration={2000} 
        delay={0} 
        scaleRange={[0.9, 1.2]} 
        isPlaying={isPlaying} 
      />
      <Blob 
        size={size * 0.8}
        color={color} 
        duration={2500} 
        delay={500} 
        scaleRange={[0.8, 1.1]} 
        isPlaying={isPlaying} 
      />
      <Blob 
        size={size * 0.6}
        color={color} 
        duration={1800} 
        delay={200} 
        scaleRange={[0.9, 1.3]} 
        isPlaying={isPlaying} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none', // Don't block touches
  },
  blobContainer: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
  },
});
