// Game types
export interface Tile {
  id: string;
  lane: number;
  y: number;
  speed: number;
  hitWindowMs: number;
  spawnedAt: number;
  state: 'falling' | 'hit' | 'missed';
}

export interface GameState {
  tiles: Tile[];
  score: number;
  combo: number;
  accuracy: number;
  lives: number;
  isPlaying: boolean;
  startTime: number;
}

export interface HitResult {
  quality: 'perfect' | 'good' | 'miss';
  points: number;
  distance: number;
}

// Vision types
export interface Point2D {
  x: number;
  y: number;
}

export interface TableCalibration {
  corners: [Point2D, Point2D, Point2D, Point2D];
  homographyMatrix: number[][];
  timestamp: number;
}

export interface TapEvent {
  fingerIndex: number;
  lane: number;
  x: number;
  y: number;
  timestamp: number;
}

export interface HandLandmarks {
  landmarks: Point2D[];
  handedness: 'Left' | 'Right';
  worldLandmarks?: Array<{ x: number; y: number; z: number }>;
}

// API types
export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  accuracy: number;
  songId: string;
  createdAt: string;
  meta?: Record<string, any>;
}

export interface ScoreSubmission {
  songId: string;
  name: string;
  score: number;
  accuracy: number;
  meta?: Record<string, any>;
}

// Screen types
export type GameScreen = 'landing' | 'gameplay' | 'results';

export interface ResultsData {
  score: number;
  accuracy: number;
  combo: number;
  perfectHits: number;
  goodHits: number;
  misses: number;
}
