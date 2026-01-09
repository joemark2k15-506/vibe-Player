// @ts-ignore
import * as FileSystem from 'expo-file-system';
import { FlacParser } from './logic/FlacParser';
import { Id3Parser } from './logic/Id3Parser';
import { M4AParser } from './logic/M4AParser';
import { extractBasicMetadata, NativeMetadata } from './NativeMetadataService';

/**
 * Metadata Service - Powered by jsmediatags
 * A proven, powerful library for ID3/MP4 parsing.
 */

export const parseFileMetadata = async (uri: string): Promise<NativeMetadata> => {
    return extractBasicMetadata(uri);
};

// Simple In-Memory Cache
const metadataCache = new Map<string, Partial<NativeMetadata>>();

export const clearMetadataCache = () => {
    metadataCache.clear();
};

export const getEmbeddedMetadata = async (uri: string): Promise<Partial<NativeMetadata> | null> => {
    // Check Cache
    if (metadataCache.has(uri)) {
        // console.log(`[MetadataService] Cache HIT for: ${uri}`);
        return metadataCache.get(uri) || null;
    }

    return new Promise(async (resolve) => {
        // Helper to allow one-time resolution
        let isResolved = false;
        const safeResolve = (val: any) => {
            if (!isResolved) {
                isResolved = true;
                // Save to Cache
                if (val) metadataCache.set(uri, val);
                resolve(val);
            }
        };

        let size = 0;

        try {
            console.log(`[MetadataService] Processing: ${uri}`);
            const fileInfo = await FileSystem.getInfoAsync(uri);
            if (!fileInfo.exists) {
                safeResolve(null);
                return;
            }
            size = fileInfo.size;
            
            // 1. MP3 Strategy
            const lowerUri = uri.toLowerCase();
            if (lowerUri.endsWith('.mp3')) {
                console.log('[MetadataService] MP3 detected -> Using Id3Parser.');
                const meta = await Id3Parser.extractMetadata(uri);
                if (meta) {
                    safeResolve(meta);
                    return;
                }
            }
            
            // 2. M4A Strategy
            if (lowerUri.endsWith('.m4a') || lowerUri.includes('m4a')) {
                console.log('[MetadataService] M4A detected -> Using M4AParser.');
                const meta = await M4AParser.extractMetadata(uri);
                if (meta) {
                    safeResolve(meta);
                    return;
                }
            }

            // 3. FLAC Strategy
            if (lowerUri.endsWith('.flac')) {
                console.log('[MetadataService] FLAC detected -> Using FlacParser.');
                const meta = await FlacParser.extractMetadata(uri);
                if (meta) {
                    safeResolve(meta);
                    return;
                }
            }

            // 4. Safety Net (Disable jsmediatags)
            // If custom parsers failed, we must NOT call jsmediatags as it crashes with 'overrideMimeType'.
            // We simply resolve with null, allowing the UI to show the filename.
            console.log('[MetadataService] Local metadata extraction skipped (No tags found).');
            safeResolve(null);
            return;

        } catch (e: any) {
            console.warn('[MetadataService] Extraction CRITICAL FAILURE:', e.message);
            if (e.message && e.message.includes('readUInt')) {
                console.error('[MetadataService] This looks like a Buffer polyfill failure. Check shim.js.');
            }
            // FIX: Ensure fallbacks run even if jsmediatags crashes synchronously
            runFallbacks(uri, size).then(safeResolve);
        }
    });
};

// Fallback logic separated for clarity
// Fallback logic separated for clarity
const runFallbacks = async (uri: string, size: number): Promise<Partial<NativeMetadata> | null> => {
     try {
        console.log(`[MetadataService] Running fallbacks for: ${uri} (${size} bytes)`);
        const lowerUri = uri.toLowerCase();
        
        // Strategy: Try parsers based on extension first, then try others if they fail or no extension match.
        
        // 1. M4AParser (Excellent for Apple formats)
        // Try if extension matches OR if absolutely no extension clue is present
        let m4aResult = null;
        if (lowerUri.endsWith('.m4a') || lowerUri.includes('m4a')) {
             console.log('[MetadataService] Fallback: M4A Extension detected.');
             m4aResult = await M4AParser.extractMetadata(uri);
        }
        if (m4aResult) return m4aResult;

        // 2. ID3Parser (Lightweight MP3)
        let id3Result = null;
        if (lowerUri.endsWith('.mp3')) {
            console.log('[MetadataService] Fallback: MP3 Extension detected.');
            id3Result = await Id3Parser.extractMetadata(uri);
        }
        if (id3Result) return id3Result;

        // 3. FlacParser (Vorbis Comments + Picture)
        let flacResult = null;
        if (lowerUri.endsWith('.flac')) {
            console.log('[MetadataService] Fallback: FLAC Extension detected.');
            flacResult = await FlacParser.extractMetadata(uri);
        }
        if (flacResult) return flacResult;

        // 4. AGGRESSIVE SNIFFING (If extension check failed or returned null)
        console.log('[MetadataService] Fallback: Extension match failed. Attempting Header Sniffing...');
        
        // Try M4A First (Common cause of issues)
        try {
            const m4a = await M4AParser.extractMetadata(uri);
            if (m4a) { 
                console.log('[MetadataService] Sniffed as M4A');
                return m4a; 
            }
        } catch (ignore) {}

        // Try ID3
        try {
            const id3 = await Id3Parser.extractMetadata(uri);
            if (id3) {
                console.log('[MetadataService] Sniffed as ID3/MP3');
                return id3;
            }
        } catch (ignore) {}

        // Try FLAC
        try {
            const flac = await FlacParser.extractMetadata(uri);
            if (flac) {
                console.log('[MetadataService] Sniffed as FLAC');
                return flac;
            }
        } catch (ignore) {}

     } catch (err) {
         console.warn('[MetadataService] Fallback extraction failed:', err);
     }
     return null;
};


