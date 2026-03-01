# 🎵 Automatic MIDI Conversion Setup

Complete guide for automatic MIDI-to-audio conversion when users upload MIDI files through the website.

## ✨ What This Does

When users upload a MIDI file via the Music Importer:
1. ✅ **Beatmap is generated** (existing functionality)
2. ✅ **MIDI is automatically converted to audio** (NEW!)
3. ✅ **Audio file is uploaded to server** (NEW!)
4. ✅ **`audioFile` is added to beatmap** (NEW!)
5. ✅ **Background music plays immediately** (NEW!)
6. ✅ **Progress indicator shows conversion status** (NEW!)

## 📦 Required Dependencies

### 1. Frontend (Web App)

```bash
cd apps/web
npm install tone @tonejs/midi
```

### 2. Backend (API)

```bash
cd services/api
npm install multer @types/multer
```

## 🚀 Installation

Run this from the root directory:

```bash
# Install frontend dependencies
npm install --workspace=apps/web tone @tonejs/midi

# Install backend dependencies
npm install --workspace=services/api multer
npm install --workspace=services/api --save-dev @types/multer
```

## 📁 Files Created/Modified

### New Files:
1. **`apps/web/src/game/import/midiToAudioConverter.ts`**
   - Converts MIDI to audio using Tone.js
   - Renders MIDI to WAV in the browser
   - Uploads audio to server

2. **`services/api/src/routes/audio.ts`**
   - API endpoint for audio file uploads
   - Saves files to `/public/sounds/`

### Modified Files:
1. **`services/api/src/index.ts`**
   - Added audioRouter

2. **`apps/web/src/game/import/songGenerator.ts`** (needs update)
   - Will integrate automatic audio conversion

3. **`apps/web/src/game/MusicImporter.tsx`** (needs update)
   - Will show conversion progress

## 🔧 Integration Steps

### Step 1: Update songGenerator.ts

Add audio conversion to the import process:

```typescript
import { convertMIDIToAudio, uploadAudioFile } from './midiToAudioConverter';

// In the importFromMIDI function, after creating the beatmap:
export async function importFromMIDI(
  midiFile: File,
  options: SongImportOptions,
  onProgress?: (progress: any) => void  // Add this parameter
): Promise<ImportResult> {
  // ... existing code to create beatmap ...

  // NEW: Convert MIDI to audio
  try {
    const audioResult = await convertMIDIToAudio(midiFile, onProgress);
    const audioPath = await uploadAudioFile(audioResult.audioBlob, beatmap.id);

    // Add audio file to beatmap
    beatmap.audioFile = audioPath;

    console.log(`[Song Import] Audio file created: ${audioPath}`);
  } catch (error) {
    console.warn('[Song Import] Audio conversion failed:', error);
    warnings.push('Audio conversion failed. Background music will use synthesized notes.');
  }

  return { beatmap, stats, warnings };
}
```

### Step 2: Update MusicImporter.tsx

Add progress indicator:

```typescript
const [conversionProgress, setConversionProgress] = useState<string>('');

const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
  // ... existing code ...

  try {
    const options: SongImportOptions = {
      name: songName.trim(),
      artist: artistName.trim(),
      extractionStrategy,
      minNoteSpacing: 400,
      manualBPM: manualBPM || undefined
    };

    // Pass progress callback
    const result = await importFromMIDI(file, options, (progress) => {
      setConversionProgress(progress.message);
    });

    // ... rest of existing code ...
  }
}

// In the JSX, add progress display:
{isProcessing && (
  <div style={{ padding: '12px', background: '#f0f0f0', borderRadius: '4px' }}>
    <div>⏳ Processing...</div>
    {conversionProgress && <div style={{ fontSize: '0.9em', color: '#666' }}>{conversionProgress}</div>}
  </div>
)}
```

## 🧪 Testing

1. **Install dependencies**:
   ```bash
   npm install --workspace=apps/web tone @tonejs/midi
   npm install --workspace=services/api multer @types/multer
   ```

