import { Outlet } from 'react-router-dom';
import { GameProvider, useGameContext } from './GameContext';
import { HAND_LANDMARKS } from '../vision/handTracker';
import { useEffect } from 'react';

function GameLayoutContent() {
  const { videoRef, overlayCanvasRef, hands, cameraReady } = useGameContext();

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

        // Draw connections - Only index and middle fingers
        const connections = [
          [0, 5], [5, 6], [6, 7], [7, 8],  // Index
          [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
          [5, 9]  // Palm connection
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

        // Draw landmarks - Only for index and middle fingers
        const allowedLandmarks = [0, 5, 6, 7, 8, 9, 10, 11, 12];

        landmarks.forEach((lm, index) => {
          // Skip landmarks that aren't index or middle finger
          if (!allowedLandmarks.includes(index)) return;

          const x = lm.x * canvas.width;
          const y = lm.y * canvas.height;

          const isTip = [8, 12].includes(index);  // Only index and middle tips

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
  }, [hands, overlayCanvasRef, videoRef]);

  return (
    <div className="game-page" style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Video feed - shared across all game routes */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}>
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
            pointerEvents: 'none',
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
            background: 'rgba(0, 0, 0, 0.7)',
            padding: '2rem',
            borderRadius: '8px',
            zIndex: 100,
          }}>
            Initializing camera...
          </div>
        )}
      </div>

      {/* Child routes render here - on top of video */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        <Outlet />
      </div>
    </div>
  );
}

export function GameLayout() {
  return (
    <GameProvider>
      <GameLayoutContent />
    </GameProvider>
  );
}
