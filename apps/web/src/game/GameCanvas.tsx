import { useRef, useEffect, useState } from 'react';
import type { Tile, HandLandmarks, TapEvent } from '../types/shared';
import { HAND_LANDMARKS, FINGERTIP_INDICES } from '../vision/handTracker';

interface TapFlash {
  x: number;
  y: number;
  timestamp: number;
}

interface GameCanvasProps {
  width: number;
  height: number;
  tiles: Tile[];
  hands: HandLandmarks[];
  lives: number;
  score: number;
  combo: number;
  accuracy: number;
  videoRef: React.RefObject<HTMLVideoElement>;
  numLanes?: number;
  showDebug?: boolean;
  recentTaps?: TapEvent[];
}

export function GameCanvas({
  width,
  height,
  tiles,
  hands,
  lives,
  score,
  combo,
  accuracy,
  videoRef,
  numLanes = 4,
  showDebug = false,
  recentTaps = []
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [tapFlashes, setTapFlashes] = useState<TapFlash[]>([]);

  const hitLineY = height - 150;
  const laneWidth = width / numLanes;

  // Update tap flashes from actual detected taps
  useEffect(() => {
    if (recentTaps.length > 0) {
      const now = performance.now();
      setTapFlashes((prev) => {
        // Filter out old flashes
        const filtered = prev.filter((f) => now - f.timestamp < 500);

        // Add new flashes for recent taps (convert normalized coords to display coords)
        const newFlashes = recentTaps
          .filter((tap) => now - tap.timestamp < 100) // Only very recent taps
          .map((tap) => ({
            x: tap.x,
            y: tap.y,
            timestamp: tap.timestamp,
          }));

        return [...filtered, ...newFlashes];
      });
    }
  }, [recentTaps]);

  // Render game (tiles, lanes, HUD)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Clear
      ctx.clearRect(0, 0, width, height);

      // Draw lane dividers
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      for (let i = 1; i < numLanes; i++) {
        const x = i * laneWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw hit line
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, hitLineY);
      ctx.lineTo(width, hitLineY);
      ctx.stroke();

      // Draw hit zone indicator
      ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
      ctx.fillRect(0, hitLineY - 60, width, 120);

      // Draw tiles
      for (const tile of tiles) {
        const x = tile.lane * laneWidth;
        const tileWidth = laneWidth - 10;
        const tileHeight = 120;

        if (tile.state === 'falling') {
          // Normal falling tile
          const gradient = ctx.createLinearGradient(x, tile.y, x, tile.y + tileHeight);
          gradient.addColorStop(0, '#1a1a2e');
          gradient.addColorStop(1, '#16213e');

          ctx.fillStyle = gradient;
          ctx.fillRect(x + 5, tile.y, tileWidth, tileHeight);

          // Glow effect when near hit line
          const distToHitLine = Math.abs(tile.y + tileHeight / 2 - hitLineY);
          if (distToHitLine < 100) {
            const intensity = 1 - distToHitLine / 100;
            ctx.strokeStyle = `rgba(0, 170, 255, ${intensity})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 5, tile.y, tileWidth, tileHeight);
          }
        } else if (tile.state === 'hit') {
          // Flash white on hit
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(x + 5, tile.y, tileWidth, tileHeight);
        } else if (tile.state === 'missed') {
          // Flash red on miss
          ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
          ctx.fillRect(x + 5, tile.y, tileWidth, tileHeight);
        }
      }

      // Draw HUD
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}`, 20, 40);
      ctx.fillText(`Combo: ${combo}`, 20, 70);
      ctx.fillText(`Accuracy: ${(accuracy * 100).toFixed(1)}%`, 20, 100);

      // Lives
      ctx.fillStyle = lives > 0 ? '#ff0000' : '#555555';
      for (let i = 0; i < 3; i++) {
        const heartX = width - 40 - i * 35;
        const heartY = 30;
        if (i < lives) {
          ctx.fillText('❤️', heartX, heartY);
        } else {
          ctx.fillText('🖤', heartX, heartY);
        }
      }

      requestAnimationFrame(render);
    };

    render();
  }, [tiles, lives, score, combo, accuracy, width, height, numLanes, laneWidth, hitLineY]);

  // Render hand overlay
  useEffect(() => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Always show hand tracking (removed showDebug check)
      const shouldShowHands = true;

      if (shouldShowHands) {
        // Draw hand landmarks
        for (const hand of hands) {
          const { landmarks, handedness } = hand;

          // Draw connections (bones)
          const connections = [
            // Thumb
            [0, 1], [1, 2], [2, 3], [3, 4],
            // Index
            [0, 5], [5, 6], [6, 7], [7, 8],
            // Middle
            [0, 9], [9, 10], [10, 11], [11, 12],
            // Ring
            [0, 13], [13, 14], [14, 15], [15, 16],
            // Pinky
            [0, 17], [17, 18], [18, 19], [19, 20],
            // Palm
            [5, 9], [9, 13], [13, 17]
          ];

          // Hand-specific colors
          const handColor = handedness === 'Left' ? 'rgba(76, 255, 0, 0.7)' : 'rgba(0, 150, 255, 0.7)';

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

            // Different colors and sizes for different landmarks
            if (FINGERTIP_INDICES.includes(index)) {
              // Fingertips - larger and brighter
              ctx.fillStyle = handedness === 'Left' ? '#4cff00' : '#00aaff';
              ctx.beginPath();
              ctx.arc(x, y, 10, 0, Math.PI * 2);
              ctx.fill();

              // White border
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.stroke();

              // Label fingertip with name and coordinates
              if (showDebug) {
                const fingerNames = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
                const fingerName = fingerNames[FINGERTIP_INDICES.indexOf(index)];
                const label = `${handedness[0]}${fingerName[0]} (${Math.round(x)},${Math.round(y)})`;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fillRect(x + 15, y - 25, 120, 20);
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px monospace';
                ctx.fillText(label, x + 20, y - 10);
              }
            } else if (index === HAND_LANDMARKS.WRIST) {
              ctx.fillStyle = handColor;
              ctx.beginPath();
              ctx.arc(x, y, 12, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.stroke();
            } else if ([5, 9, 13, 17].includes(index)) {
              // Knuckles
              ctx.fillStyle = handColor;
              ctx.beginPath();
              ctx.arc(x, y, 7, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1;
              ctx.stroke();
            } else {
              // Other joints
              ctx.fillStyle = handColor;
              ctx.beginPath();
              ctx.arc(x, y, 5, 0, Math.PI * 2);
              ctx.fill();
            }
          });

          // Label handedness at wrist
          const wrist = landmarks[HAND_LANDMARKS.WRIST];
          if (wrist) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(wrist.x * canvas.width + 15, wrist.y * canvas.height - 10, 70, 25);
            ctx.fillStyle = handedness === 'Left' ? '#4cff00' : '#00aaff';
            ctx.font = 'bold 18px monospace';
            ctx.fillText(handedness, wrist.x * canvas.width + 20, wrist.y * canvas.height + 8);
          }
        }

        // Draw tap flash indicators
        const currentTime = performance.now();
        tapFlashes.forEach((flash) => {
          const elapsed = currentTime - flash.timestamp;
          if (elapsed > 500) return; // Don't draw old flashes

          const alpha = 1 - elapsed / 500;
          const radius = 20 + (elapsed / 500) * 40;

          // Expanding yellow circle
          ctx.strokeStyle = `rgba(255, 255, 0, ${alpha})`;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(flash.x * canvas.width, flash.y * canvas.height, radius, 0, Math.PI * 2);
          ctx.stroke();

          // Inner fill
          ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.3})`;
          ctx.fill();

          // "TAP!" text
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.font = 'bold 20px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('TAP!', flash.x * canvas.width, flash.y * canvas.height + 5);
        });
      }

      requestAnimationFrame(render);
    };

    render();
  }, [hands, videoRef, showDebug, tapFlashes]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />
      <canvas
        ref={overlayRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          transform: 'scaleX(-1)'
        }}
      />
      {showDebug && (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            background: 'rgba(0, 0, 0, 0.85)',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontFamily: 'monospace',
            maxWidth: '400px',
            pointerEvents: 'none',
            lineHeight: '1.6',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
            🎯 Hand Tracking Debug Info
          </div>
          <div>
            🟢 <strong style={{ color: '#4cff00' }}>Green</strong> = Left Hand | 🔵{' '}
            <strong style={{ color: '#00aaff' }}>Blue</strong> = Right Hand
          </div>
          <div>
            🔴 <strong style={{ color: '#ff4444' }}>Red Dots</strong> = Fingertips
          </div>
          <div>
            🟢 <strong style={{ color: '#00ff00' }}>Green Dots</strong> = Knuckles
          </div>
          <div>
            ⚡ <strong style={{ color: '#ffff00' }}>Yellow Flash</strong> = Tap Detected!
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#aaa' }}>
            Tap your table surface to play the game
          </div>
        </div>
      )}
    </>
  );
}
