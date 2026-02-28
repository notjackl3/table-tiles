export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  accuracy: number;
  songId: string;
  createdAt: string;
  meta?: {
    device?: string;
    [key: string]: any;
  };
}

export interface LeaderboardResponse {
  songId: string;
  entries: LeaderboardEntry[];
}

export interface ScoreSubmission {
  songId: string;
  name: string;
  score: number;
  accuracy: number;
  meta?: {
    device?: string;
    [key: string]: any;
  };
}

export interface ScoreSubmissionResponse {
  ok: boolean;
  id: string;
}
