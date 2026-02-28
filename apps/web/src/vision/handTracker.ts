import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import type { HandLandmarks, Point2D } from '../types/shared';

export interface HandTrackerConfig {
  maxNumHands?: number;
  modelComplexity?: 0 | 1;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

export type HandTrackerCallback = (hands: HandLandmarks[]) => void;

export class HandTracker {
  private detector: handPoseDetection.HandDetector | null = null;
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

    console.log('[HandTracker] Initializing TensorFlow.js HandPose...');

    try {
      // Set backend to WebGL
      await tf.setBackend('webgl');
      await tf.ready();
      console.log('[HandTracker] TensorFlow.js backend ready:', tf.getBackend());

      // Create the hand detector
      const model = handPoseDetection.SupportedModels.MediaPipeHands;
      const detectorConfig: handPoseDetection.MediaPipeHandsMediaPipeModelConfig = {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
        maxHands: config.maxNumHands ?? 2,
        modelType: config.modelComplexity === 0 ? 'lite' : 'full',
      };

      console.log('[HandTracker] Creating detector with config:', detectorConfig);
      this.detector = await handPoseDetection.createDetector(model, detectorConfig);
      console.log('[HandTracker] Detector created successfully');

    } catch (error) {
      console.error('[HandTracker] Initialization error:', error);
      throw error;
    }

    return this;
  }

  async start() {
    if (!this.detector || !this.videoElement) {
      throw new Error('HandTracker not initialized');
    }

    console.log('[HandTracker] Starting detection loop...');
    this.isRunning = true;
    this.detectLoop();
  }

  private async detectLoop() {
    if (!this.isRunning || !this.detector || !this.videoElement) return;

    try {
      // Check if video is ready and has valid dimensions
      if (
        this.videoElement.readyState >= 2 &&
        this.videoElement.videoWidth > 0 &&
        this.videoElement.videoHeight > 0
      ) {
        // Detect hands
        const hands = await this.detector.estimateHands(this.videoElement, {
          flipHorizontal: false,
        });

        // Convert to our format
        const formattedHands: HandLandmarks[] = hands.map((hand) => {
          const landmarks: Point2D[] = hand.keypoints.map((kp) => ({
            x: kp.x / this.videoElement!.videoWidth,
            y: kp.y / this.videoElement!.videoHeight,
          }));

          const handedness = hand.handedness === 'Left' ? 'Right' : 'Left'; // Flip because camera is mirrored

          return {
            landmarks,
            handedness: handedness as 'Left' | 'Right',
            worldLandmarks: hand.keypoints3D?.map((kp) => ({
              x: kp.x,
              y: kp.y,
              z: kp.z ?? 0,
            })),
          };
        });

        if (this.callback) {
          this.callback(formattedHands);
        }
      } else {
        console.log('[HandTracker] Waiting for video to be ready...', {
          readyState: this.videoElement.readyState,
          width: this.videoElement.videoWidth,
          height: this.videoElement.videoHeight
        });
      }
    } catch (error) {
      console.error('[HandTracker] Detection error:', error);
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
    if (this.detector) {
      this.detector.dispose();
      this.detector = null;
    }
  }
}

// MediaPipe Hand landmark indices (same as before - 21 landmarks)
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
