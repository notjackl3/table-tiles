import { HandTracker, extractFingertips } from './handTracker';
import { TapDetector } from './tap/tapDetector';
import type { HandLandmarks, TapEvent, TableCalibration } from '../types/shared';

export interface VisionLoopCallbacks {
  onHands?: (hands: HandLandmarks[]) => void;
  onTaps?: (taps: TapEvent[]) => void;
}

export class VisionLoop {
  private handTracker: HandTracker;
  private tapDetector: TapDetector;
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
    this.tapDetector = new TapDetector();
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

    // Extract fingertips and detect taps
    const fingertips = extractFingertips(
      hands,
      this.videoElement.videoWidth,
      this.videoElement.videoHeight
    );

    const taps = this.tapDetector.detect(fingertips, performance.now());

    // Notify taps callback
    if (taps.length > 0 && this.callbacks.onTaps) {
      this.callbacks.onTaps(taps);
    }
  }

  setCalibration(calibration: TableCalibration) {
    this.tapDetector.setCalibration(calibration);
  }

  getCurrentHands(): HandLandmarks[] {
    return this.currentHands;
  }

  getFingerStates() {
    return this.tapDetector.getFingerStates();
  }

  async start() {
    await this.handTracker.start();
  }

  stop() {
    this.handTracker.stop();
  }

  close() {
    this.handTracker.close();
    this.tapDetector.reset();
  }
}
