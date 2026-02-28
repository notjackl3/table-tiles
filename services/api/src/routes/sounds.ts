import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const soundsRouter = express.Router();

// Ensure sounds directory exists
const soundsDir = path.join(__dirname, '../../public/sounds');
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

/**
 * Upload a sound file
 * POST /api/sounds/upload
 * Body: { filename: string, data: string (base64), mimeType: string }
 */
soundsRouter.post('/api/sounds/upload', (req, res) => {
  try {
    const { filename, data, mimeType } = req.body;

    if (!filename || !data) {
      return res.status(400).json({ error: 'Missing filename or data' });
    }

    // Validate filename (prevent path traversal)
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Decode base64 data
    const buffer = Buffer.from(data, 'base64');

    // Save file
    const filePath = path.join(soundsDir, filename);
    fs.writeFileSync(filePath, buffer);

    console.log(`✓ Saved sound file: ${filename} (${(buffer.length / 1024).toFixed(2)} KB)`);

    res.json({
      success: true,
      filename,
      size: buffer.length,
      path: `/sounds/${filename}`
    });
  } catch (error) {
    console.error('Error uploading sound file:', error);
    res.status(500).json({ error: 'Failed to upload sound file' });
  }
});

/**
 * List all sound files
 * GET /api/sounds
 */
soundsRouter.get('/api/sounds', (req, res) => {
  try {
    const files = fs.readdirSync(soundsDir)
      .filter(f => f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.json'))
      .map(filename => {
        const filePath = path.join(soundsDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          url: `/sounds/${filename}`,
          createdAt: stats.birthtime
        };
      });

    res.json({ sounds: files });
  } catch (error) {
    console.error('Error listing sound files:', error);
    res.status(500).json({ error: 'Failed to list sound files' });
  }
});

/**
 * Serve sound files
 * GET /sounds/:filename
 */
soundsRouter.get('/sounds/:filename', (req, res) => {
  try {
    const { filename } = req.params;

    // Validate filename
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(soundsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Sound file not found' });
    }

    // Set appropriate content type
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.mp3' ? 'audio/mpeg' :
                       ext === '.wav' ? 'audio/wav' :
                       ext === '.json' ? 'application/json' :
                       'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving sound file:', error);
    res.status(500).json({ error: 'Failed to serve sound file' });
  }
});

/**
 * Delete a sound file
 * DELETE /api/sounds/:filename
 */
soundsRouter.delete('/api/sounds/:filename', (req, res) => {
  try {
    const { filename } = req.params;

    // Validate filename
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(soundsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Sound file not found' });
    }

    fs.unlinkSync(filePath);
    console.log(`✓ Deleted sound file: ${filename}`);

    res.json({ success: true, message: 'Sound file deleted' });
  } catch (error) {
    console.error('Error deleting sound file:', error);
    res.status(500).json({ error: 'Failed to delete sound file' });
  }
});
