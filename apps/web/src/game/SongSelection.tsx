import { useState, useRef } from 'react';
import { getAvailableSongs, type SongMetadata, loadSong } from './songs/songLoader';
import type { AudioEngine } from './audio/audioEngine';
import { MusicImporter } from './MusicImporter';
import { deleteSongFromAPI, deleteImportedSong } from './import/songGenerator';
import { getHighScore } from './highScores';
import { Button } from '../components/Button';

interface SongSelectionProps {
  selectedSongId: string | null;
  onSelectSong: (songId: string) => void;
  audioEngine: AudioEngine;
}

export function SongSelection({ selectedSongId, onSelectSong, audioEngine }: SongSelectionProps) {
  const [availableSongs, setAvailableSongs] = useState<SongMetadata[]>(getAvailableSongs());
  const [previewingSongId, setPreviewingSongId] = useState<string | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const handleImportComplete = (songId: string) => {
    // Refresh the available songs list
    setAvailableSongs(getAvailableSongs());
    // Auto-select the newly imported song
    onSelectSong(songId);
  };

  const handleDeleteSong = async (songId: string) => {
    if (!confirm(`Are you sure you want to delete this song?`)) {
      return;
    }

    // Delete from localStorage
    deleteImportedSong(songId);

    // Delete from API/file system
    const result = await deleteSongFromAPI(songId);
    if (!result.success) {
      console.warn('[Song Delete] API delete failed:', result.error);
    }

    // Refresh song list
    setAvailableSongs(getAvailableSongs());

    // If deleted song was selected, clear selection
    if (selectedSongId === songId) {
      onSelectSong('');
    }
  };

  const stopPreview = () => {
    // Clear all scheduled note timeouts
    previewTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    previewTimeoutsRef.current = [];

    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }

    setPreviewingSongId(null);
  };

  const playPreview = (songId: string) => {
    // Stop any existing preview
    stopPreview();

    // Initialize audio if needed
    audioEngine.initialize();
    audioEngine.resume();

    // Load the song
    const beatmap = loadSong(songId);
    setPreviewingSongId(songId);

    // Schedule all notes
    const startTime = Date.now();
    const previewDuration = Math.min(beatmap.duration, 10000); // Preview max 10 seconds

    beatmap.notes.forEach((note) => {
      if (note.time > previewDuration) return; // Don't preview beyond 10 seconds

      const timeout = setTimeout(() => {
        if (note.noteFrequency) {
          audioEngine.playHitSound(note.lane, 'perfect', note.noteFrequency);
        }
      }, note.time);

      previewTimeoutsRef.current.push(timeout);
    });

    // Auto-stop after preview duration
    previewTimeoutRef.current = setTimeout(() => {
      setPreviewingSongId(null);
    }, previewDuration + 500);
  };

  return (
    <div
      data-tutorial="song-selection"
      style={{
        width: '320px',
        height: 'calc(100vh - 100px)', // Full viewport height minus header (100px)
        maxHeight: 'calc(100vh - 100px)',
        background: '#ebe4d6',
        borderLeft: '3px solid #d4c7b0',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        overflow: 'hidden'
      }}
    >
      <h2 style={{
        margin: '0 0 20px 0',
        color: '#5a4d3a',
        fontSize: '1.5rem',
        fontWeight: 'bold',
        borderBottom: '2px solid #d4c7b0',
        paddingBottom: '10px',
        flexShrink: 0
      }}>
        Song Selection
      </h2>

      {/* Music Importer */}
      <div style={{ flexShrink: 0 }}>
        <MusicImporter onImportComplete={handleImportComplete} />
      </div>

      {/* Scrollable song list */}
      <div style={{
        flex: '1 1 auto',
        overflowY: 'auto',
        overflowX: 'hidden',
        marginTop: '16px',
        paddingRight: '4px',
        minHeight: 0,
        maxHeight: '100%'
      }}>
        {availableSongs.length === 0 ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#8b7355',
            fontStyle: 'italic'
          }}>
            No songs available
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '8px' }}>
            {availableSongs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                isSelected={selectedSongId === song.id}
                isPreviewing={previewingSongId === song.id}
                onSelect={() => onSelectSong(song.id)}
                onPreview={() => playPreview(song.id)}
                onStopPreview={stopPreview}
                onDelete={() => handleDeleteSong(song.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SongCardProps {
  song: SongMetadata;
  isSelected: boolean;
  isPreviewing: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onStopPreview: () => void;
  onDelete: () => void;
}

function SongCard({ song, isSelected, isPreviewing, onSelect, onPreview, onStopPreview, onDelete }: SongCardProps) {
  // Built-in songs that cannot be deleted
  const builtInSongs = ['simple-melody', 'river-flows-in-you'];
  const canDelete = !builtInSongs.includes(song.id);
  const highScore = getHighScore(song.id);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#6fa87a';
      case 'medium': return '#d4a547';
      case 'hard': return '#c75450';
      default: return '#8b7355';
    }
  };

  return (
    <div
      style={{
        background: isSelected ? '#d4c7b0' : '#f5f1e8',
        border: `3px solid ${isSelected ? '#8b7355' : '#d4c7b0'}`,
        borderRadius: '8px',
        padding: '16px',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: isSelected ? '0 4px 8px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      <div style={{
        fontSize: '1.1rem',
        fontWeight: 'bold',
        color: '#5a4d3a'
      }}>
        {song.name}
      </div>

      <div style={{
        fontSize: '0.9rem',
        color: '#8b7355',
        fontStyle: 'italic'
      }}>
        {song.artist}
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        marginTop: '4px',
        fontSize: '0.85rem'
      }}>
        <span style={{
          background: getDifficultyColor(song.difficulty),
          color: '#ffffff',
          padding: '2px 8px',
          borderRadius: '4px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          fontSize: '0.75rem'
        }}>
          {song.difficulty}
        </span>

        <span style={{ color: '#8b7355' }}>
          {song.bpm} BPM
        </span>

        <span style={{ color: '#8b7355' }}>
          {Math.floor(song.duration / 1000)}s
        </span>
      </div>

      {/* High Score Display */}
      {highScore && (
        <div style={{
          marginTop: '8px',
          padding: '6px 8px',
          background: '#f5f1e8',
          border: '2px solid #d4a547',
          borderRadius: '4px',
          fontSize: '0.85rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: '#5a4d3a', fontWeight: 'bold' }}>
            High Score:
          </span>
          <span style={{ color: '#d4a547', fontWeight: 'bold' }}>
            {highScore.score.toLocaleString()}
          </span>
        </div>
      )}

      {isSelected && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          background: '#6fa87a',
          color: '#ffffff',
          borderRadius: '4px',
          textAlign: 'center',
          fontSize: '0.85rem',
          fontWeight: 'bold'
        }}>
          Selected
        </div>
      )}

      {/* Preview and Select buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <Button
          onClick={onSelect}
          disabled={isSelected}
          style={{
            flex: 1,
            padding: '8px',
            background: isSelected ? '#8b7355' : '#6fa87a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: isSelected ? 'default' : 'pointer',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            opacity: isSelected ? 0.6 : 1,
            transition: 'opacity 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.opacity = '0.8';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.opacity = '1';
            }
          }}
        >
          {isSelected ? 'Selected' : 'Select'}
        </Button>

        <Button
          onClick={isPreviewing ? onStopPreview : onPreview}
          disableClickSound={true}
          style={{
            flex: 1,
            padding: '8px',
            background: isPreviewing ? '#c75450' : '#5a4d3a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            transition: 'opacity 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          {isPreviewing ? 'Stop' : 'Preview'}
        </Button>
      </div>

      {/* Delete button for imported songs */}
      {canDelete && (
        <Button
          onClick={onDelete}
          style={{
            width: '100%',
            padding: '6px',
            background: '#c75450',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            marginTop: '4px',
            transition: 'opacity 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          Delete
        </Button>
      )}
    </div>
  );
}
