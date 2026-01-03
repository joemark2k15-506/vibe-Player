import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Gyroscope } from 'expo-sensors';
import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface ParallaxAlbumArtProps {
  uri: string | null | undefined;
  size?: number;
}

export default function ParallaxAlbumArt({ uri, size = width * 0.85 }: ParallaxAlbumArtProps) {
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  // Sensor values
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  useEffect(() => {
    // Check/Request Permissions
    const setupGyro = async () => {
         // Expo Sensors don't always need explicit permissions on Android, 
         // but good practice to check availability
        const isAvailable = await Gyroscope.isAvailableAsync();
        if (isAvailable) {
            setPermissionGranted(true);
            Gyroscope.setUpdateInterval(16); // ~60fps
            
            const subscription = Gyroscope.addListener(data => {
                // Smooth out the data or just use it directly
                // We use withSpring in the style for smoothing, so raw data here is fine
                // Clamp values to prevent extreme rotation
                x.value = data.x; // Rotation around X axis (tilt forward/back)
                y.value = data.y; // Rotation around Y axis (tilt left/right)
            });
            
            return () => subscription.remove();
        }
    };

    // OPTIMIZATION: Disable Gyroscope to reduce heat/battery
    // The 3D effect will be static (centered) or just respond to touch later.
    // setupGyro();
    setPermissionGranted(false);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    // Mapping sensor data to rotation degrees and translation
    // Adjust sensitivity: multiply by higher number for more movement
    const sensitivity = 5; 
    
    const rotateX = interpolate(y.value, [-1, 1], [10, -10], Extrapolation.CLAMP);
    const rotateY = interpolate(x.value, [-1, 1], [-10, 10], Extrapolation.CLAMP);

    const translateX = interpolate(x.value, [-1, 1], [-15, 15], Extrapolation.CLAMP);
    const translateY = interpolate(y.value, [-1, 1], [-15, 15], Extrapolation.CLAMP);

    return {
      transform: [
        { perspective: 300 }, // Lower perspective = more dramatic 3D effect
        { rotateX: `${rotateX}deg` },
        { rotateY: `${rotateY}deg` },
        { translateX: withSpring(translateX) },
        { translateY: withSpring(translateY) }
      ]
    };
  });

  // Reflection/Gloss effect moves in OPPOSITE direction to simulate glass surface
  const glossStyle = useAnimatedStyle(() => {
    const translateX = interpolate(x.value, [-1, 1], [40, -40], Extrapolation.CLAMP);
    const translateY = interpolate(y.value, [-1, 1], [40, -40], Extrapolation.CLAMP);
    
    return {
        transform: [
            { translateX: withSpring(translateX) },
            { translateY: withSpring(translateY) }
        ]
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={[styles.card, animatedStyle]}>
        {/* Shadow Layer - Static or slightly moving for depth */}
        <View style={styles.shadow} />
        
        {/* Main Image */}
        <View style={styles.imageContainer}>
            {uri ? (
                <Image 
                    key={uri}
                    source={{ uri }} 
                    style={styles.image} 
                    contentFit="cover"
                    transition={200}
                />
            ) : (
                <Image 
                    source={require('../assets/images/img3.png')}
                    style={styles.image} 
                    contentFit="cover"
                    transition={200}
                />
            )}
            
            {/* Gloss/Reflection Overlay */}
            <Animated.View style={[styles.glossContainer, glossStyle]}>
                <LinearGradient
                    colors={['rgba(255,255,255,0.4)', 'transparent', 'rgba(255,255,255,0.1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gloss}
                />
            </Animated.View>
        </View>
        
        {/* Border / Glass Edge */}
        <View style={styles.border} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    // Ensure we don't clip the 3D rotation
    zIndex: 10,
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#000',
    // iOS shadow for the card itself
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#333',
  },
  shadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: '#000',
    zIndex: -1,
  },
  glossContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    opacity: 0.7,
  },
  gloss: {
    flex: 1,
    width: '150%',
    height: '150%',
    left: '-25%',
    top: '-25%',
  },
  border: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.15)',
      zIndex: 20,
      pointerEvents: 'none'
  }
});
