import { decode, encode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

export class FlacParser {

    static async extractMetadata(uri: string): Promise<{ title?: string; artist?: string; album?: string; artwork?: string } | null> {
        try {
            console.log(`[FlacParser] Starting Scan for: ${uri}`);
            
            const fileInfo = await FileSystem.getInfoAsync(uri);
            if (!fileInfo.exists) return null;
            const fileSize = (fileInfo as any).size;

            // 1. Read Header + First Chunk (Cover header usually early)
            const initialSize = Math.min(fileSize, 2 * 1024 * 1024); // 2MB should cover comments + artwork
            let bufferBase64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
                position: 0,
                length: initialSize
            });
            
            let buffer = new Uint8Array(decode(bufferBase64));
            let view = new DataView(buffer.buffer);
            
            if (this.readString(buffer, 0, 4) !== 'fLaC') {
                console.warn('[FlacParser] Not a valid FLAC file (missing magic bytes)');
                return null;
            }

            const metadata: any = {};
            let offset = 4; // Skip fLaC
            
            let isLast = false;
            while (!isLast && offset < buffer.length) {
                // Block Header: 1 byte (Flag + Type), 3 bytes Length
                if (offset + 4 > buffer.length) break;
                
                const headerByte = buffer[offset];
                isLast = (headerByte & 0x80) !== 0;
                const type = headerByte & 0x7F;
                
                // Read 24-bit length (Big Endian)
                const length = ((buffer[offset + 1] << 16) | (buffer[offset + 2] << 8) | buffer[offset + 3]);
                
                const totalBlockSize = 4 + length;
                const nextOffset = offset + totalBlockSize;
                
                if (offset + 4 + length > buffer.length) {
                    console.warn(`[FlacParser] Block ${type} truncated (needed ${length} bytes). 2MB limit reached.`);
                    break; 
                }

                // TYPE 4: VORBIS_COMMENT
                if (type === 4) {
                    this.parseVorbisComment(buffer.subarray(offset + 4, nextOffset), metadata);
                }
                
                if (type === 6) {
                    const art = await this.parsePictureBlock(buffer.subarray(offset + 4, nextOffset));
                    if (art) metadata.artwork = art;
                }

                offset = nextOffset;
            }

            return metadata;
        } catch (e) {
            console.warn('[FlacParser] Extraction Error:', e);
            return null;
        }
    }

    private static parseVorbisComment(block: Uint8Array, metadata: any) {
        try {
            const view = new DataView(block.buffer, block.byteOffset, block.byteLength);
            // Little Endian layout
            let p = 0;
            // Vendor Length (LE 32)
            const vendorLen = view.getUint32(p, true);
            p += 4 + vendorLen;
            
            // List Count (LE 32)
            const listCount = view.getUint32(p, true);
            p += 4;
            
            for (let i = 0; i < listCount; i++) {
                if (p + 4 > block.length) break;
                const len = view.getUint32(p, true);
                p += 4;
                if (p + len > block.length) break;
                
                const comment = this.readString(block, p, p + len);
                p += len;
                
                const split = comment.indexOf('=');
                if (split > -1) {
                    const key = comment.substring(0, split).toUpperCase();
                    const val = comment.substring(split + 1);
                    
                    if (key === 'TITLE') metadata.title = val;
                    if (key === 'ARTIST') metadata.artist = val;
                    if (key === 'ALBUM') metadata.album = val;
                }
            }
        } catch (e) {
            console.log('[FlacParser] Error parsing Vorbis Comments', e);
        }
    }

    private static async parsePictureBlock(block: Uint8Array): Promise<string | null> {
        try {
            const view = new DataView(block.buffer, block.byteOffset, block.byteLength);
            let p = 0;
            const pictureType = view.getUint32(p, false); // Big Endian
            p += 4;
            
            const mimeLen = view.getUint32(p, false);
            p += 4;
            const mime = this.readString(block, p, p + mimeLen);
            p += mimeLen;
            
            const descLen = view.getUint32(p, false);
            p += 4 + descLen;
            
            // Width, Height, Depth, Colors (4*4 = 16 bytes)
            p += 16;
            
            const dataLen = view.getUint32(p, false);
            p += 4;
            
            const data = block.subarray(p, p + dataLen);
            // OPTIMIZATION: Write to file instead of returning massive base64 string
            try {
                // We must slice the buffer because subarray shares the same underlying ArrayBuffer
                const rawBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
                const base64 = encode(rawBuffer);
                
                const ext = mime.includes('png') ? '.png' : '.jpg';
                const fileName = `art_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`;
                const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
                
                await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                console.log(`[FlacParser] Cached cover art to: ${fileUri}`);
                
                return fileUri;
            } catch (e) {
                console.warn('[FlacParser] Failed to cache cover art', e);
                return null;
            }
        } catch (e) {
            console.warn('[FlacParser] Error parsing Picture', e);
            return null;
        }
    }

    private static readString(buffer: Uint8Array, start: number, end: number): string {
        // Native TextDecoder is supported in Hermes, but for safety in older envs/polyfills we do simple ASCII/UTF8 extraction
        // Since we are replacing Buffer, we can't use toString('utf8')
        // Ideally we use TextDecoder if available, or manual loop
        // Most metadata is ASCII or simple UTF8.
        if (typeof TextDecoder !== 'undefined') {
             return new TextDecoder('utf-8').decode(buffer.subarray(start, end));
        }
        
        // Manual Fallback
        let str = '';
        for (let i = start; i < end; i++) {
            if (i >= buffer.length) break;
            str += String.fromCharCode(buffer[i]);
        }
        return decodeURIComponent(escape(str)); // Simple UTF8 hack or just return str if ascii
    }
    
    private static uint8ToBase64(u8Arr: Uint8Array): string {
        return encode(u8Arr.buffer as ArrayBuffer);
    }
}
