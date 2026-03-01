# Hands Tiles - Turn Your Hands Into a Rhythm Game 🎹

## Inspiration
// TODO

## What it does

Hands Tiles transforms your hands into controllers for an interactive rhythm game using just a webcam.

- **Physical Piano Tiles gameplay** - Tap any flat surface with your fingers to hit falling tiles in 4 lanes
- **Real-time hand tracking** - MediaPipe Hands tracks all 5 fingertips simultaneously
- **Smart tap detection** - Velocity-based algorithm detects when your fingers tap down
- **3D spatial audio** - Immersive sound positioned in 3D space per lane with reverb and echo
- **Music import** - Upload MIDI files, sheet music images (OCR), or MP3s with auto-beatmap generation
- **Voice announcer** - Dynamic combo celebrations with 3 hype levels ("5 STREAK!", "ON FIRE!")
- **Visual effects** - Screen shake, white flashes, animated waves, and text overlays on perfect hits
- **Interactive tutorial** - Voice-narrated walkthrough of all features

## How we built it

**Tech Stack:**
- React + TypeScript + Vite (frontend)
- Node.js + Express (backend API)
- MediaPipe Hands (21-point hand tracking)
- Web Audio API (3D spatial audio, reverb, compression)
- SQLite (score persistence)

**Key Technical Components:**
- **Homography calibration** - 4-corner system maps camera pixels to play area coordinates, handles any camera angle
- **Velocity-based tap detection** - State machine with EMA smoothing filters and 150ms cooldown
- **3D audio engine** - Panner nodes, convolver reverb (60/40 dry/wet), 150ms echo, dynamic compression
- **MIDI parser** - Extracts notes with 4 polyphony handling strategies (melody-line, highest-note, smart-lanes, round-robin)
- **Auto-normalization** - Analyzes audio peaks and boosts quiet files up to 5x
- **Decoupled loops** - 30fps vision tracking, 60fps game rendering for optimal performance

## Challenges we ran into

- **Tap detection accuracy** - Initial position-based approach was too noisy; switched to velocity-based state machine with smoothing
- **Audio sync** - Browser audio context requires user interaction; implemented delayed start with game loop coordination
- **MIDI polyphony** - Real songs have chords, needed intelligent melody extraction for 4-lane constraint
- **Camera perspective** - Different angles caused distorted mapping; solved with homography transformation
- **Performance** - MediaPipe is heavy; capped vision at 30fps and optimized render path

## Accomplishments that we're proud of

- **Zero hardware required** - Works with any webcam, play on any flat surface
- **Sub-50ms tap latency** - Feels responsive and immediate
- **Professional audio** - 3D spatial audio with reverb/echo rivals commercial games
- **Smart music import** - Handles complex MIDI files with multiple polyphony strategies
- **Polished UX** - Smooth animations, visual feedback, voice announcements
- **Robust CV** - Reliable hand detection across different lighting conditions
- **Accessible** - Voice-narrated tutorial makes onboarding easy

## What we learned

**Computer Vision:**
- Homography transformations for perspective correction
- Velocity-based gesture detection beats position-based approaches
- EMA filters are essential for real-time tracking smoothness

**Web Audio:**
- 3D spatial audio with panner nodes creates immersive experiences
- Audio graph architecture (dry/wet chains, compression) for professional sound
- Browser limitations and workarounds for audio context initialization

**Music Processing:**
- MIDI file structure, parsing, and time signature handling
- Polyphony extraction strategies and their trade-offs
- BPM detection algorithms

**Game Design:**
- Immediate feedback (visual + audio) is critical for rhythm games
- Progressive disclosure in tutorials improves user retention
- Difficulty balancing through note spacing and timing windows

## What's next for Hand Tiles

**Short Term:**
- Multiplayer mode with synchronized gameplay
- Custom themes and visual skins
- Mobile support with touch calibration
- Online leaderboards with global rankings

**Long Term:**
- Beatmap editor - Record your own patterns and export
- Auto surface detection using edge detection (no manual calibration)
- Replay system with spectator mode
- Two-hand support for complex chord patterns
- AI difficulty adjustment based on player skill
- WebSocket live spectator scoreboard
