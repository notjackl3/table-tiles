/**
 * Eleven Labs Sound Effects Generator
 *
 * This script generates sound effects for the game using Eleven Labs API
 * and saves them locally for use in the game.
 *
 * Usage:
 * 1. Set ELEVENLABS_API_KEY in .env file
 * 2. Run: npm run generate:sounds
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
config({ path: path.join(__dirname, '../.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

// Voice IDs
// Visit https://api.elevenlabs.io/v1/voices to see available voices
const ENERGETIC_VOICE = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - Energetic and friendly
const ANNOUNCER_VOICE = 'gU0LNdkMOQCOrPrwtbee'; // British football announcer

interface SoundEffect {
  name: string;
  text: string;
  filename: string;
  category: 'combo' | 'announcement' | 'celebration' | 'streak';
  voiceId?: string; // Optional custom voice ID
}

const SOUND_EFFECTS: SoundEffect[] = [
  // Game start announcements
  {
    name: 'Game Start',
    text: 'Get ready! Game starting now!',
    filename: 'game-start.mp3',
    category: 'announcement',
    voiceId: ANNOUNCER_VOICE
  },
  {
    name: 'Game Start Alt',
    text: "Let's go! Show me what you've got!",
    filename: 'game-start-alt.mp3',
    category: 'announcement',
    voiceId: ANNOUNCER_VOICE
  },

  // Streak announcements (British football announcer)
  {
    name: 'Streak 2',
    text: 'Two!',
    filename: 'streak-2.mp3',
    category: 'streak',
    voiceId: ANNOUNCER_VOICE
  },
  {
    name: 'Streak 3',
    text: 'Three!',
    filename: 'streak-3.mp3',
    category: 'streak',
    voiceId: ANNOUNCER_VOICE
  },
  {
    name: 'Streak 4',
    text: 'Wow!',
    filename: 'streak-4.mp3',
    category: 'streak',
    voiceId: ANNOUNCER_VOICE
  },
  {
    name: 'Streak 5',
    text: 'Phenomenal!',
    filename: 'streak-5.mp3',
    category: 'streak',
    voiceId: ANNOUNCER_VOICE
  },
  {
    name: 'Streak 6',
    text: 'Unstoppable!',
    filename: 'streak-6.mp3',
    category: 'streak',
    voiceId: ANNOUNCER_VOICE
  },

  // Combo milestone sounds (larger milestones)
  {
    name: 'Combo 10',
    text: 'Ten combo! Amazing!',
    filename: 'combo-10.mp3',
    category: 'combo',
    voiceId: ANNOUNCER_VOICE
  },
  {
    name: 'Combo 15',
    text: 'Incredible! Fifteen combo!',
    filename: 'combo-15.mp3',
    category: 'combo',
    voiceId: ANNOUNCER_VOICE
  },
  {
    name: 'Combo 20',
    text: 'Twenty combo! Unbelievable!',
    filename: 'combo-20.mp3',
    category: 'combo',
    voiceId: ANNOUNCER_VOICE
  },
  {
    name: 'Combo 25',
    text: 'Legendary! Twenty-five combo!',
    filename: 'combo-25.mp3',
    category: 'combo',
    voiceId: ANNOUNCER_VOICE
  },

  // Celebration sounds
  {
    name: 'Awesome',
    text: 'Awesome!',
    filename: 'awesome.mp3',
    category: 'celebration',
    voiceId: ANNOUNCER_VOICE
  },
  {
    name: 'Perfect',
    text: 'Perfect!',
    filename: 'perfect.mp3',
    category: 'celebration',
    voiceId: ANNOUNCER_VOICE
  },
  {
    name: 'Boom',
    text: 'Boom!',
    filename: 'boom.mp3',
    category: 'celebration',
    voiceId: ANNOUNCER_VOICE
  },
  {
    name: 'Yeah',
    text: 'Yeah!',
    filename: 'yeah.mp3',
    category: 'celebration',
    voiceId: ANNOUNCER_VOICE
  },
  {
    name: 'On Fire',
    text: "You're on fire!",
    filename: 'on-fire.mp3',
    category: 'celebration',
    voiceId: ANNOUNCER_VOICE
  },
];

async function generateSoundEffect(effect: SoundEffect, outputDir: string): Promise<void> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set');
  }

  console.log(`Generating: ${effect.name} (${effect.text})`);

  // Use custom voice ID if specified, otherwise use energetic voice
  const voiceId = effect.voiceId || ENERGETIC_VOICE;

  const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text: effect.text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to generate ${effect.name}: ${response.status} ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const outputPath = path.join(outputDir, effect.filename);
  fs.writeFileSync(outputPath, buffer);

  console.log(`✓ Saved: ${outputPath} (${(buffer.length / 1024).toFixed(2)} KB)`);
}

async function uploadToBackend(filename: string, filePath: string): Promise<void> {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

  try {
    const audioBuffer = fs.readFileSync(filePath);
    const base64Audio = audioBuffer.toString('base64');

    const response = await fetch(`${BACKEND_URL}/api/sounds/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename,
        data: base64Audio,
        mimeType: 'audio/mpeg'
      })
    });

    if (!response.ok) {
      console.warn(`⚠ Failed to upload ${filename} to backend: ${response.status}`);
    } else {
      console.log(`✓ Uploaded to backend: ${filename}`);
    }
  } catch (error) {
    console.warn(`⚠ Could not upload ${filename} to backend (backend might not be running):`, error);
  }
}

async function main() {
  console.log('🎵 Eleven Labs Sound Effects Generator\n');

  // Check for API key
  if (!ELEVENLABS_API_KEY) {
    console.error('❌ Error: ELEVENLABS_API_KEY environment variable is not set');
    console.log('\nPlease set your Eleven Labs API key:');
    console.log('  export ELEVENLABS_API_KEY=your_api_key_here\n');
    process.exit(1);
  }

  // Create output directory
  const outputDir = path.join(__dirname, '../apps/web/public/sounds');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created directory: ${outputDir}\n`);
  }

  // Generate all sound effects
  console.log(`Generating ${SOUND_EFFECTS.length} sound effects...\n`);

  for (let i = 0; i < SOUND_EFFECTS.length; i++) {
    const effect = SOUND_EFFECTS[i];
    try {
      await generateSoundEffect(effect, outputDir);

      // Optional: Upload to backend if it's running
      const filePath = path.join(outputDir, effect.filename);
      await uploadToBackend(effect.filename, filePath);

      // Rate limiting - wait 500ms between requests
      if (i < SOUND_EFFECTS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`❌ Error generating ${effect.name}:`, error);
    }
  }

  // Create a manifest file
  const manifest = {
    generatedAt: new Date().toISOString(),
    voices: {
      energetic: ENERGETIC_VOICE,
      announcer: ANNOUNCER_VOICE
    },
    effects: SOUND_EFFECTS.map(e => ({
      name: e.name,
      filename: e.filename,
      category: e.category,
      text: e.text,
      voiceId: e.voiceId
    }))
  };

  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n✓ Created manifest: ${manifestPath}`);

  console.log('\n✅ Done! All sound effects generated successfully!');
  console.log(`\nSound effects saved to: ${outputDir}`);
}

main().catch(console.error);
