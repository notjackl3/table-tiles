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
  previousBendAmount: number;
  bendVelocity: number; // Rate of change in bend
  peakBendAmount: number; // Peak bend in current motion
  isInTapMotion: boolean; // Currently in a tap motion
  tapMotionStartTime: number; // When tap motion started
  lastTapTime: number;
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
  private sensitivity: number = 0.15; // Minimum bend amount to consider as a tap
  private velocityThreshold: number = 1; // Minimum bend velocity (change per second) to trigger tap
  private cooldownMs: number = 100; // Minimum time between taps (reduced from 200ms for faster double-tapping)
  private tapMotionTimeoutMs: number = 250; // Max time for tap motion before auto-completing (reduced from 300ms)
  private fingerStates: Map<number, FingerBendState> = new Map();
  private lastTimestamp: number = 0;

  constructor(sensitivity: number = 0.25, cooldownMs: number = 100) {
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

  setVelocityThreshold(velocityThreshold: number) {
    this.velocityThreshold = Math.max(0, velocityThreshold);
  }

  getVelocityThreshold(): number {
    return this.velocityThreshold;
  }

  setTapMotionTimeout(tapMotionTimeoutMs: number) {
    this.tapMotionTimeoutMs = Math.max(0, tapMotionTimeoutMs);
  }

  getTapMotionTimeout(): number {
    return this.tapMotionTimeoutMs;
  }

  getCooldown(): number {
    return this.cooldownMs;
  }

  /**
   * Detect finger tap motions from hand landmarks
   * Returns events for fingers that just completed a tap motion
   */
  detect(hands: HandLandmarks[], timestamp: number): FingerBendEvent[] {
    const events: FingerBendEvent[] = [];
    const currentStates = new Map<number, FingerBendState>();
    const deltaTime = this.lastTimestamp > 0 ? (timestamp - this.lastTimestamp) / 1000 : 0.016; // seconds
    this.lastTimestamp = timestamp;

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
      // Left hand: middle → 0, index → 1
      // Right hand: index → 2, middle → 3
      const indexTile = handedness === 'Left' ? 1 : 2;
      const middleTile = handedness === 'Left' ? 0 : 3;

      // Create state IDs (unique for each finger)
      const indexStateId = indexTile;
      const middleStateId = middleTile;

      // Process index finger tap detection
      const indexEvent = this.processFinger(
        indexStateId,
        indexBend,
        deltaTime,
        timestamp,
        indexTile,
        'index',
        handedness
      );
      if (indexEvent) events.push(indexEvent);

      // Process middle finger tap detection
      const middleEvent = this.processFinger(
        middleStateId,
        middleBend,
        deltaTime,
        timestamp,
        middleTile,
        'middle',
        handedness
      );
      if (middleEvent) events.push(middleEvent);

      // Store current states
      currentStates.set(indexStateId, this.fingerStates.get(indexStateId)!);
      currentStates.set(middleStateId, this.fingerStates.get(middleStateId)!);
    }

    // Clear states for fingers not currently visible
    this.fingerStates = currentStates;

    return events;
  }

  /**
   * Process a single finger and detect tap motion
   */
  private processFinger(
    stateId: number,
    currentBend: number,
    deltaTime: number,
    timestamp: number,
    tile: number,
    finger: 'index' | 'middle',
    hand: 'Left' | 'Right'
  ): FingerBendEvent | null {
    const prevState = this.fingerStates.get(stateId);

    // Calculate bend velocity (change in bend per second)
    const bendVelocity = prevState && deltaTime > 0
      ? (currentBend - prevState.bendAmount) / deltaTime
      : 0;

    // Initialize or update state
    if (!prevState) {
      this.fingerStates.set(stateId, {
        tile,
        finger,
        hand,
        bendAmount: currentBend,
        previousBendAmount: currentBend,
        bendVelocity: 0,
        peakBendAmount: currentBend,
        isInTapMotion: false,
        tapMotionStartTime: 0,
        lastTapTime: 0
      });
      return null;
    }

    // Update state
    prevState.previousBendAmount = prevState.bendAmount;
    prevState.bendAmount = currentBend;
    prevState.bendVelocity = bendVelocity;

    // Tap detection logic:
    // 1. Detect rapid increase in bend (finger bending quickly)
    // 2. Track peak bend amount
    // 3. Detect when bend decreases (finger straightening)
    // 4. Trigger tap when we see the pattern: low -> rapid increase -> peak -> decrease

    // Start of tap motion: rapid increase in bend
    if (!prevState.isInTapMotion && bendVelocity > this.velocityThreshold && currentBend > 0.15) {
      prevState.isInTapMotion = true;
      prevState.tapMotionStartTime = timestamp;
      prevState.peakBendAmount = currentBend;
      console.log(`[FingerBendDetector] ${hand} ${finger} - TAP MOTION STARTED (velocity: ${bendVelocity.toFixed(2)}, bend: ${currentBend.toFixed(3)})`);
    }

    // In tap motion: track peak and detect completion
    if (prevState.isInTapMotion) {
      if (currentBend > prevState.peakBendAmount) {
        prevState.peakBendAmount = currentBend;
      }

      const motionDuration = timestamp - prevState.tapMotionStartTime;
      const bendDecrease = prevState.peakBendAmount - currentBend;

      // Three ways to complete tap:
      // 1. Finger straightening significantly (release)
      // 2. Bend velocity becomes negative (finger moving back up)
      // 3. Motion timeout (finger stayed bent too long, auto-complete)
      const isReleasing = bendDecrease > 0.05 && bendVelocity < -1.0;
      const isTimedOut = motionDuration > this.tapMotionTimeoutMs;

      if (isReleasing || isTimedOut) {
        // Check if peak was significant enough and cooldown has passed
        if (prevState.peakBendAmount >= this.sensitivity &&
            (timestamp - prevState.lastTapTime) > this.cooldownMs) {

          const reason = isTimedOut ? 'timeout' : 'release';
          console.log(`[FingerBendDetector] ${hand} ${finger} - TAP DETECTED! (peak: ${prevState.peakBendAmount.toFixed(3)}, reason: ${reason})`);

          prevState.lastTapTime = timestamp;
          prevState.isInTapMotion = false;
          prevState.peakBendAmount = currentBend;

          return {
            tile,
            finger,
            hand,
            bendAmount: prevState.peakBendAmount,
            timestamp
          };
        } else {
          // Reset motion without triggering tap (too weak or in cooldown)
          console.log(`[FingerBendDetector] ${hand} ${finger} - Motion ended but not triggering (peak: ${prevState.peakBendAmount.toFixed(3)}, threshold: ${this.sensitivity})`);
          prevState.isInTapMotion = false;
          prevState.peakBendAmount = currentBend;
        }
      }
    }

    return null;
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
    this.lastTimestamp = 0;
  }
}
