/**
 * Audio Engine using Web Audio API
 * Generates sounds programmatically for zero-latency feedback
 */

export type HitQuality = 'perfect' | 'good' | 'miss';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;

  // Note frequencies for 4 lanes (C4, E4, G4, B4)
  private laneFrequencies = [261.63, 329.63, 392.0, 493.88];

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async initialize() {
    if (this.audioContext) return;

    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3; // Master volume
    this.masterGain.connect(this.audioContext.destination);
  }

  /**
   * Play hit sound for a lane
   */
  playHitSound(lane: number, quality: HitQuality) {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const frequency = this.laneFrequencies[lane % 4];
    const now = this.audioContext.currentTime;

    // Create oscillator for the note
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Different waveforms for different hit qualities
    oscillator.type = quality === 'perfect' ? 'sine' : quality === 'good' ? 'triangle' : 'sawtooth';
    oscillator.frequency.setValueAtTime(frequency, now);

    // ADSR envelope
    const attackTime = 0.005;
    const decayTime = quality === 'perfect' ? 0.1 : quality === 'good' ? 0.08 : 0.05;
    const sustainLevel = quality === 'perfect' ? 0.3 : quality === 'good' ? 0.2 : 0.1;
    const releaseTime = quality === 'perfect' ? 0.2 : quality === 'good' ? 0.15 : 0.1;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + attackTime);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
    gainNode.gain.linearRampToValueAtTime(0, now + attackTime + decayTime + releaseTime);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

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
   * Close audio context
   */
  close() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.masterGain = null;
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
