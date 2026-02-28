/**
 * Game constants and configuration values
 * Adjust these values to tune gameplay difficulty and feel
 */

/**
 * MINIMUM NOTE SPACING
 * Minimum time (in milliseconds) between consecutive notes in a song
 * - Lower values = faster, harder gameplay
 * - Higher values = slower, easier gameplay
 *
 * Recommended values:
 * - Easy: 600-800ms
 * - Medium: 400-600ms
 * - Hard: 300-400ms
 *
 * Current: 500ms (medium difficulty)
 */
export const MIN_NOTE_SPACING_MS = 1200;

/**
 * BPM CONFIGURATIONS
 * Beats per minute for different difficulty levels
 */
export const BPM_CONFIG = {
  easy: 80,    // ~750ms per beat
  medium: 100, // ~600ms per beat
  hard: 120,   // ~500ms per beat
} as const;

/**
 * TILE SPEED
 * How fast tiles fall down the screen (pixels per second)
 */
export const TILE_SPEED = {
  initial: 200,      // Starting speed
  increment: 10,     // Speed increase every 10 hits
} as const;

/**
 * HIT DETECTION
 * Timing windows for hit quality
 */
export const HIT_WINDOW = {
  perfect: 50,  // ±50ms for perfect hit
  good: 100,    // ±100ms for good hit
  miss: 150,    // Beyond ±150ms is a miss
} as const;

/**
 * AUDIO
 * Audio playback settings
 */
export const AUDIO_CONFIG = {
  masterVolume: 0.3,           // 0.0 to 1.0
  noteDecay: 0.15,             // How long melodic notes sustain (seconds)
  noteSustainLevel: 0.4,       // Volume level during sustain phase
  noteReleaseTime: 0.3,        // Fade out time (seconds)
  previewMaxDuration: 10000,   // Max preview length in ms
} as const;

/**
 * VISUAL
 * Visual feedback timings
 */
export const VISUAL_CONFIG = {
  flashDuration: 300,          // White flash on tap (ms)
  hitHighlightDuration: 500,   // Green hit highlight (ms)
} as const;
