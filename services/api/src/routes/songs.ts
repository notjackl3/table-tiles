import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to web app's songs directory
const SONGS_DIR = path.join(__dirname, '../../../../apps/web/src/game/songs');

export const songsRouter = Router();

/**
 * Save a new song JSON file
 * POST /api/songs
 */
songsRouter.post('/api/songs', async (req, res) => {
  try {
    const { beatmap } = req.body;

    if (!beatmap || !beatmap.id || !beatmap.name) {
      return res.status(400).json({
        error: 'Invalid beatmap data. Required: id, name, artist, bpm, duration, notes'
      });
    }

    // Generate filename from song ID
    const filename = `${beatmap.id}.json`;
    const filepath = path.join(SONGS_DIR, filename);

    // Check if file already exists
    try {
      await fs.access(filepath);
      return res.status(409).json({
        error: `Song "${beatmap.id}" already exists. Delete it first or use a different name.`
      });
    } catch {
      // File doesn't exist, continue
    }

    // Write the JSON file
    const jsonContent = JSON.stringify(beatmap, null, 2);
    await fs.writeFile(filepath, jsonContent, 'utf-8');

    console.log(`[Songs API] Saved song: ${filename}`);

    res.json({
      success: true,
      message: `Song "${beatmap.name}" saved successfully`,
      filename,
      path: filepath
    });
  } catch (error: any) {
    console.error('[Songs API] Error saving song:', error);
    res.status(500).json({
      error: 'Failed to save song',
      details: error.message
    });
  }
});

/**
 * Delete a song JSON file
 * DELETE /api/songs/:id
 */
songsRouter.delete('/api/songs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Song ID is required' });
    }

    // Prevent deleting built-in songs
    const builtInSongs = ['simple-melody', 'river-flows-in-you'];
    if (builtInSongs.includes(id)) {
      return res.status(403).json({
        error: 'Cannot delete built-in songs'
      });
    }

    const filename = `${id}.json`;
    const filepath = path.join(SONGS_DIR, filename);

    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({
        error: `Song "${id}" not found`
      });
    }

    // Delete the file
    await fs.unlink(filepath);

    console.log(`[Songs API] Deleted song: ${filename}`);

    res.json({
      success: true,
      message: `Song "${id}" deleted successfully`,
      filename
    });
  } catch (error: any) {
    console.error('[Songs API] Error deleting song:', error);
    res.status(500).json({
      error: 'Failed to delete song',
      details: error.message
    });
  }
});

/**
 * List all song files
 * GET /api/songs
 */
songsRouter.get('/api/songs', async (req, res) => {
  try {
    const files = await fs.readdir(SONGS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'README.md');

    const songs = await Promise.all(
      jsonFiles.map(async (file) => {
        const filepath = path.join(SONGS_DIR, file);
        const content = await fs.readFile(filepath, 'utf-8');
        const beatmap = JSON.parse(content);
        return {
          id: beatmap.id,
          name: beatmap.name,
          artist: beatmap.artist,
          filename: file
        };
      })
    );

    res.json({
      success: true,
      songs
    });
  } catch (error: any) {
    console.error('[Songs API] Error listing songs:', error);
    res.status(500).json({
      error: 'Failed to list songs',
      details: error.message
    });
  }
});
