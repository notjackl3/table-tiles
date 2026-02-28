/**
 * Note to frequency converter
 * Supports standard note notation (C4, C#4, Db4, etc.)
 */

// Note names to semitone offset from C
const NOTE_OFFSETS: Record<string, number> = {
  'C': 0,
  'C#': 1, 'Db': 1,
  'D': 2,
  'D#': 3, 'Eb': 3,
  'E': 4,
  'F': 5,
  'F#': 6, 'Gb': 6,
  'G': 7,
  'G#': 8, 'Ab': 8,
  'A': 9,
  'A#': 10, 'Bb': 10,
  'B': 11
};

// A4 = 440 Hz (standard tuning)
const A4_FREQUENCY = 440;
const A4_MIDI_NUMBER = 69;

/**
 * Convert note name to frequency
 * @param note - Note name (e.g., "C4", "C#5", "Db3")
 * @returns Frequency in Hz
 *
 * @example
 * noteToFrequency("A4") // 440
 * noteToFrequency("C4") // 261.63
 * noteToFrequency("C#4") // 277.18
 * noteToFrequency("Db4") // 277.18 (same as C#4)
 */
export function noteToFrequency(note: string): number {
  // Parse note name (e.g., "C#4" -> "C#" and "4")
  const match = note.match(/^([A-G][#b]?)(\d+)$/);

  if (!match) {
    throw new Error(`Invalid note format: ${note}. Expected format like "C4", "C#4", or "Db4"`);
  }

  const [, noteName, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);

  // Get semitone offset for the note
  const noteOffset = NOTE_OFFSETS[noteName];
  if (noteOffset === undefined) {
    throw new Error(`Unknown note name: ${noteName}`);
  }

  // Calculate MIDI note number
  // C4 is MIDI 60, so C0 is MIDI 12
  const midiNumber = (octave + 1) * 12 + noteOffset;

  // Convert MIDI number to frequency using equal temperament formula
  // f = 440 * 2^((n - 69) / 12)
  const frequency = A4_FREQUENCY * Math.pow(2, (midiNumber - A4_MIDI_NUMBER) / 12);

  return Math.round(frequency * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert frequency to closest note name
 * @param frequency - Frequency in Hz
 * @returns Note name (e.g., "A4", "C#5")
 */
export function frequencyToNote(frequency: number): string {
  // Convert frequency to MIDI number
  const midiNumber = Math.round(12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI_NUMBER);

  // Convert MIDI number to note name
  const octave = Math.floor(midiNumber / 12) - 1;
  const noteIndex = midiNumber % 12;

  // Use sharp notation by default
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteName = noteNames[noteIndex];

  return `${noteName}${octave}`;
}

/**
 * Common note frequencies for reference
 */
export const COMMON_NOTES = {
  // Octave 3
  'C3': noteToFrequency('C3'),   // 130.81
  'D3': noteToFrequency('D3'),   // 146.83
  'E3': noteToFrequency('E3'),   // 164.81
  'F3': noteToFrequency('F3'),   // 174.61
  'G3': noteToFrequency('G3'),   // 196.00
  'A3': noteToFrequency('A3'),   // 220.00
  'B3': noteToFrequency('B3'),   // 246.94

  // Octave 4 (middle C)
  'C4': noteToFrequency('C4'),   // 261.63
  'D4': noteToFrequency('D4'),   // 293.66
  'E4': noteToFrequency('E4'),   // 329.63
  'F4': noteToFrequency('F4'),   // 349.23
  'G4': noteToFrequency('G4'),   // 392.00
  'A4': noteToFrequency('A4'),   // 440.00
  'B4': noteToFrequency('B4'),   // 493.88

  // Octave 5
  'C5': noteToFrequency('C5'),   // 523.25
  'D5': noteToFrequency('D5'),   // 587.33
  'E5': noteToFrequency('E5'),   // 659.25
  'F5': noteToFrequency('F5'),   // 698.46
  'G5': noteToFrequency('G5'),   // 783.99
  'A5': noteToFrequency('A5'),   // 880.00
  'B5': noteToFrequency('B5'),   // 987.77
} as const;
