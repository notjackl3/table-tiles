// High score management using localStorage

interface HighScore {
  songId: string;
  score: number;
  accuracy: number;
  timestamp: number;
}

const HIGH_SCORES_KEY = 'table-tiles-high-scores';

export function getHighScore(songId: string): HighScore | null {
  const scores = getAllHighScores();
  return scores.find(s => s.songId === songId) || null;
}

export function getAllHighScores(): HighScore[] {
  try {
    const data = localStorage.getItem(HIGH_SCORES_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('[HighScores] Error loading high scores:', error);
    return [];
  }
}

export function saveHighScore(songId: string, score: number, accuracy: number): boolean {
  try {
    const scores = getAllHighScores();
    const existingIndex = scores.findIndex(s => s.songId === songId);

    const newScore: HighScore = {
      songId,
      score,
      accuracy,
      timestamp: Date.now()
    };

    // Check if this is a new high score
    let isNewHighScore = false;

    if (existingIndex >= 0) {
      // Update if score is higher
      if (score > scores[existingIndex].score) {
        scores[existingIndex] = newScore;
        isNewHighScore = true;
      }
    } else {
      // New song, add it
      scores.push(newScore);
      isNewHighScore = true;
    }

    localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(scores));
    return isNewHighScore;
  } catch (error) {
    console.error('[HighScores] Error saving high score:', error);
    return false;
  }
}

export function clearHighScores(): void {
  localStorage.removeItem(HIGH_SCORES_KEY);
}
