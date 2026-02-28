# TableTiles - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start the App
```bash
npm run dev
```

This starts:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

### Step 3: Play!

1. **Allow camera access** when prompted by your browser
2. **Click "Calibrate Table"**:
   - Click the 4 corners of your table area (top-left → top-right → bottom-right → bottom-left)
   - Test the mapping by clicking around
   - Click "Save & Continue"
3. **Click "Start Game"**
4. **Tap your table** to hit the falling tiles!

## 🎮 Game Controls

- **Tap the table** where tiles cross the green line
- **Show/Hide Debug**: Toggle to see hand tracking landmarks
- **Quit**: Return to main menu

## 📊 Scoring

- **Perfect** (±30px): 100 points
- **Good** (±60px): 50 points
- **Miss**: 0 points + lose 1 life
- **Combo Multipliers**: Build combos for 1.5x-3x multipliers!

## 🔧 Troubleshooting

### Camera Issues
- Grant camera permissions in browser
- Use Chrome or Edge for best results
- Ensure good lighting

### Taps Not Registering
- Re-calibrate your table
- Tap more deliberately (faster downward motion)
- Ensure flat, stable surface

### Performance
- Close other tabs
- Disable debug mode during gameplay

## 📁 Project Structure

```
tabletiles/
├── apps/web/          # React frontend
├── services/api/      # Express backend
└── shared/types/      # Shared TypeScript types
```

## 🛠️ Development Commands

```bash
npm run dev          # Start both frontend + backend
npm run dev:web      # Frontend only
npm run dev:api      # Backend only
npm run build        # Build for production
```

## 🎯 Features

✅ Real-time hand tracking (MediaPipe Hands)
✅ Table calibration with homography mapping
✅ Velocity-based tap detection
✅ Web Audio API sounds
✅ SQLite leaderboard
✅ Debug mode with 21 hand landmarks

## 📖 Full Documentation

See [README.md](./README.md) for complete documentation.

---

**Have fun!** 🎹✨
