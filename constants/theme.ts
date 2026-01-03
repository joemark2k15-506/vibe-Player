/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';

export const Colors = {
  light: {
    text: '#1A1A1A', // Softer Black
    textSecondary: '#64748B', // Slate Gray
    background: '#F2F2F7', // Softer Off-White (iOS System Grey 6)
    primary: '#FF4E00', // Neon Orange
    secondary: '#BD00FF', // Neon Purple
    tint: tintColorLight,
    icon: '#475569',
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorLight,
    surface: '#FFFFFF', // Pure White Cards
    border: '#E2E8F0',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#D1D5DB', // Light Gray
    background: '#120924', // Deep Royal Shadow
    primary: '#00E4FF', // Electric Cyan
    secondary: '#D400FF', // Electric Purple
    tint: '#00E4FF',
    icon: '#FFFFFF',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#00E4FF',
    surface: 'rgba(255, 255, 255, 0.1)', // High Visibility Glass
    border: 'rgba(255, 255, 255, 0.15)',
  },
};

export const Shadows = {
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
  neonOrange: {
    shadowColor: '#FF4E00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
};

export const Fonts = {
  branding: 'Righteous_400Regular',
  montserrat: 'Montserrat_400Regular',
  montserratSemiBold: 'Montserrat_600SemiBold',
  montserratBold: 'Montserrat_700Bold',
  montserratExtraBold: 'Montserrat_800ExtraBold',
  montserratBlack: 'Montserrat_900Black',
  kanit: 'Kanit_400Regular',
  kanitSemiBold: 'Kanit_600SemiBold',
  kanitBold: 'Kanit_700Bold',
  inter: 'Montserrat_400Regular',
  interSemiBold: 'Montserrat_600SemiBold',
  interBold: 'Montserrat_700Bold',
  interBlack: 'Montserrat_900Black',
  ios: Platform.select({
    ios: {
      sans: 'system-ui',
      serif: 'ui-serif',
      rounded: 'ui-rounded',
      mono: 'ui-monospace',
    },
    default: {
      sans: 'normal',
      serif: 'serif',
      rounded: 'normal',
      mono: 'monospace',
    },
  })
};
