import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { HandLandmarks, TapEvent } from '../types/shared';
import { VisionLoop } from '../vision/visionLoop';
import { GameLoop } from '../game/engine/gameLoop';
import { generateProceduralBeatmap } from '../game/engine/beatmap';
import { getAudioEngine } from '../game/audio/audioEngine';
import { HAND_LANDMARKS } from '../vision/handTracker';
import { SettingsPanel } from '../game/SettingsPanel';

export function GamePage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const visionLoopRef = useRef<VisionLoop | null>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);
  const audioEngine = getAudioEngine();

  const [cameraReady, setCameraReady] = useState(false);
  const [hands, setHands] = useState<HandLandmarks[]>([]);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [recentTaps, setRecentTaps] = useState<TapEvent[]>([]);

  // White flash tiles for visual feedback
  interface FlashTile {
    lane: number;
    timestamp: number;
  }
  const [flashTiles, setFlashTiles] = useState<FlashTile[]>([]);

  // Green hit highlights
  interface HitHighlight {
    lane: number;
    timestamp: number;
  }
  const [hitHighlights, setHitHighlights] = useState<HitHighlight[]>([]);

  // Finger statistics for display
  const [fingerStats, setFingerStats] = useState([
    { name: 'L Middle', tile: 0, x: 0, y: 0, active: false },
    { name: 'L Index', tile: 1, x: 0, y: 0, active: false },
    { name: 'R Index', tile: 2, x: 0, y: 0, active: false },
    { name: 'R Middle', tile: 3, x: 0, y: 0, active: false },
  ]);

  // Initialize camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initCamera() {
      try {
        console.log('[GamePage Camera Init] Requesting camera access...');

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        });

        streamRef.current = stream;
        console.log('[GamePage Camera Init] Stream obtained:', stream.id);

        const video = videoRef.current;
        if (!video) {
          console.error('[GamePage Camera Init] Video ref is null!');
          return;
        }

        video.srcObject = stream;

        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = async () => {
            console.log('[GamePage Camera Init] Metadata loaded:', video.videoWidth, 'x', video.videoHeight);
            try {
              await video.play();
              console.log('[GamePage Camera Init] Video playing');
              resolve();
            } catch (err) {
              console.error('[GamePage Camera Init] Play error:', err);
              reject(err);
            }
          };
        });

        // Wait for video dimensions
        console.log('[GamePage Camera Init] Waiting for video dimensions...');
        let attempts = 0;
        while ((video.videoWidth === 0 || video.videoHeight === 0) && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
          console.log(`[GamePage Camera Init] Attempt ${attempts}: ${video.videoWidth}x${video.videoHeight}`);
        }

        if (video.videoWidth === 0 || video.videoHeight === 0) {
          throw new Error('Video dimensions are still 0 after waiting');
        }

        console.log('[GamePage Camera Init] Camera ready!', video.videoWidth, 'x', video.videoHeight);
        setCameraReady(true);

        // Initialize vision loop
        console.log('[GamePage Vision Init] Starting vision loop...');
        const visionLoop = new VisionLoop(video, {
          onHands: (detectedHands) => {
            setHands(detectedHands);
            updateFingerStats(detectedHands);
          },
          onTaps: (taps) => handleTaps(taps)
        });

        await visionLoop.initialize();
        console.log('[GamePage Vision Init] Vision loop initialized');

        await visionLoop.start();
        console.log('[GamePage Vision Init] Vision loop started');

        visionLoopRef.current = visionLoop;

      } catch (error) {
        console.error('[GamePage Camera Init] Error:', error);
        alert('Failed to access camera. Please grant camera permissions and reload.');
      }
    }

    initCamera();

    return () => {
      if (visionLoopRef.current) {
        visionLoopRef.current.close();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Update finger statistics
  const updateFingerStats = (detectedHands: HandLandmarks[]) => {
    const newStats = [...fingerStats];

    detectedHands.forEach((hand) => {
      const { landmarks, handedness } = hand;

      // Index finger
      const indexTip = landmarks[HAND_LANDMARKS.INDEX_FINGER_TIP];
      if (indexTip) {
        const tile = handedness === 'Left' ? 1 : 2;
        newStats[tile] = {
          ...newStats[tile],
          x: indexTip.x,
          y: indexTip.y,
        };
      }

      // Middle finger
      const middleTip = landmarks[HAND_LANDMARKS.MIDDLE_FINGER_TIP];
      if (middleTip) {
        const tile = handedness === 'Left' ? 0 : 3;
        newStats[tile] = {
          ...newStats[tile],
          x: middleTip.x,
          y: middleTip.y,
        };
      }
    });

    setFingerStats(newStats);
  };

  const handleTaps = (taps: TapEvent[]) => {
    console.log('[GamePage] Tap detected:', taps);
    console.log('[GamePage] Game state:', {
      hasGameLoop: !!gameLoopRef.current,
      gameStarted,
      isPlaying: gameLoopRef.current?.isPlaying()
    });

    setRecentTaps((prev) => {
      const now = performance.now();
      const filtered = prev.filter((t) => now - t.timestamp < 1000);
      return [...filtered, ...taps];
    });

    // Add white flash tiles for visual feedback
    const now = performance.now();
    setFlashTiles((prev) => {
      const filtered = prev.filter((f) => now - f.timestamp < 300); // Keep for 300ms
      const newFlashes = taps.map((tap) => ({
        lane: tap.lane,
        timestamp: tap.timestamp,
      }));
      return [...filtered, ...newFlashes];
    });

    // Update active state in finger stats
    setFingerStats((prev) =>
      prev.map((stat) => ({
        ...stat,
        active: taps.some((tap) => tap.lane === stat.tile && now - tap.timestamp < 200),
      }))
    );

    // Check if game loop exists AND is actually playing (not paused)
    if (gameLoopRef.current?.isPlaying()) {
      console.log('[GamePage] Forwarding', taps.length, 'taps to game loop');
      for (const tap of taps) {
        gameLoopRef.current.handleTap(tap);
        audioEngine.playHitSound(tap.lane, 'perfect');
      }
    } else {
      console.log('[GamePage] NOT forwarding taps - gameLoop exists:', !!gameLoopRef.current, 'isPlaying:', gameLoopRef.current?.isPlaying());
    }
  };

  const startGame = () => {
    console.log('[GamePage] Starting game...');

    // Initialize audio
    audioEngine.initialize();
    audioEngine.resume();

    // Create game loop
    const gameLoop = new GameLoop({
      canvasWidth: 800,
      canvasHeight: 600,
      numLanes: 4,
      latencyCompensationMs: 150, // Compensate for 150ms camera/processing delay
      onScoreUpdate: (stats) => {
        setScore(stats.score);
      },
      onGameOver: (stats) => {
        console.log('[GamePage] Game over:', stats);
        alert(`Game Over! Score: ${stats.score}`);
        setGameStarted(false);
      },
      onHit: (lane, quality) => {
        // Add green highlight for successful hit
        console.log('[GamePage] Successful hit!', lane, quality);
        setHitHighlights((prev) => {
          const now = performance.now();
          const filtered = prev.filter((h) => now - h.timestamp < 500);
          return [...filtered, { lane, timestamp: now }];
        });
      }
    });

    gameLoopRef.current = gameLoop;

    // Generate beatmap and start
    const beatmap = generateProceduralBeatmap(60000, 'medium');
    gameLoop.start(beatmap);

    setGameStarted(true);
    console.log('[GamePage] Game started');
  };

  // Render game canvas
  useEffect(() => {
    if (!gameStarted || !gameLoopRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      if (!gameLoopRef.current) return;

      const tiles = gameLoopRef.current.getTiles();
      const width = 800;
      const height = 600;
      const numLanes = 4;
      const laneWidth = width / numLanes;
      const hitLineY = height - 100; // Bottom hit line

      // Clear
      ctx.clearRect(0, 0, width, height);

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Draw lane dividers
      ctx.strokeStyle = '#d4c7b0';
      ctx.lineWidth = 2;
      for (let i = 1; i < numLanes; i++) {
        const x = i * laneWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw hit line at bottom
      ctx.strokeStyle = '#8b7355';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, hitLineY);
      ctx.lineTo(width, hitLineY);
      ctx.stroke();

      // Draw hit zone indicator
      ctx.fillStyle = 'rgba(139, 115, 85, 0.1)';
      ctx.fillRect(0, hitLineY - 60, width, 60);

      // Draw white flash tiles (ghost tiles from finger taps)
      const now = performance.now();
      flashTiles.forEach((flash) => {
        const age = now - flash.timestamp;
        if (age < 300) { // Show for 300ms
          const x = flash.lane * laneWidth;
          const tileWidth = laneWidth - 10;
          const tileHeight = 80;
          const opacity = 1 - (age / 300); // Fade out

          // White flash tile at hit line
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.9})`;
          ctx.fillRect(x + 5, hitLineY - tileHeight, tileWidth, tileHeight);

          // Border
          ctx.strokeStyle = `rgba(139, 115, 85, ${opacity})`;
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 5, hitLineY - tileHeight, tileWidth, tileHeight);
        }
      });

      // Draw green hit highlights (successful hits)
      hitHighlights.forEach((hit) => {
        const age = now - hit.timestamp;
        if (age < 400) { // Show for 400ms
          const x = hit.lane * laneWidth;
          const tileWidth = laneWidth - 10;
          const tileHeight = 80;
          const opacity = 1 - (age / 400); // Fade out

          // Green flash overlay
          ctx.fillStyle = `rgba(111, 168, 122, ${opacity * 0.6})`;
          ctx.fillRect(x + 5, hitLineY - tileHeight, tileWidth, tileHeight);

          // Bright green border
          ctx.strokeStyle = `rgba(111, 168, 122, ${opacity})`;
          ctx.lineWidth = 6;
          ctx.strokeRect(x + 5, hitLineY - tileHeight, tileWidth, tileHeight);

          // Inner glow
          ctx.strokeStyle = `rgba(195, 230, 203, ${opacity * 0.8})`;
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 8, hitLineY - tileHeight + 3, tileWidth - 6, tileHeight - 6);
        }
      });

      // Draw tiles (black)
      for (const tile of tiles) {
        const x = tile.lane * laneWidth;
        const tileWidth = laneWidth - 10;
        const tileHeight = 80;

        if (tile.state === 'falling') {
          ctx.fillStyle = '#000000';
          ctx.fillRect(x + 5, tile.y, tileWidth, tileHeight);

          // Highlight when near hit line
          const distToHitLine = Math.abs(tile.y + tileHeight - hitLineY);
          if (distToHitLine < 80) {
            ctx.strokeStyle = '#8b7355';
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 5, tile.y, tileWidth, tileHeight);

            // Check if it matches with a flash tile (successful hit feedback)
            const hasFlash = flashTiles.some((f) => f.lane === tile.lane && now - f.timestamp < 150);
            if (hasFlash) {
              // Add green glow for successful hit
              ctx.strokeStyle = '#6fa87a';
              ctx.lineWidth = 5;
              ctx.strokeRect(x + 5, tile.y, tileWidth, tileHeight);
            }
          }
        } else if (tile.state === 'hit') {
          ctx.fillStyle = 'rgba(139, 115, 85, 0.8)';
          ctx.fillRect(x + 5, tile.y, tileWidth, tileHeight);
        }
      }

      requestAnimationFrame(render);
    };

    render();
  }, [gameStarted, flashTiles, hitHighlights]);

  // Render hand overlay
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw hands
      for (const hand of hands) {
        const { landmarks, handedness } = hand;
        const handColor = handedness === 'Left' ? '#8b7355' : '#5a4d3a';

        // Draw connections
        const connections = [
          [0, 1], [1, 2], [2, 3], [3, 4],
          [0, 5], [5, 6], [6, 7], [7, 8],
          [0, 9], [9, 10], [10, 11], [11, 12],
          [0, 13], [13, 14], [14, 15], [15, 16],
          [0, 17], [17, 18], [18, 19], [19, 20],
          [5, 9], [9, 13], [13, 17]
        ];

        ctx.strokeStyle = handColor;
        ctx.lineWidth = 3;

        for (const [start, end] of connections) {
          const startLM = landmarks[start];
          const endLM = landmarks[end];
          if (startLM && endLM) {
            ctx.beginPath();
            ctx.moveTo(startLM.x * canvas.width, startLM.y * canvas.height);
            ctx.lineTo(endLM.x * canvas.width, endLM.y * canvas.height);
            ctx.stroke();
          }
        }

        // Draw landmarks
        landmarks.forEach((lm, index) => {
          const x = lm.x * canvas.width;
          const y = lm.y * canvas.height;

          const isTip = [4, 8, 12, 16, 20].includes(index);

          if (isTip) {
            ctx.fillStyle = handColor;
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#f5f1e8';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else if (index === 0) {
            ctx.fillStyle = handColor;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = handColor;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      requestAnimationFrame(render);
    };

    render();
  }, [hands]);

  return (
    <div className="game-page">
      {/* Header with score */}
      <div className="game-header">
        <div className="score-display">Score: {score}</div>
      </div>

      {/* Main game area with sidebar */}
      <div className="game-main" style={{ display: 'flex', padding: 0, gap: 0 }}>
        {/* Settings sidebar - only show before game starts */}
        {cameraReady && !gameStarted && (
          <div style={{
            width: '320px',
            height: '100%',
            flexShrink: 0,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <SettingsPanel visionLoop={visionLoopRef.current} />
            </div>
            <div style={{
              padding: '16px',
              background: '#ebe4d6',
              borderRight: '3px solid #d4c7b0',
              borderTop: '2px solid #d4c7b0',
            }}>
              <button
                className="button button-primary"
                onClick={startGame}
                style={{
                  width: '100%',
                  fontSize: '1.2rem',
                  padding: '12px',
                }}
              >
                Start Game
              </button>
            </div>
          </div>
        )}

        {/* Game canvas container */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div className="game-canvas-container">
          {/* Video feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
            }}
          />

          {/* Hand tracking overlay */}
          <canvas
            ref={overlayCanvasRef}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              transform: 'scaleX(-1)',
            }}
          />

          {/* Game canvas */}
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
            }}
          />

          {!cameraReady && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '1.5rem',
              color: 'var(--text-secondary)',
            }}>
              Initializing camera...
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Finger statistics (bottom-right) */}
      <div className="game-stats">
        <h3>Finger Tracking</h3>
        {fingerStats.map((stat) => (
          <div key={stat.tile} className={`finger-stat ${stat.active ? 'active' : ''}`}>
            <span className="finger-name">{stat.name}</span>
            <span className="finger-position">
              ({(stat.x * 100).toFixed(0)}%, {(stat.y * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>

      {/* Back button */}
      <button
        className="button"
        onClick={() => navigate('/')}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
        }}
      >
        ← Back
      </button>
    </div>
  );
}
