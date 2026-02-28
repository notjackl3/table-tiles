/**
 * Beatmap system for generating tile patterns
 */

export interface BeatmapNote {
  lane: number;
  time: number; // ms from start
}

export interface Beatmap {
  id: string;
  name: string;
  bpm: number;
  duration: number; // ms
  notes: BeatmapNote[];
}

/**
 * Generate a procedural beatmap
 */
export function generateProceduralBeatmap(
  duration: number = 60000, // 1 minute
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Beatmap {
  const bpm = difficulty === 'easy' ? 100 : difficulty === 'medium' ? 120 : 140;
  const beatInterval = (60 / bpm) * 1000; // ms per beat

  const notes: BeatmapNote[] = [];
  let currentTime = 2000; // Start after 2 seconds

  // Pattern parameters based on difficulty
  const patterns = {
    easy: { notesPerBeat: 0.5, randomness: 0.2 },
    medium: { notesPerBeat: 0.75, randomness: 0.3 },
    hard: { notesPerBeat: 1.0, randomness: 0.4 }
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
        time: currentTime + (Math.random() * randomness * beatInterval)
      });
    }

    currentTime += beatInterval;
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
  const interval = 500; // 500ms between notes

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
