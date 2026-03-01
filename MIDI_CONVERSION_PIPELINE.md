# 🎵 Automated MIDI to Audio Pipeline

Complete automated pipeline for converting MIDI files to background audio for your game!

## 🚀 Quick Start

### One-Time Setup

1. **Install dependencies** (Mac):
```bash
brew install fluidsynth ffmpeg
```

Or (Linux):
```bash
sudo apt-get install fluidsynth ffmpeg
```

2. **Create MIDI files directory**:
```bash
mkdir -p midi-files
```

3. **Add your MIDI files**:
```bash
cp your-song.mid midi-files/
```

### Automated Workflow

**Option 1: Full Pipeline (Recommended)**
```bash
# Step 1: Convert all MIDI files to MP3
npm run convert-midi -- --all

# Step 2: Auto-update beatmap JSON files with audio paths
npm run update-beatmaps

# Done! 🎉
```

**Option 2: Convert Single File**
```bash
npm run convert-midi path/to/your-song.mid
npm run update-beatmaps
```

---

## 📋 Pipeline Scripts

### 1. `convert-midi-to-audio.js` - MIDI to MP3 Converter

Automatically converts MIDI files to high-quality MP3 audio.

**Features:**
- ✅ Auto-downloads soundfont (one-time)
- ✅ Converts MIDI → WAV → MP3
- ✅ Optimized quality settings (44.1kHz, 192kbps)
- ✅ Batch processing support
- ✅ Auto-cleanup of temporary files

**Usage:**
```bash
# Convert single file
npm run convert-midi path/to/song.mid

# Convert all MIDI files in midi-files/
npm run convert-midi -- --all

# Direct node command
node scripts/convert-midi-to-audio.js path/to/song.mid
```

**Output:**
- Creates MP3 files in `/apps/web/public/sounds/`
- Preserves original MIDI filename
- Shows file size and conversion summary

**Example:**
```bash
$ npm run convert-midi -- --all

🔍 Checking dependencies...
  ✓ fluidsynth installed
  ✓ ffmpeg installed

📥 Downloading soundfont...
  ✓ Soundfont downloaded successfully

Converting: river-flows-in-you
  🎵 Converting to WAV...
  ✓ WAV created
  🎶 Converting to MP3...
  ✓ MP3 created
  ✓ Final size: 856.34 KB

✅ Successfully converted: river-flows-in-you.mp3
   Location: /sounds/river-flows-in-you.mp3
```

---

### 2. `update-beatmaps-with-audio.js` - Auto-Update JSON Files

Automatically adds `audioFile` property to beatmap JSON files.

**Features:**
- ✅ Scans all beatmap JSON files
- ✅ Auto-matches audio files by ID
- ✅ Preserves existing formatting
- ✅ Safe (skips files that already have audio)

**Usage:**
```bash
npm run update-beatmaps
```

**What it does:**
1. Scans `/apps/web/src/game/songs/*.json`
2. Finds matching MP3/WAV in `/apps/web/public/sounds/`
3. Adds `"audioFile": "/sounds/your-song.mp3"` to JSON
4. Preserves all other properties

**Example:**
```bash
$ npm run update-beatmaps

📄 Processing: riverFlowsInYou.json
  ✓ Added audioFile: /sounds/river-flows-in-you.mp3

📄 Processing: simpleMelody.json
  ⚠  No matching audio file found for ID: simple-melody

📊 Update Summary
✓ Updated (1):
  - riverFlowsInYou.json → /sounds/river-flows-in-you.mp3

⏭  Skipped (1):
  - simpleMelody.json (no matching audio file)
```

---

## 🎯 Complete Example Workflow

### Starting with a MIDI file:

```bash
# 1. Place your MIDI file
cp "River Flows in You.mid" midi-files/river-flows-in-you.mid

# 2. Convert to MP3
npm run convert-midi -- --all
# Output: /apps/web/public/sounds/river-flows-in-you.mp3

# 3. Update beatmap JSON
npm run update-beatmaps
# Adds: "audioFile": "/sounds/river-flows-in-you.mp3" to riverFlowsInYou.json

# 4. Start game and test!
npm run dev
```

---

## 📁 Directory Structure

```
table-tiles/
├── midi-files/                    # Put your MIDI files here
│   ├── river-flows-in-you.mid
│   ├── something-just-like-this.mid
│   └── your-song.mid
│
├── apps/web/
│   ├── public/sounds/             # Generated MP3 files go here
│   │   ├── river-flows-in-you.mp3
│   │   └── something-just-like-this.mp3
│   │
│   └── src/game/songs/            # Beatmap JSON files
│       ├── riverFlowsInYou.json   # Auto-updated with audioFile
│       └── somethingJustLikeThis.json
│
└── scripts/
    ├── convert-midi-to-audio.js   # MIDI → MP3 converter
    └── update-beatmaps-with-audio.js  # JSON updater
```

