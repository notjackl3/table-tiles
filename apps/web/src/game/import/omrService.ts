/**
 * OMR (Optical Music Recognition) Service
 * Converts sheet music images to MIDI-compatible note data
 *
 * This module provides integration with various OMR services:
 * 1. Audiveris API (recommended - open source)
 * 2. Custom OMR API endpoint (if you deploy your own)
 */

import type { ParsedNote } from './midiParser';

export interface OMRConfig {
  /** API endpoint for OMR service */
  apiEndpoint: string;
  /** Optional API key */
  apiKey?: string;
  /** Service type */
  serviceType: 'audiveris' | 'custom';
}

export interface OMRResult {
  notes: ParsedNote[];
  bpm: number;
  timeSignature: [number, number];
  confidence: number;  // 0-1, how confident the OCR is
  warnings?: string[];
}

/**
 * Convert sheet music image to MIDI notes using OMR
 * @param imageFile - Sheet music image file (PNG, JPG, PDF)
 * @param config - OMR service configuration
 * @returns Parsed notes from the sheet music
 */
export async function transcribeSheetMusic(
  imageFile: File,
  config: OMRConfig
): Promise<OMRResult> {
  console.log('[OMR] Transcribing sheet music:', imageFile.name);

  // Validate file type
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
  if (!validTypes.includes(imageFile.type)) {
    throw new Error(`Invalid file type: ${imageFile.type}. Supported: PNG, JPG, PDF`);
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (imageFile.size > maxSize) {
    throw new Error(`File too large: ${imageFile.size} bytes. Max: ${maxSize} bytes (10MB)`);
  }

  // Call OMR service based on type
  if (config.serviceType === 'audiveris') {
    return await transcribeWithAudiveris(imageFile, config);
  } else {
    return await transcribeWithCustomAPI(imageFile, config);
  }
}

/**
 * Transcribe using Audiveris API
 * Audiveris is an open-source OMR engine
 */
async function transcribeWithAudiveris(
  imageFile: File,
  config: OMRConfig
): Promise<OMRResult> {
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('output', 'musicxml');  // Request MusicXML output

  try {
    const response = await fetch(`${config.apiEndpoint}/transcribe`, {
      method: 'POST',
      headers: config.apiKey ? { 'X-API-Key': config.apiKey } : {},
      body: formData
    });

    if (!response.ok) {
      throw new Error(`OMR service error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    // Parse MusicXML to notes
    // Note: This is a simplified parser - in production you'd use a full MusicXML parser
    const notes = parseMusicXMLToNotes(result.musicxml);

    return {
      notes,
      bpm: result.tempo || 120,
      timeSignature: result.timeSignature || [4, 4],
      confidence: result.confidence || 0.8,
      warnings: result.warnings
    };
  } catch (error) {
    console.error('[OMR] Audiveris error:', error);
    throw new Error(`Failed to transcribe with Audiveris: ${error.message}`);
  }
}

/**
 * Transcribe using custom API endpoint
 */
async function transcribeWithCustomAPI(
  imageFile: File,
  config: OMRConfig
): Promise<OMRResult> {
  const formData = new FormData();
  formData.append('image', imageFile);

  try {
    const response = await fetch(config.apiEndpoint, {
      method: 'POST',
      headers: config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {},
      body: formData
    });

    if (!response.ok) {
      throw new Error(`OMR service error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    // Expect result to have notes array in standard format
    return {
      notes: result.notes || [],
      bpm: result.bpm || 120,
      timeSignature: result.timeSignature || [4, 4],
      confidence: result.confidence || 0.5,
      warnings: result.warnings
    };
  } catch (error) {
    console.error('[OMR] Custom API error:', error);
    throw new Error(`Failed to transcribe with custom API: ${error.message}`);
  }
}

/**
 * Parse MusicXML to notes
 * This is a simplified parser - in production use a library like musicxml-interfaces
 */
function parseMusicXMLToNotes(musicxml: string): ParsedNote[] {
  // This is a placeholder - implementing full MusicXML parsing is complex
  // In production, use a library like opensheetmusicdisplay or musicxml-interfaces

  console.warn('[OMR] MusicXML parsing is simplified. Consider using a full parser library.');

  // For now, return empty array - you'll need to implement or use a library
  return [];
}

/**
 * Check if OMR service is available
 */
export async function checkOMRServiceAvailability(config: OMRConfig): Promise<boolean> {
  try {
    const response = await fetch(`${config.apiEndpoint}/health`, {
      method: 'GET',
      headers: config.apiKey ? { 'X-API-Key': config.apiKey } : {}
    });
    return response.ok;
  } catch (error) {
    console.error('[OMR] Service unavailable:', error);
    return false;
  }
}

/**
 * Get default OMR configuration
 * Users should set up their own OMR service
 */
export function getDefaultOMRConfig(): OMRConfig {
  return {
    apiEndpoint: import.meta.env.VITE_OMR_API_ENDPOINT || 'http://localhost:8080/omr',
    apiKey: import.meta.env.VITE_OMR_API_KEY,
    serviceType: 'custom'
  };
}

/**
 * Instructions for setting up OMR service
 */
export const OMR_SETUP_INSTRUCTIONS = `
# Setting Up OMR (Optical Music Recognition)

To enable sheet music image import, you need to set up an OMR service.

## Option 1: Use Audiveris (Recommended)

Audiveris is an open-source OMR engine.

### Docker Setup (Easiest):
\`\`\`bash
docker pull audiveris/audiveris
docker run -p 8080:8080 audiveris/audiveris
\`\`\`

### Configure in .env:
\`\`\`
VITE_OMR_API_ENDPOINT=http://localhost:8080/omr
VITE_OMR_SERVICE_TYPE=audiveris
\`\`\`

## Option 2: Use Commercial API

Services like:
- Scorecloud API
- IMSLP OMR service

## Option 3: Build Your Own

You can build a custom OMR service using:
- TensorFlow.js with music notation models
- OpenCV for image processing
- Python libraries like music21 + opencv

For now, users can upload MIDI files directly as an alternative.
`;
