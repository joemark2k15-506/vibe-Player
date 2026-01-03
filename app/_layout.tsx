import '../shim';
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
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeOut } from 'react-native-reanimated';
import '../shim';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { GlobalBackground } from '../components/GlobalBackground';
import { PlayerProvider } from '../components/PlayerContext';
import { ThemeProvider, useTheme } from '../components/ThemeContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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
              {/* <GlobalStatusBar /> */} 
              <Stack screenOptions={{
                headerStyle: {
                  backgroundColor: isDark ? '#0F0F1A' : '#ffffff',
                },
                headerTintColor: isDark ? '#fff' : '#000',
                contentStyle: { backgroundColor: 'transparent' }, // Make stack screens transparent
              }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen 
                  name="now-playing" 
                  options={{ 
                    presentation: 'transparentModal', // Allows custom animation below
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

function AnimatedSplashScreen({ onAnimationFinish }: { onAnimationFinish: () => void }) {
  return (
    <Animated.View 
      exiting={FadeOut.duration(500)}
      style={[StyleSheet.absoluteFill, { backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }]}
      pointerEvents="none" 
    >
       <Image 
        source={require('../assets/images/image1.jpg')} 
        style={StyleSheet.absoluteFill} 
        contentFit="cover"
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

  useEffect(() => {
    async function prepare() {
      try {
          // Initialize Audio Mode for Android stability
          await ExpoAudio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            interruptionModeIOS: 2, // InterruptionModeIOS.DuckOthers
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: 2, // InterruptionModeAndroid.DuckOthers
            playThroughEarpieceAndroid: false,
          });
          
          if (fontsLoaded) {
              await SplashScreen.hideAsync();
              setIsReady(true);
              setTimeout(() => {
                  setShowSplash(false);
              }, 100);
          }
      } catch (e) {
          console.warn('Layout preparation failed', e);
      }
    }
    prepare();
  }, [fontsLoaded]);

  if (!isReady && !fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PlayerProvider>
        <ThemeProvider>
          <RootContent />
          {showSplash && <AnimatedSplashScreen onAnimationFinish={() => {}} />}
        </ThemeProvider>
      </PlayerProvider>
    </GestureHandlerRootView>
  );
}
