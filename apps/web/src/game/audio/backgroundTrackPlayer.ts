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
  private readonly TARGET_PEAK_LEVEL = 0.7; // Target peak level for normalization (70% of max)
  private readonly MIN_PEAK_THRESHOLD = 0.15; // Boost if peak is below 15%

  constructor(config: BackgroundTrackConfig) {
    this.config = config;
    this.audioContext = config.audioContext;
    this.masterGain = config.masterGain;
    this.BACKGROUND_VOLUME = config.backgroundVolume ?? 0.20; // Default 20% volume
  }

  /**
   * Analyze audio buffer to find peak volume
   * Returns the maximum absolute sample value across all channels
   */
  private analyzePeakVolume(buffer: AudioBuffer): number {
    let peak = 0;

    // Check all channels
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);

      // Find peak in this channel
      for (let i = 0; i < channelData.length; i++) {
        const abs = Math.abs(channelData[i]);
        if (abs > peak) {
          peak = abs;
        }
      }
    }

    return peak;
  }

  /**
   * Calculate normalization gain to boost quiet audio
   * Returns a multiplier to apply to the volume
   */
  private calculateNormalizationGain(peakVolume: number): number {
    // If audio is already loud enough, don't boost
    if (peakVolume >= this.MIN_PEAK_THRESHOLD) {
      console.log('[BackgroundTrack] Audio level is good, no boost needed');
      return 1.0;
    }

    // Calculate boost needed to reach target level
    const boost = Math.min(this.TARGET_PEAK_LEVEL / peakVolume, 5.0); // Cap at 5x boost
    console.log('[BackgroundTrack] Audio is quiet, applying boost:', {
      peakVolume: (peakVolume * 100).toFixed(1) + '%',
      boost: boost.toFixed(2) + 'x',
      targetLevel: (this.TARGET_PEAK_LEVEL * 100).toFixed(1) + '%'
    });

    return boost;
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

      // Analyze audio and calculate normalization
      const peakVolume = this.analyzePeakVolume(this.audioBuffer);
      const normalizationGain = this.calculateNormalizationGain(peakVolume);
      const finalVolume = this.BACKGROUND_VOLUME * normalizationGain;

      console.log(`[BackgroundTrack] Starting playback at ${(finalVolume * 100).toFixed(1)}% volume (base: ${(this.BACKGROUND_VOLUME * 100).toFixed(1)}%, boost: ${normalizationGain.toFixed(2)}x)`);

      // Double-check nothing is playing before creating new nodes
      if (this.sourceNode || this.gainNode) {
        console.warn('[BackgroundTrack] Nodes still exist after stop! Force cleaning...');
        this.stop();
      }

      // Create audio source
      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;

      // Create gain node for volume control with normalization
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = finalVolume;

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
