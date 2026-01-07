import { BlurView } from 'expo-blur';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeOut,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';

interface ScanningPopupProps {
    visible: boolean;
    onHide: () => void;
}

export const ScanningPopup: React.FC<ScanningPopupProps> = ({ visible, onHide }) => {
    const [state, setState] = React.useState<'IDLE' | 'SCANNING' | 'SUCCESS'>('IDLE');

    // Animations
    const rotation = useSharedValue(0);
    const pulse = useSharedValue(1);

    useEffect(() => {
        if (visible) {
            setState('SCANNING');
            rotation.value = withRepeat(
                withTiming(360, { duration: 2000, easing: Easing.linear }),
                -1
            );
            pulse.value = withRepeat(
                withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            );
        } else if (state === 'SCANNING') {
            // Visible became false (external trigger), but we were scanning.
            // TRANSITION TO SUCCESS
            setState('SUCCESS');
            
            // Stop loop animations
            cancelAnimation(rotation);
            cancelAnimation(pulse);
            
            // Auto hide after success duration
            const timer = setTimeout(() => {
                onHide(); // Tell parent we are strictly done
                setState('IDLE');
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotateZ: `${rotation.value}deg` }]
        };
    });

    const pulseStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: pulse.value }],
            opacity: 0.5 // Safe static opacity
        };
    });

    if (!visible && state === 'IDLE') return null;

    return (
        <View style={StyleSheet.absoluteFill}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            
            <View style={styles.container}>
                {state === 'SUCCESS' ? (
                     <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.successContainer}>
                        <View style={styles.checkCircle}>
                             <Text style={styles.checkIcon}>✓</Text>
                        </View>
                        <Text style={styles.title}>All Set!</Text>
                        <Text style={styles.subtitle}>Your library is ready.</Text>
                     </Animated.View>
                ) : (
                    <Animated.View exiting={FadeOut}>
                        {/* Radar / Pulse Effect */}
                        <View style={styles.radarContainer}>
                            <Animated.View style={[styles.pulseCircle, pulseStyle]} />
                            <Animated.View style={[styles.spinnerRing, animatedStyle]} />
                            <View style={styles.core} />
                        </View>

                        <Text style={styles.title}>Optimizing Library</Text>
                        <Text style={styles.subtitle}>We're getting things ready for you...</Text>
                        
                        {/* Optional Manual Hide */}
                        <TouchableOpacity style={styles.button} onPress={() => {
                            // If user cancels, we just hide immediately? Or allow them to background it?
                            onHide();
                        }}>
                            <Text style={styles.buttonText}>Back</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 99999,
        elevation: 100,
    },
    radarContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    pulseCircle: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#4ade80', // Green glow
        opacity: 0.3,
    },
    spinnerRing: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: 'transparent',
        borderTopColor: '#fff',
        borderRightColor: '#4ade80',
    },
    core: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#fff',
        shadowColor: "#4ade80",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 10,
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        fontFamily: 'Kanit_700Bold',
    },
    subtitle: {
        color: '#ccc',
        fontSize: 16,
        marginBottom: 30,
        textAlign: 'center',
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        marginTop: 20
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    successContainer: {
        alignItems: 'center',
    },
    checkCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#4ade80',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: "#4ade80",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 15,
    },
    checkIcon: {
        fontSize: 50,
        color: '#fff',
        fontWeight: 'bold',
    }
});
