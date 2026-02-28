/**
 * Music Import System
 * Exports all music import functionality
 */

// MIDI Parser
export {
  parseMidiFile,
  getMidiStats,
  type ParsedNote,
  type MidiParseResult
} from './midiParser';

// Melody Extractor
export {
  extractMelody,
  analyzeMelodyQuality,
  type GameNote,
  type ExtractionStrategy
} from './melodyExtractor';

// OMR Service
export {
  transcribeSheetMusic,
  checkOMRServiceAvailability,
  getDefaultOMRConfig,
  OMR_SETUP_INSTRUCTIONS,
  type OMRConfig,
  type OMRResult
} from './omrService';

// Song Generator
export {
  importFromMIDI,
  importFromSheetMusic,
  saveBeatmapAsJSON,
  saveBeatmapToLocalStorage,
  loadBeatmapFromLocalStorage,
  getAllImportedSongs,
  deleteImportedSong,
  type SongImportOptions,
  type ImportResult
} from './songGenerator';
