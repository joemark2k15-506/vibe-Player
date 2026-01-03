import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEmbeddedMetadata } from './MetadataService';
import { extractBasicMetadata, NativeMetadata } from './NativeMetadataService';
import { fetchDeepMetadata } from './ServerMetadataService';

/**
 * Metadata Repository
 * 
 * "The Source of Truth"
 * 
 * Strategy:
 * 1. Fast: Return Cached/Native immediately
 * 2. Deep: Background fetch from Server -> Merge & Update
 */

const CACHE_KEY_PREFIX = 'meta_v1_';

export interface UnifiedMetadata extends NativeMetadata {
    source: 'NATIVE' | 'SERVER' | 'CACHE' | 'MANUAL';
    lastUpdated: number;
}

class MetadataRepository {

    // In-memory cache for session speed
    private memCache = new Map<string, UnifiedMetadata>();

    /**
     * Get metadata for a file.
     * Guaranteed to return *something* valid (Native or Basic).
     */
    async getMetadata(uri: string, filename: string): Promise<UnifiedMetadata> {
        // 1. Check Memory or Disk Cache
        const cached = await this.getFromCache(uri);
        if (cached) {
             // Potentially check if stale here
             return cached;
        }

        // 2a. Fallback to Native (Filename parsing) - FASTEST, SAFE
        const native = await extractBasicMetadata(uri);

        // 2b. Attempt Embedded Extraction (ID3/M4A) - SLIGHTLY SLOWER, BIT BETTER
        // We merged this logic here to avoid a separate async step in UI
        let embedded: any = {};
        try {
            embedded = await getEmbeddedMetadata(uri);
        } catch (e) { console.warn('Embedded fail', e); }

        const unified: UnifiedMetadata = {
            ...native,       // Filename defaults
            ...embedded,     // Overwrite with real tags if found
            // Ensure we don't have partial updates wiping out keys
            title: embedded?.title || native.title,
            artist: embedded?.artist || native.artist,
            
            source: 'NATIVE',
            lastUpdated: Date.now()
        };

        // 3. Cache and Return (Don't wait for server here)
        this.saveToCache(uri, unified);
        
        // 4. Trigger Server Enrich (Fire and Forget)
        this.enrichInBackground(uri, filename);

        return unified;
    }

    private async getFromCache(uri: string): Promise<UnifiedMetadata | null> {
        if (this.memCache.has(uri)) return this.memCache.get(uri)!;
        
        try {
            // Hash URI for key? Just use simple key for now
            const json = await AsyncStorage.getItem(CACHE_KEY_PREFIX + uri);
            if (json) {
                const data = JSON.parse(json);
                this.memCache.set(uri, data);
                return data;
            }
        } catch (e) {
            // Cache fail is non-fatal
        }
        return null;
    }

    private async saveToCache(uri: string, data: UnifiedMetadata) {
        this.memCache.set(uri, data);
        AsyncStorage.setItem(CACHE_KEY_PREFIX + uri, JSON.stringify(data)).catch(() => {});
    }

    /**
     * Background Enrichment
     */
    private async enrichInBackground(uri: string, filename: string) {
        try {
             // 1. Fetch Server
             const serverData = await fetchDeepMetadata(uri, filename);
             if (serverData && serverData.serverConfidence > 0.8) {
                 // 2. Merge
                 const current = await this.getFromCache(uri) || { source: 'NATIVE', lastUpdated: 0 };
                 
                 // Overwrite rules: Server > Native (usually)
                 const merged: UnifiedMetadata = {
                     ...current,
                     ...serverData, // Apply server fields
                     source: 'SERVER',
                     lastUpdated: Date.now()
                 };

                 this.saveToCache(uri, merged);
                 // Emit event or listener if we want UI to update live?
             }
        } catch (e) {
            // Ignore server errors
        }
    }
}

export const SharedMetadataRepository = new MetadataRepository();
