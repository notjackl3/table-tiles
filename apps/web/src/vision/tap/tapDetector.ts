import type { Point2D, TapEvent, TableCalibration } from '../../types/shared';
import { VelocityTracker, EMAFilter } from './smoothing';
import { applyHomography, isInTableBounds, uvToLane } from '../calibration/homography';

// Tap detection states
type TapState = 'idle' | 'moving_down' | 'tapped' | 'lifting';

interface FingerState {
  state: TapState;
  position: Point2D;
  velocity: { vx: number; vy: number; speed: number };
  lastTapTime: number;
  cooldownUntil: number;
}

// Configuration
const TAP_VELOCITY_THRESHOLD = 0.015; // normalized units per ms (moving downward)
const TAP_CONFIRM_TIME_MS = 100; // time window to confirm tap
const COOLDOWN_MS = 150; // minimum time between taps
const NUM_LANES = 4;

export class TapDetector {
  private fingerStates: Map<number, FingerState> = new Map();
  private velocityTrackers: Map<number, VelocityTracker> = new Map();
  private smoothers: Map<number, EMAFilter> = new Map();
  private calibration: TableCalibration | null = null;

  setCalibration(calibration: TableCalibration) {
    this.calibration = calibration;
  }

  /**
   * Process fingertip landmarks and detect taps
   * @param fingertips Array of fingertip positions (indices 4, 8, 12, 16, 20 from MediaPipe)
   * @param timestamp Current timestamp in ms
   * @returns Array of tap events detected this frame
   */
  detect(fingertips: Array<{ index: number; position: Point2D }>, timestamp: number): TapEvent[] {
    const taps: TapEvent[] = [];

    for (const fingertip of fingertips) {
      const { index, position } = fingertip;

      // Initialize tracking for this finger if needed
      if (!this.fingerStates.has(index)) {
        this.fingerStates.set(index, {
          state: 'idle',
          position,
          velocity: { vx: 0, vy: 0, speed: 0 },
          lastTapTime: 0,
          cooldownUntil: 0
        });
        this.velocityTrackers.set(index, new VelocityTracker());
        this.smoothers.set(index, new EMAFilter(0.3));
      }

      const state = this.fingerStates.get(index)!;
      const tracker = this.velocityTrackers.get(index)!;
      const smoother = this.smoothers.get(index)!;

      // Smooth the position
      const smoothedPos = smoother.update(position);

      // Calculate velocity
      const velocity = tracker.update(smoothedPos, timestamp);

      // Update state
      state.position = smoothedPos;
      state.velocity = velocity;

      // Check if in cooldown
      if (timestamp < state.cooldownUntil) {
        continue;
      }

      // Map to table coordinates if calibration is available
      let tableUV: Point2D | null = null;
      let inTable = false;

      if (this.calibration) {
        tableUV = applyHomography(this.calibration.homographyMatrix, smoothedPos);
        inTable = isInTableBounds(tableUV, 0.1); // 10% margin
      }

      // State machine for tap detection
      switch (state.state) {
        case 'idle':
          // Check if finger is moving down quickly
          if (velocity.vy > TAP_VELOCITY_THRESHOLD && inTable) {
            state.state = 'moving_down';
          }
          break;

        case 'moving_down':
          // Confirm tap if velocity reverses or stops
          if (velocity.vy < TAP_VELOCITY_THRESHOLD * 0.5) {
            // Tap confirmed!
            state.state = 'tapped';
            state.lastTapTime = timestamp;
            state.cooldownUntil = timestamp + COOLDOWN_MS;

            if (tableUV) {
              const lane = uvToLane(tableUV, NUM_LANES);
              taps.push({
                fingerIndex: index,
                lane,
                x: smoothedPos.x,
                y: smoothedPos.y,
                timestamp
              });
            }
          }
          break;

        case 'tapped':
          // Wait for finger to lift (velocity moving up)
          if (velocity.vy < -TAP_VELOCITY_THRESHOLD * 0.3) {
            state.state = 'lifting';
          } else if (timestamp > state.cooldownUntil) {
            state.state = 'idle';
          }
          break;

        case 'lifting':
          // Return to idle once finger stops moving
          if (Math.abs(velocity.vy) < TAP_VELOCITY_THRESHOLD * 0.2) {
            state.state = 'idle';
          }
          break;
      }
    }

    return taps;
  }

  getFingerStates(): Map<number, FingerState> {
    return new Map(this.fingerStates);
  }

  reset() {
    this.fingerStates.clear();
    this.velocityTrackers.clear();
    this.smoothers.clear();
  }
}
