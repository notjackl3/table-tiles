/**
 * Melody Extractor - Converts polyphonic music to monophonic melody
 * Handles multiple simultaneous notes and creates playable game patterns
 */

import type { ParsedNote } from './midiParser';
import { noteToFrequency } from '../audio/noteConverter';

export interface GameNote {
  lane: number;  // 0-3 (4 lanes)
  time: number;  // Time in milliseconds
  note: string;  // Note name (e.g., "C4")
}

export type ExtractionStrategy =
  | 'melody-line'      // Extract main melody intelligently
  | 'highest-note'     // Always take highest note
  | 'round-robin'      // Distribute across lanes
  | 'smart-lanes';     // Assign based on pitch ranges

/**
 * Extract melody from polyphonic MIDI and assign to game lanes
 * @param notes - Parsed MIDI notes
 * @param strategy - Extraction strategy
 * @param minNoteSpacing - Minimum spacing between notes in ms (default 400ms)
 * @returns Game-ready notes with lane assignments
 */
export function extractMelody(
  notes: ParsedNote[],
  strategy: ExtractionStrategy = 'melody-line',
  minNoteSpacing: number = 400
): GameNote[] {
  console.log('[Melody Extractor] Starting extraction with', notes.length, 'total notes');

  // Group notes by time (within 150ms window = simultaneous)
  // Wider window captures bass + melody that are slightly offset in MIDI timing
  const noteGroups = groupSimultaneousNotes(notes, 150);

  console.log('[Melody Extractor] Created', noteGroups.length, 'note groups');

  // Debug: Log first 10 groups to see what we're working with
  const singleNoteGroups = noteGroups.filter(g => g.length === 1).length;
  const multiNoteGroups = noteGroups.filter(g => g.length > 1).length;
  console.log('[Melody Extractor] Single-note groups:', singleNoteGroups, '| Multi-note groups:', multiNoteGroups);

  // Sample first few groups for debugging
  console.log('[Melody Extractor] First 5 groups sample:');
  noteGroups.slice(0, 5).forEach((group, i) => {
    const noteNames = group.map(n => n.note).join(', ');
    console.log(`  Group ${i} @ ${group[0].time}ms: [${noteNames}] (${group.length} notes)`);
  });

  // Extract single note from each group based on strategy
  let selectedNotes: ParsedNote[];

  switch (strategy) {
    case 'highest-note':
      selectedNotes = extractHighestNoteWithVariety(noteGroups);
      break;
    case 'melody-line':
      selectedNotes = extractMelodyLine(noteGroups);
      break;
    case 'round-robin':
      selectedNotes = noteGroups.map(group => group[0]); // Take first note from each group
      break;
    case 'smart-lanes':
      selectedNotes = extractMelodyLine(noteGroups); // Use melody line for selection
      break;
    default:
      selectedNotes = extractMelodyLine(noteGroups);
  }

  console.log('[Melody Extractor] Selected', selectedNotes.length, 'notes after extraction');

  // Apply minimum note spacing
  selectedNotes = applyMinimumSpacing(selectedNotes, minNoteSpacing);

  console.log('[Melody Extractor] Final note count after spacing:', selectedNotes.length);

  // Assign lanes based on strategy
  const gameNotes = assignLanes(selectedNotes, strategy);

  return gameNotes;
}

/**
 * Group notes that occur at approximately the same time
 */
