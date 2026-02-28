import type { Point2D } from '../../types/shared';

/**
 * Exponential Moving Average (EMA) filter for smoothing coordinates
 */
export class EMAFilter {
  private alpha: number;
  private smoothedX: number | null = null;
  private smoothedY: number | null = null;

  constructor(alpha: number = 0.3) {
    this.alpha = alpha; // 0 = heavy smoothing, 1 = no smoothing
  }

  update(point: Point2D): Point2D {
    if (this.smoothedX === null || this.smoothedY === null) {
      this.smoothedX = point.x;
      this.smoothedY = point.y;
      return { x: point.x, y: point.y };
    }

    this.smoothedX = this.alpha * point.x + (1 - this.alpha) * this.smoothedX;
    this.smoothedY = this.alpha * point.y + (1 - this.alpha) * this.smoothedY;

    return { x: this.smoothedX, y: this.smoothedY };
  }

  reset() {
    this.smoothedX = null;
    this.smoothedY = null;
  }
}

/**
 * Rolling window for velocity calculation
 */
export class VelocityTracker {
  private history: Array<{ point: Point2D; timestamp: number }> = [];
  private maxHistory: number;

  constructor(maxHistory: number = 5) {
    this.maxHistory = maxHistory;
  }

  update(point: Point2D, timestamp: number): { vx: number; vy: number; speed: number } {
    this.history.push({ point, timestamp });

    // Keep only recent history
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Need at least 2 points to calculate velocity
    if (this.history.length < 2) {
      return { vx: 0, vy: 0, speed: 0 };
    }

    // Calculate average velocity over window
    const oldest = this.history[0];
    const newest = this.history[this.history.length - 1];

    const dt = newest.timestamp - oldest.timestamp;
    if (dt === 0) {
      return { vx: 0, vy: 0, speed: 0 };
    }

    const vx = (newest.point.x - oldest.point.x) / dt;
    const vy = (newest.point.y - oldest.point.y) / dt;
    const speed = Math.sqrt(vx * vx + vy * vy);

    return { vx, vy, speed };
  }

  reset() {
    this.history = [];
  }

  getHistory() {
    return [...this.history];
  }
}

/**
 * One Euro Filter (optional advanced smoothing)
 * Better than EMA for reducing jitter while maintaining responsiveness
 */
export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter: LowPassFilter;
  private dxFilter: LowPassFilter;

  constructor(minCutoff: number = 1.0, beta: number = 0.007, dCutoff: number = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xFilter = new LowPassFilter(this.alpha(minCutoff));
    this.dxFilter = new LowPassFilter(this.alpha(dCutoff));
  }

  private alpha(cutoff: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    const te = 1.0 / 60; // Assume 60fps
    return 1.0 / (1.0 + tau / te);
  }

  filter(x: number, timestamp: number): number {
    const dx = this.xFilter.hasLastValue()
      ? (x - this.xFilter.lastValue()!) * 60 // Convert to per-second
      : 0;

    const edx = this.dxFilter.filter(dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);

    this.xFilter.setAlpha(this.alpha(cutoff));
    return this.xFilter.filter(x);
  }

  reset() {
    this.xFilter.reset();
    this.dxFilter.reset();
  }
}

class LowPassFilter {
  private alpha: number;
  private y: number | null = null;

  constructor(alpha: number) {
    this.alpha = alpha;
  }

  setAlpha(alpha: number) {
    this.alpha = alpha;
  }

  filter(x: number): number {
    if (this.y === null) {
      this.y = x;
      return x;
    }

    this.y = this.alpha * x + (1 - this.alpha) * this.y;
    return this.y;
  }

  hasLastValue(): boolean {
    return this.y !== null;
  }

  lastValue(): number | null {
    return this.y;
  }

  reset() {
    this.y = null;
  }
}
