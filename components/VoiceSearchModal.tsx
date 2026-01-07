
import { BlurView } from 'expo-blur';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';

interface VoiceSearchModalProps {
    visible: boolean;
    onClose: () => void;
    onResult: (text: string) => void;
}

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({ visible, onClose, onResult }) => {
    const [isListening, setIsListening] = useState(false);
    const [partialResult, setPartialResult] = useState('');
    const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
    
    // Animation Values
    const wave1 = useSharedValue(1);
    const wave2 = useSharedValue(1);
    const wave3 = useSharedValue(1);

    // Expo Speech Recognition Events
    useSpeechRecognitionEvent("start", () => setIsListening(true));
    useSpeechRecognitionEvent("end", () => setIsListening(false));
    useSpeechRecognitionEvent("result", (event) => {
        if (event.results && event.results.length > 0) {
            const text = event.results[0].transcript;
            onResult(text);
            onClose();
        }
    });

    useEffect(() => {
        if (visible) {
            checkPermissionsAndStart();
        } else {
            stopListening();
        }
        // Cleanup not strictly necessary as module handles it, but good practice
        return () => {
             stopListening();
        }
    }, [visible]);

    const checkPermissionsAndStart = async () => {
        try {
            const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            setPermissionStatus(result.granted ? 'granted' : 'denied');
            
            if (result.granted) {
                startListening();
                startAnimations();
            }
        } catch (e) {
            console.error('Permission check failed', e);
            setPermissionStatus('denied');
        }
    };

    const handleGrantPermission = async () => {
         const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
         setPermissionStatus(result.granted ? 'granted' : 'denied');
         if (result.granted) {
             startListening();
             startAnimations();
         }
    };

    const startAnimations = () => {
         wave1.value = withRepeat(withTiming(1.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }), -1, true);
         setTimeout(() => {
             wave2.value = withRepeat(withTiming(1.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }), -1, true);
         }, 200);
         setTimeout(() => {
             wave3.value = withRepeat(withTiming(1.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }), -1, true);
         }, 400);
    };

    const startListening = async () => {
        try {
            setPartialResult('');
            // Start with interim results to show partial text
            // Note: 'interimResults' option might depend on exact library version features, 
            // but standard Web Speech API supports it.
            // If the library supports options in start(), we pass them here.
            await ExpoSpeechRecognitionModule.start({ 
                lang: 'en-US',
                interimResults: true 
            });
        } catch (e) {
            console.error('Start listening error', e);
        }
    };

    const stopListening = async () => {
        try {
            await ExpoSpeechRecognitionModule.stop();
        } catch (e) {
            // ignore
        }
    };

    const createWaveStyle = (sv: Animated.SharedValue<number>) => useAnimatedStyle(() => ({
        transform: [{ scale: sv.value }],
        opacity: 0.8 / sv.value 
    }));

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
             <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
                 <View style={styles.container}>
                     
                     {permissionStatus === 'denied' ? (
                         <View style={{ alignItems: 'center', paddingHorizontal: 40 }}>
                             <View style={[styles.micCircle, { backgroundColor: '#ef4444' }]}>
                                 <Text style={styles.micIcon}>❌</Text>
                             </View>
                             <Text style={[styles.resultText, { marginTop: 20 }]}>Microphone Needed</Text>
                             <Text style={[styles.statusText, { textAlign: 'center', marginTop: 10 }]}>
                                 We need access to your microphone to listen for commands.
                             </Text>
                             <TouchableOpacity style={[styles.closeButton, { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }]} onPress={handleGrantPermission}>
                                 <Text style={[styles.closeText, { fontWeight: 'bold' }]}>Allow Access</Text>
                             </TouchableOpacity>
                         </View>
                     ) : (
                         <>
                             {/* Dynamic Visualizer */}
                             <View style={styles.visualizer}>
                                 <Animated.View style={[styles.wave, createWaveStyle(wave3), { backgroundColor: '#8b5cf6' }]} />
                                 <Animated.View style={[styles.wave, createWaveStyle(wave2), { backgroundColor: '#6366f1' }]} />
                                 <Animated.View style={[styles.wave, createWaveStyle(wave1), { backgroundColor: '#ec4899' }]} />
                                 
                                 <View style={styles.micCircle}>
                                     <Text style={styles.micIcon}>🎙️</Text>
                                 </View>
                             </View>

                             <Text style={styles.statusText}>
                                 {isListening ? "Listening..." : "Initializing..."}
                             </Text>
                             
                             <Text style={styles.resultText}>
                                 {partialResult || "Say a song name..."}
                             </Text>
                         </>
                     )}

                     <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                         <Text style={styles.closeText}>Cancel</Text>
                     </TouchableOpacity>
                 </View>
             </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    visualizer: {
        width: 150,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    micCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        elevation: 10,
    },
    micIcon: {
        fontSize: 32,
    },
    wave: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        opacity: 0.5,
    },
    statusText: {
        color: '#ccc',
        fontSize: 18,
        marginBottom: 10,
        fontFamily: 'Montserrat_600SemiBold',
    },
    resultText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        paddingHorizontal: 40,
        fontFamily: 'Kanit_600SemiBold',
    },
    closeButton: {
        marginTop: 60,
        paddingVertical: 12,
        paddingHorizontal: 30,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    closeText: {
        color: '#fff',
        fontSize: 16,
    }
});
