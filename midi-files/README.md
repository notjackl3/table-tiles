# MIDI Files Directory

Place your MIDI files here for automatic conversion to background audio.

## Quick Start

1. **Add your MIDI file** to this directory:
   ```bash
   cp ~/Downloads/your-song.mid midi-files/
   ```

2. **Convert to MP3**:
   ```bash
   npm run convert-midi -- --all
   ```

3. **Update beatmap JSON files**:
   ```bash
   npm run update-beatmaps
   ```

4. **Done!** The audio file is now in `/apps/web/public/sounds/` and your beatmap JSON is updated.

## File Naming

For best results, name your MIDI files to match your beatmap IDs:
- Beatmap ID: `river-flows-in-you`
- MIDI file: `river-flows-in-you.mid` ✅
- MP3 output: `river-flows-in-you.mp3` ✅

## Need Help?

See the complete guide: [MIDI_CONVERSION_PIPELINE.md](../MIDI_CONVERSION_PIPELINE.md)
