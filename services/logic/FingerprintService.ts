import { NormalizationService } from './NormalizationService';
import { Song } from './Types';

/**
 * STRICT LOGIC: Search Fingerprint
 * 
 * Rules:
 * - Deterministic generation
 * - Uses cleaned filename
 * - Uses duration (±2s tolerance handled in matching, exact here)
 * - Uses artist if available
 * 
 * NO AI/Probabilistic guessing.
 */
export class FingerprintService {

  /**
   * Generates a deterministic fingerprint string for internal caching/lookup.
   * Format: `clean_title|duration_sec|clean_artist`
   */
  static generate(song: Song): string {
    const titlePart = NormalizationService.normalize(song.title);
    // Round duration to nearest second to handle minor inconsistencies
    const durationSec = Math.round(song.duration / 1000); 
    const artistPart = NormalizationService.normalize(song.artist || 'unknown');

    return `${titlePart}|${durationSec}|${artistPart}`;
  }

  /**
   * Generates a detailed fingerprint object for precise matching.
   */
  static generateFingerprintObject(song: Song) {
      return {
          title: NormalizationService.normalize(song.title),
          durationMs: song.duration,
          artist: NormalizationService.normalize(song.artist || ''),
          filenameClean: NormalizationService.cleanFilename(song.filename)
      };
  }
}
