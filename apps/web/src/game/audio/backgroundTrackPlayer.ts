/**
 * Background Track Player
 * Continuously plays the entire MIDI track at low volume
 * Player notes overlay louder on top
 */

import type { Beatmap } from '../engine/beatmap';

export interface BackgroundTrackConfig {
  audioContext: AudioContext;
  masterGain: GainNode;
  dryGain: GainNode;
  wetGain: GainNode;
  backgroundVolume?: number; // Volume multiplier for background notes (default 0.20)
}

export class BackgroundTrackPlayer {
  private config: BackgroundTrackConfig;
  private beatmap: Beatmap | null = null;
  private startTime: number = 0;
  private scheduledNotes: Set<number> = new Set(); // Track which note indices have been scheduled
  private isPlaying = false;
  private scheduleIntervalId: number | null = null;
  private readonly SCHEDULE_AHEAD_TIME = 0.5; // Schedule notes 500ms ahead
  private readonly BACKGROUND_VOLUME: number;

  constructor(config: BackgroundTrackConfig) {
    this.config = config;
    this.BACKGROUND_VOLUME = config.backgroundVolume ?? 0.20; // Default 20% volume for background
  }

  /**
   * Start playing the background track
   */
  start(beatmap: Beatmap) {
    this.beatmap = beatmap;
    this.startTime = performance.now();
    this.scheduledNotes.clear();
    this.isPlaying = true;

    console.log(`[BackgroundTrack] Starting continuous background playback at ${this.BACKGROUND_VOLUME * 100}% volume`);
    console.log('[BackgroundTrack] All notes will play in background - player notes will overlay on top');

    // Schedule notes periodically
    this.scheduleIntervalId = window.setInterval(() => {
      this.scheduleNotes();
    }, 100); // Check every 100ms
  }

  /**
   * Stop the background track
   */
  stop() {
    this.isPlaying = false;
    if (this.scheduleIntervalId !== null) {
      clearInterval(this.scheduleIntervalId);
      this.scheduleIntervalId = null;
    }
    this.scheduledNotes.clear();
    console.log('[BackgroundTrack] Stopped');
  }

  /**
   * Schedule notes that are coming up
   */
  private scheduleNotes() {
    if (!this.beatmap || !this.isPlaying) return;

    const currentGameTime = performance.now() - this.startTime;
    const scheduleUpTo = currentGameTime + this.SCHEDULE_AHEAD_TIME * 1000;

    for (let i = 0; i < this.beatmap.notes.length; i++) {
      const note = this.beatmap.notes[i];

      // Skip if already scheduled
      if (this.scheduledNotes.has(i)) continue;

      // Skip if note time is beyond our schedule window
      if (note.time > scheduleUpTo) break;

      // Skip if note time has already passed
      if (note.time < currentGameTime - 100) {
        this.scheduledNotes.add(i);
        continue;
      }

      // Schedule this note (always, regardless of player hits)
      this.scheduleNote(note, i);
      this.scheduledNotes.add(i);
    }
  }

  /**
   * Schedule a single note to play
   */
  private scheduleNote(note: any, noteIndex: number) {
    if (!note.noteFrequency) return;

    const currentGameTime = performance.now() - this.startTime;
    const delay = (note.time - currentGameTime) / 1000; // Convert to seconds

    // If delay is negative but small, play immediately
    const playTime = this.config.audioContext.currentTime + Math.max(0, delay);

    // Create oscillator for the background note
    const oscillator = this.config.audioContext.createOscillator();
    const gainNode = this.config.audioContext.createGain();

    // Create 3D panner - centered for background track
    const panner = this.config.audioContext.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;

    // Center position for background track
    panner.positionX.setValueAtTime(0, playTime);
    panner.positionY.setValueAtTime(0, playTime);
    panner.positionZ.setValueAtTime(-2, playTime);

    // Sine wave for clean melodic sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(note.noteFrequency, playTime);

    // ADSR envelope with reduced volume for background
    const attackTime = 0.005;
    const decayTime = 0.15;
    const sustainLevel = 0.4 * this.BACKGROUND_VOLUME;
    const releaseTime = 0.3;

    const baseVolume = 0.5 * this.BACKGROUND_VOLUME;
    gainNode.gain.setValueAtTime(0, playTime);
    gainNode.gain.linearRampToValueAtTime(baseVolume, playTime + attackTime);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, playTime + attackTime + decayTime);
    gainNode.gain.linearRampToValueAtTime(0, playTime + attackTime + decayTime + releaseTime);

    // Connect: oscillator -> gain -> panner -> dry/wet split
    oscillator.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.config.dryGain);
    panner.connect(this.config.wetGain);

    oscillator.start(playTime);
    oscillator.stop(playTime + attackTime + decayTime + releaseTime);
  }

  /**
   * Check if currently playing
   */
  isActive(): boolean {
    return this.isPlaying;
  }
}
