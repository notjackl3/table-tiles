/**
 * MIDI Parser - Converts MIDI files to game-compatible note format
 */

import { Midi } from '@tonejs/midi';
import type { Note as MidiNote } from '@tonejs/midi/dist/Note';

export interface ParsedNote {
  note: string;  // Note name (e.g., "C4", "D#5")
  time: number;  // Time in milliseconds
  duration: number;  // Duration in milliseconds
  velocity: number;  // Velocity (0-127)
  trackIndex: number;  // Original track index
}

export interface MidiParseResult {
  notes: ParsedNote[];
  bpm: number;
  duration: number;  // Total duration in milliseconds
  timeSignature: [number, number];  // e.g., [4, 4] for 4/4 time
  trackNames: string[];
}

/**
 * Parse a MIDI file from ArrayBuffer
 * @param buffer - MIDI file as ArrayBuffer
 * @returns Parsed MIDI data with all notes
 */
export async function parseMidiFile(buffer: ArrayBuffer): Promise<MidiParseResult> {
  // Convert ArrayBuffer to Uint8Array
  const uint8Array = new Uint8Array(buffer);

  // Parse MIDI file
  const midi = new Midi(uint8Array);

  // Extract metadata
  const bpm = midi.header.tempos[0]?.bpm || 120;
  const timeSignature = midi.header.timeSignatures[0]?.timeSignature || [4, 4];
  const durationInSeconds = midi.duration;
  const duration = Math.round(durationInSeconds * 1000);

  // Extract all notes from all tracks
  const allNotes: ParsedNote[] = [];
  const trackNames: string[] = [];

  midi.tracks.forEach((track, trackIndex) => {
    trackNames.push(track.name || `Track ${trackIndex + 1}`);

    track.notes.forEach((note: MidiNote) => {
      allNotes.push({
        note: note.name,  // e.g., "C4", "D#5"
        time: Math.round(note.time * 1000),  // Convert seconds to milliseconds
        duration: Math.round(note.duration * 1000),
        velocity: note.velocity,
        trackIndex
      });
    });
  });

  // Sort notes by time
  allNotes.sort((a, b) => a.time - b.time);

  return {
    notes: allNotes,
    bpm,
    duration,
    timeSignature,
    trackNames
  };
}

/**
 * Normalize velocity values in parsed notes
 * Boosts quiet MIDI files to ensure consistent, audible playback
 * @param notes - Array of parsed notes to normalize
 * @param targetMin - Minimum velocity after normalization (default 95)
 * @param targetMax - Maximum velocity after normalization (default 127)
 */
export function normalizeVelocity(
  notes: ParsedNote[],
  targetMin: number = 95,
  targetMax: number = 127
): ParsedNote[] {
  if (notes.length === 0) return notes;

  // Find current min and max velocity
  const velocities = notes.map(n => n.velocity);
  const currentMin = Math.min(...velocities);
  const currentMax = Math.max(...velocities);
  const currentRange = currentMax - currentMin;

  // If the max velocity is already very loud (>85), don't normalize
  // Lower threshold than before to boost more files
  if (currentMax >= 85 && currentRange > 30) {
    console.log('[MIDI Parser] Velocity levels are good, skipping normalization');
    return notes;
  }

  console.log(`[MIDI Parser] Normalizing velocity: ${currentMin}-${currentMax} → ${targetMin}-${targetMax}`);

  // Normalize each note's velocity
  return notes.map(note => {
    let normalizedVelocity: number;

    if (currentRange === 0) {
      // All notes have same velocity - set to high value for audibility
      normalizedVelocity = 110; // Louder default for uniform velocity
    } else {
      // Scale to target range (95-127 for louder output)
      const normalized = (note.velocity - currentMin) / currentRange;
      normalizedVelocity = targetMin + (normalized * (targetMax - targetMin));
    }

    return {
      ...note,
      velocity: Math.round(normalizedVelocity)
    };
  });
}

/**
 * Get statistics about the parsed MIDI file
 * Useful for deciding how to process the file
 */
export function getMidiStats(parseResult: MidiParseResult): {
  totalNotes: number;
  notesPerTrack: number[];
  maxSimultaneousNotes: number;
  isPolyphonic: boolean;
  averageNotesPerSecond: number;
  velocityRange: { min: number; max: number; average: number };
} {
  const { notes, duration } = parseResult;

  // Count notes per track
  const trackCounts = new Map<number, number>();
  notes.forEach(note => {
    trackCounts.set(note.trackIndex, (trackCounts.get(note.trackIndex) || 0) + 1);
  });
  const notesPerTrack = Array.from(trackCounts.values());

  // Find maximum simultaneous notes
  let maxSimultaneous = 0;
  const timeSlots = new Map<number, number>();

  notes.forEach(note => {
    const startTime = Math.floor(note.time / 10) * 10;  // 10ms buckets
    const endTime = Math.floor((note.time + note.duration) / 10) * 10;

    for (let t = startTime; t <= endTime; t += 10) {
      const count = (timeSlots.get(t) || 0) + 1;
      timeSlots.set(t, count);
      maxSimultaneous = Math.max(maxSimultaneous, count);
    }
  });

  // Calculate velocity statistics
  let velocityRange = { min: 0, max: 0, average: 0 };
  if (notes.length > 0) {
    const velocities = notes.map(n => n.velocity);
    const minVelocity = Math.min(...velocities);
    const maxVelocity = Math.max(...velocities);
    const avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    velocityRange = {
      min: Math.round(minVelocity),
      max: Math.round(maxVelocity),
      average: Math.round(avgVelocity)
    };
  }

  return {
    totalNotes: notes.length,
    notesPerTrack,
    maxSimultaneousNotes: maxSimultaneous,
    isPolyphonic: maxSimultaneous > 1,
    averageNotesPerSecond: notes.length / (duration / 1000),
    velocityRange
  };
}
