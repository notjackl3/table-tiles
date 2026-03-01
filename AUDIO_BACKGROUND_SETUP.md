# Background Audio Setup Guide

## Overview

The game now supports playing pre-rendered audio files (MP3/WAV) as background music instead of synthesizing individual notes. This provides:
- ✅ **Better sound quality** - Real instruments instead of synthesized beeps
- ✅ **Simpler system** - Just plays an audio file, no complex scheduling
- ✅ **More realistic** - Actual music in the background with player notes on top
- ✅ **Lower CPU usage** - One audio file vs hundreds of synthesized notes

## How It Works

1. **Background music** plays the entire song at 20% volume (continuous audio file)
2. **Player notes** play at full volume on top when you hit tiles (synthesized notes)
3. **Result**: You hear the melody in the background with emphasized notes as you play

---

## Setup Instructions

### Step 1: Convert MIDI to Audio

You need to convert your MIDI files to MP3 or WAV format. Here are several options:

#### Option A: Online Converter (Easiest)
1. Go to https://www.zamzar.com/convert/midi-to-mp3/ or https://www.onlineconverter.com/midi-to-mp3
2. Upload your MIDI file
3. Download the converted MP3

#### Option B: Using GarageBand (Mac)
1. Open GarageBand
2. Import your MIDI file
3. Select File → Share → Export Song to Disk
4. Choose MP3 format
5. Export

#### Option C: Using MuseScore (Free, Cross-platform)
1. Download MuseScore: https://musescore.org/
2. Open your MIDI file in MuseScore
3. File → Export → Choose MP3 or WAV
4. Export

#### Option D: Command Line with FluidSynth (Advanced)
```bash
# Install FluidSynth
brew install fluidsynth  # Mac
apt-get install fluidsynth  # Linux

# Download a soundfont (e.g., FluidR3_GM.sf2)
# Convert MIDI to WAV
fluidsynth -ni soundfont.sf2 your-song.mid -F output.wav -r 44100

# Convert WAV to MP3 (optional, requires ffmpeg)
ffmpeg -i output.wav -codec:a libmp3lame -qscale:a 2 output.mp3
```

### Step 2: Add Audio File to Project

1. Place your converted audio file in `/apps/web/public/sounds/`
   - Example: `/apps/web/public/sounds/river-flows-in-you.mp3`

2. Name it something related to your song (e.g., `river-flows-in-you.mp3`)

### Step 3: Update Beatmap JSON

Add the `audioFile` property to your beatmap JSON file:

**Example - Before:**
```json
{
  "id": "river-flows-in-you",
  "name": "River Flows in You",
  "artist": "Yiruma",
  "bpm": 72,
  "duration": 45000,
  "notes": [
    { "lane": 0, "time": 2000, "noteFrequency": 261.63 },
    ...
  ]
}
```

**Example - After:**
```json
{
  "id": "river-flows-in-you",
  "name": "River Flows in You",
  "artist": "Yiruma",
  "bpm": 72,
  "duration": 45000,
  "audioFile": "/sounds/river-flows-in-you.mp3",
  "notes": [
    { "lane": 0, "time": 2000, "noteFrequency": 261.63 },
    ...
  ]
}
```

### Step 4: Test

1. Start your game
2. Select the song
3. The background music should play from the audio file
4. Player notes will play on top when you hit tiles

---

## Current Songs to Update

You have these song files that need audio files:

1. **River Flows in You** - `/apps/web/src/game/songs/riverFlowsInYou.json`
   - Add: `"audioFile": "/sounds/river-flows-in-you.mp3"`

2. **Something Just Like This** - `/apps/web/src/game/songs/something-just-like-this.json`
   - Add: `"audioFile": "/sounds/something-just-like-this.mp3"`

3. **Simple Melody** - `/apps/web/src/game/songs/simpleMelody.json`
   - Add: `"audioFile": "/sounds/simple-melody.mp3"`

---

## Troubleshooting

### Audio file not loading
- Check browser console for errors
- Verify file path is correct (should start with `/sounds/`)
- Ensure file exists in `/apps/web/public/sounds/`
- Try opening the file directly: `http://localhost:5173/sounds/your-file.mp3`

### Audio is out of sync
- Verify the audio file duration matches the beatmap duration
- Check that your MIDI conversion didn't add silence at the beginning
- Trim silence from the start of the audio file if needed

### Volume too loud/quiet
- Adjust background volume in code: `/apps/web/src/game/audio/audioEngine.ts` line 585
- Default is `0.20` (20% volume) - increase or decrease as needed

### Fallback Behavior
If no `audioFile` is specified, the system will show a warning:
```
[BackgroundTrack] No audio file specified in beatmap, falling back to note synthesis
```

This means it will try to synthesize notes (old behavior), but won't work as well.

---

## File Format Recommendations

- **Format**: MP3 (best compatibility and size) or WAV (best quality)
- **Sample Rate**: 44100 Hz (standard)
- **Bit Rate**: 192-320 kbps for MP3
- **Channels**: Stereo

---

## Next Steps

1. Convert your existing MIDI files to MP3
2. Place them in `/apps/web/public/sounds/`
3. Update your JSON beatmap files with `"audioFile"` property
4. Test and enjoy better sound quality!
