/**
 * Audio Engine using Web Audio API
 * Generates sounds programmatically for zero-latency feedback
 */

import { BackgroundTrackPlayer } from './backgroundTrackPlayer';
import type { Beatmap } from '../engine/beatmap';

export type HitQuality = 'perfect' | 'good' | 'miss';
export type HypeLevel = 'low' | 'medium' | 'high';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private enabled = true;
  private hypeLevel: HypeLevel = 'medium';
  private backgroundTrackPlayer: BackgroundTrackPlayer | null = null;
  private rotationEnabled = false;
  private rotationSpeed = 0.5; // Rotations per second
  private rotationStartTime = 0;

  // Preloaded sound effects
  private soundEffects: Map<string, AudioBuffer> = new Map();
  private lastComboAnnouncement = 0;
  private celebrationSounds = ['awesome', 'perfect', 'boom', 'yeah', 'on-fire'];

  // Impact sounds for hits
  private impactSounds = ['boom'];

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
    this.masterGain.gain.value = 0.65; // Master volume (increased for better audibility of imported MIDI)
    this.masterGain.connect(this.audioContext.destination);

    // Create reverb chain (dry/wet mix)
    this.dryGain = this.audioContext.createGain();
    this.wetGain = this.audioContext.createGain();
    this.convolver = this.audioContext.createConvolver();

    // Create delay for echo effect
    this.delayNode = this.audioContext.createDelay(1.0); // 1 second max delay
    this.delayNode.delayTime.value = 0.08; // 150ms delay for echo

    // Create compressor for loudness and preventing clipping
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    // Set dry/wet mix (60% dry, 40% wet for more immersive reverb)
    this.dryGain.gain.value = 0.7;
    this.wetGain.gain.value = 0.3;

    // Connect audio chain: dry/wet → delay → compressor → master
    this.dryGain.connect(this.delayNode);
    this.delayNode.connect(this.compressor);
    this.wetGain.connect(this.convolver);
    this.convolver.connect(this.compressor);
    this.compressor.connect(this.masterGain);

    // Generate impulse response for reverb
    await this.createImpulseResponse();

    // Preload sound effects
    await this.loadSoundEffects();
  }

  /**
   * Load all sound effects from the public/sounds directory
   */
  private async loadSoundEffects() {
    if (!this.audioContext) return;

    const soundFiles = [
      'game-start.mp3',
      'game-start-alt.mp3',
      'streak-2.mp3',
      'streak-3.mp3',
      'streak-4.mp3',
      'streak-5.mp3',
      'streak-6.mp3',
      'combo-10.mp3',
      'combo-15.mp3',
      'combo-20.mp3',
      'combo-25.mp3',
      'awesome.mp3',
      'perfect.mp3',
      'boom.mp3',
      'yeah.mp3',
      'on-fire.mp3'
    ];

    for (const filename of soundFiles) {
      try {
        const response = await fetch(`/sounds/${filename}`);
        if (!response.ok) {
          console.warn(`Could not load sound effect: ${filename}`);
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

        // Store with name without extension
        const name = filename.replace('.mp3', '');
        this.soundEffects.set(name, audioBuffer);
        console.log(`✓ Loaded sound effect: ${name}`);
      } catch (error) {
        console.warn(`Failed to load sound effect ${filename}:`, error);
      }
    }
  }

  /**
   * Get volume multiplier based on hype level
   */
  private getHypeMultiplier(): number {
    switch (this.hypeLevel) {
      case 'low':
        return 0.5;
      case 'medium':
        return 1.0;
      case 'high':
        return 1.3;
      default:
        return 1.0;
    }
  }

  /**
   * Play a preloaded sound effect
   */
  private playSoundEffect(name: string, volume: number = 1.0, respectHype: boolean = true) {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const buffer = this.soundEffects.get(name);
    if (!buffer) {
      console.warn(`Sound effect not found: ${name}`);
      return;
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;

    // Apply hype level multiplier if respectHype is true
    const finalVolume = respectHype ? volume * this.getHypeMultiplier() : volume;
    gainNode.gain.value = finalVolume;

    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    source.start(0);
  }

  /**
   * Set hype level for announcer intensity
   */
  setHypeLevel(level: HypeLevel) {
    this.hypeLevel = level;
    console.log(`🎤 Hype level set to: ${level.toUpperCase()}`);
  }

  /**
   * Get current hype level
   */
  getHypeLevel(): HypeLevel {
    return this.hypeLevel;
  }

  /**
   * Play game start announcement
   * Volume adjusts based on hype level
   */
  playGameStartSound() {
    // Randomly choose between two start sounds
    const sound = Math.random() > 0.5 ? 'game-start' : 'game-start-alt';
    this.playSoundEffect(sound, 0.6, true); // Reduced to 75% (was 0.8)
  }

  /**
   * Play impact sound effect (boom, bam) for successful hits
   * These are punchy, short sounds that emphasize the hit
   */
  playImpactSound(quality: HitQuality) {
    // Only play impact sounds for good or perfect hits
    if (quality === 'miss') return;

    // Play more frequently for perfect hits
    const playChance = quality === 'perfect' ? 0.6 : 0.3;
    if (Math.random() > playChance) return;

    const sound = this.impactSounds[
      Math.floor(Math.random() * this.impactSounds.length)
    ];

    // Impact sounds should be punchy and not affected by hype level
    this.playSoundEffect(sound, 0.3, false); // Reduced to 75% (was 0.4)
  }

  /**
   * Play streak announcement (British football announcer style)
   * Called for every hit to announce streaks 2-6
   * Volume adjusts based on hype level
   */
  playStreakAnnouncement(streak: number) {
    // Play announcement only for streak 5
    if (streak === 5) {
      this.playSoundEffect(`streak-${streak}`, 0.7, true); // Reduced to ~74% (was 0.95)
    }
  }

  /**
   * Play combo announcement at larger milestones (10, 15, 20, 25)
   * Volume and intensity adjust based on hype level
   */
  playComboMilestone(combo: number) {
    const now = Date.now();

    // Don't announce combos too frequently (at least 2 seconds apart)
    if (now - this.lastComboAnnouncement < 2000) return;

    // Announce at specific milestones (larger milestones only)
    const milestones = [10, 15, 20, 25];
    const milestone = milestones.find(m => combo === m);

    if (milestone) {
      this.playSoundEffect(`combo-${milestone}`, 0.68, true); // Reduced to ~75% (was 0.9)
      this.lastComboAnnouncement = now;
    }
  }

  /**
   * Play a random celebration sound for perfect hits
   * These are more elaborate than impact sounds (e.g., "Awesome!", "You're on fire!")
   * @returns true if sound was played, false otherwise
   */
  playRandomCelebration(): boolean {
    // Only play celebration sounds occasionally (15% chance - reduced to avoid overlap with impact sounds)
    if (Math.random() > 0.15) return false;

    const sound = this.celebrationSounds[
      Math.floor(Math.random() * this.celebrationSounds.length)
    ];
    // Celebration sounds respect hype level
    this.playSoundEffect(sound, 0.53, true); // Reduced to ~75% (was 0.7)
    return true;
  }

  /**
   * Create impulse response for convolution reverb
   * Simulates a medium-sized concert hall
   */
  private async createImpulseResponse() {
    if (!this.audioContext || !this.convolver) return;

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * 3; // 3 seconds of reverb for longer echo tail
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
   * @param customFrequency - Optional custom frequency or array of frequencies for melodic playback
   */
  playHitSound(lane: number, quality: HitQuality, customFrequency?: number | number[]) {
    if (!this.enabled || !this.audioContext || !this.dryGain || !this.wetGain) return;

    // Check if we're playing multiple frequencies (chord/cluster)
    const isMultiNote = Array.isArray(customFrequency);
    const frequencies = isMultiNote
      ? customFrequency
      : [customFrequency ?? this.laneFrequencies[lane % 4]];

    // Volume normalization for multiple notes to prevent clipping
    const volumeMultiplier = isMultiNote ? 1 / Math.sqrt(frequencies.length) : 1;

    const now = this.audioContext.currentTime;

    // ADSR envelope parameters - longer sustain for melodic notes
    const attackTime = 0.005;
    const decayTime = customFrequency ? 0.15 : (quality === 'perfect' ? 0.1 : quality === 'good' ? 0.08 : 0.05);
    const sustainLevel = customFrequency ? 0.4 : (quality === 'perfect' ? 0.3 : quality === 'good' ? 0.2 : 0.1);
    const releaseTime = customFrequency ? 0.3 : (quality === 'perfect' ? 0.2 : quality === 'good' ? 0.15 : 0.1);

    console.log(`[AudioEngine] Playing ${frequencies.length} note(s) at volume ${volumeMultiplier.toFixed(2)}x:`, frequencies);

    // Create oscillator for each frequency
    frequencies.forEach((frequency) => {
      // Create oscillator for the note
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      // Create 3D panner for spatial audio
      const panner = this.audioContext!.createPanner();
      panner.panningModel = 'HRTF'; // Head-Related Transfer Function for realistic 3D audio
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 10000;
      panner.rolloffFactor = 1;
      panner.coneInnerAngle = 360;
      panner.coneOuterAngle = 0;
      panner.coneOuterGain = 0;

      // Set position: centered for multi-note, lane-based or rotating for single note
      if (isMultiNote) {
        // Center position for cohesive chord sound
        panner.positionX.setValueAtTime(0, now);
        panner.positionY.setValueAtTime(0, now);
        panner.positionZ.setValueAtTime(-2, now);
      } else if (this.rotationEnabled) {
        // Circular motion for single notes when rotation is enabled
        this.animateCircularMotion(panner, attackTime + decayTime + releaseTime, now);
      } else {
        // Lane-based position for single notes (static)
        const pos = this.lanePositions[lane % 4];
        panner.positionX.setValueAtTime(pos.x, now);
        panner.positionY.setValueAtTime(pos.y, now);
        panner.positionZ.setValueAtTime(pos.z, now);
      }

      // For melodic notes (when customFrequency is provided), always use sine wave for consistent sound
      // Otherwise, use different waveforms for different hit qualities
      if (customFrequency) {
        oscillator.type = 'sine'; // Consistent melodic sound
      } else {
        oscillator.type = quality === 'perfect' ? 'sine' : quality === 'good' ? 'triangle' : 'sawtooth';
      }

      oscillator.frequency.setValueAtTime(frequency, now);

      // Apply ADSR envelope with volume normalization
      const baseVolume = 0.5 * volumeMultiplier;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(baseVolume, now + attackTime);
      gainNode.gain.linearRampToValueAtTime(sustainLevel * volumeMultiplier, now + attackTime + decayTime);
      gainNode.gain.linearRampToValueAtTime(0, now + attackTime + decayTime + releaseTime);

      // Connect: oscillator -> gain -> panner -> dry/wet split (routed through delay and compressor)
      oscillator.connect(gainNode);
      gainNode.connect(panner);
      panner.connect(this.dryGain!);
      panner.connect(this.wetGain!);

      oscillator.start(now);
      oscillator.stop(now + attackTime + decayTime + releaseTime);
    });
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
   * Enable/disable circular rotation effect for spatial audio
   */
  setRotationEnabled(enabled: boolean) {
    this.rotationEnabled = enabled;
    if (enabled && this.audioContext) {
      this.rotationStartTime = this.audioContext.currentTime;
    }
    console.log(`[AudioEngine] Rotation ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set rotation speed (rotations per second)
   * @param speed - Rotations per second (clamped between 0.1 and 2.0)
   */
  setRotationSpeed(speed: number) {
    this.rotationSpeed = Math.max(0.1, Math.min(2.0, speed));
    console.log(`[AudioEngine] Rotation speed set to ${this.rotationSpeed.toFixed(2)} rotations/sec`);
  }

  /**
   * Animate panner position in circular motion
   * @param panner - The panner node to animate
   * @param duration - Total duration of the sound
   * @param startTime - AudioContext start time
   */
  private animateCircularMotion(panner: PannerNode, duration: number, startTime: number) {
    if (!this.rotationEnabled) return;

    const radius = 3; // 3 units from listener
    const steps = Math.ceil(duration * 60); // 60 updates per second

    for (let i = 0; i <= steps; i++) {
      const t = startTime + (i / 60); // Time in seconds
      const elapsed = t - startTime;

      // Calculate rotation angle based on elapsed time and rotation speed
      const angle = (elapsed * this.rotationSpeed * Math.PI * 2) +
                    (this.rotationStartTime * this.rotationSpeed * Math.PI * 2);

      const x = Math.sin(angle) * radius;
      const z = -Math.cos(angle) * radius; // Negative Z is in front
      const y = 0;

      panner.positionX.linearRampToValueAtTime(x, t);
      panner.positionY.linearRampToValueAtTime(y, t);
      panner.positionZ.linearRampToValueAtTime(z, t);
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
   * Start background track playback from audio file
   */
  async startBackgroundTrack(beatmap: Beatmap) {
    if (!this.audioContext || !this.masterGain) {
      console.warn('[AudioEngine] Cannot start background track: audio not initialized');
      return;
    }

    // Create background track player if it doesn't exist
    if (!this.backgroundTrackPlayer) {
      this.backgroundTrackPlayer = new BackgroundTrackPlayer({
        audioContext: this.audioContext,
        masterGain: this.masterGain,
        dryGain: this.dryGain || undefined,
        wetGain: this.wetGain || undefined,
        backgroundVolume: 0.20 // 20% volume for background track
      });
    }

    await this.backgroundTrackPlayer.start(beatmap);
    console.log('[AudioEngine] Background track started - audio file playback mode');
  }

  /**
   * Stop background track playback
   */
  stopBackgroundTrack() {
    if (this.backgroundTrackPlayer) {
      this.backgroundTrackPlayer.stop();
      console.log('[AudioEngine] Background track stopped');
    }
  }

  /**
   * Close audio context
   */
  close() {
    this.stopBackgroundTrack();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.masterGain = null;
      this.convolver = null;
      this.dryGain = null;
      this.wetGain = null;
      this.delayNode = null;
      this.compressor = null;
      this.backgroundTrackPlayer = null;
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
