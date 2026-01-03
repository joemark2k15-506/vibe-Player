import { NativeModules, Platform } from 'react-native';

/**
 * Safely extracts colors from an image URI.
 * Catches errors if the native module is missing (common if prebuild/rebuild hasn't happened).
 */
export const extractColors = async (
    uri: string | undefined | null, 
    fallback: string
): Promise<string> => {
    if (!uri) return fallback;

    // Safety check: Ensure native module exists before require
    const hasNativeModule = NativeModules.ImageColors || NativeModules.RNCImageColors;
    if (!hasNativeModule) {
        console.log('[ColorService] Native module missing, skipping extraction.');
        return fallback;
    }

    try {
        // Dynamic require to prevent crash at module parse time if native module is missing
        const { getColors } = require('react-native-image-colors');
        
        const result = await getColors(uri, {
            fallback: fallback,
            cache: true,
            key: uri,
        });

        if (Platform.OS === 'android') {
            // Android platform properties
            return (result as any).average || (result as any).dominant || fallback;
        } else {
            // iOS platform properties
            return (result as any).background || (result as any).primary || fallback;
        }
    } catch (error) {
        // Use a less alarming log if it's just the missing module
        console.log('Color extraction skipped: Native module not ready.');
        return fallback;
    }
};
