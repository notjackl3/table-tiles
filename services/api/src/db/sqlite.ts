import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { LeaderboardEntry, ScoreSubmission } from '../types/dto.js';

export class ScoreDatabase {
  private db: Database.Database;

  constructor(filename: string = 'scores.db') {
    this.db = new Database(filename);
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scores (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        score INTEGER NOT NULL,
        accuracy REAL NOT NULL,
        songId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        meta TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_scores_songId_score
      ON scores(songId, score DESC);
    `);
  }

  addScore(submission: ScoreSubmission): string {
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const meta = submission.meta ? JSON.stringify(submission.meta) : null;

    const stmt = this.db.prepare(`
      INSERT INTO scores (id, name, score, accuracy, songId, createdAt, meta)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      submission.name,
      submission.score,
      submission.accuracy,
      submission.songId,
      createdAt,
      meta
    );

    return id;
  }

  getLeaderboard(songId: string = 'default', limit: number = 10): LeaderboardEntry[] {
    const stmt = this.db.prepare(`
      SELECT id, name, score, accuracy, songId, createdAt, meta
      FROM scores
      WHERE songId = ?
      ORDER BY score DESC, createdAt ASC
      LIMIT ?
    `);

    const rows = stmt.all(songId, limit) as any[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      score: row.score,
      accuracy: row.accuracy,
      songId: row.songId,
      createdAt: row.createdAt,
      meta: row.meta ? JSON.parse(row.meta) : undefined
    }));
  }

  getRecentScores(limit: number = 10): LeaderboardEntry[] {
    const stmt = this.db.prepare(`
      SELECT id, name, score, accuracy, songId, createdAt, meta
      FROM scores
      ORDER BY createdAt DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      score: row.score,
      accuracy: row.accuracy,
      songId: row.songId,
      createdAt: row.createdAt,
      meta: row.meta ? JSON.parse(row.meta) : undefined
    }));
  }

  close() {
    this.db.close();
  }
}
