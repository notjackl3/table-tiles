#!/usr/bin/env node

/**
 * Generate beatmap JSON from MIDI file
 * Properly maps MIDI notes to game lanes based on pitch
 */

const fs = require('fs');
const path = require('path');
const { Midi } = require('@tonejs/midi');

// Game lane frequencies (from audioEngine.ts)
// Lane 0: C4 (261.63 Hz)
// Lane 1: E4 (329.63 Hz)
// Lane 2: G4 (392.0 Hz)
// Lane 3: B4 (493.88 Hz)
const LANE_FREQUENCIES = [261.63, 329.63, 392.0, 493.88];

/**
 * Map a MIDI pitch to a lane (0-3)
 * Uses modulo-12 for octave-agnostic pitch class mapping
 */
function pitchToLane(midiPitch) {
  // Get pitch class (0-11, C=0, C#=1, D=2, etc.)
  const pitchClass = midiPitch % 12;

  // Map pitch classes to lanes
  // Lane 0 (C): C, C#, D
  // Lane 1 (E): D#, E, F
  // Lane 2 (G): F#, G, G#
  // Lane 3 (B): A, A#, B
  if (pitchClass >= 0 && pitchClass <= 2) return 0;   // C, C#, D
  if (pitchClass >= 3 && pitchClass <= 5) return 1;   // D#, E, F
  if (pitchClass >= 6 && pitchClass <= 8) return 2;   // F#, G, G#
  return 3;  // A, A#, B
}

/**
 * Extract melody line from polyphonic MIDI
 * Prioritizes highest notes when multiple notes play simultaneously
 */
function extractMelody(allNotes, minSpacing = 400) {
  const melody = [];
  let lastTime = -minSpacing;
  let lastLane = -1;

  // Group notes by time windows (within 50ms = simultaneous)
  const timeGroups = [];
  let currentGroup = [];
  let currentGroupTime = -1;

  for (const note of allNotes) {
    if (currentGroupTime === -1 || Math.abs(note.time - currentGroupTime) < 50) {
      currentGroup.push(note);
      currentGroupTime = note.time;
    } else {
      if (currentGroup.length > 0) {
        timeGroups.push(currentGroup);
      }
      currentGroup = [note];
      currentGroupTime = note.time;
    }
  }
  if (currentGroup.length > 0) {
    timeGroups.push(currentGroup);
  }

  console.log(`📊 Found ${timeGroups.length} note groups (chords/single notes)`);

  // Extract one note per group (prefer highest pitch for melody)
  for (const group of timeGroups) {
    // Sort by pitch (highest first) and velocity (loudest first)
    group.sort((a, b) => {
      if (Math.abs(a.pitch - b.pitch) > 2) {
        return b.pitch - a.pitch; // Higher pitch preferred
      }
      return b.velocity - a.velocity; // Higher velocity preferred
    });

    const selectedNote = group[0];
    const noteTime = selectedNote.time;

    // Apply minimum spacing
    if (noteTime - lastTime >= minSpacing) {
      const lane = pitchToLane(selectedNote.pitch);

      // Avoid same lane twice in a row if possible
      if (lane === lastLane && group.length > 1) {
        // Try next note in group
        const altNote = group[1];
        const altLane = pitchToLane(altNote.pitch);
        if (altLane !== lastLane) {
          melody.push({
            lane: altLane,
            time: Math.round(noteTime),
            noteFrequency: altNote.frequency
          });
          lastLane = altLane;
          lastTime = noteTime;
          continue;
        }
      }

      melody.push({
        lane: lane,
        time: Math.round(noteTime),
        noteFrequency: selectedNote.frequency
      });

      lastLane = lane;
      lastTime = noteTime;
    }
  }

  return melody;
}

async function generateBeatmap(midiPath, outputPath) {
  console.log(`📄 Reading MIDI: ${midiPath}`);

  // Read MIDI file
  const midiBuffer = fs.readFileSync(midiPath);
  const midi = new Midi(midiBuffer);

  console.log(`🎵 MIDI Info:
  - Name: ${midi.name}
  - Duration: ${midi.duration.toFixed(2)}s
  - Tracks: ${midi.tracks.length}
  - Total notes: ${midi.tracks.reduce((sum, t) => sum + t.notes.length, 0)}`);

  // Extract all notes from all tracks
  const allNotes = [];
  midi.tracks.forEach((track, trackIndex) => {
    console.log(`  Track ${trackIndex}: ${track.name || 'Unnamed'} (${track.notes.length} notes)`);
    track.notes.forEach(note => {
      allNotes.push({
        time: note.time * 1000, // Convert to milliseconds
        pitch: note.midi,
        frequency: note.frequency,
        duration: note.duration * 1000,
        velocity: note.velocity,
        name: note.name
      });
    });
  });

  // Sort by time
  allNotes.sort((a, b) => a.time - b.time);

  console.log(`\n📊 Total notes extracted: ${allNotes.length}`);

  // Analyze pitch range
  const pitches = allNotes.map(n => n.pitch);
  const minPitch = Math.min(...pitches);
  const maxPitch = Math.max(...pitches);
  console.log(`🎹 Pitch range: ${minPitch} to ${maxPitch} (${maxPitch - minPitch} semitones)`);

  // Extract melody with proper lane mapping
  const gameNotes = extractMelody(allNotes, 400);

  // Analyze lane distribution
  const laneCount = [0, 0, 0, 0];
  gameNotes.forEach(note => laneCount[note.lane]++);
  console.log(`\n🎮 Lane distribution:
  Lane 0 (C4): ${laneCount[0]} notes
  Lane 1 (E4): ${laneCount[1]} notes
  Lane 2 (G4): ${laneCount[2]} notes
  Lane 3 (B4): ${laneCount[3]} notes
  Total: ${gameNotes.length} notes`);

  // Get song info from filename
  const basename = path.basename(midiPath, path.extname(midiPath));
  const songId = basename.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Create beatmap
  const beatmap = {
    id: songId,
    name: midi.name || basename.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    artist: "Unknown Artist", // Update this manually
    bpm: Math.round(midi.header.tempos[0]?.bpm || 120),
    duration: Math.ceil(midi.duration * 1000),
    audioFile: `/sounds/${songId}.mp3`,
    notes: gameNotes
  };

  // Save to file
  fs.writeFileSync(outputPath, JSON.stringify(beatmap, null, 2));

  console.log(`\n✅ Beatmap created: ${outputPath}`);
  console.log(`📊 Stats:
  - ID: ${beatmap.id}
  - Duration: ${(beatmap.duration / 1000).toFixed(2)}s
  - BPM: ${beatmap.bpm}
  - Notes: ${beatmap.notes.length}
  - Audio: ${beatmap.audioFile}`);

  console.log(`\n📝 Next steps:
  1. Update artist name in the JSON if needed
  2. Reload the game
  3. Play with properly mapped notes!`);
}

// Get command line args
const midiPath = process.argv[2] || 'midi-files/a-sky-full-of-stars.mid';
const outputPath = process.argv[3] || 'apps/web/src/game/songs/a-sky-full-of-stars.json';

generateBeatmap(midiPath, outputPath);
