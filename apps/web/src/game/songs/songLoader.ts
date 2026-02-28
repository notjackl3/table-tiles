/**
 * Song loader - loads beatmaps from JSON files
 */

import type { Beatmap } from '../engine/beatmap';
import { validateBeatmapSpacing } from '../engine/beatmap';
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

  // Validate note spacing
  const validation = validateBeatmapSpacing(beatmap);
  if (!validation.valid) {
    console.warn(`[Song Loader] Spacing validation warnings for "${beatmap.name}":`);
    validation.errors.forEach(error => console.warn(`  - ${error}`));
  }

  return beatmap;
}

/**
 * Get song metadata by ID
 */
export function getSongMetadata(songId: string): SongMetadata | undefined {
  return AVAILABLE_SONGS.find(song => song.id === songId);
}
