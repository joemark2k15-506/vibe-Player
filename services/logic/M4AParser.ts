import { decode, encode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

/**
 * Intelligent M4A/MP4 Atom Parser
 * Implements "Deep Scan" by efficiently seeking through the file structure
 * to locate and fetch only the metadata atoms, regardless of file size.
 * 
 * REFACTOR: Using DataView/Uint8Array to avoid Buffer polyfill issues.
 */
export class M4AParser {

    static async extractMetadata(uri: string): Promise<{ title?: string; artist?: string; director?: string; artwork?: string } | null> {
        try {
            console.log(`[M4AParser] Starting Smart Scan for: ${uri}`);
            
            const fileInfo = await FileSystem.getInfoAsync(uri);
            if (!fileInfo.exists) return null;
            const fileSize = (fileInfo as any).size;

            let cursor = 0;
            // Limit scan to avoid infinite loops on corrupted files
            const MAX_SCAN_DEPTH = 50 * 1024 * 1024; 
            
            while (cursor < fileSize) {
                // Read Atom Header (Size + Type) = 8 bytes
                const headerBase64 = await FileSystem.readAsStringAsync(uri, {
                    encoding: FileSystem.EncodingType.Base64,
                    position: cursor,
                    length: 8
                });
                
                if (!headerBase64 || headerBase64.length === 0) break;
                
                const header = new Uint8Array(decode(headerBase64));
                const view = new DataView(header.buffer);

                const size = view.getUint32(0, false); // Big Endian
                const type = this.readString(header, 4, 8);
                
                if (type === 'moov') {
                    console.log(`[M4AParser] Found 'moov' at ${cursor}. Fetching payload (${size} bytes)...`);
                    
                    const fetchSize = Math.min(size, 8 * 1024 * 1024); // Cap at 8MB
                    
                    const moovBase64 = await FileSystem.readAsStringAsync(uri, {
                        encoding: FileSystem.EncodingType.Base64,
                        position: cursor,
                        length: fetchSize
                    });
                    
                    const moovData = new Uint8Array(decode(moovBase64));
                    return await this.parseBuffer(moovData, cursor, uri);
                }
                
                if (size < 8) {
                    if (size === 1) {
                         console.log('[M4AParser] 64-bit atom detected, stopping scan.');
                         break;
                    }
                    break;
                }
                
                cursor += size;
            }

        } catch (e) {
            console.warn('[M4AParser] Smart Scan Error:', e);
        }
        return null;
    }

    private static async parseBuffer(buffer: Uint8Array, globalOffset: number, uri: string): Promise<any> {
        const metadata: any = {};
        const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        
        let offset = 8; // Default skip (Size + Type)
        
        // Peek container type check
        if (buffer.length >= 8) {
            const containerType = this.readString(buffer, 4, 8);
            if (containerType === 'meta') {
                offset += 4; // 'meta' has 4 bytes Version/Flags
            }
        }
                        
        while (offset + 8 <= buffer.length) {
            const size = view.getUint32(offset, false); // Big Endian
            const type = this.readString(buffer, offset + 4, offset + 8);
            
            if (size <= 0) break;
            const atomEnd = offset + size;
            const absoluteAtomStart = globalOffset + offset;
            
            // Handle Truncated Atoms
            if (atomEnd > buffer.length) {
                 if (['udta', 'meta', 'ilst'].includes(type) || type === 'covr') {
                     console.log(`[M4AParser] Truncated Atom '${type}' detected. Fetching full atom (${size} bytes)...`);
                     try {
                         const fetchLimit = Math.min(size, 15 * 1024 * 1024);
                         const atomDataBase64 = await FileSystem.readAsStringAsync(uri, {
                             encoding: FileSystem.EncodingType.Base64,
                             position: absoluteAtomStart,
                             length: fetchLimit
                         });
                         const newBuffer = new Uint8Array(decode(atomDataBase64));
                         
                         const childMeta = await this.parseBuffer(newBuffer, absoluteAtomStart, uri);
                         Object.assign(metadata, childMeta);
                         
                     } catch (fetchErr) {
                         console.warn(`[M4AParser] Failed to fetch truncated '${type}'`, fetchErr);
                     }
                 }
                 offset += size; 
                 continue;
            }

            if (['udta', 'meta', 'ilst'].includes(type) || type === 'covr') {
                let childOffset = offset + 8;
                if (type === 'meta') childOffset += 4;
                
                if (type === 'covr') {
                     const dataBlock = buffer.subarray(childOffset, atomEnd);
                     const covrMeta = await this.parseCovrData(dataBlock);
                     Object.assign(metadata, covrMeta);
                } else {
                    const childBuffer = buffer.subarray(offset, atomEnd); 
                    const childGlobal = globalOffset + offset;
                    const childMeta = await this.parseBuffer(childBuffer, childGlobal, uri);
                    Object.assign(metadata, childMeta);
                }
            } else if (['©nam', '©ART', '©alb', '©wrt', 'nam', 'ART', 'alb'].includes(type)) {
                 const dataSize = view.getUint32(offset + 8, false);
                 const dataType = this.readString(buffer, offset + 12, offset + 16);
                 if (dataType === 'data') {
                      const textLen = dataSize - 16;
                      const textStart = offset + 24; 
                      const val = this.readString(buffer, textStart, textStart + textLen).trim();
                      if (type === '©nam' || type === 'nam') metadata.title = val;
                      if (type === '©ART' || type === 'ART') metadata.artist = val;
                      if (type === '©wrt') metadata.director = val;
                 }
            }
            
            offset += size;
        }
        
        return metadata;
    }
    
    private static async parseCovrData(buffer: Uint8Array): Promise<{ artwork?: string } | {}> {
        const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        let offset = 0;
        
        while (offset + 8 < buffer.length) {
             const size = view.getUint32(offset, false);
             const type = this.readString(buffer, offset + 4, offset + 8);
             
             if (type === 'data') {
                 // Header is 16 bytes
                 const mime = this.detectMime(buffer.subarray(offset + 16, offset + 20));
                 const imgData = buffer.subarray(offset + 16, offset + size);
                 
                 // OPTIMIZATION: Write to file instead of returning massive base64 string
                 try {
                     // We must slice the buffer because subarray shares the same underlying ArrayBuffer
                     const rawBuffer = imgData.buffer.slice(imgData.byteOffset, imgData.byteOffset + imgData.byteLength) as ArrayBuffer;
                     const base64 = encode(rawBuffer);
                     
                     const ext = mime.includes('png') ? '.png' : '.jpg';
                     const fileName = `art_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`;
                     const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
                     
                     await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                     console.log(`[M4AParser] Cached cover art to: ${fileUri}`);
                     return { artwork: fileUri };
                     
                 } catch (e) {
                     console.warn('[M4AParser] Failed to cache cover art', e);
                     return {};
                 }
             }
             offset += size;
        }
        return {};
    }

    private static detectMime(header: Uint8Array): string {
        if (header[0] === 0x89 && header[1] === 0x50) return 'image/png';
        return 'image/jpeg';
    }

    private static readString(buffer: Uint8Array, start: number, end: number): string {
        let str = '';
        for (let i = start; i < end; i++) {
            if (i >= buffer.length) break;
            if (buffer[i] === 0) continue; // Skip nulls
            str += String.fromCharCode(buffer[i]);
        }
        return str;
    }

    private static uint8ToBase64(u8Arr: Uint8Array): string {
        return encode(u8Arr.buffer as ArrayBuffer);
    }

}
