# Music Import System - Quick Start Guide

## ✅ What Was Built

You now have a complete pipeline to import MIDI files and automatically save them to your game:

### Features
1. **MIDI File Import** - Upload .mid/.midi files
2. **Automatic Melody Extraction** - Converts polyphonic music to playable single notes
3. **Permanent Storage** - Songs saved to `apps/web/src/game/songs/`
4. **Instant Availability** - Songs appear immediately in the song list
5. **Delete Functionality** - Remove imported songs with one click

### How It Works
```
Upload MIDI → Parse Notes → Extract Melody → Save to:
                                             ├─ localStorage (instant)
                                             └─ File System (permanent)
```

## 🚀 How to Use

### 1. Start the Backend API
The backend is needed to save songs to the file system:

```bash
# In project root
npm run dev:api
```

The API will run on `http://localhost:3001`

### 2. Start the Web App
```bash
# In project root (separate terminal)
npm run dev:web
```

### 3. Import a Song

1. Open your game in browser
2. Go to song selection
3. Click **"📥 Import Music"**
4. Fill in:
   - **Song Name** (required)
   - **Artist** (optional)
   - **Polyphony Handling**: Choose extraction strategy
     - **Melody Line** (Recommended) - Smart AI-like extraction
     - **Highest Note** - Always picks highest pitch
     - **Smart Lanes** - Ergonomic lane assignments
     - **Round Robin** - Even distribution
5. Click **"📁 Select MIDI File"**
6. Choose your .mid file
7. Wait for processing
8. **Done!** Song appears in list above

### 4. Delete a Song

- Imported songs have a **🗑️ Delete** button
- Built-in songs (Simple Melody, River Flows in You) cannot be deleted

## 📁 Where Are Songs Stored?

### Immediate Storage (LocalStorage)
- **Location**: Browser's localStorage
- **Key**: `imported-song-{song-id}`
- **Available**: Instantly after import
- **Persistence**: Until browser data is cleared

### Permanent Storage (File System)
- **Location**: `apps/web/src/game/songs/{song-id}.json`
- **Format**: Standard JSON beatmap format
- **Available**: After dev server restart OR via localStorage
- **Persistence**: Forever (committed to git)

## 🎹 Polyphony Handling Explained

### What is Polyphony?
When MIDI files have multiple notes playing at the same time (like piano chords), the game needs a single melody line.

### Extraction Strategies

#### Melody Line (Recommended) ⭐
Smart algorithm that considers:
- **Velocity**: Louder notes prioritized
- **Duration**: Longer notes prioritized
- **Melodic Contour**: Smooth transitions preferred
- **Pitch Range**: Upper register preferred

**Best for**: Most songs, especially piano pieces

#### Highest Note
Simply picks the highest pitched note.

**Best for**: Songs where melody is always on top

#### Smart Lanes
Assigns notes to lanes based on pitch and ergonomics.

**Best for**: Creating natural finger patterns

#### Round Robin
Cycles through lanes evenly.

**Best for**: Simple, balanced patterns

## 📊 Import Statistics

After import, you'll see:
- **Original vs Final Notes**: How many notes were kept
- **Retention Rate**: Percentage of notes kept (higher is better)
- **Average Spacing**: Time between notes (affects difficulty)
- **Suggested Difficulty**: Auto-calculated
- **Lane Distribution**: Notes per lane (balanced is better)
- **Warnings**: Issues to be aware of

## 🎵 Finding MIDI Files

### Free MIDI Files
- [BitMidi](https://bitmidi.com/) - Large collection
- [FreeMidi](https://freemidi.org/) - Categorized library
- [Musescore](https://musescore.com/) - Export sheet music as MIDI

### Create Your Own
1. **MuseScore** (Free) - Write music, export as MIDI
2. **Flat.io** (Free) - Online notation, export MIDI
3. **Logic Pro / GarageBand** - Mac users
4. **FL Studio / Ableton** - DAW users

## 🐛 Troubleshooting

### "Failed to save song to server"
**Solution**: Make sure the API is running:
```bash
npm run dev:api
```

### Song doesn't appear after import
**Check**:
1. Is API running? (`http://localhost:3001/health`)
2. Check browser console for errors
3. Song may be in localStorage - check song list

### "Low retention rate" warning
**Solution**:
- Try different extraction strategy
- Reduce minimum note spacing
- Original song may be very dense/fast

### Song is too fast/slow
**Solution**:
- Use **Manual BPM** field to override detected BPM
- Adjust in the JSON file directly

### Delete doesn't work
**Check**:
- Can't delete built-in songs (Simple Melody, River Flows in You)
- Check if API is running
- Song will be removed from localStorage anyway

## 🔧 Advanced Usage

### Manual JSON Editing

Songs are saved as JSON files in `apps/web/src/game/songs/`.

Example format:
```json
{
  "id": "my-song",
  "name": "My Song",
  "artist": "Artist Name",
  "bpm": 120,
  "duration": 30000,
  "notes": [
    { "lane": 0, "time": 0, "note": "C4" },
    { "lane": 1, "time": 500, "note": "D4" }
  ]
}
```

You can manually edit these files to adjust:
- BPM
- Note timing
- Lane assignments
- Add/remove notes

### API Endpoints

The backend provides:

```bash
# Save a song
POST http://localhost:3001/api/songs
Body: { "beatmap": { ... } }

# Delete a song
DELETE http://localhost:3001/api/songs/:id

# List all songs
GET http://localhost:3001/api/songs
```

### Environment Variables

Create `apps/web/.env`:
```env
# API URL (default: http://localhost:3001)
VITE_API_URL=http://localhost:3001

# OMR Service (for sheet music images - optional)
VITE_OMR_API_ENDPOINT=http://localhost:8080/omr
VITE_OMR_API_KEY=your-api-key
```

## 📝 Tips for Best Results

1. **Use high-quality MIDI files** with proper velocity data
2. **Test different extraction strategies** to find the best melody
3. **Check statistics** before saving - low retention may need adjustment
4. **Preview songs** before playing to verify quality
5. **Keep backups** of JSON files you like
6. **Name songs clearly** for easy identification

## 🎯 What's Next?

Current limitations and future improvements:
- [ ] Sheet music image import (requires OMR service setup)
- [ ] Batch import multiple MIDIs
- [ ] Auto-detect optimal extraction strategy
- [ ] Edit songs in-app (adjust notes, timing, etc.)
- [ ] Import from YouTube/Spotify (audio transcription)

## 🆘 Need Help?

1. Check browser console for errors (F12)
2. Check API logs (terminal running `npm run dev:api`)
3. Review import statistics and warnings
4. Try a different MIDI file to isolate the issue

## 📚 Full Documentation

For detailed technical documentation, see:
- [apps/web/src/game/import/README.md](apps/web/src/game/import/README.md)
- API routes: [services/api/src/routes/songs.ts](services/api/src/routes/songs.ts)

---

**Enjoy creating your own songs!** 🎶
