# Song Format Guide

## Using Note Names vs Frequencies

You can now use **note names** instead of raw frequencies! This makes creating songs much easier.

### Format Options

#### Option 1: Note Names (Recommended ✅)
```json
{
  "lane": 0,
  "time": 1000,
  "note": "C4"
}
```

#### Option 2: Frequencies (Still Supported)
```json
{
  "lane": 0,
  "time": 1000,
  "noteFrequency": 261.63
}
```

### Note Name Format

- **Format**: `[Note][Accidental?][Octave]`
- **Examples**: `C4`, `C#5`, `Db3`, `F#4`, `Ab5`

### Supported Notes

#### Natural Notes
- C, D, E, F, G, A, B

#### Sharps (#)
- C#, D#, F#, G#, A#

#### Flats (b)
- Db, Eb, Gb, Ab, Bb

**Note**: C# and Db are the same pitch (enharmonic equivalents)

### Octave Numbers

- **C3**: 130.81 Hz (Lower)
- **C4**: 261.63 Hz (Middle C) ⭐ Most common
- **C5**: 523.25 Hz (Higher)
- **C6**: 1046.50 Hz (Very high)

### Common Notes Quick Reference

| Note | Frequency | Description |
|------|-----------|-------------|
| C4   | 261.63 Hz | Middle C |
| D4   | 293.66 Hz | |
| E4   | 329.63 Hz | |
| F4   | 349.23 Hz | |
| G4   | 392.00 Hz | |
| A4   | 440.00 Hz | Concert A (tuning reference) |
| B4   | 493.88 Hz | |
| C5   | 523.25 Hz | One octave above middle C |

### Example Song

See [exampleWithNotes.json](./exampleWithNotes.json) for a complete example using note names.

See [riverFlowsInYou_notes.json](./riverFlowsInYou_notes.json) for River Flows in You using note names instead of frequencies.

### Benefits of Note Names

✅ **More readable** - "C#4" vs "277.18"
✅ **Easier to compose** - Match with sheet music
✅ **Less error-prone** - No need to look up frequencies
✅ **Standard notation** - Universal music notation

### Converting Existing Songs

To convert frequency to note name:
1. Use the `frequencyToNote()` function in `noteConverter.ts`
2. Or use this quick reference:
   - 261.63 Hz = C4
   - 293.66 Hz = D4
   - 329.63 Hz = E4
   - 392.00 Hz = G4
   - 440.00 Hz = A4
   - 493.88 Hz = B4
   - 523.25 Hz = C5
   - 587.33 Hz = D5
   - 659.25 Hz = E5
   - 739.99 Hz = F#5
   - 783.99 Hz = G5
   - 880.00 Hz = A5
   - 987.77 Hz = B5
