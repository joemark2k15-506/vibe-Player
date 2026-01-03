import { NormalizationService } from './NormalizationService';
import { MetadataResult, Song, VerificationResult } from './Types';

/**
 * STRICT LOGIC: Confidence Scoring
 * 
 * Weights:
 * - Title: 40%
 * - Duration: 30%
 * - Album (Movie): 20%
 * - Artist (Director/Singer): 10%
 * 
 * Threshold: 85%
 */
export class ScoringService {

  private static readonly WEIGHTS = {
    TITLE: 0.4,
    DURATION: 0.3,
    ALBUM: 0.2,
    ARTIST: 0.1
  };

  private static readonly THRESHOLD = 0.85;

  /**
   * Calculates the confidence score for a candidate match against a local song.
   */
  static calculateScore(local: Song, remote: MetadataResult): VerificationResult {
    const titleSim = NormalizationService.compareSimilarity(local.title, remote.title);
    
    // Duration Logic: ±2 seconds tolerance = 100%, else linear drop
    const durDiff = Math.abs(local.duration - remote.duration);
    let durScore = 0;
    if (durDiff <= 2000) {
      durScore = 1;
    } else {
      // Harsh penalty for duration mismatch
      durScore = Math.max(0, 1 - (durDiff / 10000)); 
    }

    const albumSim = NormalizationService.compareSimilarity(local.album || '', remote.album);
    const artistSim = NormalizationService.compareSimilarity(local.artist, remote.artist);

    // Weighted Sum
    const totalScore = 
      (titleSim * this.WEIGHTS.TITLE) +
      (durScore * this.WEIGHTS.DURATION) +
      (albumSim * this.WEIGHTS.ALBUM) +
      (artistSim * this.WEIGHTS.ARTIST);

    // Breakdown for debugging/transparency
    const breakdown = {
      title: titleSim,
      duration: durScore,
      album: albumSim,
      artist: artistSim
    };

    return {
      isMatch: totalScore >= this.THRESHOLD,
      totalScore,
      breakdown
    };
  }

  /**
   * Helper to check if a specific component passes strict validation
   */
  static validateComponent(localVal: string, remoteVal: string, threshold = 0.9): boolean {
    return NormalizationService.compareSimilarity(localVal, remoteVal) >= threshold;
  }
}
