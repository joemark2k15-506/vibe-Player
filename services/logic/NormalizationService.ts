/**
 * STRICT LOGIC: Metadata Normalization
 * 
 * Rules:
 * - Trim spaces
 * - Lowercase for comparison
 * - Remove symbols (_ - () [] {})
 */

export class NormalizationService {
  
  /**
   * Normalizes a string for strict comparison.
   * Removes symbols, extra spaces, and lowercases.
   */
  static normalize(text: string | undefined): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[_()[\]{}-]/g, ' ') // Replace symbols with space
      .replace(/\s+/g, ' ')         // Collapse multiple spaces
      .trim();
  }

  /**
   * Cleans a filename to extract a potential title.
   * Removes extensions and common noise patterns (track numbers, 'copy').
   */
  static cleanFilename(filename: string): string {
    let clean = filename;
    
    // Remove extension
    const lastDotIndex = clean.lastIndexOf('.');
    if (lastDotIndex > 0) {
      clean = clean.substring(0, lastDotIndex);
    }

    // Remove leading track numbers (e.g., "01. Song", "01 - Song", "01 Song")
    clean = clean.replace(/^\d+[\.\-\s]+/, '');

    // Remove "copy", "unknown"
    clean = clean.replace(/\(copy\)/i, '').replace(/unknown/i, '');

    return this.normalize(clean);
  }

  /**
   * Calculates Levenshtein similarity between two strings.
   * Returns a value between 0 and 1.
   */
  static compareSimilarity(a: string, b: string): number {
    const normA = this.normalize(a);
    const normB = this.normalize(b);

    if (!normA && !normB) return 1;
    if (!normA || !normB) return 0;
    if (normA === normB) return 1;

    const distance = this.levenshteinDistance(normA, normB);
    const maxLength = Math.max(normA.length, normB.length);
    
    return 1 - (distance / maxLength);
  }

  private static levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
  }
}
