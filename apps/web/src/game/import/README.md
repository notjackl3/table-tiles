# Music Import System

This module provides a complete pipeline for importing music into Table Tiles from various sources, including MIDI files and sheet music images.

## Features

### 🎵 MIDI Import
- Parse standard MIDI (.mid, .midi) files
- Extract notes with octave and timing information
- Auto-detect BPM and time signature
- Support for polyphonic music (multiple simultaneous notes)

### 📄 Sheet Music Import (OMR)
- Import sheet music images (PNG, JPG, PDF)
- Optical Music Recognition (OMR) integration
- Configurable OMR service endpoints

### 🎹 Melody Extraction
Intelligently convert polyphonic music to playable game notes with multiple strategies:
- **Melody Line** (Recommended): Smart algorithm that extracts the main melody
- **Highest Note**: Always selects the highest pitched note
- **Smart Lanes**: Assigns notes to lanes based on pitch and ergonomics
- **Round Robin**: Distributes notes evenly across lanes

### 📊 Quality Analysis
- Retention rate (how many notes were kept)
- Average note spacing
- Lane distribution statistics
- Automatic difficulty suggestion

## Usage

### Quick Start

1. **In the Game UI**:
   - Click "📥 Import Music" in the song selection panel
   - Choose MIDI or Sheet Music import
   - Fill in song details (name, artist)
   - Select extraction strategy
   - Upload your file
   - Song is auto-downloaded as JSON and available immediately

2. **Programmatic Usage**:

```typescript
import { importFromMIDI, saveBeatmapAsJSON } from './import';

// Import a MIDI file
const result = await importFromMIDI(midiFile, {
  name: 'My Song',
  artist: 'Artist Name',
  extractionStrategy: 'melody-line',
  minNoteSpacing: 100
});

// Save as JSON
saveBeatmapAsJSON(result.beatmap);

// Check import statistics
console.log('Notes:', result.stats.finalNoteCount);
console.log('Retention:', result.stats.retentionRate);
console.log('Difficulty:', result.stats.suggestedDifficulty);
```

## Architecture

### Module Structure

```
import/
├── midiParser.ts          # MIDI file parsing
├── melodyExtractor.ts     # Polyphony to monophony conversion
├── omrService.ts          # Sheet music OCR integration
├── songGenerator.ts       # Main import pipeline & JSON generation
├── index.ts               # Public API exports
└── README.md             # This file
```

### Data Flow

```
MIDI File or Image
       ↓
   Parser (MIDI/OMR)
       ↓
  ParsedNote[] (with timing, pitch, octave)
       ↓
 Melody Extractor (handles polyphony)
       ↓
  GameNote[] (lane assignments)
       ↓
  Song Generator
       ↓
  Beatmap JSON + Statistics
```

## Extraction Strategies

### Melody Line (Default)
Intelligent algorithm that considers:
- Note velocity (louder notes prioritized)
- Note duration (longer notes prioritized)
- Melodic contour (smooth transitions preferred)
- Pitch range (upper register preferred for melody)

**Best for**: Most songs, especially piano pieces

### Highest Note
Simply takes the highest pitched note when multiple notes play simultaneously.

**Best for**: Songs where melody is consistently in the upper register

### Smart Lanes
Assigns notes to lanes considering:
- Pitch-based positioning
- Ergonomic finger movements
- Natural left-to-right patterns for ascending melodies

**Best for**: Creating playable, ergonomic patterns

### Round Robin
Cycles through lanes 0 → 1 → 2 → 3 → 0...

**Best for**: Even distribution, simple patterns

## Polyphony Handling

When importing polyphonic music (multiple notes at once), the system:

1. **Groups simultaneous notes** (within 50ms window)
2. **Selects melody notes** using chosen strategy
3. **Applies minimum spacing** (default 100ms)
4. **Assigns lanes** (0-3) based on strategy

Example:
```
Original (Polyphonic):
C4 + E4 + G4 at time 0ms
D4 + F4 + A4 at time 500ms

After Melody Extraction:
G4 at time 0ms → Lane 2
A4 at time 500ms → Lane 3
```

## OMR (Optical Music Recognition) Setup

### Option 1: Audiveris (Recommended)

