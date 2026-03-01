/**
 * Music Importer Component
 * Allows users to import MIDI files or sheet music images
 */

import { useState, useRef } from 'react';
import {
  importFromMIDI,
  importFromSheetMusic,
  importFromMP3Only,
  saveBeatmapToAPI,
  saveBeatmapToLocalStorage,
  type SongImportOptions,
  type ImportResult
} from './import/songGenerator';
import type { ExtractionStrategy } from './import/melodyExtractor';
import { getDefaultOMRConfig, checkOMRServiceAvailability, OMR_SETUP_INSTRUCTIONS } from './import/omrService';
import { uploadAudioFile } from './import/midiToAudioConverter';
import { Button } from '../components/Button';

interface MusicImporterProps {
  onImportComplete?: (songId: string) => void;
}

export function MusicImporter({ onImportComplete }: MusicImporterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [importType, setImportType] = useState<'midi' | 'image'>('midi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [omrAvailable, setOmrAvailable] = useState<boolean | null>(null);
  const [midiFile, setMidiFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const midiFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [songName, setSongName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [extractionStrategy, setExtractionStrategy] = useState<ExtractionStrategy>('melody-line');
  const [manualBPM, setManualBPM] = useState<number | undefined>();

  // Check OMR availability on mount
  const checkOMRAvailability = async () => {
    const config = getDefaultOMRConfig();
    const available = await checkOMRServiceAvailability(config);
    setOmrAvailable(available);
  };

  const handleMidiFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMidiFile(file);
    }
  };

  const handleImport = async () => {
    // Validate inputs
    if (!songName.trim()) {
      setError('Please enter a song name');
      return;
    }

    // Check that at least one file is provided
    if (!midiFile && !audioFile && importType !== 'image') {
      setError('Please upload at least a MIDI file or an MP3 file');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setImportResult(null);

    try {
      const options: SongImportOptions = {
        name: songName.trim(),
        artist: artistName.trim() || 'Unknown Artist',
        extractionStrategy,
        minNoteSpacing: 400,
        manualBPM: manualBPM || undefined
      };

      let result: ImportResult;

      if (importType === 'midi') {
        if (midiFile) {
          // MIDI file provided - generate notes from MIDI
          result = await importFromMIDI(midiFile, options);

          // Upload user-provided audio file if one is selected
          if (audioFile) {
            try {
              console.log('[Music Importer] Uploading background audio...');
              const audioPath = await uploadAudioFile(audioFile, result.beatmap.id);
              console.log('[Music Importer] Audio uploaded to:', audioPath);

              // Update beatmap with audio file path
              result.beatmap.audioFile = audioPath;

            } catch (audioError) {
              console.warn('[Music Importer] Audio upload failed:', audioError);
              result.warnings.push('Background audio upload failed. Song will use synthesized audio.');
            }
          }
        } else if (audioFile) {
          // MP3 only - generate random notes
          result = await importFromMP3Only(audioFile, options);
        } else {
          throw new Error('No files provided');
        }
      } else {
        // Sheet music import (not affected by this change)
        const omrConfig = getDefaultOMRConfig();
        if (!midiFile) {
          throw new Error('Please select an image file');
        }
        result = await importFromSheetMusic(midiFile, options, omrConfig);
      }

      setImportResult(result);

      // Save to localStorage for immediate availability
      saveBeatmapToLocalStorage(result.beatmap);

      // Save to backend API (permanent storage in songs folder)
      const saveResult = await saveBeatmapToAPI(result.beatmap);

      if (!saveResult.success) {
        console.warn('[Music Importer] API save failed:', saveResult.error);
        // Don't throw - song is still in localStorage
      }

      // Notify parent to refresh song list
      if (onImportComplete) {
        onImportComplete(result.beatmap.id);
      }

      console.log('[Music Importer] Import successful:', result);

      // Reset file inputs
      setMidiFile(null);
      setAudioFile(null);
      if (midiFileInputRef.current) {
        midiFileInputRef.current.value = '';
      }
      if (audioFileInputRef.current) {
        audioFileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('[Music Importer] Import failed:', err);
      setError(err.message || 'Failed to import music');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportTypeChange = async (type: 'midi' | 'image') => {
    setImportType(type);
    if (type === 'image' && omrAvailable === null) {
      await checkOMRAvailability();
    }
  };

  const handleAudioFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  };

  return (
    <div style={{
      background: '#f5f1e8',
      border: '3px solid #d4c7b0',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '16px'
    }}>
      {/* Header - Always visible */}
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        disableClickSound={true}
        style={{
          width: '100%',
          padding: '16px',
          background: '#d4c7b0',
          color: '#5a4d3a',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1rem',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>Import Music</span>
        <span style={{ fontSize: '1.2rem' }}>{isExpanded ? 'v' : '>'}</span>
      </Button>

      {/* Content - Expandable */}
      {isExpanded && (
        <div style={{ padding: '16px' }}>
          {/* Import Type Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#5a4d3a', fontWeight: 'bold' }}>
              Import From:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                onClick={() => handleImportTypeChange('midi')}
                disableClickSound={true}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: importType === 'midi' ? '#6fa87a' : '#8b7355',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                MIDI File
              </Button>
              <Button
                onClick={() => handleImportTypeChange('image')}
                disableClickSound={true}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: importType === 'image' ? '#6fa87a' : '#8b7355',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Sheet Music Image
              </Button>
            </div>
          </div>

          {/* OMR Warning */}
          {importType === 'image' && omrAvailable === false && (
            <div style={{
              padding: '12px',
              background: '#fff4e6',
              border: '2px solid #d4a547',
              borderRadius: '4px',
              marginBottom: '16px',
              fontSize: '0.85rem',
              color: '#5a4d3a'
            }}>
              <strong>OMR Service Not Available</strong>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem' }}>
                Sheet music transcription requires an OMR service. Please use MIDI files or set up an OMR service.
              </p>
              <details style={{ marginTop: '8px', fontSize: '0.75rem' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Setup Instructions</summary>
                <pre style={{
                  marginTop: '8px',
                  padding: '8px',
                  background: '#f5f1e8',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '0.7rem'
                }}>
                  {OMR_SETUP_INSTRUCTIONS}
                </pre>
              </details>
            </div>
          )}

          {/* Song Metadata */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#5a4d3a', fontSize: '0.85rem', fontWeight: 'bold' }}>
              Song Name *
            </label>
            <input
              type="text"
              value={songName}
              onChange={(e) => setSongName(e.target.value)}
              placeholder="Enter song name"
              style={{
                width: '100%',
                padding: '8px',
                border: '2px solid #d4c7b0',
                borderRadius: '4px',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#5a4d3a', fontSize: '0.85rem', fontWeight: 'bold' }}>
              Artist
            </label>
            <input
              type="text"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Enter artist name"
              style={{
                width: '100%',
                padding: '8px',
                border: '2px solid #d4c7b0',
                borderRadius: '4px',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Extraction Strategy */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#5a4d3a', fontSize: '0.85rem', fontWeight: 'bold' }}>
              Polyphony Handling
            </label>
            <select
              value={extractionStrategy}
              onChange={(e) => setExtractionStrategy(e.target.value as ExtractionStrategy)}
              style={{
                width: '100%',
                padding: '8px',
                border: '2px solid #d4c7b0',
                borderRadius: '4px',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
                background: 'white'
              }}
            >
              <option value="melody-line">Extract Melody (Smart)</option>
              <option value="highest-note">Highest Note Only</option>
              <option value="smart-lanes">Smart Lane Assignment</option>
              <option value="round-robin">Round Robin Distribution</option>
            </select>
          </div>

          {/* MIDI File Upload (Optional) */}
          {importType === 'midi' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', color: '#5a4d3a', fontSize: '0.85rem', fontWeight: 'bold' }}>
                MIDI File (Optional)
              </label>
              <div style={{ fontSize: '0.75rem', color: '#8b7355', marginBottom: '8px' }}>
                Upload a MIDI file to generate notes. If not provided, random notes will be generated.
              </div>
              <input
                ref={midiFileInputRef}
                type="file"
                accept=".mid,.midi"
                onChange={handleMidiFileSelect}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '2px solid #d4c7b0',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                  background: 'white'
                }}
              />
              {midiFile && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px',
                  background: '#e6f7e9',
                  border: '2px solid #6fa87a',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  color: '#5a4d3a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>✓ {midiFile.name}</span>
                  <Button
                    onClick={() => {
                      setMidiFile(null);
                      if (midiFileInputRef.current) {
                        midiFileInputRef.current.value = '';
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      background: '#c75450',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* MP3 File Upload (Optional) */}
          {importType === 'midi' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', color: '#5a4d3a', fontSize: '0.85rem', fontWeight: 'bold' }}>
                MP3 File (Optional)
              </label>
              <div style={{ fontSize: '0.75rem', color: '#8b7355', marginBottom: '8px' }}>
                Upload an MP3 file to play as background music. If not provided, notes will be synthesized.
              </div>
              <input
                ref={audioFileInputRef}
                type="file"
                accept="audio/wav,audio/mp3,audio/mpeg,.wav,.mp3"
                onChange={handleAudioFileSelect}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '2px solid #d4c7b0',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                  background: 'white'
                }}
              />
              {audioFile && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px',
                  background: '#e6f7e9',
                  border: '2px solid #6fa87a',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  color: '#5a4d3a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>✓ {audioFile.name}</span>
                  <Button
                    onClick={() => {
                      setAudioFile(null);
                      if (audioFileInputRef.current) {
                        audioFileInputRef.current.value = '';
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      background: '#c75450',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={isProcessing || !songName.trim() || (importType === 'midi' && !midiFile && !audioFile) || (importType === 'image' && omrAvailable === false)}
            disableClickSound={true}
            style={{
              width: '100%',
              padding: '12px',
              background: isProcessing ? '#8b7355' : '#6fa87a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: isProcessing ? 'wait' : 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              opacity: !songName.trim() || (importType === 'midi' && !midiFile && !audioFile) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isProcessing ? 'Processing...' : 'Import Song'}
          </Button>

          {/* Error Display */}
          {error && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#ffe6e6',
              border: '2px solid #c75450',
              borderRadius: '4px',
              color: '#5a4d3a',
              fontSize: '0.85rem'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Success Display */}
          {importResult && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#e6f7e9',
              border: '2px solid #6fa87a',
              borderRadius: '4px',
              color: '#5a4d3a',
              fontSize: '0.85rem'
            }}>
              <strong>Import Successful!</strong>
              <div style={{ marginTop: '8px', fontSize: '0.8rem' }}>
                <div>Notes: {importResult.stats.originalNoteCount} → {importResult.stats.finalNoteCount}</div>
                <div>Retention: {importResult.stats.retentionRate.toFixed(1)}%</div>
                <div>Avg Spacing: {importResult.stats.averageSpacing}ms</div>
                <div>Suggested Difficulty: {importResult.stats.suggestedDifficulty}</div>
                <div>Lane Distribution: {importResult.stats.laneDistribution.join(', ')}</div>
                <div>Note Variety: {importResult.stats.noteVariety.uniqueNotes} unique notes</div>
                <div>Max Repetition: {importResult.stats.noteVariety.longestRepetition} consecutive</div>
                {importResult.beatmap.audioFile && (
                  <div style={{ marginTop: '4px', color: '#6fa87a', fontWeight: 'bold' }}>
                    Background audio: Generated ✓
                  </div>
                )}
              </div>

              {importResult.warnings.length > 0 && (
                <details style={{ marginTop: '8px', fontSize: '0.75rem' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Warnings ({importResult.warnings.length})</summary>
                  <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                    {importResult.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </details>
              )}

              <div style={{
                marginTop: '8px',
                fontSize: '0.75rem',
                color: '#6fa87a',
                fontStyle: 'italic'
              }}>
                Saved permanently! Song is now available in the list above.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
