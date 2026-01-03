import { NativeMetadata } from './NativeMetadataService';

/**
 * Server Metadata Service
 * 
 * Responsibilities:
 * - Upload file hash/identifier or small chunk to backend
 * - Receive deep metadata (ID3v2, unsynced lyrics, etc.)
 */

// Stub URL
const API_URL = "https://api.my-music-app.com/v1/metadata";

export interface ServerMetadata extends NativeMetadata {
    lyrics?: string;
    isExplicit?: boolean;
    serverConfidence: number;
}

export const fetchDeepMetadata = async (fileUri: string, filename: string): Promise<ServerMetadata | null> => {
    // Stub implementation for now
    // In real implementation:
    // 1. Calculate file hash
    // 2. Check server DB
    // 3. If missing, maybe upload header
    
    // Simulate network delay
    await new Promise(r => setTimeout(r, 500));

    // Return mock data for demo
    // We only return data if we can pretend to match it.
    if (filename.includes('Coolie')) {
        return {
           title: 'Coolie Disco',
           artist: 'Anirudh Ravichander',
           album: 'Coolie',
           duration: 185000,
           serverConfidence: 0.95
        };
    }
    
    return null;
}
