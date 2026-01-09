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
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import TrackPlayer from 'react-native-track-player';
import '../shim';

// Register TrackPlayer playback service
// @ts-ignore
if (!global.isTrackPlayerRegistered) {
  try {
    if (TrackPlayer && typeof TrackPlayer.registerPlaybackService === 'function') {
      TrackPlayer.registerPlaybackService(() => require('../services/TrackPlayerService'));
      // @ts-ignore
      global.isTrackPlayerRegistered = true;
    }
  } catch (e) {
    console.warn('[RootLayout] TrackPlayer registration failed (likely missing native module):', e);
  }
}

import { ErrorBoundary } from '@/components/ErrorBoundary';
import PermissionScreen from '@/components/FirstRun/PermissionScreen';
import ScanningScreen from '@/components/FirstRun/ScanningScreen';
import { GlobalBackground } from '@/components/GlobalBackground';
import { PlayerProvider } from '@/components/PlayerContext';
import { ScanningPopup } from '@/components/ScanningPopup';
import { ThemeProvider, useTheme } from '@/components/ThemeContext';
import { FirstRunService } from '@/services/logic/FirstRunService';
import LibraryManager from '@/services/logic/LibraryManager';

import * as SplashScreen from 'expo-splash-screen';

// 1. NON-BLOCKING SPLASH CONFIG
// Prevent auto-hide to control transition manually
SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};
// ... (rest of imports)



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
                  name="notification.click" 
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
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [step, setStep] = useState<'CHECKING' | 'PERMISSION' | 'SCANNING' | 'HOME'>('CHECKING');

  // Legacy global scanning popup for subsequent runs
  const [isLegacyScanning, setIsLegacyScanning] = useState(false);

  const hasStarted = useRef(false);

  useEffect(() => {
    LibraryManager.onScanStart = () => setIsLegacyScanning(true);
    LibraryManager.onScanEnd = () => setIsLegacyScanning(false);
  }, []);

  useEffect(() => {
    async function prepare() {
      if (hasStarted.current) return;
      hasStarted.current = true;
      try {
          console.log('[RootLayout] Starting prepare()...');
          
          // Keep splash visible for at least 2 seconds for branding
          await new Promise(resolve => setTimeout(resolve, 2000));

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
      } catch (e) {
          console.warn('Layout preparation error', e);
          setStep('HOME'); // Fallback
      } finally {
        // Hide native splash (transparent), revealing the JS splash (image1.jpg)
        // effectively making it appear as if image1.jpg was there all along
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  // Final readiness trigger
  useEffect(() => {
      if (fontsLoaded && step !== 'CHECKING') {
          // Additional safety delay to ensure image1 is rendered
          setTimeout(() => {
              console.log('[RootLayout] Everything ready. Showing app.');
              setIsReady(true);
          }, 2500);
      }
  }, [fontsLoaded, step]);

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
  
  // 1. Splash / Loading Backup (Simplified)
  if (!isReady) {
       return (
        <ThemeProvider>
            <View style={{ flex: 1, backgroundColor: '#000000' }}>
                <StatusBar hidden={true} />
                <Animated.Image 
                    source={require('../assets/images/image1.jpg')}
                    style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
                    resizeMode="cover"
                />
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
