import { encode } from 'base64-arraybuffer';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system';

export class Id3Parser {
    static async extractMetadata(uri: string): Promise<{ title?: string; artist?: string; director?: string; artwork?: string } | null> {
        const metadata: any = {};
        try {
            // Read tiny header (1KB) first to verify if it's even an ID3 file
            const headerChunk = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
                length: 1024,
                position: 0
            });
            const headerBuffer = Buffer.from(headerChunk, 'base64');
            // const headerBuffer declared above, no need to redeclare
             
            // Check for ID3 signature (relaxed: scan first 128 bytes in case of garbage)
            let id3Offset = headerBuffer.indexOf('ID3');
            if (id3Offset === -1 || id3Offset > 128) {
                console.warn(`[Id3Parser] ID3 Header not found in first 128 bytes. Magic: ${headerBuffer.subarray(0, 3).toString()}`);
                return null;
            }
            console.log(`[Id3Parser] Found ID3 header at offset ${id3Offset}`);

            // Verified! Now read enough for a lot of tags (1MB to be safe for large cover art)
            const chunk = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
                length: 1048576, 
                position: 0
            });
            
            const buffer = Buffer.from(chunk, 'base64');
            const version = buffer[id3Offset + 3];
            
            // Syncsafe integer for size
            const tagSize = ((buffer[id3Offset + 6] & 0x7f) << 21) |
                            ((buffer[id3Offset + 7] & 0x7f) << 14) |
                            ((buffer[id3Offset + 8] & 0x7f) << 7) |
                            (buffer[id3Offset + 9] & 0x7f);
                         
            // Limit search to what we read or the tag size
            const limit = Math.min(id3Offset + tagSize + 10, buffer.length);
            
            let pos = id3Offset + 10; // Skip Header
            
            while (pos < limit) {
                // Prevent reading past buffer
                if (pos + 10 > limit) break;

                let frameId = '';
                let frameSize = 0;
                let headerSize = 0;
                
                if (version === 3 || version === 4) {
                    frameId = buffer.toString('utf8', pos, pos + 4);
                    if (frameId.charCodeAt(0) === 0) break;

                    if (version === 3) {
                         frameSize = buffer.readUInt32BE(pos + 4);
                    } else {
                         const b = buffer.subarray(pos + 4, pos + 8);
                         frameSize = ((b[0] & 0x7f) << 21) | ((b[1] & 0x7f) << 14) | ((b[2] & 0x7f) << 7) | (b[3] & 0x7f);
                    }
                    headerSize = 10;
                } else if (version === 2) {
                    frameId = buffer.toString('utf8', pos, pos + 3);
                    if (frameId.charCodeAt(0) === 0) break;

                    const b = buffer.subarray(pos + 3, pos + 6);
                    frameSize = (b[0] << 16) | (b[1] << 8) | b[2];
                    headerSize = 6;
                } else {
                    break;
                }
                
                if (frameSize <= 0 || pos + headerSize + frameSize > buffer.length) break;

                if (frameId === 'APIC' || frameId === 'PIC') {
                    const frameBody = buffer.subarray(pos + headerSize, pos + headerSize + frameSize);
                    // Await the now-async file writer
                    metadata.artwork = await this.parseApic(frameBody, version);
                } else if (['TIT2', 'TT2', 'TPE1', 'TP1', 'TCOM', 'TCM'].includes(frameId)) {
                    const frameBody = buffer.subarray(pos + headerSize, pos + headerSize + frameSize);
                    const text = this.parseText(frameBody);
                    
                    if (text) {
                        if (frameId === 'TIT2' || frameId === 'TT2') metadata.title = text;
                        if (frameId === 'TPE1' || frameId === 'TP1') metadata.artist = text;
                        if (frameId === 'TCOM' || frameId === 'TCM') metadata.director = text;
                    }
                }
                
                pos += headerSize + frameSize;
            }
            
        } catch (e) {
            console.warn('[Id3Parser] Error:', e);
        }
        return Object.keys(metadata).length > 0 ? metadata : null;
    }

    private static parseText(buffer: Buffer): string | null {
        try {
            if (buffer.length < 2) return null;
            const encoding = buffer[0];
            const content = buffer.subarray(1);
            
            // 0 = ISO-8859-1 (Latin-1)
            // 1 = UTF-16 with BOM
            // 2 = UTF-16BE
            // 3 = UTF-8
            
            let text = '';
            
            if (encoding === 1 || encoding === 2) {
                // Quick and dirty UTF-16 to ASCII/UTF-8 for now (removing nulls)
                // Real implementation needs full iconv-lite, but we avoid deps.
                // Just keeping standard ASCII/UTF-8 chars.
                text = content.toString('utf8').replace(/\0/g, ''); 
            } else {
                 text = content.toString('utf8').replace(/\0/g, '');
            }
            return text.trim();
        } catch {
            return null;
        }
    }
    
    private static async parseApic(buffer: Buffer, version: number): Promise<string | null> {
        try {
            let offset = 0;
            const encoding = buffer[0];
            offset += 1;
            
            let mimeType = '';
            if (version === 2) {
                mimeType = 'image/' + buffer.toString('utf8', offset, offset + 3).toLowerCase();
                offset += 3;
            } else {
                const end = buffer.indexOf(0, offset);
                mimeType = buffer.toString('utf8', offset, end);
                offset = end + 1;
            }
            
            offset += 1;
            
            if (encoding === 0 || encoding === 3) {
                 const end = buffer.indexOf(0, offset);
                 offset = end + 1;
            } else {
                 let end = offset;
                 while (end < buffer.length - 1) {
                     if (buffer[end] === 0 && buffer[end + 1] === 0) {
                         break;
                     }
                     end += 2;
                 }
                 offset = end + 2;
            }
            
            // ROBUSTNESS: Scan for JPEG or PNG magic bytes to find the true start of the image.
            // Description fields are notoriously malformed (wrong encoding, missing nulls, etc).
            // We start searching from where we think the description ends (or even earlier if we suspect issues).
            
            let imageStart = offset;
            const searchLimit = Math.min(buffer.length, offset + 512); // Limit scan to next 512 bytes
            
            // Search for JPEG (FF D8 FF) or PNG (89 50 4E 47)
            let foundStart = -1;
            
            for (let i = offset; i < searchLimit; i++) {
                // JPEG: FF D8 is the start of image marker. 
                // We typically expect FF D8 FF, but strictly just FF D8 is the marker.
                if (buffer[i] === 0xFF && buffer[i+1] === 0xD8) {
                     foundStart = i;
                     if (mimeType.indexOf('png') === -1) { 
                         break;
                     }
                }
                else if (buffer[i] === 0x89 && buffer[i+1] === 0x50 && buffer[i+2] === 0x4E && buffer[i+3] === 0x47) {
                     foundStart = i;
                     break; 
                }
            }
            
            if (foundStart !== -1) {
                if (foundStart !== offset) {
                     console.log(`[Id3Parser] Correcting image start offset from ${offset} to ${foundStart} based on magic bytes.`);
                     imageStart = foundStart;
                }
            } else {
                 console.warn(`[Id3Parser] Warning: No Magic Bytes (FF D8 / 89 50) found in scan window! Using default offset ${offset}.`);
            }

            const imageBuffer = buffer.subarray(imageStart);
            
            // CRITICAL FIX: Use base64-arraybuffer instead of Buffer.toString('base64')
            // Buffer polyfills can be unreliable in RN.
            // We must slice the underlying ArrayBuffer because 'subarray' shares memory.
            const rawBuffer = imageBuffer.buffer.slice(imageBuffer.byteOffset, imageBuffer.byteOffset + imageBuffer.byteLength) as ArrayBuffer;
            const base64 = encode(rawBuffer);
            
            const preview = base64.substring(0, 30);
            
            console.log(`[Id3Parser] APIC: mime=${mimeType}, b64Head=${preview}..., size=${imageBuffer.length}, b64Len=${base64.length}`);

            if (mimeType.includes('jpg') || mimeType.includes('jpeg')) mimeType = 'image/jpeg';
            else if (mimeType.includes('png')) mimeType = 'image/png';
            
            // OPTIMIZATION: Write to file instead of returning massive Data URI.
            // This fixes 'useImageColors' failing on Android with large strings and reduces JS memory pressure.
            const ext = mimeType.includes('png') ? '.png' : '.jpg';
            // Simple random hash to avoid collisions
            const fileName = `art_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`;
            const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
            
            await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
            console.log(`[Id3Parser] Cached cover art to: ${fileUri}`);
            
            return fileUri;
            
        } catch (e) {
            console.warn('[Id3Parser] APIC parse error', e);
            return null;
        }
    }
}