```bash
# Using Docker
docker pull audiveris/audiveris
docker run -p 8080:8080 audiveris/audiveris

# Configure in .env
VITE_OMR_API_ENDPOINT=http://localhost:8080/omr
VITE_OMR_SERVICE_TYPE=audiveris
```

### Option 2: Custom API

Create your own OMR service with this API format:

```typescript
POST /your-omr-endpoint
Content-Type: multipart/form-data

{
  image: File
}

Response:
{
  notes: ParsedNote[],
  bpm: number,
  timeSignature: [number, number],
  confidence: number,
  warnings?: string[]
}
```

### Option 3: Use MIDI Instead

If OMR setup is complex, simply use MIDI files:
- Export from notation software (MuseScore, Finale, Sibelius)
- Convert images to MIDI using online services
- Use existing MIDI files from the internet

## Import Statistics

After import, you receive detailed statistics:

```typescript
{
  originalNoteCount: 250,      // Notes in original file
  finalNoteCount: 180,          // Notes in game
  retentionRate: 72.0,          // Percentage kept
  averageSpacing: 280,          // ms between notes
  isPolyphonic: true,           // Had multiple simultaneous notes
  laneDistribution: [45, 42, 48, 45],  // Notes per lane
  suggestedDifficulty: 'medium' // Auto-suggested difficulty
}
```

## Tips for Best Results

### MIDI Import
1. **Use high-quality MIDI files** with proper note velocities
2. **Adjust minNoteSpacing** if notes are too fast/slow
3. **Try different extraction strategies** to find best melody
4. **Check warnings** in import result for issues

### Sheet Music Import
1. **Use clear, high-resolution images** (300 DPI+)
2. **Avoid hand-written scores** (OCR works best with printed music)
3. **Check confidence score** (< 70% may need manual review)
4. **Consider exporting to MIDI** from notation software instead

### General
1. **Name songs clearly** for easy identification
2. **Review JSON output** before using in game
3. **Test with preview** before playing full song
4. **Save JSON files** to version control

## Troubleshooting

### "Failed to parse MIDI file"
- Ensure file is valid MIDI (.mid or .midi extension)
- Try opening in DAW or music software to verify
- Check file isn't corrupted

### "Low retention rate warning"
- Reduce `minNoteSpacing` to keep more notes
- Try different extraction strategy
- Original music may be very dense

### "OMR Service Not Available"
- Check OMR service is running (docker ps)
- Verify endpoint in .env file
- Check network connectivity
- Consider using MIDI files instead

### "Notes too fast/slow"
- Adjust `minNoteSpacing` parameter
- Verify BPM detection (use manualBPM if needed)
- Check time signature in original file

## API Reference

See individual files for detailed API documentation:
- [midiParser.ts](./midiParser.ts) - MIDI parsing functions
- [melodyExtractor.ts](./melodyExtractor.ts) - Melody extraction
- [omrService.ts](./omrService.ts) - OMR integration
- [songGenerator.ts](./songGenerator.ts) - Main import pipeline

## Examples

### Example 1: Simple MIDI Import

```typescript
const file = await fetch('song.mid').then(r => r.blob());
const result = await importFromMIDI(file, {
  name: 'Twinkle Twinkle',
  artist: 'Traditional'
});

saveBeatmapAsJSON(result.beatmap);
```

### Example 2: Advanced Configuration

```typescript
const result = await importFromMIDI(file, {
  name: 'Complex Song',
  artist: 'Composer',
  extractionStrategy: 'smart-lanes',
  minNoteSpacing: 150,
  manualBPM: 90
});

// Check if result is playable
if (result.stats.averageSpacing < 100) {
  console.warn('May be too difficult!');
}
```

### Example 3: Batch Import

```typescript
const files = [file1, file2, file3];
const results = await Promise.all(
  files.map((file, i) =>
    importFromMIDI(file, {
      name: `Song ${i + 1}`,
      artist: 'Various'
    })
  )
);

results.forEach(r => saveBeatmapAsJSON(r.beatmap));
```

## Contributing

To extend the import system:

1. **Add new extraction strategies** in `melodyExtractor.ts`
2. **Integrate new OMR services** in `omrService.ts`
3. **Add new file formats** (e.g., MusicXML parser)
4. **Improve melody detection** algorithms

## License

Part of the Table Tiles project.
