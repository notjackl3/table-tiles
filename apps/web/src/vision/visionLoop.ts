import { HandTracker } from './handTracker';
import { FingerBendDetector, type FingerBendEvent } from './fingerBend/fingerBendDetector';
import type { HandLandmarks, TapEvent } from '../types/shared';

export interface VisionLoopCallbacks {
  onHands?: (hands: HandLandmarks[]) => void;
  onTaps?: (taps: TapEvent[]) => void;
}

export class VisionLoop {
  private handTracker: HandTracker;
  private bendDetector: FingerBendDetector;
  private videoElement: HTMLVideoElement;
  private callbacks: VisionLoopCallbacks;
  private currentHands: HandLandmarks[] = [];

  constructor(
    videoElement: HTMLVideoElement,
    callbacks: VisionLoopCallbacks = {}
  ) {
    this.videoElement = videoElement;
    this.callbacks = callbacks;
    this.handTracker = new HandTracker();
    // Use lower sensitivity (0.25) for easier tap detection with 100ms cooldown for faster tapping
    this.bendDetector = new FingerBendDetector(0.25, 100);
  }

  async initialize() {
    await this.handTracker.initialize(
      this.videoElement,
      (hands) => this.onHandsDetected(hands),
      {
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      }
    );
  }

  private onHandsDetected(hands: HandLandmarks[]) {
    this.currentHands = hands;

    // Notify hands callback
    if (this.callbacks.onHands) {
      this.callbacks.onHands(hands);
    }

    // Detect finger bends and convert to tap events
    const bendEvents = this.bendDetector.detect(hands, performance.now());

    // Convert finger bend events to tap events for compatibility
    if (bendEvents.length > 0) {
      const taps: TapEvent[] = bendEvents.map((event: FingerBendEvent) => ({
        fingerIndex: event.tile, // Use tile number as finger index
        lane: event.tile,
        x: 0, // Not needed for bend detection
        y: 0, // Not needed for bend detection
        timestamp: event.timestamp
      }));

      if (this.callbacks.onTaps) {
        this.callbacks.onTaps(taps);
      }
    }
  }

  setSensitivity(sensitivity: number) {
    this.bendDetector.setSensitivity(sensitivity);
  }

  getSensitivity(): number {
    return this.bendDetector.getSensitivity();
  }

  setVelocityThreshold(velocityThreshold: number) {
    this.bendDetector.setVelocityThreshold(velocityThreshold);
  }

  getVelocityThreshold(): number {
    return this.bendDetector.getVelocityThreshold();
  }

  setCooldown(cooldownMs: number) {
    this.bendDetector.setCooldown(cooldownMs);
  }

  getCooldown(): number {
    return this.bendDetector.getCooldown();
  }

  setTapMotionTimeout(tapMotionTimeoutMs: number) {
    this.bendDetector.setTapMotionTimeout(tapMotionTimeoutMs);
  }

  getTapMotionTimeout(): number {
    return this.bendDetector.getTapMotionTimeout();
  }

  getCurrentHands(): HandLandmarks[] {
    return this.currentHands;
  }

  getFingerStates() {
    return this.bendDetector.getFingerStates();
  }

  async start() {
    await this.handTracker.start();
  }

  stop() {
    this.handTracker.stop();
  }

  close() {
    this.handTracker.close();
    this.bendDetector.reset();
  }
}