---

## ⚙️ Configuration

### Conversion Quality Settings

Edit `scripts/convert-midi-to-audio.js`:

```javascript
// Sample rate (Hz)
const SAMPLE_RATE = 44100; // CD quality

// MP3 quality (0-9, lower is better)
const MP3_QUALITY = 2; // ~192kbps
```

### Background Volume

Edit `apps/web/src/game/audio/audioEngine.ts`:

```typescript
backgroundVolume: 0.20 // 20% volume (0.0 - 1.0)
```

---

## 🔧 Troubleshooting

### Dependencies Not Found

**Problem:** `fluidsynth: command not found`

**Solution (Mac):**
```bash
brew install fluidsynth ffmpeg
```

**Solution (Linux):**
```bash
sudo apt-get install fluidsynth ffmpeg
```

### Soundfont Download Fails

**Problem:** Cannot download soundfont automatically

**Solution:** Download manually:
1. Download from: https://github.com/FluidSynth/fluidsynth/raw/master/sf2/VintageDreamsWaves-v2.sf2
2. Save to: `scripts/VintageDreamsWaves-v2.sf2`

### Audio File Not Matching

**Problem:** `update-beatmaps` can't find audio for beatmap

**Cause:** Filename mismatch between beatmap ID and MP3 filename

**Solution:** Ensure filenames match:
- Beatmap ID: `river-flows-in-you`
- MP3 file: `river-flows-in-you.mp3`

Or manually add to JSON:
```json
{
  "id": "river-flows-in-you",
  "audioFile": "/sounds/river-flows-in-you.mp3",
  ...
}
```

### Audio Out of Sync

**Problem:** Background music doesn't match tiles

**Possible causes:**
1. MIDI conversion added silence at start
2. Different tempo interpretation

**Solution:**
1. Trim silence from audio file
2. Adjust beatmap note timings
3. Try different soundfont

---

## 🎼 Soundfont Options

The default soundfont is **VintageDreamsWaves-v2.sf2**. For different sounds:

**Other popular soundfonts:**
- FluidR3_GM.sf2 (General MIDI)
- MuseScore_General.sf3
- TimGM6mb.sf2

**To use custom soundfont:**
```bash
# Download your soundfont
curl -L -o scripts/your-soundfont.sf2 <URL>

# Edit convert-midi-to-audio.js:
# Change SOUNDFONT_PATH to your soundfont
```

---

## 📊 Technical Details

### Conversion Pipeline

```
MIDI file
    ↓
FluidSynth (synthesizes MIDI → WAV using soundfont)
    ↓
WAV file (44.1kHz, stereo)
    ↓
FFmpeg (encodes WAV → MP3 with quality settings)
    ↓
MP3 file (~200KB per minute)
    ↓
Moved to /public/sounds/
```

### Audio Playback

```
Game starts
    ↓
Load MP3 into AudioBuffer
    ↓
Play at 20% volume (background)
    ↓
Player hits note → synthesized note plays at 100% volume on top
```

---

## 🚀 Advanced Usage

### Batch Convert with Custom Output

```bash
# Convert specific files
node scripts/convert-midi-to-audio.js midi-files/song1.mid
node scripts/convert-midi-to-audio.js midi-files/song2.mid

# Or use a loop
for file in midi-files/*.mid; do
  npm run convert-midi "$file"
done
```

### Integration with Git Workflow

```bash
# Add to .gitignore
echo "midi-files/" >> .gitignore
echo "scripts/*.sf2" >> .gitignore

# Commit generated MP3s (they're small enough)
git add apps/web/public/sounds/*.mp3
git commit -m "Add background music"
```

---

## 📝 Package.json Scripts

```json
{
  "scripts": {
    "convert-midi": "node scripts/convert-midi-to-audio.js",
    "update-beatmaps": "node scripts/update-beatmaps-with-audio.js"
  }
}
```

---

## ✨ Benefits

### Before (Manual Process):
1. Export MIDI from DAW
2. Find online converter
3. Upload and wait
4. Download MP3
5. Move to correct folder
6. Manually edit JSON
7. Remember exact path format

⏱️ **Time: ~10 minutes per song**

### After (Automated):
1. Drop MIDI in `midi-files/`
2. Run `npm run convert-midi -- --all`
3. Run `npm run update-beatmaps`

⏱️ **Time: ~30 seconds per song** ✨

---

## 🎉 You're All Set!

The pipeline is ready to use. Just:
1. Drop MIDI files in `midi-files/`
2. Run the scripts
3. Play your game with awesome background music!

For more details, see [AUDIO_BACKGROUND_SETUP.md](AUDIO_BACKGROUND_SETUP.md)
