import type { HandLandmarks, Point2D } from '../types/shared';

// MediaPipe types
interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

interface Results {
  multiHandLandmarks?: NormalizedLandmark[][];
  multiHandedness?: Array<{ label: string }>;
  multiHandWorldLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
}

// MediaPipe Hands class (loaded from CDN in index.html)
declare const Hands: any;

export interface HandTrackerConfig {
  maxNumHands?: number;
  modelComplexity?: 0 | 1;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

export type HandTrackerCallback = (hands: HandLandmarks[]) => void;

export class HandTracker {
  private hands: Hands | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private callback: HandTrackerCallback | null = null;
  private animationFrameId: number | null = null;
  private isRunning = false;

  async initialize(
    videoElement: HTMLVideoElement,
    callback: HandTrackerCallback,
    config: HandTrackerConfig = {}
  ) {
    this.videoElement = videoElement;
    this.callback = callback;

    console.log('[HandTracker] Initializing MediaPipe Hands...');
    console.log('[HandTracker] Hands class available:', typeof Hands !== 'undefined');

    if (typeof Hands === 'undefined') {
      console.error('[HandTracker] MediaPipe Hands not loaded! Check CDN scripts in index.html');
      throw new Error('MediaPipe Hands not loaded');
    }

    // Initialize MediaPipe Hands
    this.hands = new Hands({
      locateFile: (file) => {
        const url = `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        console.log('[HandTracker] Loading MediaPipe file:', url);
        return url;
      }
    });

    console.log('[HandTracker] MediaPipe Hands instance created');

    this.hands.setOptions({
      maxNumHands: config.maxNumHands ?? 2,
      modelComplexity: config.modelComplexity ?? 1,
      minDetectionConfidence: config.minDetectionConfidence ?? 0.7,
      minTrackingConfidence: config.minTrackingConfidence ?? 0.7
    });

    this.hands.onResults((results) => this.onResults(results));

    return this;
  }

  private onResults(results: Results) {
    if (!this.callback) return;

    const hands: HandLandmarks[] = [];

    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness[i];

        // Convert MediaPipe landmarks to our format
        const landmarkPoints: Point2D[] = landmarks.map((lm) => ({
          x: lm.x,
          y: lm.y
        }));

        hands.push({
          landmarks: landmarkPoints,
          handedness: handedness.label as 'Left' | 'Right',
          worldLandmarks: results.multiHandWorldLandmarks?.[i]?.map((lm) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z
          }))
        });
      }
    }

    this.callback(hands);
  }

  async start() {
    if (!this.hands || !this.videoElement) {
      throw new Error('HandTracker not initialized');
    }

    this.isRunning = true;
    this.detectLoop();
  }

  private async detectLoop() {
    if (!this.isRunning || !this.hands || !this.videoElement) return;

    try {
      await this.hands.send({ image: this.videoElement });
    } catch (error) {
      console.error('Hand detection error:', error);
    }

    // Cap at ~30fps for performance
    setTimeout(() => {
      if (this.isRunning) {
        this.animationFrameId = requestAnimationFrame(() => this.detectLoop());
      }
    }, 33);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  close() {
    this.stop();
    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }
  }
}

// MediaPipe Hand landmark indices
export const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_FINGER_MCP: 5,
  INDEX_FINGER_PIP: 6,
  INDEX_FINGER_DIP: 7,
  INDEX_FINGER_TIP: 8,
  MIDDLE_FINGER_MCP: 9,
  MIDDLE_FINGER_PIP: 10,
  MIDDLE_FINGER_DIP: 11,
  MIDDLE_FINGER_TIP: 12,
  RING_FINGER_MCP: 13,
  RING_FINGER_PIP: 14,
  RING_FINGER_DIP: 15,
  RING_FINGER_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20
};

export const FINGERTIP_INDICES = [
  HAND_LANDMARKS.THUMB_TIP,
  HAND_LANDMARKS.INDEX_FINGER_TIP,
  HAND_LANDMARKS.MIDDLE_FINGER_TIP,
  HAND_LANDMARKS.RING_FINGER_TIP,
  HAND_LANDMARKS.PINKY_TIP
];

/**
 * Extract fingertip positions from hand landmarks
 */
export function extractFingertips(
  hands: HandLandmarks[],
  videoWidth: number,
  videoHeight: number
): Array<{ index: number; position: Point2D }> {
  const fingertips: Array<{ index: number; position: Point2D }> = [];

  for (const hand of hands) {
    for (const tipIndex of FINGERTIP_INDICES) {
      const landmark = hand.landmarks[tipIndex];
      if (landmark) {
        fingertips.push({
          index: tipIndex,
          position: {
            x: landmark.x * videoWidth,
            y: landmark.y * videoHeight
          }
        });
      }
    }
  }

  return fingertips;
}
