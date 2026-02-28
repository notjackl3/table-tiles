# 🎹 TableTiles

> Turn any desk into a rhythm game

TableTiles is a browser-based Piano Tiles-style rhythm game where falling tiles are hit by tapping your **physical table** with your fingers. Uses webcam + MediaPipe Hands for real-time hand tracking and computer vision-based tap detection.

![TableTiles Demo](docs/gameplay.png)

## Features

- 🎮 **Piano Tiles gameplay** on any flat surface
- 🤖 **Real-time hand tracking** using MediaPipe Hands
- 📐 **Table calibration system** with homography mapping
- 🎵 **Web Audio API** for zero-latency sound
- 🏆 **Leaderboard system** with score persistence
- 🎯 **Tap detection** using velocity-based algorithms
- 👁️ **Debug mode** showing all 21 hand landmarks

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| Hand Tracking | MediaPipe Hands |
| Audio | Web Audio API |
| Database | SQLite (better-sqlite3) |
| Computer Vision | Custom homography implementation |

## Project Structure

```
tabletiles/
├── apps/
│   └── web/                 # React frontend
│       ├── src/
│       │   ├── game/        # Game engine & canvas
│       │   ├── vision/      # Hand tracking & calibration
│       │   ├── api/         # API client
│       │   └── types/       # TypeScript types
│       └── vite.config.ts
├── services/
│   └── api/                 # Express backend
│       ├── src/
│       │   ├── routes/      # API routes
│       │   └── db/          # SQLite database
│       └── tsconfig.json
└── shared/
    └── types/               # Shared types
```

## Setup

### Prerequisites

- Node.js 18+ (or use `nvm` to install)
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Start both frontend and backend
npm run dev
```

This will start:
- Frontend dev server: http://localhost:3000
- Backend API server: http://localhost:3001

### Camera Permissions

When you first load the app, your browser will request camera access. This is required for hand tracking. Make sure to **allow** camera permissions.

## How to Play

### 1. Calibrate Your Table

On first launch, click **"Calibrate Table"**:

1. Click the **4 corners** of your table area in order:
   - Top-left → Top-right → Bottom-right → Bottom-left
2. The system will compute a homography matrix to map camera pixels to table coordinates
3. **Test mode**: Click anywhere on the table to verify the lane mapping
4. Click **"Save & Continue"** when satisfied

Calibration is saved to localStorage and persists between sessions.

### 2. Start Playing

1. Click **"Start Game"**
2. Tiles will fall in 4 lanes
3. **Tap the table** where a tile crosses the green hit line
4. Score increases based on timing:
   - **Perfect**: ±30px from hit line (100 points)
   - **Good**: ±60px from hit line (50 points)
   - **Miss**: everything else (0 points)
5. Build combos for multipliers!
6. You have **3 lives** - lose one for each missed tile

### 3. Debug Mode

During gameplay, click **"Show Debug"** to see:
- All 21 hand landmarks color-coded
- Bone connections between joints
- Fingertip labels
- Real-time hand detection

## Tap Detection Algorithm

The system uses a velocity-based state machine:

```
IDLE → MOVING_DOWN → TAPPED → LIFTING → IDLE
```

**Tap trigger conditions:**
1. Fingertip Y-velocity > threshold (moving downward)
2. Fingertip is within calibrated table bounds
3. Not in cooldown period (prevents double-taps)

**Smoothing:**
- Exponential Moving Average (EMA) filter for position
- Rolling window velocity tracker (last 5 frames)
- 150ms cooldown per finger

## API Endpoints

### `GET /health`
Health check

### `GET /leaderboard?limit=10&songId=default`
Get top scores

**Response:**
```json
{
  "songId": "default",
  "entries": [
    {
      "id": "uuid",
      "name": "Player",
      "score": 12345,
      "accuracy": 0.95,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### `POST /score`
Submit a score

**Body:**
```json
{
  "songId": "default",
  "name": "Player",
  "score": 12345,
  "accuracy": 0.95,
  "meta": { "device": "web" }
}
```

## Troubleshooting

### Camera not working
- Ensure camera permissions are granted in your browser
- Check that no other app is using the camera
- Try a different browser (Chrome/Edge recommended)

### Hands not detected
- Make sure you have good lighting
- Keep hands in frame with palms visible
- Avoid cluttered backgrounds
- Try adjusting camera angle

### Taps not registering
- Re-calibrate the table area
- Ensure you're tapping within the calibrated zone
- Try tapping more deliberately (faster downward motion)
- Check that table surface is flat and stable

### Audio not playing
- Click anywhere on the page to initialize audio context
- Check browser volume settings
- Ensure Web Audio API is supported (modern browsers)

### Performance issues
- Close other browser tabs
- Use a modern browser (Chrome/Edge recommended)
- Reduce video quality in camera settings
- Disable debug mode during gameplay

## Development

### Run frontend only
```bash
npm run dev:web
```

### Run backend only
```bash
npm run dev:api
```

### Build for production
```bash
npm run build
```

### Project Commands
```bash
npm run dev          # Start both frontend and backend
npm run build        # Build both projects
npm run build:web    # Build frontend only
npm run build:api    # Build backend only
```

## Architecture Notes

### Coordinate Spaces

1. **Video Pixels**: Raw MediaPipe landmark coordinates (normalized 0-1)
2. **Table UV**: Homography-transformed coordinates on table plane (0-1)
3. **Game Space**: Canvas pixel coordinates for rendering

### Performance

- Hand tracking runs at 30fps (capped for performance)
- Game rendering runs at 60fps
- Vision loop is decoupled from render loop
- No server round-trips in the critical path

### Audio System

All sounds are generated using Web Audio API:
- 4 lanes mapped to notes: C4, E4, G4, B4
- ADSR envelope for each note
- Different waveforms for hit quality (perfect/good/miss)
- Combo milestone sounds (ascending arpeggio)

## Future Enhancements

- [ ] Two-hand support + multi-lane chords
- [ ] Beatmap editor (record taps → export JSON)
- [ ] Auto table detection using OpenCV edge detection
- [ ] Replay mode (store taps + tile spawns)
- [ ] WebSocket live spectators scoreboard
- [ ] Multiple difficulty levels
- [ ] Custom beatmap import

## Credits

Built with:
- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Express](https://expressjs.com/)

## License

MIT

---

**Tagline:** "Turn any desk into a rhythm game." 🎹✨