function groupSimultaneousNotes(notes: ParsedNote[], timeWindow: number): ParsedNote[][] {
  if (notes.length === 0) return [];

  const groups: ParsedNote[][] = [];
  let currentGroup: ParsedNote[] = [notes[0]];
  let groupStartTime = notes[0].time;

  for (let i = 1; i < notes.length; i++) {
    const note = notes[i];
    const timeDiff = note.time - groupStartTime;

    if (timeDiff <= timeWindow) {
      // Note is close enough to be in the same group
      currentGroup.push(note);
    } else {
      // Start new group
      groups.push(currentGroup);
      currentGroup = [note];
      groupStartTime = note.time;
    }
  }

  // Add last group
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Post-process to enforce maximum consecutive repetitions
 * If a note repeats more than maxConsecutive times, skip the extras
 * This is a final safety net to prevent excessive repetition
 */
function enforceMaxRepetition(notes: ParsedNote[], maxConsecutive: number): ParsedNote[] {
  if (notes.length === 0) return [];

  const result: ParsedNote[] = [notes[0]];
  let consecutiveCount = 1;

  for (let i = 1; i < notes.length; i++) {
    const note = notes[i];
    const lastNote = result[result.length - 1];

    if (note.note === lastNote.note) {
      consecutiveCount++;

      // Only include if we haven't exceeded the max
      if (consecutiveCount <= maxConsecutive) {
        result.push(note);
      }
      // Otherwise skip this note to prevent excessive repetition
    } else {
      // Different note - reset counter and include
      consecutiveCount = 1;
      result.push(note);
    }
  }

  console.log(`[Melody Extractor] Enforced max repetition: ${notes.length} -> ${result.length} notes`);
  return result;
}

/**
 * Extract highest notes with variety enforcement
 * Prevents selecting the same note too many times in a row
 */
function extractHighestNoteWithVariety(noteGroups: ParsedNote[][]): ParsedNote[] {
  const selected: ParsedNote[] = [];
  const MAX_CONSECUTIVE = 2; // Maximum times to allow same note in a row (with alternatives)
  const MAX_SINGLE_NOTE_REPETITION = 2; // Skip single notes after this many repeats (reduced from 3)

  for (const group of noteGroups) {
    if (group.length === 1) {
      // Single note - check if including it would create excessive repetition
      const consecutiveCount = countConsecutiveSameNote(selected, group[0].note);

      if (consecutiveCount >= MAX_SINGLE_NOTE_REPETITION) {
        // Skip this note to avoid excessive repetition
        continue;
      }

      // Accept the single note
      selected.push(group[0]);
      continue;
    }

    // Sort notes by frequency (highest first)
    const sortedByPitch = [...group].sort((a, b) => {
      const freqA = noteToFrequency(a.note);
      const freqB = noteToFrequency(b.note);
      return freqB - freqA;
    });

    // Check if highest note would create repetition
    const highestNote = sortedByPitch[0];
    const consecutiveCount = countConsecutiveSameNote(selected, highestNote.note);

    // AGGRESSIVE VARIETY: If we have alternatives, strongly prefer variety
    if (sortedByPitch.length > 1) {
      // Find the first note that's different from the last selected note
      const lastNote = selected.length > 0 ? selected[selected.length - 1].note : '';
      const alternativeNote = sortedByPitch.find(note => note.note !== lastNote);

      // If there's ANY repetition and we have an alternative, prefer the alternative
      if (alternativeNote && consecutiveCount >= 1) {
        const highestFreq = noteToFrequency(highestNote.note);
        const altFreq = noteToFrequency(alternativeNote.note);

        // Use alternative if it's within reasonable range (not more than an octave lower)
        if (highestFreq - altFreq < 700) { // Increased tolerance from 600 to 700
          selected.push(alternativeNote);
        } else if (consecutiveCount >= MAX_CONSECUTIVE) {
          // Force alternative even if it's lower, to avoid too much repetition
          selected.push(alternativeNote);
        } else {
          selected.push(highestNote);
        }
      } else {
        selected.push(highestNote);
      }
    } else {
      selected.push(highestNote);
    }
  }

  // POST-PROCESS: Fix any remaining 4+ consecutive repeats
  return enforceMaxRepetition(selected, 3);
}

/**
 * Extract melody line using intelligent algorithm
 * Considers note velocity, duration, melodic contour, and variety
 */
function extractMelodyLine(noteGroups: ParsedNote[][]): ParsedNote[] {
  const melody: ParsedNote[] = [];
  let previousNote: ParsedNote | null = null;
  const MAX_CONSECUTIVE_SAME_NOTE = 2; // Maximum for multi-note groups
  const MAX_SINGLE_NOTE_REPETITION = 2; // Skip single notes after this many repeats (reduced from 3)

  for (const group of noteGroups) {
    if (group.length === 1) {
      // Single note - check if including it would create excessive repetition
      const consecutiveCount = countConsecutiveSameNote(melody, group[0].note);

      if (consecutiveCount >= MAX_SINGLE_NOTE_REPETITION) {
        // Skip this note to avoid excessive repetition
        // Even though it's the only choice, skipping is better than boring repetition
        continue;
      }

      // Accept the single note
      melody.push(group[0]);
      previousNote = group[0];
      continue;
    }

    // Multiple notes - select melody note with strong variety preference
    let selectedNote: ParsedNote;

    // Check if we have alternatives to the repeated note
    const hasAlternatives = group.some(note => note.note !== (melody.length > 0 ? melody[melody.length - 1].note : ''));

    // Score each note based on multiple factors
    const scores = group.map(note => {
      let score = 0;

      // Factor 1: Velocity (louder notes are often melody)
      score += note.velocity * 0.3;

      // Factor 2: Duration (longer notes are often melody)
      score += Math.min(note.duration / 100, 10) * 0.2;

      // Factor 3: Melodic contour (prefer notes that follow previous note smoothly)
      if (previousNote) {
        const currentFreq = noteToFrequency(note.note);
        const prevFreq = noteToFrequency(previousNote.note);
        const interval = Math.abs(currentFreq - prevFreq);

        // Prefer smaller intervals (smoother melody)
        if (interval < 100) score += 30;      // Small step
        else if (interval < 300) score += 20; // Medium step
        else if (interval < 600) score += 10; // Large step
      }

      // Factor 4: Prefer higher notes (melody is often in upper register)
      const frequency = noteToFrequency(note.note);
      score += (frequency / 1000) * 0.1;

      // Factor 5: VARIETY ENFORCEMENT - SUPER AGGRESSIVELY penalize repetitive notes
      const noteConsecutiveCount = countConsecutiveSameNote(melody, note.note);

      if (hasAlternatives) {
        // We have other note options - EXTREMELY heavily discourage ANY repetition
        if (noteConsecutiveCount >= MAX_CONSECUTIVE_SAME_NOTE) {
          // Massive penalty - completely eliminate this option
          score -= 2000;
        } else if (noteConsecutiveCount >= 1) {
          // Even a single repeat gets HEAVILY penalized when we have choices
          score -= 100; // Increased from 50 to 100
        }
      } else {
        // All notes in group are the same - apply moderate penalty
        if (noteConsecutiveCount >= MAX_CONSECUTIVE_SAME_NOTE) {
          score -= 150; // Increased from 100
        } else if (noteConsecutiveCount >= 1) {
          score -= 30; // Increased from 20
        }
      }

      return score;
    });

    // Select note with highest score
    const maxScore = Math.max(...scores);
    const bestIndex = scores.indexOf(maxScore);
    selectedNote = group[bestIndex];

    melody.push(selectedNote);
    previousNote = selectedNote;
  }

  // POST-PROCESS: Fix any remaining 4+ consecutive repeats
  return enforceMaxRepetition(melody, 3);
}

/**
 * Count how many times the same note appears consecutively at the end of the melody
 * Used to enforce variety and prevent boring repetition
 */
function countConsecutiveSameNote(melody: ParsedNote[], noteName: string): number {
  if (melody.length === 0) return 0;

  let count = 0;
  for (let i = melody.length - 1; i >= 0; i--) {
    if (melody[i].note === noteName) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Apply minimum spacing between notes with variety preference
 * When notes are too close together, prefers to keep notes that add variety
 */
function applyMinimumSpacing(notes: ParsedNote[], minSpacing: number): ParsedNote[] {
  if (notes.length === 0) return [];

  const spaced: ParsedNote[] = [notes[0]];

  for (let i = 1; i < notes.length; i++) {
    const note = notes[i];
    const lastNote = spaced[spaced.length - 1];
    const timeDiff = note.time - lastNote.time;

    if (timeDiff >= minSpacing) {
      // Far enough apart - always include
      spaced.push(note);
    } else {
      // Too close - decide whether to replace last note or skip this one
      // Prefer variety: if this note is different, replace the last note
      const lastNoteRepetitionCount = countConsecutiveSameNote(spaced.slice(0, -1), lastNote.note);

      // If replacing with this note would reduce repetition, do it
      if (note.note !== lastNote.note && lastNoteRepetitionCount >= 1) {
        // Replace last note with this one for variety
        spaced[spaced.length - 1] = note;
      }
      // Otherwise skip this note (keep the previous one)
    }
  }

  return spaced;
}

/**
 * Find best alternative lane when preferred lane is at max consecutive count
 * Prioritizes lanes with lowest consecutive count, with slight preference for nearby lanes
 */
function findBestAlternativeLane(laneConsecutiveCount: number[], preferredLane: number): number {
  let bestLane = 0;
  let lowestCount = laneConsecutiveCount[0];

  for (let i = 1; i < 4; i++) {
    const count = laneConsecutiveCount[i];
    const distance = Math.abs(i - preferredLane);

    // Prefer lanes with lower consecutive count
    // If tied, prefer lanes closer to the preferred lane
    if (count < lowestCount || (count === lowestCount && distance < Math.abs(bestLane - preferredLane))) {
      bestLane = i;
      lowestCount = count;
    }
  }

  return bestLane;
}

/**
 * Assign notes to lanes (0-3)
 */
function assignLanes(notes: ParsedNote[], strategy: ExtractionStrategy): GameNote[] {
  if (strategy === 'smart-lanes') {
    return assignSmartLanes(notes);
  } else if (strategy === 'round-robin') {
    return assignRoundRobinLanes(notes);
  } else {
    // Default: assign based on pitch
    return assignPitchBasedLanes(notes);
  }
}

/**
 * Assign lanes based on pitch ranges with anti-stacking logic
 * Divides the frequency spectrum into 4 lanes
 * Prevents more than 4 consecutive notes in the same lane
 */
function assignPitchBasedLanes(notes: ParsedNote[]): GameNote[] {
  // Find min and max frequencies
  const frequencies = notes.map(n => noteToFrequency(n.note));
  const minFreq = Math.min(...frequencies);
  const maxFreq = Math.max(...frequencies);
  const range = maxFreq - minFreq;

  const gameNotes: GameNote[] = [];
  const laneConsecutiveCount = [0, 0, 0, 0]; // Track consecutive uses per lane
  const MAX_CONSECUTIVE = 4;

  for (const note of notes) {
    const freq = noteToFrequency(note.note);
    const normalized = range > 0 ? (freq - minFreq) / range : 0.5;

    // Determine preferred lane based on frequency
    let preferredLane: number;
    if (normalized < 0.25) preferredLane = 0;
    else if (normalized < 0.5) preferredLane = 1;
    else if (normalized < 0.75) preferredLane = 2;
    else preferredLane = 3;

    // Check if preferred lane has hit consecutive limit
    let lane = preferredLane;
    if (laneConsecutiveCount[preferredLane] >= MAX_CONSECUTIVE) {
      // Find alternative lane with lowest consecutive count
      lane = findBestAlternativeLane(laneConsecutiveCount, preferredLane);
    }

    gameNotes.push({
      lane,
      time: note.time,
      note: note.note
    });

    // Update consecutive counts
    for (let i = 0; i < 4; i++) {
      if (i === lane) {
        laneConsecutiveCount[i]++;
      } else {
        laneConsecutiveCount[i] = 0; // Reset other lanes
      }
    }
  }

  return gameNotes;
}

/**
 * Smart lane assignment considering ergonomics and patterns
 * Tries to create natural finger movements with anti-stacking
 */
function assignSmartLanes(notes: ParsedNote[]): GameNote[] {
  const gameNotes: GameNote[] = [];
  const laneConsecutiveCount = [0, 0, 0, 0];
  const MAX_CONSECUTIVE = 4;
  let lastLane = 1;  // Start in middle

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const nextNote = notes[i + 1];

    let preferredLane: number;

    if (!nextNote) {
      // Last note - use any lane
      preferredLane = lastLane;
    } else {
      // Compare pitch with next note
      const currentFreq = noteToFrequency(note.note);
      const nextFreq = noteToFrequency(nextNote.note);

      if (nextFreq > currentFreq) {
        // Next note is higher - move right if possible
        preferredLane = Math.min(lastLane + 1, 3);
      } else if (nextFreq < currentFreq) {
        // Next note is lower - move left if possible
        preferredLane = Math.max(lastLane - 1, 0);
      } else {
        // Same pitch - stay in same lane
        preferredLane = lastLane;
      }
    }

    // Check consecutive limit
    let lane = preferredLane;
    if (laneConsecutiveCount[preferredLane] >= MAX_CONSECUTIVE) {
      lane = findBestAlternativeLane(laneConsecutiveCount, preferredLane);
    }

    gameNotes.push({
      lane,
      time: note.time,
      note: note.note
    });

    // Update consecutive counts
    for (let i = 0; i < 4; i++) {
      if (i === lane) {
        laneConsecutiveCount[i]++;
      } else {
        laneConsecutiveCount[i] = 0;
      }
    }

    lastLane = lane;
  }

  return gameNotes;
}

/**
 * Round-robin lane assignment
 * Cycles through lanes 0 -> 1 -> 2 -> 3 -> 0 ...
 */
function assignRoundRobinLanes(notes: ParsedNote[]): GameNote[] {
  return notes.map((note, index) => ({
    lane: index % 4,
    time: note.time,
    note: note.note
  }));
}

/**
 * Analyze extraction quality
 * Provides metrics about the extracted melody
 */
export function analyzeMelodyQuality(
  original: ParsedNote[],
  extracted: GameNote[]
): {
  retentionRate: number;  // Percentage of original notes kept
  averageSpacing: number;  // Average time between notes (ms)
  laneDistribution: number[];  // Count of notes per lane
  difficulty: 'easy' | 'medium' | 'hard';
  noteVariety: {
    uniqueNotes: number;  // Number of unique notes used
    longestRepetition: number;  // Longest consecutive repetition of same note
  };
} {
  const retentionRate = (extracted.length / original.length) * 100;

  // Calculate average spacing
  let totalSpacing = 0;
  for (let i = 1; i < extracted.length; i++) {
    totalSpacing += extracted[i].time - extracted[i - 1].time;
  }
  const averageSpacing = extracted.length > 1 ? totalSpacing / (extracted.length - 1) : 0;

  // Lane distribution
  const laneDistribution = [0, 0, 0, 0];
  extracted.forEach(note => laneDistribution[note.lane]++);

  // Calculate note variety
  const uniqueNotesSet = new Set(extracted.map(n => n.note));
  const uniqueNotes = uniqueNotesSet.size;

  // Find longest consecutive repetition
  let longestRepetition = 1;
  let currentRepetition = 1;
  for (let i = 1; i < extracted.length; i++) {
    if (extracted[i].note === extracted[i - 1].note) {
      currentRepetition++;
      longestRepetition = Math.max(longestRepetition, currentRepetition);
    } else {
      currentRepetition = 1;
    }
  }

  // Determine difficulty
  let difficulty: 'easy' | 'medium' | 'hard';
  if (averageSpacing > 500) difficulty = 'easy';
  else if (averageSpacing > 250) difficulty = 'medium';
  else difficulty = 'hard';

  return {
    retentionRate: Math.round(retentionRate * 100) / 100,
    averageSpacing: Math.round(averageSpacing),
    laneDistribution,
    difficulty,
    noteVariety: {
      uniqueNotes,
      longestRepetition
    }
  };
}
