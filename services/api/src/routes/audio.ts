/**
 * Audio Upload Routes
 * Handles uploading converted audio files from MIDI
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Helper function to find the sounds directory
function getSoundsDirectory(): string {
  const cwd = process.cwd();

  // Possible paths depending on where the server is run from
  const possiblePaths = [
    // Running from services/api
    path.join(cwd, '../../apps/web/public/sounds'),
    // Running from project root
    path.join(cwd, 'apps/web/public/sounds'),
    // Running from services/api/dist
    path.join(cwd, '../../../apps/web/public/sounds'),
  ];

  // Try to find an existing path or use the first one
  for (const p of possiblePaths) {
    const parentDir = path.dirname(p);
    if (fs.existsSync(parentDir)) {
      console.log('[Audio Upload] Using sounds directory:', p);
      return p;
    }
  }

  // Default to first path
  console.log('[Audio Upload] Using default sounds directory:', possiblePaths[0]);
  return possiblePaths[0];
}

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const soundsDir = getSoundsDirectory();

      console.log('[Audio Upload] Target directory:', soundsDir);
      console.log('[Audio Upload] Current working directory:', process.cwd());

      // Create directory if it doesn't exist
      if (!fs.existsSync(soundsDir)) {
        console.log('[Audio Upload] Creating sounds directory...');
        fs.mkdirSync(soundsDir, { recursive: true });
        console.log('[Audio Upload] Directory created successfully');
      } else {
        console.log('[Audio Upload] Directory already exists');
      }

      cb(null, soundsDir);
    } catch (error) {
      console.error('[Audio Upload] Error setting destination:', error);
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    try {
      // Sanitize filename
      const sanitized = file.originalname
        .toLowerCase()
        .replace(/[^a-z0-9.-]/g, '-')
        .replace(/-+/g, '-');

      console.log('[Audio Upload] Original filename:', file.originalname);
      console.log('[Audio Upload] Sanitized filename:', sanitized);

      cb(null, sanitized);
    } catch (error) {
      console.error('[Audio Upload] Error sanitizing filename:', error);
      cb(error as Error, '');
    }
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files only
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-wav'];
    const allowedExts = ['.wav', '.mp3', '.mp4'];

    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowed = allowedTypes.includes(file.mimetype) || allowedExts.includes(ext);

    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only WAV and MP3 files are allowed.'));
    }
  }
});

/**
 * POST /api/upload-audio
 * Upload an audio file to the sounds directory
 */
router.post('/api/upload-audio', (req, res) => {
  upload.single('audio')(req, res, (err) => {
    if (err) {
      console.error('[Audio Upload] Multer error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'File upload failed'
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No audio file provided'
        });
      }

      const audioPath = `/sounds/${req.file.filename}`;

      console.log(`[Audio Upload] File uploaded: ${req.file.filename} (${(req.file.size / 1024).toFixed(2)} KB)`);
      console.log(`[Audio Upload] Saved to: ${req.file.path}`);

      res.json({
        success: true,
        path: audioPath,
        filename: req.file.filename,
        size: req.file.size
      });

    } catch (error) {
      console.error('[Audio Upload] Upload failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      });
    }
  });
});

export { router as audioRouter };
