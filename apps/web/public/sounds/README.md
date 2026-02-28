# Sound Effects

This directory contains game sound effects generated using Eleven Labs API.

## Files

- `game-start.mp3` - Game start announcement
- `game-start-alt.mp3` - Alternative game start
- `combo-5.mp3` through `combo-25.mp3` - Combo milestone celebrations
- `awesome.mp3`, `perfect.mp3`, `boom.mp3`, etc. - Quick celebration sounds
- `manifest.json` - Metadata about all generated sounds

## Generating Sounds

To regenerate these sound effects:

```bash
# Set your Eleven Labs API key
export ELEVENLABS_API_KEY=

# Run the generator
npx tsx scripts/generateSoundEffects.ts
```

## Usage in Game

These sounds are played automatically by the AudioEngine during gameplay:
- Game start announcements when the game begins
- Combo sounds at milestones (5, 10, 15, 20, 25 combos)
- Random celebration sounds for perfect hits
