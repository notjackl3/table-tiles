/**
 * ElevenLabs Text-to-Speech API Integration
 * Converts text to speech using ElevenLabs API
 */

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'; // George - British male voice (warm, perfect for announcements)

// Debug: Log the API key status (only first few characters for security)
console.log('[ElevenLabs] API Key status:', ELEVENLABS_API_KEY ? `Loaded (${ELEVENLABS_API_KEY.substring(0, 6)}...)` : 'NOT FOUND');

export interface ElevenLabsOptions {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

export class ElevenLabsError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ElevenLabsError';
  }
}

/**
 * Convert text to speech using ElevenLabs API
 * Returns audio buffer ready for Web Audio API playback
 */
export async function textToSpeech(
  text: string,
  options: ElevenLabsOptions = {}
): Promise<AudioBuffer> {
  const voiceId = options.voiceId || DEFAULT_VOICE_ID;
  const modelId = options.modelId || 'eleven_multilingual_v2';

  if (!ELEVENLABS_API_KEY) {
    throw new ElevenLabsError('ElevenLabs API key not configured');
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarityBoost ?? 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ElevenLabsError(
        `ElevenLabs API error: ${response.statusText} - ${errorText}`,
        response.status
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    // Decode audio data for Web Audio API
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    return audioBuffer;
  } catch (error) {
    if (error instanceof ElevenLabsError) {
      throw error;
    }
    throw new ElevenLabsError(`Failed to generate speech: ${error}`);
  }
}

export interface AudioPlayback {
  promise: Promise<void>;
  stop: () => void;
}

/**
 * Play audio buffer using Web Audio API
 * Returns an object with a promise and stop function
 */
export function playAudioBuffer(
  audioBuffer: AudioBuffer,
  volume: number = 1.0
): AudioPlayback {
  let source: AudioBufferSourceNode | null = null;
  let audioContext: AudioContext | null = null;

  const promise = new Promise<void>((resolve, reject) => {
    try {
      audioContext = new AudioContext();
      source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();

      source.buffer = audioBuffer;
      gainNode.gain.value = Math.max(0, Math.min(1, volume));

      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      source.onended = () => {
        audioContext?.close();
        resolve();
      };

      source.start(0);
    } catch (error) {
      reject(new ElevenLabsError(`Failed to play audio: ${error}`));
    }
  });

  const stop = () => {
    if (source) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Already stopped
      }
    }
    if (audioContext) {
      audioContext.close();
    }
  };

  return { promise, stop };
}
