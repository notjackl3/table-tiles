/**
 * Audio Engine using Web Audio API
 * Generates sounds programmatically for zero-latency feedback
 */

export type HitQuality = 'perfect' | 'good' | 'miss';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private enabled = true;

  // Note frequencies for 4 lanes (C4, E4, G4, B4)
  private laneFrequencies = [261.63, 329.63, 392.0, 493.88];

  // 3D positions for each lane (x, y, z) - positioned in front of listener
  private lanePositions = [
    { x: -2, y: 0, z: -2 },   // Lane 0: Far left
    { x: -0.7, y: 0, z: -2 }, // Lane 1: Left
    { x: 0.7, y: 0, z: -2 },  // Lane 2: Right
    { x: 2, y: 0, z: -2 }     // Lane 3: Far right
  ];

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async initialize() {
    if (this.audioContext) return;

    this.audioContext = new AudioContext();

    // Create master gain
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3; // Master volume
    this.masterGain.connect(this.audioContext.destination);

    // Create reverb chain (dry/wet mix)
    this.dryGain = this.audioContext.createGain();
    this.wetGain = this.audioContext.createGain();
    this.convolver = this.audioContext.createConvolver();

    // Set dry/wet mix (70% dry, 30% wet for subtle reverb)
    this.dryGain.gain.value = 0.7;
    this.wetGain.gain.value = 0.3;

    // Connect reverb chain
    this.dryGain.connect(this.masterGain);
    this.wetGain.connect(this.convolver);
    this.convolver.connect(this.masterGain);

    // Generate impulse response for reverb
    await this.createImpulseResponse();
  }

  /**
   * Create impulse response for convolution reverb
   * Simulates a medium-sized concert hall
   */
  private async createImpulseResponse() {
    if (!this.audioContext || !this.convolver) return;

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * 2; // 2 seconds of reverb
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    const impulseL = impulse.getChannelData(0);
    const impulseR = impulse.getChannelData(1);

    // Generate realistic impulse response with decay
    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 2); // Exponential decay
      impulseL[i] = (Math.random() * 2 - 1) * decay;
      impulseR[i] = (Math.random() * 2 - 1) * decay;
    }

    this.convolver.buffer = impulse;
  }

  /**
   * Play hit sound for a lane
   * @param lane - The lane number (0-3)
   * @param quality - The hit quality
   * @param customFrequency - Optional custom frequency for melodic playback
   */
  playHitSound(lane: number, quality: HitQuality, customFrequency?: number) {
    if (!this.enabled || !this.audioContext || !this.dryGain || !this.wetGain) return;

    // Use custom frequency if provided, otherwise use default lane frequency
    const frequency = customFrequency ?? this.laneFrequencies[lane % 4];
    const now = this.audioContext.currentTime;

    // Create oscillator for the note
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Create 3D panner for spatial audio
    const panner = this.audioContext.createPanner();
    panner.panningModel = 'HRTF'; // Head-Related Transfer Function for realistic 3D audio
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;

    // Set position based on lane
    const pos = this.lanePositions[lane % 4];
    panner.positionX.setValueAtTime(pos.x, now);
    panner.positionY.setValueAtTime(pos.y, now);
    panner.positionZ.setValueAtTime(pos.z, now);

    // For melodic notes (when customFrequency is provided), always use sine wave for consistent sound
    // Otherwise, use different waveforms for different hit qualities
    if (customFrequency) {
      oscillator.type = 'sine'; // Consistent melodic sound
    } else {
      oscillator.type = quality === 'perfect' ? 'sine' : quality === 'good' ? 'triangle' : 'sawtooth';
    }

    oscillator.frequency.setValueAtTime(frequency, now);

    // ADSR envelope - longer sustain for melodic notes
    const attackTime = 0.005;
    const decayTime = customFrequency ? 0.15 : (quality === 'perfect' ? 0.1 : quality === 'good' ? 0.08 : 0.05);
    const sustainLevel = customFrequency ? 0.4 : (quality === 'perfect' ? 0.3 : quality === 'good' ? 0.2 : 0.1);
    const releaseTime = customFrequency ? 0.3 : (quality === 'perfect' ? 0.2 : quality === 'good' ? 0.15 : 0.1);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + attackTime);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
    gainNode.gain.linearRampToValueAtTime(0, now + attackTime + decayTime + releaseTime);

    // Connect: oscillator -> gain -> panner -> dry/wet split
    oscillator.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.dryGain);
    panner.connect(this.wetGain);

    oscillator.start(now);
    oscillator.stop(now + attackTime + decayTime + releaseTime);
  }

  /**
   * Play miss sound (low thud)
   */
  playMissSound() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;

    // Low frequency thud
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(80, now);
    oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.1);

    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(now);
    oscillator.stop(now + 0.15);
  }

  /**
   * Play combo milestone sound
   */
  playComboSound(combo: number) {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;

    // Ascending arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const noteInterval = 0.05;

    notes.forEach((freq, i) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now + i * noteInterval);

      gainNode.gain.setValueAtTime(0, now + i * noteInterval);
      gainNode.gain.linearRampToValueAtTime(0.2, now + i * noteInterval + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * noteInterval + 0.15);

      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain!);

      oscillator.start(now + i * noteInterval);
      oscillator.stop(now + i * noteInterval + 0.15);
    });
  }

  /**
   * Play UI click sound
   */
  playClickSound() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, now);

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(now);
    oscillator.stop(now + 0.05);
  }

  /**
   * Play game over sound
   */
  playGameOverSound() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;

    // Descending notes
    const notes = [523.25, 392.0, 329.63, 261.63]; // C5, G4, E4, C4
    const noteInterval = 0.2;

    notes.forEach((freq, i) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(freq, now + i * noteInterval);

      gainNode.gain.setValueAtTime(0, now + i * noteInterval);
      gainNode.gain.linearRampToValueAtTime(0.3, now + i * noteInterval + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * noteInterval + 0.4);

      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain!);

      oscillator.start(now + i * noteInterval);
      oscillator.stop(now + i * noteInterval + 0.4);
    });
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(volume: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Enable/disable audio
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Get audio enabled state
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Resume audio context (needed after page interaction)
   */
  async resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Test 3D audio by playing a sound that rotates 360 degrees around the listener
   */
  playTestAudio360() {
    if (!this.enabled || !this.audioContext || !this.dryGain || !this.wetGain) return;

    const now = this.audioContext.currentTime;
    const duration = 6; // 6 seconds for full rotation
    const frequency = 440; // A4 note

    // Create oscillator
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const panner = this.audioContext.createPanner();

    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 1;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);

    // Fade in and out
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.1);
    gainNode.gain.setValueAtTime(0.4, now + duration - 0.2);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    // Animate position in a circle around the listener
    const radius = 3;
    const steps = 120; // Update position 120 times during rotation

    for (let i = 0; i <= steps; i++) {
      const t = now + (i / steps) * duration;
      const angle = (i / steps) * Math.PI * 2; // Full 360 degree rotation

      const x = Math.sin(angle) * radius;
      const z = -Math.cos(angle) * radius; // Negative Z is in front
      const y = 0;

      panner.positionX.linearRampToValueAtTime(x, t);
      panner.positionY.linearRampToValueAtTime(y, t);
      panner.positionZ.linearRampToValueAtTime(z, t);
    }

    // Connect audio graph
    oscillator.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.dryGain);
    panner.connect(this.wetGain);

    oscillator.start(now);
    oscillator.stop(now + duration);

    console.log('Playing 360° test audio - you should hear the sound rotate around your head!');
  }

  /**
   * Close audio context
   */
  close() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.masterGain = null;
      this.convolver = null;
      this.dryGain = null;
      this.wetGain = null;
    }
  }
}

// Singleton instance
let audioEngineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine();
  }
  return audioEngineInstance;
}