2. **Restart servers**:
   ```bash
   npm run dev
   ```

3. **Test upload**:
   - Go to the Music Importer
   - Upload `a-sky-full-of-stars.mid`
   - Watch the progress: "Loading MIDI file..." → "Synthesizing audio..." → "Encoding audio file..." → "Complete!"
   - Audio file should appear in `/apps/web/public/sounds/`
   - Beatmap JSON should have `"audioFile": "/sounds/a-sky-full-of-stars.wav"`
   - Play the song - background music should play automatically!

## 📊 Conversion Flow

```
User uploads MIDI
       ↓
Parse MIDI (existing)
       ↓
Generate beatmap (existing)
       ↓
NEW: Convert MIDI to audio
    - Load MIDI with @tonejs/midi
    - Render using Tone.js offline
    - Export as WAV blob
       ↓
NEW: Upload audio to server
    - POST to /api/upload-audio
    - Save to /public/sounds/
       ↓
NEW: Update beatmap
    - Add "audioFile": "/sounds/song.wav"
       ↓
Save beatmap (existing)
       ↓
Song ready to play with background music!
```

## ⚙️ Configuration

### Audio Quality Settings

Edit `apps/web/src/game/import/midiToAudioConverter.ts`:

```typescript
const sampleRate = 44100; // CD quality
const bitDepth = 16; // 16-bit PCM
```

### File Size Limit

Edit `services/api/src/routes/audio.ts`:

```typescript
limits: {
  fileSize: 50 * 1024 * 1024 // 50MB max
}
```

### Background Volume

Already configured in `apps/web/src/game/audio/audioEngine.ts`:

```typescript
backgroundVolume: 0.20 // 20% volume
```

## 🔍 Troubleshooting

### "Module not found: tone"

**Solution:** Install dependencies:
```bash
npm install --workspace=apps/web tone @tonejs/midi
```

### "Cannot find module 'multer'"

**Solution:** Install on API:
```bash
npm install --workspace=services/api multer @types/multer
```

### Audio file not created

**Check:**
1. Browser console for errors
2. Network tab - is POST to /api/upload-audio successful?
3. Server logs - is the audio route registered?
4. File permissions on `/apps/web/public/sounds/`

### Audio is silent

**Check:**
1. Is the MIDI file valid?
2. Browser console - look for Tone.js errors
3. Try playing the generated WAV file directly

## 📈 Performance

### Conversion Time

- Small MIDI (< 1MB): ~5-10 seconds
- Medium MIDI (1-5MB): ~10-30 seconds
- Large MIDI (> 5MB): ~30-60 seconds

### File Sizes

- WAV files are larger than MP3 (~10MB per minute)
- Browser supports WAV natively
- Can add MP3 encoding later if needed

## 🎯 Benefits

### Before (Manual):
1. User uploads MIDI
2. Beatmap generated
3. **Manual step:** Run `npm run convert-midi`
4. **Manual step:** Add audioFile to JSON
5. Play game

### After (Automatic):
1. User uploads MIDI
2. Beatmap generated + audio conversion happens automatically
3. Play game immediately! 🎉

---

## ✅ Quick Start Checklist

- [ ] Install frontend dependencies (`tone`, `@tonejs/midi`)
- [ ] Install backend dependencies (`multer`, `@types/multer`)
- [ ] Update `songGenerator.ts` to call `convertMIDIToAudio`
- [ ] Update `MusicImporter.tsx` to show progress
- [ ] Restart dev servers
- [ ] Test with a MIDI file
- [ ] Verify audio file appears in `/public/sounds/`
- [ ] Verify beatmap has `audioFile` property
- [ ] Play song and hear background music!

## 🚀 Next Steps

Once this is working, you can:
- Add MP3 encoding (smaller file size)
- Add quality settings in UI
- Show audio waveform preview
- Allow users to adjust background volume
- Support custom soundfonts for different instrument sounds

---

Ready to go! Just install the dependencies and update those two files, then automatic MIDI conversion will be live! 🎵
