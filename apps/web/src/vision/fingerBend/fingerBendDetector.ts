import type { HandLandmarks, Point2D } from '../../types/shared';
import { HAND_LANDMARKS } from '../handTracker';

export interface FingerBendEvent {
  tile: number; // 0-3 mapping to the 4 tiles
  finger: 'index' | 'middle';
  hand: 'Left' | 'Right';
  bendAmount: number; // 0-1, where 1 is fully bent
  timestamp: number;
}

export interface FingerBendState {
  tile: number;
  finger: 'index' | 'middle';
  hand: 'Left' | 'Right';
  bendAmount: number;
  isActive: boolean; // true when bend exceeds threshold
  lastActivationTime: number;
}

/**
 * Calculate the angle at a finger joint to determine if it's bent
 * Returns a value from 0 (straight) to 1 (fully bent)
 */
function calculateFingerBend(
  mcp: Point2D,   // Base of finger (knuckle)
  pip: Point2D,   // First joint
  dip: Point2D,   // Second joint
  tip: Point2D    // Fingertip
): number {
  // Calculate vectors
  const v1x = pip.x - mcp.x;
  const v1y = pip.y - mcp.y;
  const v2x = dip.x - pip.x;
  const v2y = dip.y - pip.y;
  const v3x = tip.x - dip.x;
  const v3y = tip.y - dip.y;

  // Calculate angles between segments
  const angle1 = Math.atan2(v2y, v2x) - Math.atan2(v1y, v1x);
  const angle2 = Math.atan2(v3y, v3x) - Math.atan2(v2y, v2x);

  // Normalize angles to -π to π
  const normalizeAngle = (a: number) => {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  };

  const norm1 = Math.abs(normalizeAngle(angle1));
  const norm2 = Math.abs(normalizeAngle(angle2));

  // Average the angles and normalize to 0-1
  // Straight finger: angles ≈ 0, Bent finger: angles > 0
  const avgAngle = (norm1 + norm2) / 2;
  const bendAmount = Math.min(avgAngle / Math.PI, 1);

  return bendAmount;
}

export class FingerBendDetector {
  private sensitivity: number = 0.3; // 0-1, lower = more sensitive
  private cooldownMs: number = 100; // Minimum time between activations
  private fingerStates: Map<number, FingerBendState> = new Map();

  constructor(sensitivity: number = 0.3, cooldownMs: number = 100) {
    this.sensitivity = sensitivity;
    this.cooldownMs = cooldownMs;
  }

  setSensitivity(sensitivity: number) {
    this.sensitivity = Math.max(0, Math.min(1, sensitivity));
  }

  getSensitivity(): number {
    return this.sensitivity;
  }

  setCooldown(cooldownMs: number) {
    this.cooldownMs = cooldownMs;
  }

  /**
   * Detect finger bends from hand landmarks
   * Returns events for fingers that just crossed the threshold
   */
  detect(hands: HandLandmarks[], timestamp: number): FingerBendEvent[] {
    const events: FingerBendEvent[] = [];
    const currentStates = new Map<number, FingerBendState>();

    // Process each hand
    for (const hand of hands) {
      const landmarks = hand.landmarks;
      const handedness = hand.handedness;

      // Process index finger
      const indexBend = calculateFingerBend(
        landmarks[HAND_LANDMARKS.INDEX_FINGER_MCP],
        landmarks[HAND_LANDMARKS.INDEX_FINGER_PIP],
        landmarks[HAND_LANDMARKS.INDEX_FINGER_DIP],
        landmarks[HAND_LANDMARKS.INDEX_FINGER_TIP]
      );

      // Process middle finger
      const middleBend = calculateFingerBend(
        landmarks[HAND_LANDMARKS.MIDDLE_FINGER_MCP],
        landmarks[HAND_LANDMARKS.MIDDLE_FINGER_PIP],
        landmarks[HAND_LANDMARKS.MIDDLE_FINGER_DIP],
        landmarks[HAND_LANDMARKS.MIDDLE_FINGER_TIP]
      );

      // Map to tiles:
      // Left hand: index → 0, middle → 1
      // Right hand: index → 2, middle → 3
      const indexTile = handedness === 'Left' ? 0 : 2;
      const middleTile = handedness === 'Left' ? 1 : 3;

      // Create state IDs (unique for each finger)
      const indexStateId = indexTile;
      const middleStateId = middleTile;

      // Check index finger
      const indexActive = indexBend > this.sensitivity;
      const prevIndexState = this.fingerStates.get(indexStateId);

      currentStates.set(indexStateId, {
        tile: indexTile,
        finger: 'index',
        hand: handedness,
        bendAmount: indexBend,
        isActive: indexActive,
        lastActivationTime: prevIndexState?.lastActivationTime || 0
      });

      // Trigger event if crossed threshold and not in cooldown
      if (indexActive && (!prevIndexState || !prevIndexState.isActive)) {
        if (!prevIndexState || timestamp - prevIndexState.lastActivationTime > this.cooldownMs) {
          events.push({
            tile: indexTile,
            finger: 'index',
            hand: handedness,
            bendAmount: indexBend,
            timestamp
          });
          currentStates.get(indexStateId)!.lastActivationTime = timestamp;
        }
      }

      // Check middle finger
      const middleActive = middleBend > this.sensitivity;
      const prevMiddleState = this.fingerStates.get(middleStateId);

      currentStates.set(middleStateId, {
        tile: middleTile,
        finger: 'middle',
        hand: handedness,
        bendAmount: middleBend,
        isActive: middleActive,
        lastActivationTime: prevMiddleState?.lastActivationTime || 0
      });

      // Trigger event if crossed threshold and not in cooldown
      if (middleActive && (!prevMiddleState || !prevMiddleState.isActive)) {
        if (!prevMiddleState || timestamp - prevMiddleState.lastActivationTime > this.cooldownMs) {
          events.push({
            tile: middleTile,
            finger: 'middle',
            hand: handedness,
            bendAmount: middleBend,
            timestamp
          });
          currentStates.get(middleStateId)!.lastActivationTime = timestamp;
        }
      }
    }

    // Update states
    this.fingerStates = currentStates;

    return events;
  }

  /**
   * Get current state of all tracked fingers
   */
  getFingerStates(): FingerBendState[] {
    return Array.from(this.fingerStates.values());
  }

  /**
   * Reset all states
   */
  reset() {
    this.fingerStates.clear();
  }
}