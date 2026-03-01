import { TileEngine } from './tileEngine';
import { ScoringEngine } from './scoring';
import type { Beatmap } from './beatmap';
import type { TapEvent } from '../../types/shared';

export interface GameLoopConfig {
  canvasWidth: number;
  canvasHeight: number;
  numLanes: number;
  latencyCompensationMs?: number; // Milliseconds to compensate for hand tracking delay
  onScoreUpdate?: (stats: any) => void;
  onGameOver?: (stats: any) => void;
  onHit?: (lane: number, quality: string, noteFrequency?: number | number[], timestamp?: number) => void;
  onComboChange?: (combo: number, quality: string) => void; // Called when combo changes
}

export class GameLoop {
  private config: GameLoopConfig;
  private tileEngine: TileEngine;
  private scoringEngine: ScoringEngine;
  private beatmap: Beatmap | null = null;
  private isRunning = false;
  private startTime = 0;
  private lastTime = 0;
  private animationFrameId: number | null = null;
  private beatmapIndex = 0;

  constructor(config: GameLoopConfig) {
    this.config = config;

    const hitLineY = config.canvasHeight - 150;

    this.tileEngine = new TileEngine({
      numLanes: config.numLanes,
      initialSpeed: 200,
      speedIncrement: 10,
      tileHeight: 120,
      canvasHeight: config.canvasHeight,
      hitLineY
    });

    this.scoringEngine = new ScoringEngine();
  }

  /**
   * Start the game with a beatmap
   */
  start(beatmap: Beatmap) {
    this.beatmap = beatmap;
    this.isRunning = true;
    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.beatmapIndex = 0;

    this.tileEngine.clear();
    this.scoringEngine.reset();

    this.loop();
  }

  /**
   * Main game loop
   */
  private loop = () => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    const gameTime = currentTime - this.startTime;

    // Spawn tiles from beatmap
    if (this.beatmap) {
      while (
        this.beatmapIndex < this.beatmap.notes.length &&
        this.beatmap.notes[this.beatmapIndex].time <= gameTime
      ) {
        const note = this.beatmap.notes[this.beatmapIndex];
        this.tileEngine.spawnTile(note.lane, note.noteFrequency, note.time);
        this.beatmapIndex++;
      }
    }

    // Update tiles
    const { missedTiles } = this.tileEngine.update(deltaTime);

    // Handle missed tiles - game over on first miss (no lives)
    if (missedTiles.length > 0) {
      this.scoringEngine.registerMiss();

      // Notify about combo reset when tile is missed
      if (this.config.onComboChange) {
        const stats = this.scoringEngine.getStats();
        this.config.onComboChange(stats.combo, 'miss');
      }

      // End game immediately on missed note
      this.gameOver();
      return;
    }

    // Notify score update
    if (this.config.onScoreUpdate) {
      const stats = this.scoringEngine.getStats();
      this.config.onScoreUpdate(stats);
    }

    // Check if beatmap is complete
    if (
      this.beatmap &&
      this.beatmapIndex >= this.beatmap.notes.length &&
      this.tileEngine.getTilesByState('falling').length === 0
    ) {
      this.gameOver();
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Handle tap event
   */
  handleTap(tap: TapEvent) {
    console.log('[GameLoop] handleTap called', { lane: tap.lane, isRunning: this.isRunning });

    if (!this.isRunning) {
      console.log('[GameLoop] Game not running, ignoring tap');
      return;
    }

    const tile = this.tileEngine.findNearestTile(tap.lane);
    console.log('[GameLoop] Found nearest tile:', tile);

    if (!tile) {
      console.log('[GameLoop] No tile found in lane', tap.lane);
      return;
    }

    const hitLineY = this.config.canvasHeight - 150;

    // LATENCY COMPENSATION: Predict where the tile will be after the camera delay
    // This compensates for the ~100-200ms delay in hand tracking
    const latencyMs = this.config.latencyCompensationMs || 150; // Default 150ms compensation
    const tileSpeed = tile.speed; // pixels per second
    const latencyOffset = (tileSpeed * latencyMs) / 1000; // pixels to offset

    // Calculate distance with latency compensation
    // We pretend the tile is further down than it visually appears
    const compensatedY = tile.y + latencyOffset;
    const distance = compensatedY + 60 - hitLineY; // 60 = half tile height

    console.log('[GameLoop] Latency compensation:', {
      actualY: tile.y,
      compensatedY,
      offset: latencyOffset,
      distance
    });

    const hitResult = this.scoringEngine.calculateHitResult(distance);
    console.log('[GameLoop] Hit result:', { distance, quality: hitResult.quality, points: hitResult.points });

    if (hitResult.quality !== 'miss') {
      console.log('[GameLoop] Processing hit - before state:', tile.state);
      this.tileEngine.hitTile(tile);
      console.log('[GameLoop] Processing hit - after state:', tile.state);

      this.scoringEngine.registerHit(hitResult);
      const stats = this.scoringEngine.getStats();
      console.log('[GameLoop] Score after hit:', stats.score);

      // Notify about successful hit with single note (background track handles the rest)
      if (this.config.onHit) {
        this.config.onHit(tap.lane, hitResult.quality, tile.noteFrequency, tile.timestamp);
      }

      // Notify about combo change
      if (this.config.onComboChange) {
        this.config.onComboChange(stats.combo, hitResult.quality);
      }
    } else {
      console.log('[GameLoop] Hit quality was miss, not processing');
    }
  }

  /**
   * Get tiles for rendering
   */
  getTiles() {
    return this.tileEngine.getTiles();
  }

  /**
   * Get current stats
   */
  getStats() {
    return this.scoringEngine.getStats();
  }

  /**
   * Pause the game
   */
  pause() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  /**
   * Resume the game
   */
  resume() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  /**
   * Game over
   */
  private gameOver() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const stats = this.scoringEngine.getStats();

    if (this.config.onGameOver) {
      this.config.onGameOver(stats);
    }
  }

  /**
   * Stop the game
   */
  stop() {
    this.pause();
    this.tileEngine.clear();
    this.scoringEngine.reset();
  }

  /**
   * Check if game is running
   */
  isPlaying(): boolean {
    return this.isRunning;
  }
}
