import { Router } from 'express';
import type { ScoreDatabase } from '../db/sqlite.js';
import type { ScoreSubmission } from '../types/dto.js';

export function createLeaderboardRouter(db: ScoreDatabase) {
  const router = Router();

  // GET /leaderboard?limit=10&songId=default
  router.get('/leaderboard', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const songId = (req.query.songId as string) || 'default';

    const entries = db.getLeaderboard(songId, limit);

    res.json({
      songId,
      entries
    });
  });

  // GET /recent?limit=10
  router.get('/recent', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const entries = db.getRecentScores(limit);
    res.json({ entries });
  });

  // POST /score
  router.post('/score', (req, res) => {
    const submission: ScoreSubmission = req.body;

    // Basic validation
    if (!submission.name || typeof submission.score !== 'number' || typeof submission.accuracy !== 'number') {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: name, score, accuracy'
      });
    }

    if (!submission.songId) {
      submission.songId = 'default';
    }

    try {
      const id = db.addScore(submission);
      res.json({ ok: true, id });
    } catch (error) {
      console.error('Error saving score:', error);
      res.status(500).json({ ok: false, error: 'Failed to save score' });
    }
  });

  return router;
}
