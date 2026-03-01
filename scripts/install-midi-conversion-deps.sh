#!/bin/bash

# Install dependencies for automatic MIDI conversion
# Run from project root: bash scripts/install-midi-conversion-deps.sh

echo "🎵 Installing MIDI Conversion Dependencies"
echo "=========================================="
echo ""

# Frontend dependencies
echo "📦 Installing frontend dependencies (Tone.js)..."
npm install --workspace=apps/web tone @tonejs/midi

if [ $? -eq 0 ]; then
  echo "✅ Frontend dependencies installed"
else
  echo "❌ Failed to install frontend dependencies"
  exit 1
fi

echo ""

# Backend dependencies
echo "📦 Installing backend dependencies (multer)..."
npm install --workspace=services/api multer
npm install --workspace=services/api --save-dev @types/multer

if [ $? -eq 0 ]; then
  echo "✅ Backend dependencies installed"
else
  echo "❌ Failed to install backend dependencies"
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ All dependencies installed successfully!"
echo ""
echo "📝 Next steps:"
echo "  1. Update songGenerator.ts (see AUTOMATIC_MIDI_CONVERSION_SETUP.md)"
echo "  2. Update MusicImporter.tsx (see AUTOMATIC_MIDI_CONVERSION_SETUP.md)"
echo "  3. Restart dev servers: npm run dev"
echo "  4. Test by uploading a MIDI file!"
echo ""
