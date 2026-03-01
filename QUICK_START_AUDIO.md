# 🎵 Quick Start: Background Music

## 30-Second Setup

```bash
# 1. Install tools (one-time)
brew install fluidsynth ffmpeg  # Mac
# or: sudo apt-get install fluidsynth ffmpeg  # Linux

# 2. Add MIDI file
cp your-song.mid midi-files/

# 3. Convert & Update
npm run convert-midi -- --all
npm run update-beatmaps

# 4. Test!
npm run dev
```

## That's It! 🎉

Your game now has:
- ✅ Background music playing at low volume
- ✅ Player notes playing loud on top
- ✅ Professional sound quality

## Commands Reference

| Command | What It Does |
|---------|--------------|
| `npm run convert-midi -- --all` | Convert all MIDI files in `midi-files/` to MP3 |
| `npm run convert-midi path/to/song.mid` | Convert single MIDI file |
| `npm run update-beatmaps` | Auto-add audio files to beatmap JSONs |

## File Locations

```
midi-files/              ← Put MIDI files here
  └── your-song.mid

apps/web/public/sounds/  ← MP3 files go here (auto)
  └── your-song.mp3

apps/web/src/game/songs/ ← JSON files (auto-updated)
  └── yourSong.json      ← "audioFile": "/sounds/your-song.mp3"
```

## Manual JSON Update (Optional)

If auto-update doesn't work, add this line to your beatmap JSON:

```json
{
  "id": "your-song",
  "name": "Your Song Name",
  "audioFile": "/sounds/your-song.mp3",  ← Add this
  ...
}
```

## Adjust Volume

Edit `apps/web/src/game/audio/audioEngine.ts` line 583:

```typescript
backgroundVolume: 0.20  // 0.0 = silent, 1.0 = full volume
```

## More Info

- Full guide: [MIDI_CONVERSION_PIPELINE.md](MIDI_CONVERSION_PIPELINE.md)
- Audio setup: [AUDIO_BACKGROUND_SETUP.md](AUDIO_BACKGROUND_SETUP.md)
