/**
 * Song loader - loads beatmaps from JSON files
 */

import type { Beatmap } from '../engine/beatmap';
import { validateBeatmapSpacing } from '../engine/beatmap';
import { noteToFrequency } from '../audio/noteConverter';
import simpleMelodyData from './simpleMelody.json';
import riverFlowsInYouData from './riverFlowsInYou.json';

export interface SongMetadata {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  duration: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Available songs
export const AVAILABLE_SONGS: SongMetadata[] = [
  {
    id: 'simple-melody',
    name: 'Simple Melody',
    artist: 'Tutorial',
    bpm: 120,
    duration: 30000,
    difficulty: 'easy'
  },
  {
    id: 'river-flows-in-you',
    name: 'River Flows in You',
    artist: 'Yiruma',
    bpm: 72,
    duration: 45000,
    difficulty: 'medium'
  }
];

/**
 * Load a song beatmap by ID
 */
export function loadSong(songId: string): Beatmap {
  let beatmap: Beatmap;

  switch (songId) {
    case 'simple-melody':
      beatmap = simpleMelodyData as Beatmap;
      break;
    case 'river-flows-in-you':
      beatmap = riverFlowsInYouData as Beatmap;
      break;
    default:
      throw new Error(`Unknown song: ${songId}`);
  }

  // Convert note names to frequencies if needed
  beatmap = convertNotesToFrequencies(beatmap);

  // Validate note spacing
  const validation = validateBeatmapSpacing(beatmap);
  if (!validation.valid) {
    console.warn(`[Song Loader] Spacing validation warnings for "${beatmap.name}":`);
    validation.errors.forEach(error => console.warn(`  - ${error}`));
  }

  return beatmap;
}

/**
 * Convert note names to frequencies in a beatmap
 * Supports both "note" (string like "C4") and "noteFrequency" (number) formats
 */
function convertNotesToFrequencies(beatmap: Beatmap): Beatmap {
  return {
    ...beatmap,
    notes: beatmap.notes.map(note => {
      // If note has a "note" property (string), convert it to frequency
      if ('note' in note && typeof (note as any).note === 'string') {
        const noteName = (note as any).note;
        try {
          const frequency = noteToFrequency(noteName);
          return {
            ...note,
            noteFrequency: frequency
          };
        } catch (error) {
          console.error(`Failed to convert note "${noteName}":`, error);
          return note;
        }
      }
      // If already has noteFrequency, keep it as is
      return note;
    })
  };
}

/**
 * Get song metadata by ID
 */
export function getSongMetadata(songId: string): SongMetadata | undefined {
  return AVAILABLE_SONGS.find(song => song.id === songId);
}
