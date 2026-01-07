import {
    Kanit_400Regular,
    Kanit_600SemiBold,
    Kanit_700Bold
} from '@expo-google-fonts/kanit';
import {
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Montserrat_900Black,
    useFonts
} from '@expo-google-fonts/montserrat';
import {
    Righteous_400Regular
} from '@expo-google-fonts/righteous';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Audio as ExpoAudio } from 'expo-av';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeOut } from 'react-native-reanimated';
import '../shim';

import { ErrorBoundary } from '../components/ErrorBoundary';
import PermissionScreen from '../components/FirstRun/PermissionScreen';
import ScanningScreen from '../components/FirstRun/ScanningScreen';
import { GlobalBackground } from '../components/GlobalBackground';
import { PlayerProvider } from '../components/PlayerContext';
import { ScanningPopup } from '../components/ScanningPopup';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import { FirstRunService } from '../services/logic/FirstRunService';
import LibraryManager from '../services/logic/LibraryManager';

// 1. NON-BLOCKING SPLASH CONFIG
// We let the native splash auto-hide immediately to prevent system-level hangs.
// Our custom JS AnimatedSplashScreen will handle the visual transition.
// SplashScreen.preventAutoHideAsync().catch(() => {}); 

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootContent() {
  const { isDark } = useTheme();

  const CustomDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: 'transparent',
    },
  };

  const CustomLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: 'transparent',
    },
  };

  return (
    <NavigationThemeProvider value={isDark ? CustomDarkTheme : CustomLightTheme}>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
              <GlobalBackground />
              <Stack screenOptions={{
                headerStyle: {
                  backgroundColor: isDark ? '#0F0F1A' : '#ffffff',
                },
                headerTintColor: isDark ? '#fff' : '#000',
                contentStyle: { backgroundColor: 'transparent' }, 
              }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen 
                  name="now-playing" 
                  options={{ 
                    presentation: 'transparentModal', 
                    animation: 'slide_from_bottom',
                    headerShown: false,
                    gestureEnabled: true,
                    gestureDirection: 'vertical',
                  }} 
                />
                
                <Stack.Screen 
                  name="settings" 
                  options={{ 
                    presentation: 'transparentModal', 
                    animation: 'none',
                    title: 'Settings',
                    headerShown: false 
                  }} 
                />
              </Stack>
        </GestureHandlerRootView>
      </ErrorBoundary>
      <StatusBar style={isDark ? 'light' : 'dark'} translucent={true} backgroundColor="transparent" hidden={true} />
    </NavigationThemeProvider>
  );
}

const { width, height } = Dimensions.get('window');

function AnimatedSplashScreen() {
  return (
    <Animated.View 
      exiting={FadeOut.duration(500)}
      style={[StyleSheet.absoluteFill, { backgroundColor: '#000000', zIndex: 9999 }]}
      pointerEvents="none" 
    >
       <Image 
        source={require('../assets/images/image1.jpg')} 
        style={{ width: width, height: height }} 
        resizeMode="cover"
       />
    </Animated.View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Righteous_400Regular,
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Montserrat_900Black,
    Kanit_400Regular,
    Kanit_600SemiBold,
    Kanit_700Bold,
  });

  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  
  // First Run States
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null); // null = unknown
  const [step, setStep] = useState<'CHECKING' | 'PERMISSION' | 'SCANNING' | 'HOME'>('CHECKING');
  
  // Legacy global scanning popup for subsequent runs
  const [isLegacyScanning, setIsLegacyScanning] = useState(false);

  useEffect(() => {
    LibraryManager.onScanStart = () => setIsLegacyScanning(true);
    LibraryManager.onScanEnd = () => setIsLegacyScanning(false);
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
          console.log('[RootLayout] Starting prepare()...');
          
          await ExpoAudio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            interruptionModeIOS: 2,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: 2,
            playThroughEarpieceAndroid: false,
          });

          // Check First Run Status
          const complete = await FirstRunService.checkFirstRunComplete();
          console.log('[RootLayout] First Run Complete?', complete);
          setIsFirstRun(!complete);
          
          // Determine initial step
          if (complete) {
              setStep('HOME');
          } else {
              setStep('PERMISSION');
          }

          if (fontsLoaded) {
              setIsReady(true);
              // Hide splash slightly later for smooth transition
              setTimeout(() => setShowSplash(false), 2500);
          }
      } catch (e) {
          console.warn('Layout preparation error', e);
          setIsReady(true);
          setShowSplash(false);
      }
    }
    prepare();
  }, [fontsLoaded]);

  // First Run Transition Handlers
  const handlePermissionGranted = () => {
      console.log('[RootLayout] Permission granted, moving to scanning...');
      setStep('SCANNING');
  };

  const handleScanComplete = async () => {
      console.log('[RootLayout] Scan complete, moving to home...');
      await FirstRunService.markFirstRunComplete();
      setStep('HOME');
  };

  // RENDER LOGIC
  
  // 1. Splash / Loading Backup
  if (!isReady || showSplash) {
       // We keep the splash visible until we determine where to go
       // But we must render ThemeProvider for safety if our custom splash relies on it (it doesn't currently, but good practice)
       return (
        <ThemeProvider>
            <View style={{ flex: 1, backgroundColor: '#000000' }}>
                <StatusBar hidden={true} />
                <GlobalBackground />
                <AnimatedSplashScreen />
            </View>
        </ThemeProvider>
       );
  }

  // 2. First Run Flow
  if (step === 'PERMISSION') {
      return (
          <ThemeProvider>
               <StatusBar hidden={false} style="light" translucent={true} backgroundColor="transparent" />
               <PermissionScreen onPermissionGranted={handlePermissionGranted} />
          </ThemeProvider>
      );
  }

  if (step === 'SCANNING') {
      return (
          <ThemeProvider>
              <StatusBar hidden={false} style="light" translucent={true} backgroundColor="transparent" />
              <ScanningScreen onScanComplete={handleScanComplete} />
          </ThemeProvider>
      );
  }

  // 3. Main App (HOME)
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PlayerProvider>
        <ThemeProvider>
          <RootContent />
          {/* Legacy Popup for subsequent updates */}
          <ScanningPopup visible={isLegacyScanning} onHide={() => setIsLegacyScanning(false)} />
        </ThemeProvider>
      </PlayerProvider>
    </GestureHandlerRootView>
  );
}
