import express from 'express';
import cors from 'cors';
import { ScoreDatabase } from './db/sqlite.js';
import { healthRouter } from './routes/health.js';
import { createLeaderboardRouter } from './routes/leaderboard.js';
import { songsRouter } from './routes/songs.js';
import { soundsRouter } from './routes/sounds.js';

const PORT = process.env.PORT || 3001;
const app = express();

// Initialize database
const db = new ScoreDatabase();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for song JSON files

// Routes
app.use('/', healthRouter);
app.use('/', createLeaderboardRouter(db));
app.use('/', songsRouter);
app.use('/', soundsRouter);

// Start server
app.listen(PORT, () => {
  console.log(`🎹 TableTiles API running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});
