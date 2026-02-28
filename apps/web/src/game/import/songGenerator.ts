/**
 * Song Generator - Creates game-ready JSON files from imported music
 * Combines MIDI parsing, OMR, and melody extraction
 */

import type { Beatmap } from '../engine/beatmap';
import { parseMidiFile, getMidiStats, normalizeVelocity } from './midiParser';
import { extractMelody, analyzeMelodyQuality, type ExtractionStrategy } from './melodyExtractor';
import { transcribeSheetMusic, type OMRConfig, getDefaultOMRConfig } from './omrService';

export interface SongImportOptions {
  /** Song metadata */
  name: string;
  artist: string;

  /** Extraction strategy for polyphonic music */
  extractionStrategy?: ExtractionStrategy;

  /** Minimum spacing between notes in ms */
  minNoteSpacing?: number;

  /** Automatically detect BPM (default true) */
  autoDetectBPM?: boolean;

  /** Manual BPM override */
  manualBPM?: number;

  /** Difficulty level */
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface ImportResult {
  /** Generated beatmap/song data */
  beatmap: Beatmap;

  /** Import statistics */
  stats: {
    originalNoteCount: number;
    finalNoteCount: number;
    retentionRate: number;
    averageSpacing: number;
    isPolyphonic: boolean;
    laneDistribution: number[];
    suggestedDifficulty: 'easy' | 'medium' | 'hard';
    noteVariety: {
      uniqueNotes: number;
      longestRepetition: number;
    };
  };

  /** Warnings or issues during import */
  warnings: string[];
}

/**
 * Import a MIDI file and generate a playable song
 * @param midiFile - MIDI file
 * @param options - Import options and metadata
 * @returns Generated beatmap with statistics
 */
export async function importFromMIDI(
  midiFile: File,
  options: SongImportOptions
): Promise<ImportResult> {
  console.log('[Song Import] Processing MIDI file:', midiFile.name);

  // Validate file
  if (!midiFile.name.toLowerCase().endsWith('.mid') && !midiFile.name.toLowerCase().endsWith('.midi')) {
    throw new Error('Invalid file type. Expected .mid or .midi file');
  }

  // Read file as ArrayBuffer
  const buffer = await midiFile.arrayBuffer();

  // Parse MIDI
  const parseResult = await parseMidiFile(buffer);
  const stats = getMidiStats(parseResult);

  console.log('[Song Import] MIDI Stats:', stats);

  // Normalize velocity for consistent volume
  const normalizedNotes = normalizeVelocity(parseResult.notes);
  parseResult.notes = normalizedNotes;

  // Check if polyphonic
  const warnings: string[] = [];
  if (stats.isPolyphonic) {
    warnings.push(`This song is polyphonic (up to ${stats.maxSimultaneousNotes} simultaneous notes). Melody will be extracted.`);
  }

  // Warn if velocity was low
  if (stats.velocityRange.max < 85) {
    warnings.push(`Low volume detected (max: ${stats.velocityRange.max}). Volume has been boosted for better playback.`);
  }

  // Extract melody
  const extractionStrategy = options.extractionStrategy || 'melody-line';
  const minNoteSpacing = options.minNoteSpacing || 400;

  const gameNotes = extractMelody(parseResult.notes, extractionStrategy, minNoteSpacing);

  // Analyze extraction quality
  const quality = analyzeMelodyQuality(parseResult.notes, gameNotes);

  console.log('[Song Import] Extraction Quality:', quality);

  // Add warnings based on quality
  if (quality.retentionRate < 50) {
    warnings.push(`Low retention rate (${quality.retentionRate.toFixed(1)}%). Consider adjusting minNoteSpacing.`);
  }

  if (quality.averageSpacing < 400) {
    warnings.push(`Fast notes detected (${quality.averageSpacing}ms average). Notes have been spaced to 400ms minimum for playability.`);
  }

  // Add note variety info
  if (quality.noteVariety.uniqueNotes < 5) {
    warnings.push(`Limited note variety (${quality.noteVariety.uniqueNotes} unique notes). Song may sound repetitive.`);
  }

  if (quality.noteVariety.longestRepetition > 5) {
    warnings.push(`Some notes repeat consecutively (max ${quality.noteVariety.longestRepetition} times). Variety enforcement applied.`);
  }

  // Determine BPM
  let bpm = parseResult.bpm;
  if (options.manualBPM) {
    bpm = options.manualBPM;
    warnings.push(`Using manual BPM: ${bpm}`);
  } else if (options.autoDetectBPM !== false) {
    // Use detected BPM from MIDI
    console.log(`[Song Import] Detected BPM: ${bpm}`);
  }

  // Generate beatmap
  const beatmap: Beatmap = {
    id: generateSongId(options.name),
    name: options.name,
    artist: options.artist,
    bpm,
    duration: parseResult.duration,
    notes: gameNotes
  };

  return {
    beatmap,
    stats: {
      originalNoteCount: parseResult.notes.length,
      finalNoteCount: gameNotes.length,
      retentionRate: quality.retentionRate,
      averageSpacing: quality.averageSpacing,
      isPolyphonic: stats.isPolyphonic,
      laneDistribution: quality.laneDistribution,
      suggestedDifficulty: quality.difficulty,
      noteVariety: quality.noteVariety
    },
    warnings
  };
}

/**
 * Import from sheet music image using OMR
 * @param imageFile - Sheet music image (PNG, JPG, PDF)
 * @param options - Import options
 * @param omrConfig - OMR service configuration
 * @returns Generated beatmap with statistics
 */
export async function importFromSheetMusic(
  imageFile: File,
  options: SongImportOptions,
  omrConfig?: OMRConfig
): Promise<ImportResult> {
  console.log('[Song Import] Processing sheet music image:', imageFile.name);

  // Use default config if not provided
  const config = omrConfig || getDefaultOMRConfig();

  // Transcribe sheet music to notes
  const omrResult = await transcribeSheetMusic(imageFile, config);

  console.log('[Song Import] OMR Confidence:', omrResult.confidence);

  const warnings: string[] = [];

  // Add OMR warnings
  if (omrResult.warnings) {
    warnings.push(...omrResult.warnings);
  }

  if (omrResult.confidence < 0.7) {
    warnings.push(`Low OMR confidence (${(omrResult.confidence * 100).toFixed(1)}%). Results may be inaccurate.`);
  }

  // Extract melody
  const extractionStrategy = options.extractionStrategy || 'melody-line';
  const minNoteSpacing = options.minNoteSpacing || 400;

  const gameNotes = extractMelody(omrResult.notes, extractionStrategy, minNoteSpacing);

  // Analyze extraction quality
  const quality = analyzeMelodyQuality(omrResult.notes, gameNotes);

  // Determine BPM
  const bpm = options.manualBPM || omrResult.bpm;

  // Generate beatmap
  const beatmap: Beatmap = {
    id: generateSongId(options.name),
    name: options.name,
    artist: options.artist,
    bpm,
    duration: gameNotes.length > 0 ? gameNotes[gameNotes.length - 1].time + 2000 : 30000,
    notes: gameNotes
  };

  return {
    beatmap,
    stats: {
      originalNoteCount: omrResult.notes.length,
      finalNoteCount: gameNotes.length,
      retentionRate: quality.retentionRate,
      averageSpacing: quality.averageSpacing,
      isPolyphonic: omrResult.notes.length > gameNotes.length,
      laneDistribution: quality.laneDistribution,
      suggestedDifficulty: quality.difficulty,
      noteVariety: quality.noteVariety
    },
    warnings
  };
}

/**
 * Generate a unique song ID from name
 */
function generateSongId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Save beatmap to backend API (permanent storage)
 * Saves to apps/web/src/game/songs/ folder
 */
export async function saveBeatmapToAPI(beatmap: Beatmap): Promise<{ success: boolean; error?: string }> {
  try {
    // Use relative URL in development to leverage Vite proxy
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/songs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ beatmap })
    });

    if (!response.ok) {
      // Try to parse error response, but handle cases where it's not JSON
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Response body is not JSON, use status text
        const text = await response.text();
        if (text) errorMessage = text;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('[Song Import] Saved to API:', result);

    return { success: true };
  } catch (error: any) {
    console.error('[Song Import] API save failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete song from backend API
 */
export async function deleteSongFromAPI(songId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Use relative URL in development to leverage Vite proxy
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/songs/${songId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete song');
    }

    const result = await response.json();
    console.log('[Song Import] Deleted from API:', result);

    return { success: true };
  } catch (error: any) {
    console.error('[Song Import] API delete failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save beatmap as JSON file
 * Downloads the JSON file to user's computer
 */
export function saveBeatmapAsJSON(beatmap: Beatmap, filename?: string): void {
  const json = JSON.stringify(beatmap, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${beatmap.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log('[Song Import] Saved beatmap:', a.download);
}

/**
 * Save beatmap to local storage (temporary)
 * Useful for previewing before downloading
 */
export function saveBeatmapToLocalStorage(beatmap: Beatmap): void {
  const key = `imported-song-${beatmap.id}`;
  const json = JSON.stringify(beatmap);
  localStorage.setItem(key, json);
  console.log('[Song Import] Saved to localStorage:', key);
}

/**
 * Load beatmap from local storage
 */
export function loadBeatmapFromLocalStorage(songId: string): Beatmap | null {
  const key = `imported-song-${songId}`;
  const json = localStorage.getItem(key);

  if (!json) return null;

  try {
    return JSON.parse(json) as Beatmap;
  } catch (error) {
    console.error('[Song Import] Failed to parse beatmap from localStorage:', error);
    return null;
  }
}

/**
 * Get all imported songs from local storage
 */
export function getAllImportedSongs(): Beatmap[] {
  const songs: Beatmap[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('imported-song-')) {
      const json = localStorage.getItem(key);
      if (json) {
        try {
          songs.push(JSON.parse(json) as Beatmap);
        } catch (error) {
          console.error('[Song Import] Failed to parse song:', key);
        }
      }
    }
  }

  return songs;
}

/**
 * Delete imported song from local storage
 */
export function deleteImportedSong(songId: string): void {
  const key = `imported-song-${songId}`;
  localStorage.removeItem(key);
  console.log('[Song Import] Deleted song:', songId);
}
