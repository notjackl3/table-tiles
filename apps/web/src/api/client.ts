import type { LeaderboardEntry, ScoreSubmission } from '../types/shared';

const API_BASE = '/api';

export async function getLeaderboard(
  songId: string = 'default',
  limit: number = 10
): Promise<{ songId: string; entries: LeaderboardEntry[] }> {
  const response = await fetch(`${API_BASE}/leaderboard?songId=${songId}&limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard');
  }
  return response.json();
}

export async function submitScore(
  submission: ScoreSubmission
): Promise<{ ok: boolean; id: string }> {
  const response = await fetch(`${API_BASE}/score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(submission)
  });
  if (!response.ok) {
    throw new Error('Failed to submit score');
  }
  return response.json();
}

export async function healthCheck(): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) {
    throw new Error('Health check failed');
  }
  return response.json();
}
