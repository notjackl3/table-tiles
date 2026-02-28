import type { HitResult } from '../../types/shared';

// Hit window thresholds (in pixels from hit line)
export const HIT_WINDOWS = {
  perfect: 30,
  good: 60,
  miss: 100
};

// Points awarded
export const POINTS = {
  perfect: 100,
  good: 50,
  miss: 0
};

// Combo multiplier thresholds
export const COMBO_MULTIPLIERS = [
  { threshold: 0, multiplier: 1 },
  { threshold: 10, multiplier: 1.5 },
  { threshold: 25, multiplier: 2 },
  { threshold: 50, multiplier: 2.5 },
  { threshold: 100, multiplier: 3 }
];

export interface ScoreStats {
  score: number;
  combo: number;
  maxCombo: number;
  accuracy: number;
  perfectHits: number;
  goodHits: number;
  misses: number;
  totalNotes: number;
}

export class ScoringEngine {
  private stats: ScoreStats = {
    score: 0,
    combo: 0,
    maxCombo: 0,
    accuracy: 1,
    perfectHits: 0,
    goodHits: 0,
    misses: 0,
    totalNotes: 0
  };

  /**
   * Calculate hit result based on distance from hit line
   */
  calculateHitResult(distance: number): HitResult {
    const absDist = Math.abs(distance);

    if (absDist <= HIT_WINDOWS.perfect) {
      return {
        quality: 'perfect',
        points: POINTS.perfect,
        distance: absDist
      };
    } else if (absDist <= HIT_WINDOWS.good) {
      return {
        quality: 'good',
        points: POINTS.good,
        distance: absDist
      };
    } else {
      return {
        quality: 'miss',
        points: POINTS.miss,
        distance: absDist
      };
    }
  }

  /**
   * Get current combo multiplier
   */
  getComboMultiplier(): number {
    for (let i = COMBO_MULTIPLIERS.length - 1; i >= 0; i--) {
      if (this.stats.combo >= COMBO_MULTIPLIERS[i].threshold) {
        return COMBO_MULTIPLIERS[i].multiplier;
      }
    }
    return 1;
  }

  /**
   * Register a hit
   */
  registerHit(hitResult: HitResult) {
    const multiplier = this.getComboMultiplier();
    const points = Math.floor(hitResult.points * multiplier);

    this.stats.score += points;
    this.stats.totalNotes++;

    if (hitResult.quality === 'perfect') {
      this.stats.perfectHits++;
      this.stats.combo++;
    } else if (hitResult.quality === 'good') {
      this.stats.goodHits++;
      this.stats.combo++;
    } else {
      this.stats.misses++;
      this.stats.combo = 0;
    }

    // Update max combo
    if (this.stats.combo > this.stats.maxCombo) {
      this.stats.maxCombo = this.stats.combo;
    }

    // Update accuracy
    this.updateAccuracy();
  }

  /**
   * Register a miss (tile passed without being hit)
   */
  registerMiss() {
    this.stats.misses++;
    this.stats.totalNotes++;
    this.stats.combo = 0;
    this.updateAccuracy();
  }

  private updateAccuracy() {
    if (this.stats.totalNotes === 0) {
      this.stats.accuracy = 1;
    } else {
      const hits = this.stats.perfectHits + this.stats.goodHits;
      this.stats.accuracy = hits / this.stats.totalNotes;
    }
  }

  /**
   * Get current stats
   */
  getStats(): ScoreStats {
    return { ...this.stats };
  }

  /**
   * Reset scoring
   */
  reset() {
    this.stats = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      accuracy: 1,
      perfectHits: 0,
      goodHits: 0,
      misses: 0,
      totalNotes: 0
    };
  }
}
