export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  accuracy: number;
  songId: string;
  createdAt: string;
  meta?: Record<string, any>;
}

export interface LeaderboardQuery {
  limit?: number;
  songId?: string;
}

export interface ScoreSubmission {
  songId: string;
  name: string;
  score: number;
  accuracy: number;
  meta?: Record<string, any>;
}
