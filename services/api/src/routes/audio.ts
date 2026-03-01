/**
 * Audio Upload Routes
 * Handles uploading converted audio files from MIDI
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save to public/sounds directory
    const soundsDir = path.join(process.cwd(), '../../apps/web/public/sounds');

    // Create directory if it doesn't exist
    if (!fs.existsSync(soundsDir)) {
      fs.mkdirSync(soundsDir, { recursive: true });
    }

    cb(null, soundsDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const sanitized = file.originalname
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/-+/g, '-');

    cb(null, sanitized);
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
router.post('/api/upload-audio', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }

    const audioPath = `/sounds/${req.file.filename}`;

    console.log(`[Audio Upload] File uploaded: ${req.file.filename} (${(req.file.size / 1024).toFixed(2)} KB)`);

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

export { router as audioRouter };
