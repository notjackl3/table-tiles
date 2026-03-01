/**
 * Note Clustering Utility
 * Finds all notes within a time window for multi-note playback
 */

import type { Beatmap } from '../engine/beatmap';

// Time window in milliseconds for collecting notes (±100ms)
const TIME_WINDOW_MS = 100;

/**
 * Find all note frequencies within a time window around a center time
 * @param centerTime - The center time in milliseconds (from the hit tile)
 * @param beatmap - The current beatmap containing all notes
 * @returns Array of frequencies to play simultaneously
 */
export function findNotesInTimeWindow(
  centerTime: number,
  beatmap: Beatmap
): number[] {
  const startTime = centerTime - TIME_WINDOW_MS;
  const endTime = centerTime + TIME_WINDOW_MS;

  // Find all notes within the time window
  const notesInWindow = beatmap.notes
    .filter(note => note.time >= startTime && note.time <= endTime);

  console.log(`[NoteCluster] Searching time window [${startTime.toFixed(0)}, ${endTime.toFixed(0)}] around ${centerTime.toFixed(0)}ms`);
  console.log(`[NoteCluster] Found ${notesInWindow.length} notes in window:`,
    notesInWindow.map(n => ({ time: n.time, freq: n.noteFrequency }))
  );

  // Extract frequencies
  const frequencies = notesInWindow
    .map(note => note.noteFrequency)
    .filter((freq): freq is number => freq !== undefined && freq !== null);

  // If no frequencies found, return empty array
  if (frequencies.length === 0) {
    console.warn(`[NoteCluster] No valid frequencies found in window`);
    return [];
  }

  console.log(`[NoteCluster] Returning ${frequencies.length} frequencies:`, frequencies);
  return frequencies;
}

/**
 * Get the time window size (useful for debugging/config)
 */
export function getTimeWindowMs(): number {
  return TIME_WINDOW_MS;
}
