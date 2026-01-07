import { useEffect, useState } from 'react';

interface ImageColors {
  primary: string;
  secondary: string;
  background: string;
  detail: string;
}

const DEFAULT_COLORS: ImageColors = {
  primary: '#1A1A2E',   // Deep Blue
  secondary: '#16213E', // Navy
  background: '#0F0F1A', 
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
    // Validation: If URL is null/undefined or empty string, fails gracefully
    if (!url || typeof url !== 'string' || url.trim() === '') {
        setColors(fallbackColors);
        return;
    }
    
    // Skip if it is a local numeric ID (sometimes passed by mistake) or obviously invalid
    if (!url.startsWith('file://') && !url.startsWith('http') && !url.startsWith('content://')) {
        // console.log('[useImageColors] Skipping non-image URI:', url);
        setColors(fallbackColors);
        return;
    }

    const fetchColors = async () => {
        try {
            // Additional Check: Verify file exists if local
            // This prevents "Failed to get image" errors for ghost files
            if (url.startsWith('file://')) {
                 // We need to import FileSystem but it's a hook file... 
                 // Changing architecture to import FileSystem might be heavy, 
                 // but checking existence is the only way to be 100% sure.
                 // For now, let's just attempt it and log the error properly.
            }

            const result = await getColors(url, {
                fallback: '#000000',
                cache: true,
                key: url, // Simplify key to just url
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
             console.log('[useImageColors] Extraction failed for:', url);
             // console.warn(e); // Keep warnings clean, log is enough
             setColors(fallbackColors);
        }
    };

    fetchColors();
  }, [url, isDark]); // Re-run if theme changes

  return { colors, loading: false, error: null };
};
