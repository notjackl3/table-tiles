# Sound Effects Setup Guide

This guide will help you generate and integrate Eleven Labs sound effects into your game.

## Prerequisites

1. **Eleven Labs API Key**
   - Sign up at [Eleven Labs](https://elevenlabs.io/)
   - Get your API key from your profile settings
   - Free tier includes 10,000 characters per month

2. **Node.js and npm**
   - Make sure you have Node.js installed (v18+)

## Step 1: Set Up Your API Key

```bash
export ELEVENLABS_API_KEY=
```

Or create a `.env` file in the root directory:
```
ELEVENLABS_API_KEY=
```

## Step 2: Install Dependencies

The script requires `tsx` to run TypeScript directly:

```bash
npm install -D tsx
```

## Step 3: Generate Sound Effects

Run the generator script:

```bash
npx tsx scripts/generateSoundEffects.ts
```

This will:
- Generate 12 sound effects using Eleven Labs
- Save them to `apps/web/public/sounds/`
- Optionally upload them to your backend (if running)
- Create a `manifest.json` with metadata

Generated sounds include:
- **Game Start**: `game-start.mp3`, `game-start-alt.mp3`
- **Combo Milestones**: `combo-5.mp3`, `combo-10.mp3`, `combo-15.mp3`, `combo-20.mp3`, `combo-25.mp3`
- **Celebrations**: `awesome.mp3`, `perfect.mp3`, `boom.mp3`, `yeah.mp3`, `on-fire.mp3`

## Step 4: Start Your Backend (Optional)

If you want to sync sounds to the backend:

```bash
cd services/api
npm run dev
```

The backend will serve sounds from `/sounds/:filename` and provides endpoints to upload/manage sound files.

## Step 5: Test in Your Game

1. Start the web app:
   ```bash
   cd apps/web
   npm run dev
   ```

2. Navigate to the game page
3. Click "Start Game"
4. You should hear:
   - Game start announcement
   - Combo milestone sounds at 5, 10, 15, 20, 25 combos
   - Random celebration sounds on perfect hits

## Customization

### Change Voice

Edit `scripts/generateSoundEffects.ts` and change the `VOICE_ID`:

```typescript
// Available voices at: https://api.elevenlabs.io/v1/voices
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - Energetic
```

Popular voice IDs:
- `21m00Tcm4TlvDq8ikWAM` - Rachel (Calm)
- `EXAVITQu4vr4xnSDxMaL` - Sarah (Energetic) **[Default]**
- `pNInz6obpgDQGcFmaJgB` - Adam (Deep)

### Add New Sound Effects

Edit the `SOUND_EFFECTS` array in `scripts/generateSoundEffects.ts`:

```typescript
{
  name: 'My Custom Sound',
  text: 'Text to speak',
  filename: 'custom-sound.mp3',
  category: 'celebration'
}
```

Then re-run the generator.

### Adjust Playback Probability

In `apps/web/src/game/audio/audioEngine.ts`, adjust the celebration frequency:

```typescript
playRandomCelebration() {
  // Change 0.2 (20% chance) to your preference
  if (Math.random() > 0.2) return;
  // ...
}
```

## Backend API Endpoints

- `POST /api/sounds/upload` - Upload a sound file
- `GET /api/sounds` - List all sound files
- `GET /sounds/:filename` - Download/stream a sound file
- `DELETE /api/sounds/:filename` - Delete a sound file

## Troubleshooting

### "Sound effect not found" warnings in console

The sound files haven't been generated yet. Run the generator script.

### No sound playing

1. Check browser console for errors
2. Make sure audio is initialized (requires user interaction)
3. Check that files exist in `apps/web/public/sounds/`
4. Verify your browser's audio settings

### Generator script fails

1. Verify your API key is set: `echo $ELEVENLABS_API_KEY`
2. Check your internet connection
3. Verify you have API credits remaining
4. Check the Eleven Labs API status

### Sounds are cut off or too short

Edit the voice settings in the generator script:

```typescript
voice_settings: {
  stability: 0.5,      // Lower = more varied, higher = more consistent
  similarity_boost: 0.75,
  style: 0.5,          // Voice style exaggeration
  use_speaker_boost: true
}
```

## Cost Estimation

Each sound effect uses approximately:
- Game announcements: ~30-50 characters
- Combo sounds: ~20-40 characters
- Celebrations: ~5-15 characters

Total for all 12 sounds: ~300-400 characters

With the free tier (10,000 chars/month), you can generate the full set ~25-30 times per month.

## Next Steps

- Customize the text for different personalities (epic, funny, motivational)
- Add more milestone sounds (combo 50, 100, etc.)
- Create different sound packs for different themes
- Add game over announcements
- Add warning sounds when combo is about to break
