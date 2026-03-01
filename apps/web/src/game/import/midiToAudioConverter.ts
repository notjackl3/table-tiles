/**
 * MIDI to Audio Converter
 * Converts MIDI files to audio using Web Audio API and Tone.js
 * This allows automatic background music generation when importing MIDI files
 */

import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';

export interface ConversionProgress {
  status: 'loading' | 'synthesizing' | 'encoding' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

export interface ConversionResult {
  audioBlob: Blob;
  duration: number;
  format: 'wav' | 'mp3';
}

/**
 * Convert MIDI file to audio
 * @param midiFile - MIDI file to convert
 * @param onProgress - Progress callback
 * @returns Audio blob and metadata
 */
export async function convertMIDIToAudio(
  midiFile: File,
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult> {

  const updateProgress = (status: ConversionProgress['status'], progress: number, message: string) => {
    if (onProgress) {
      onProgress({ status, progress, message });
    }
  };

  try {
    updateProgress('loading', 10, 'Loading MIDI file...');

    // Read MIDI file
    const arrayBuffer = await midiFile.arrayBuffer();
    const midi = new Midi(arrayBuffer);

    console.log('[MIDI Converter] Loaded MIDI:', {
      name: midi.name,
      duration: midi.duration,
      tracks: midi.tracks.length,
      totalNotes: midi.tracks.reduce((sum, t) => sum + t.notes.length, 0)
    });

    updateProgress('synthesizing', 30, 'Synthesizing audio...');

    // Start Tone.js context
    await Tone.start();

    // Create offline context for rendering
    const duration = Math.ceil(midi.duration) + 1; // Add 1 second padding
    const sampleRate = 44100;

    updateProgress('synthesizing', 40, `Rendering ${duration.toFixed(1)}s of audio...`);

    // Use Tone.Offline to render audio
    const audioBuffer = await Tone.Offline(async ({ transport }) => {
      // Create a polyphonic synth for rendering
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: 'sine'
        },
        envelope: {
          attack: 0.005,
          decay: 0.1,
          sustain: 0.3,
          release: 0.3
        }
      }).toDestination();

      // Schedule all notes from all tracks
      let noteCount = 0;
      midi.tracks.forEach(track => {
        track.notes.forEach(note => {
          synth.triggerAttackRelease(
            note.name,
            note.duration,
            note.time,
            note.velocity
          );
          noteCount++;
        });
      });

      console.log(`[MIDI Converter] Scheduled ${noteCount} notes`);

      // Start transport to play the notes
      transport.start();

      updateProgress('synthesizing', 70, 'Rendering complete...');
    }, duration);

    updateProgress('encoding', 80, 'Encoding audio file...');

    // Convert AudioBuffer to WAV Blob
    const wavBlob = await audioBufferToWav(audioBuffer);

    updateProgress('complete', 100, 'Conversion complete!');

    return {
      audioBlob: wavBlob,
      duration: duration * 1000, // Convert to ms
      format: 'wav'
    };

  } catch (error) {
    console.error('[MIDI Converter] Conversion failed:', error);
    updateProgress('error', 0, `Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Convert AudioBuffer to WAV Blob
 * @param audioBuffer - Web Audio API AudioBuffer
 * @returns WAV file as Blob
 */
async function audioBufferToWav(audioBuffer: AudioBuffer): Promise<Blob> {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;

  const data = new Int16Array(audioBuffer.length * numberOfChannels);

  // Interleave channels
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = audioBuffer.getChannelData(channel)[i];
      // Convert float (-1 to 1) to 16-bit PCM
      const pcm = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
      data[i * numberOfChannels + channel] = pcm;
    }
  }

  const buffer = new ArrayBuffer(44 + data.length * bytesPerSample);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + data.length * bytesPerSample, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, data.length * bytesPerSample, true);

  // Write PCM data
  const dataView = new Int16Array(buffer, 44);
  dataView.set(data);

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Upload audio file to server
 * @param audioFile - Audio file as Blob or File
 * @param filename - Filename (without extension)
 * @returns URL path to uploaded file
 */
export async function uploadAudioFile(
  audioFile: Blob | File,
  filename: string
): Promise<string> {
  const formData = new FormData();

  // If it's a File object with a name, use the original filename
  // Otherwise, use the provided filename
  const uploadFilename = audioFile instanceof File && audioFile.name
    ? audioFile.name
    : `${filename}.wav`;

  formData.append('audio', audioFile, uploadFilename);

  try {
    // Use relative URL in development to leverage Vite proxy
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/upload-audio`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.path; // e.g., "/sounds/song-name.wav"

  } catch (error) {
    console.error('[MIDI Converter] Audio upload failed:', error);
    throw error;
  }
}
