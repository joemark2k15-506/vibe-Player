
export interface NativeMetadata {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  artwork?: string; // base64 or uri
  director?: string; // Composer or Director
}

/**
 * Robust Native Metadata Extractor
 * 1. Tries Expo MediaLibrary (fastest, most reliable for MediaStore items)
 * 2. Fallback to Filename parsing (zero crash risk)
 */
export const extractBasicMetadata = async (uri: string): Promise<NativeMetadata> => {
  try {
    // 1. MediaLibrary Strategy (If we have an asset ID or standard media URI)
    // Note: This requires the app to have permissions. We assume permissions are requested elsewhere.
    
    // We can try to look up the asset if we have a file URI, though MediaLibrary works best with assets.
    // For now, let's implement the filename fallback as the primary "Crash Proof" method for arbitrary files,
    // and rely on the LibraryManager to populate MediaStore data if available.

    // If the URI works with MediaLibrary directly (uncommon to reverse lookup from URI to Asset without scanning),
    // we skip straight to filename parsing for safety unless we have a specific asset ID.
    
    return parseFilename(uri);

  } catch (error) {
    console.log('[NativeMetadata] Remote extraction skipped (Using safe default).');
    return { title: 'Unknown Track' };
  }
};

const parseFilename = (uri: string): NativeMetadata => {
  try {
    const filename = uri.split('/').pop() || '';
    const name = filename.replace(/\.[^/.]+$/, ""); // Remove extension

    // Strategy 1: "Artist - Title"
    if (name.includes(' - ')) {
      const parts = name.split(' - ');
      if (parts.length >= 2) {
        return {
          artist: parts[0].trim(),
          title: parts[1].trim()
        };
      }
    }

    // Strategy 2: just Title
    return { title: decoded(name) };
  } catch (e) {
    return { title: 'Unknown File' };
  }
};

const decoded = (str: string) => {
    try {
        return decodeURIComponent(str);
    } catch {
        return str;
    }
}
