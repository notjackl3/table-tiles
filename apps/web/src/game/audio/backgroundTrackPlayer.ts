/**
 * Background Track Player
 * Plays pre-rendered audio files (MP3/WAV) as background music
 * Player notes overlay louder on top
 */

import type { Beatmap } from '../engine/beatmap';

export interface BackgroundTrackConfig {
  audioContext: AudioContext;
  masterGain: GainNode;
  backgroundVolume?: number; // Volume multiplier for background track (default 0.20)
}

export class BackgroundTrackPlayer {
  private config: BackgroundTrackConfig;
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private readonly BACKGROUND_VOLUME: number;

  constructor(config: BackgroundTrackConfig) {
    this.config = config;
    this.audioContext = config.audioContext;
    this.masterGain = config.masterGain;
    this.BACKGROUND_VOLUME = config.backgroundVolume ?? 0.20; // Default 20% volume
  }

  /**
   * Load audio file and start playing
   */
  async start(beatmap: Beatmap) {
    console.log('[BackgroundTrack] Start requested');

    // CRITICAL: Stop any existing playback FIRST and wait a bit for cleanup
    this.stop();

    // Give the audio context a moment to fully release the previous source
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check if beatmap has an audio file
    if (!beatmap.audioFile) {
      console.warn('[BackgroundTrack] No audio file specified in beatmap, falling back to note synthesis');
      console.log('[BackgroundTrack] To use audio playback, add "audioFile": "/sounds/your-song.mp3" to your beatmap JSON');
      return;
    }

    console.log(`[BackgroundTrack] Loading audio file: ${beatmap.audioFile}`);

    try {
      // Fetch and decode audio file
      const response = await fetch(beatmap.audioFile);
      if (!response.ok) {
        throw new Error(`Failed to load audio file: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      console.log(`[BackgroundTrack] Audio loaded successfully (${this.audioBuffer.duration.toFixed(2)}s)`);
      console.log(`[BackgroundTrack] Starting playback at ${this.BACKGROUND_VOLUME * 100}% volume`);

      // Double-check nothing is playing before creating new nodes
      if (this.sourceNode || this.gainNode) {
        console.warn('[BackgroundTrack] Nodes still exist after stop! Force cleaning...');
        this.stop();
      }

      // Create audio source
      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.BACKGROUND_VOLUME;

      // Connect: source -> gain -> master
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.masterGain);

      // Start playback
      this.sourceNode.start(0);
      this.isPlaying = true;

      console.log('[BackgroundTrack] Playback started successfully');

      // Handle playback end
      this.sourceNode.onended = () => {
        if (this.isPlaying) {
          console.log('[BackgroundTrack] Playback ended naturally');
          this.isPlaying = false;
        }
      };

    } catch (error) {
      console.error('[BackgroundTrack] Failed to load/play audio file:', error);
      console.log('[BackgroundTrack] Make sure the audio file exists at:', beatmap.audioFile);
      this.stop(); // Clean up on error
    }
  }

  /**
   * Stop playback
   */
  stop() {
    console.log('[BackgroundTrack] Stopping playback...', {
      hasSource: !!this.sourceNode,
      hasGain: !!this.gainNode,
      isPlaying: this.isPlaying
    });

    // Always set isPlaying to false first to prevent any race conditions
    this.isPlaying = false;

    // Stop and disconnect source node
    if (this.sourceNode) {
      try {
        this.sourceNode.stop(0);
        console.log('[BackgroundTrack] Source node stopped');
      } catch (e) {
        console.log('[BackgroundTrack] Source already stopped or invalid state:', e);
      }

      try {
        this.sourceNode.disconnect();
        console.log('[BackgroundTrack] Source node disconnected');
      } catch (e) {
        console.log('[BackgroundTrack] Error disconnecting source:', e);
      }

      this.sourceNode = null;
    }

    // Disconnect gain node
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
        console.log('[BackgroundTrack] Gain node disconnected');
      } catch (e) {
        console.log('[BackgroundTrack] Error disconnecting gain:', e);
      }

      this.gainNode = null;
    }

    console.log('[BackgroundTrack] Stopped successfully');
  }

  /**
   * Set background volume (0-1)
   */
  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Check if currently playing
   */
  isActive(): boolean {
    return this.isPlaying;
  }
}
