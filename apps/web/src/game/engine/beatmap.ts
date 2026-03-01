/**
 * Beatmap system for generating tile patterns
 */

import { MIN_NOTE_SPACING_MS, BPM_CONFIG } from '../constants';

export interface BeatmapNote {
  lane: number;
  time: number; // ms from start
  noteFrequency?: number; // Optional frequency for melodic playback
}

export interface Beatmap {
  id: string;
  name: string;
  artist?: string;
  bpm: number;
  duration: number; // ms
  notes: BeatmapNote[];
  audioFile?: string; // Optional path to pre-rendered audio file (MP3/WAV) for background music
  silentNotes?: boolean; // If true, don't synthesize notes (MP3-only mode with random notes)
}

/**
 * Generate a procedural beatmap
 */
export function generateProceduralBeatmap(
  duration: number = 60000, // 1 minute
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Beatmap {
  // Use configured BPM values
  const bpm = BPM_CONFIG[difficulty];
  const beatInterval = (60 / bpm) * 1000; // ms per beat

  // Ensure beat interval respects minimum spacing
  const effectiveBeatInterval = Math.max(beatInterval, MIN_NOTE_SPACING_MS);

  const notes: BeatmapNote[] = [];
  let currentTime = 3000; // Start after 3 seconds (more preparation time)

  // Pattern parameters based on difficulty - reduced density for easier gameplay
  const patterns = {
    easy: { notesPerBeat: 0.4, randomness: 0.2 },    // 40% chance per beat
    medium: { notesPerBeat: 0.5, randomness: 0.3 },  // 50% chance per beat (was 75%)
    hard: { notesPerBeat: 0.7, randomness: 0.4 }     // 70% chance per beat (was 100%)
  };

  const { notesPerBeat, randomness } = patterns[difficulty];

  while (currentTime < duration) {
    // Decide if we place a note this beat
    if (Math.random() < notesPerBeat) {
      // Choose lane (with slight anti-repeat bias)
      let lane = Math.floor(Math.random() * 4);

      // Avoid putting 3+ notes in same lane consecutively
      if (notes.length >= 2) {
        const lastTwo = notes.slice(-2);
        if (lastTwo[0].lane === lastTwo[1].lane && lastTwo[1].lane === lane) {
          lane = (lane + 1 + Math.floor(Math.random() * 3)) % 4;
        }
      }

      notes.push({
        lane,
        time: currentTime + (Math.random() * randomness * effectiveBeatInterval)
      });
    }

    currentTime += effectiveBeatInterval;
  }

  return {
    id: 'procedural-' + difficulty,
    name: `Procedural ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`,
    bpm,
    duration,
    notes
  };
}

/**
 * Load beatmap from JSON
 */
export function loadBeatmapFromJSON(json: string): Beatmap {
  const data = JSON.parse(json);

  if (!data.notes || !Array.isArray(data.notes)) {
    throw new Error('Invalid beatmap format');
  }

  return {
    id: data.id || 'custom',
    name: data.name || 'Custom Song',
    bpm: data.bpm || 120,
    duration: data.duration || 60000,
    notes: data.notes
  };
}

/**
 * Example: Create a simple pattern beatmap
 */
export function createPatternBeatmap(): Beatmap {
  const notes: BeatmapNote[] = [];
  const interval = MIN_NOTE_SPACING_MS; // Use configured minimum spacing

  // Pattern: 0-1-2-3, 3-2-1-0, repeat
  for (let i = 0; i < 60; i++) {
    const lane = i % 8 < 4 ? i % 4 : 3 - (i % 4);
    notes.push({
      lane,
      time: 2000 + i * interval
    });
  }

  return {
    id: 'pattern-basic',
    name: 'Basic Pattern',
    bpm: 120,
    duration: 32000,
    notes
  };
}

/**
 * Validate beatmap note spacing
 * Checks if all notes meet the minimum spacing requirement
 */
export function validateBeatmapSpacing(beatmap: Beatmap): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const sortedNotes = [...beatmap.notes].sort((a, b) => a.time - b.time);

  for (let i = 1; i < sortedNotes.length; i++) {
    const prevNote = sortedNotes[i - 1];
    const currNote = sortedNotes[i];
    const spacing = currNote.time - prevNote.time;

    if (spacing < MIN_NOTE_SPACING_MS) {
      errors.push(
        `Note ${i} at ${currNote.time}ms is too close to previous note (${spacing}ms spacing, minimum: ${MIN_NOTE_SPACING_MS}ms)`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get recommended spacing for a given BPM
 * Useful for creating new songs
 */
export function getRecommendedSpacing(bpm: number): number {
  const beatInterval = (60 / bpm) * 1000; // ms per beat
  return Math.max(beatInterval, MIN_NOTE_SPACING_MS);
}

/**
 * Generate random notes for MP3-only mode
 * Creates notes with random spacing between 500-1000ms for a faster pace
 */
export function generateRandomNotes(
  duration: number,
  _bpm: number,
  _difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): BeatmapNote[] {
  const notes: BeatmapNote[] = [];
  let currentTime = 3000; // Start after 3 seconds

  while (currentTime < duration) {
    // Choose random lane (with slight anti-repeat bias)
    let lane = Math.floor(Math.random() * 4);

    // Avoid putting 3+ notes in same lane consecutively
    if (notes.length >= 2) {
      const lastTwo = notes.slice(-2);
      if (lastTwo[0].lane === lastTwo[1].lane && lastTwo[1].lane === lane) {
        lane = (lane + 1 + Math.floor(Math.random() * 3)) % 4;
      }
    }

    notes.push({
      lane,
      time: currentTime
    });

    // Random spacing between 500-1000ms for faster pace
    const randomSpacing = 500 + Math.random() * 500; // 500 to 1000ms
    currentTime += randomSpacing;
  }

  return notes;
}
