import type { Tile } from '../../types/shared';
import { v4 as uuidv4 } from 'uuid';

export interface TileEngineConfig {
  numLanes: number;
  initialSpeed: number; // pixels per second
  speedIncrement: number;
  tileHeight: number;
  canvasHeight: number;
  hitLineY: number; // Y position of hit line from top
}

export class TileEngine {
  private config: TileEngineConfig;
  private tiles: Tile[] = [];
  private currentSpeed: number;
  private tilesHit = 0;

  constructor(config: TileEngineConfig) {
    this.config = config;
    this.currentSpeed = config.initialSpeed;
  }

  /**
   * Spawn a new tile
   */
  spawnTile(lane: number): Tile {
    const tile: Tile = {
      id: uuidv4(),
      lane,
      y: -this.config.tileHeight, // Start above screen
      speed: this.currentSpeed,
      hitWindowMs: 100,
      spawnedAt: performance.now(),
      state: 'falling'
    };

    this.tiles.push(tile);
    return tile;
  }

  /**
   * Update all tiles
   */
  update(deltaTime: number): { tilesToRemove: Tile[]; missedTiles: Tile[] } {
    const deltaSeconds = deltaTime / 1000;
    const tilesToRemove: Tile[] = [];
    const missedTiles: Tile[] = [];

    for (const tile of this.tiles) {
      if (tile.state === 'falling') {
        // Move tile down
        tile.y += tile.speed * deltaSeconds;

        // Check if tile passed hit line and wasn't hit
        const hitLineBottom = this.config.hitLineY + 100; // Grace area
        if (tile.y > hitLineBottom) {
          tile.state = 'missed';
          missedTiles.push(tile);
        }
      }

      // Remove tiles that are off screen or marked for removal
      if (
        tile.state === 'hit' ||
        (tile.state === 'missed' && tile.y > this.config.canvasHeight + this.config.tileHeight) ||
        (tile.y > this.config.canvasHeight + this.config.tileHeight) // Remove any tile past bottom
      ) {
        tilesToRemove.push(tile);
      }
    }

    // Remove tiles
    for (const tile of tilesToRemove) {
      const index = this.tiles.indexOf(tile);
      if (index !== -1) {
        this.tiles.splice(index, 1);
      }
    }

    return { tilesToRemove, missedTiles };
  }

  /**
   * Find the nearest tile to hit line in a given lane
   */
  findNearestTile(lane: number): Tile | null {
    let nearest: Tile | null = null;
    let minDistance = Infinity;

    for (const tile of this.tiles) {
      if (tile.lane === lane && tile.state === 'falling') {
        const distance = Math.abs(tile.y + this.config.tileHeight / 2 - this.config.hitLineY);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = tile;
        }
      }
    }

    return nearest;
  }

  /**
   * Mark a tile as hit
   */
  hitTile(tile: Tile) {
    console.log('[TileEngine] Marking tile as hit:', tile.id, 'current state:', tile.state);
    tile.state = 'hit';
    this.tilesHit++;
    console.log('[TileEngine] Tile marked as hit, new state:', tile.state, 'total hits:', this.tilesHit);

    // Increase speed every 10 tiles
    if (this.tilesHit % 10 === 0) {
      this.currentSpeed += this.config.speedIncrement;
    }
  }

  /**
   * Get all tiles
   */
  getTiles(): Tile[] {
    return [...this.tiles];
  }

  /**
   * Get tiles by state
   */
  getTilesByState(state: Tile['state']): Tile[] {
    return this.tiles.filter(t => t.state === state);
  }

  /**
   * Clear all tiles
   */
  clear() {
    this.tiles = [];
    this.tilesHit = 0;
    this.currentSpeed = this.config.initialSpeed;
  }

  /**
   * Get current speed
   */
  getCurrentSpeed(): number {
    return this.currentSpeed;
  }
}

// Helper to generate UUID (simple version)
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
