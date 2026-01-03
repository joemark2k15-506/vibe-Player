import { useEffect, useState } from 'react';

interface ImageColors {
  primary: string;
  secondary: string;
  background: string;
  detail: string;
}

const DEFAULT_COLORS: ImageColors = {
  primary: '#FF0099',
  secondary: '#BD00FF',
  background: '#000000',
  detail: '#FFFFFF'
};

import { getColors } from 'react-native-image-colors';

// ... imports
import { useColorScheme } from 'react-native';
// ... inside hook
export const useImageColors = (
  url?: string | null,
  fallbackColors: ImageColors = DEFAULT_COLORS
) => {
  const [colors, setColors] = useState<ImageColors>(fallbackColors);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (!url) {
        setColors(fallbackColors);
        return;
    }

    const fetchColors = async () => {
        try {
            const result = await getColors(url, {
                fallback: '#000000',
                cache: true,
                key: url.length > 100 ? url.substring(0, 50) + url.length : url,
            });

            if (result.platform === 'android') {
                // Adaptive logic based on Theme
                const bg = isDark 
                    ? (result.darkVibrant || result.average || result.dominant)
                    : (result.lightVibrant || result.lightMuted || result.dominant);
                
                // Ensure we don't get a null/undefined value (fallback to default)
                const safeBg = bg || fallbackColors.background;

                setColors({
                    primary: result.dominant || fallbackColors.primary,
                    secondary: result.vibrant || fallbackColors.secondary,
                    background: safeBg,
                    detail: isDark ? (result.lightVibrant || '#FFFFFF') : (result.darkVibrant || '#000000')
                });
            } else if (result.platform === 'ios') {
                setColors({
                    primary: result.primary || fallbackColors.primary,
                    secondary: result.secondary || fallbackColors.secondary,
                    background: result.background || fallbackColors.background,
                    detail: result.detail || fallbackColors.detail
                });
            }
        } catch (e) {
             console.warn('[useImageColors] Color extraction failed:', e);
             setColors(fallbackColors);
        }
    };

    fetchColors();
  }, [url, isDark]); // Re-run if theme changes

  return { colors, loading: false, error: null };
};
