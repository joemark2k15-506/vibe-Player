import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import LibraryManager from '../../services/logic/LibraryManager';

const { width } = Dimensions.get('window');

interface ScanningScreenProps {
  onScanComplete: () => void;
}

export default function ScanningScreen({ onScanComplete }: ScanningScreenProps) {
  useKeepAwake(); // Prevent sleep during scanning
  const [status, setStatus] = useState('Initializing...');
  const [count, setCount] = useState(0);
  const [subStatus, setSubStatus] = useState('');
  const [complete, setComplete] = useState(false);

  // Animation values
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
        withTiming(1.1, { duration: 1000 }),
        -1,
        true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.8
  }));

  useEffect(() => {
    startScan();
  }, []);

  const startScan = async () => {
    try {
        setStatus('Scanning device...');
        
        // 1. Setup listeners for the SECOND phase (Enrichment)
        // CRITICAL: We now WAIT for this to finish.
        LibraryManager.onEnrichmentProgress = (current, total, message) => {
             setStatus(message);
             setSubStatus(`${current} / ${total}`);
        };

        LibraryManager.onEnrichmentEnd = () => {
             finishScan();
        };

        // 2. Start the FIRST phase (File Discovery)
        const interval = setInterval(() => {
            const currentCount = LibraryManager.getAllSongs().length;
            if (currentCount > count) setCount(currentCount);
        }, 500);

        const success = await LibraryManager.scanAndRefresh();
        clearInterval(interval);

        if (success) {
            const finalCount = LibraryManager.getAllSongs().length;
            setCount(finalCount);
            
            // 3. CHECK STATUS
            // If enrichment is running (which it should be), we just wait for the events above.
            if (LibraryManager.isEnriching) {
                setStatus('Processing Metadata...');
                setSubStatus(`0 / ${finalCount}`);
            } else {
                // Only if enrichment finished instantly (e.g. 0 songs) do we finish here.
                finishScan();
            }
        } else {
            setStatus('Scan failed. Please restart.');
        }
    } catch (e) {
        setStatus('Error occurred.');
        console.error(e);
    }
  };

  const finishScan = () => {
      setStatus('Finalizing...');
      setSubStatus('');
      setTimeout(() => {
          setComplete(true);
          setTimeout(onScanComplete, 2000); 
      }, 500);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
         colors={['#000000', '#1a1a1a']}
         style={StyleSheet.absoluteFill}
      />
      
      {!complete ? (
           <Animated.View entering={FadeIn} style={styles.center}>
               <Animated.View style={[styles.pulseRing, pulseStyle]} />
               <Text style={styles.count}>{count}</Text>
               <Text style={styles.label}>Songs Found</Text>
               <Text style={styles.status}>{status}</Text>
               {subStatus ? <Text style={styles.subStatus}>{subStatus}</Text> : null}
           </Animated.View>
      ) : (
          <Animated.View entering={ZoomIn} style={styles.center}>
               <View style={styles.successCircle}>
                   <Text style={styles.check}>✓</Text>
               </View>
               <Text style={styles.successTitle}>All Done!</Text>
               <Text style={styles.successSub}>{count} songs added to library.</Text>
          </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    position: 'absolute',
  },
  count: {
    fontFamily: 'Kanit_700Bold',
    fontSize: 60,
    color: '#4ade80',
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontFamily: 'Kanit_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  status: {
    marginTop: 40,
    fontFamily: 'Kanit_400Regular',
    fontSize: 16,
    color: '#fff',
  },
  subStatus: {
    marginTop: 5,
    fontFamily: 'Kanit_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)', 
  },
  successCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: '#4ade80',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      shadowColor: "#4ade80",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
  },
  check: {
      fontSize: 50,
      color: '#000',
      fontWeight: 'bold',
  },
  successTitle: {
      fontFamily: 'Kanit_700Bold',
      fontSize: 28,
      color: '#fff',
  },
  successSub: {
      fontFamily: 'Kanit_400Regular',
      fontSize: 16,
      color: 'rgba(255,255,255,0.7)',
      marginTop: 5,
  }
});
