import { useRef, useState, useEffect } from 'react';
import { type FingerBendState } from '../fingerBend/fingerBendDetector';
import { HAND_LANDMARKS } from '../handTracker';
import type { HandLandmarks } from '../../types/shared';
import type { VisionLoop } from '../visionLoop';
import { Button } from '../../components/Button';

interface SensitivityTestUIProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onComplete: (sensitivity: number) => void;
  onCancel: () => void;
  visionLoop: VisionLoop | null;
}

export function SensitivityTestUI({ videoRef, onComplete, onCancel, visionLoop }: SensitivityTestUIProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sensitivity, setSensitivity] = useState(0.3);
  const [fingerStates, setFingerStates] = useState<FingerBendState[]>([]);
  const [hands, setHands] = useState<HandLandmarks[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');

  console.log('[SensitivityTestUI] Component mounted', { visionLoop: !!visionLoop });

  // Wait for everything to be ready
  useEffect(() => {
    async function checkReady() {
      console.log('[SensitivityTestUI] Checking if ready...');

      const video = videoRef.current;
      if (!video) {
        console.log('[SensitivityTestUI] Video ref not available yet');
        setLoadingMessage('Waiting for video element...');
        return;
      }

      if (!visionLoop) {
        console.log('[SensitivityTestUI] Vision loop not available yet');
        setLoadingMessage('Waiting for vision system...');
        return;
      }

      // Wait for video to have dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log('[SensitivityTestUI] Video dimensions not ready:', video.videoWidth, 'x', video.videoHeight);
        setLoadingMessage('Waiting for camera to initialize...');
        return;
      }

      // Add a small delay to ensure everything is stable
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('[SensitivityTestUI] Everything ready!', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        visionLoop: !!visionLoop
      });

      setIsReady(true);
      setLoadingMessage('');
    }

    const interval = setInterval(checkReady, 500);
    checkReady();

    return () => clearInterval(interval);
  }, [videoRef, visionLoop]);

  // Get initial sensitivity from visionLoop
  useEffect(() => {
    if (visionLoop && isReady) {
      const currentSensitivity = visionLoop.getSensitivity();
      console.log('[SensitivityTestUI] Initial sensitivity:', currentSensitivity);
      setSensitivity(currentSensitivity);
    }
  }, [visionLoop, isReady]);

  // Update states from visionLoop
  useEffect(() => {
    if (!visionLoop || !isReady) return;

    console.log('[SensitivityTestUI] Starting state update interval');

    const interval = setInterval(() => {
      const currentHands = visionLoop.getCurrentHands();
      const states = visionLoop.getFingerStates();

      if (currentHands.length > 0) {
        console.log('[SensitivityTestUI] Hands detected:', currentHands.length, 'Finger states:', states.length);
      }

      setHands(currentHands);
      setFingerStates(states);
    }, 50);

    return () => {
      console.log('[SensitivityTestUI] Cleaning up state update interval');
      clearInterval(interval);
    };
  }, [visionLoop, isReady]);

  // Update sensitivity when slider changes
  useEffect(() => {
    if (visionLoop && isReady) {
      console.log('[SensitivityTestUI] Updating sensitivity to:', sensitivity);
      visionLoop.setSensitivity(sensitivity);
    }
  }, [sensitivity, visionLoop, isReady]);

  // Draw the visualization
  useEffect(() => {
    if (!isReady) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('[SensitivityTestUI] Starting visualization render loop');

    const draw = () => {
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        requestAnimationFrame(draw);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw hand skeletons
      hands.forEach((hand) => {
        const { landmarks, handedness } = hand;
        const handColor = handedness === 'Left' ? '#8b7355' : '#5a4d3a';

        // Define connections for index and middle fingers
        const fingerConnections = [
          [HAND_LANDMARKS.WRIST, HAND_LANDMARKS.INDEX_FINGER_MCP],
          [HAND_LANDMARKS.INDEX_FINGER_MCP, HAND_LANDMARKS.INDEX_FINGER_PIP],
          [HAND_LANDMARKS.INDEX_FINGER_PIP, HAND_LANDMARKS.INDEX_FINGER_DIP],
          [HAND_LANDMARKS.INDEX_FINGER_DIP, HAND_LANDMARKS.INDEX_FINGER_TIP],
          [HAND_LANDMARKS.WRIST, HAND_LANDMARKS.MIDDLE_FINGER_MCP],
          [HAND_LANDMARKS.MIDDLE_FINGER_MCP, HAND_LANDMARKS.MIDDLE_FINGER_PIP],
          [HAND_LANDMARKS.MIDDLE_FINGER_PIP, HAND_LANDMARKS.MIDDLE_FINGER_DIP],
          [HAND_LANDMARKS.MIDDLE_FINGER_DIP, HAND_LANDMARKS.MIDDLE_FINGER_TIP],
        ];

        // Draw finger bones
        ctx.strokeStyle = handColor;
        ctx.lineWidth = 4;

        fingerConnections.forEach(([start, end]) => {
          const startLM = landmarks[start];
          const endLM = landmarks[end];
          if (startLM && endLM) {
            ctx.beginPath();
            ctx.moveTo(startLM.x * canvas.width, startLM.y * canvas.height);
            ctx.lineTo(endLM.x * canvas.width, endLM.y * canvas.height);
            ctx.stroke();
          }
        });

        // Draw joints
        const trackedJoints = [
          HAND_LANDMARKS.WRIST,
          HAND_LANDMARKS.INDEX_FINGER_MCP,
          HAND_LANDMARKS.INDEX_FINGER_PIP,
          HAND_LANDMARKS.INDEX_FINGER_DIP,
          HAND_LANDMARKS.INDEX_FINGER_TIP,
          HAND_LANDMARKS.MIDDLE_FINGER_MCP,
          HAND_LANDMARKS.MIDDLE_FINGER_PIP,
          HAND_LANDMARKS.MIDDLE_FINGER_DIP,
          HAND_LANDMARKS.MIDDLE_FINGER_TIP,
        ];

        trackedJoints.forEach((jointIndex) => {
          const lm = landmarks[jointIndex];
          if (lm) {
            const x = lm.x * canvas.width;
            const y = lm.y * canvas.height;

            const isTip = jointIndex === HAND_LANDMARKS.INDEX_FINGER_TIP ||
                         jointIndex === HAND_LANDMARKS.MIDDLE_FINGER_TIP;
            const isActive = isTip && fingerStates.some((state) => {
              const matchesHand = state.hand === handedness;
              const matchesFinger =
                (jointIndex === HAND_LANDMARKS.INDEX_FINGER_TIP && state.finger === 'index') ||
                (jointIndex === HAND_LANDMARKS.MIDDLE_FINGER_TIP && state.finger === 'middle');
              return matchesHand && matchesFinger && state.isActive;
            });

            // Draw node
            if (isActive) {
              ctx.fillStyle = '#c3e6cb';
              ctx.beginPath();
              ctx.arc(x, y, 12, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#6fa87a';
              ctx.lineWidth = 3;
              ctx.stroke();
            } else if (isTip) {
              ctx.fillStyle = handColor;
              ctx.beginPath();
              ctx.arc(x, y, 10, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#f5f1e8';
              ctx.lineWidth = 2;
              ctx.stroke();
            } else if (jointIndex === HAND_LANDMARKS.WRIST) {
              ctx.fillStyle = handColor;
              ctx.beginPath();
              ctx.arc(x, y, 8, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#f5f1e8';
              ctx.lineWidth = 2;
              ctx.stroke();
            } else {
              ctx.fillStyle = handColor;
              ctx.beginPath();
              ctx.arc(x, y, 6, 0, Math.PI * 2);
              ctx.fill();
            }

            // Label finger tips
            if (isTip) {
              const fingerName = jointIndex === HAND_LANDMARKS.INDEX_FINGER_TIP ? 'Index' : 'Middle';
              const tileNum =
                (handedness === 'Left' && jointIndex === HAND_LANDMARKS.MIDDLE_FINGER_TIP) ? 0 :
                (handedness === 'Left' && jointIndex === HAND_LANDMARKS.INDEX_FINGER_TIP) ? 1 :
                (handedness === 'Right' && jointIndex === HAND_LANDMARKS.INDEX_FINGER_TIP) ? 2 :
                3;

              const state = fingerStates.find((s) => s.tile === tileNum);
              const bendPercent = state ? (state.bendAmount * 100).toFixed(0) : '0';

              const label = `${handedness[0]}${fingerName[0]} T${tileNum}`;
              const bendLabel = `${bendPercent}%`;

              ctx.fillStyle = 'rgba(245, 241, 232, 0.95)';
              ctx.fillRect(x + 15, y - 35, 100, 30);

              ctx.strokeStyle = '#d4c7b0';
              ctx.lineWidth = 2;
              ctx.strokeRect(x + 15, y - 35, 100, 30);

              ctx.fillStyle = isActive ? '#6fa87a' : '#2c2416';
              ctx.font = 'bold 12px monospace';
              ctx.textAlign = 'left';
              ctx.fillText(label, x + 20, y - 20);

              ctx.font = '11px monospace';
              ctx.fillText(bendLabel, x + 20, y - 8);
            }
          }
        });
      });

      // Draw tile indicators at the top
      const tileWidth = canvas.width / 4;
      const tileHeight = 80;

      fingerStates.forEach((state) => {
        const x = state.tile * tileWidth;

        // Background
        ctx.fillStyle = state.isActive ? 'rgba(195, 230, 203, 0.9)' : 'rgba(235, 228, 214, 0.9)';
        ctx.fillRect(x + 5, 5, tileWidth - 10, tileHeight);

        // Border
        ctx.strokeStyle = state.isActive ? '#6fa87a' : '#d4c7b0';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 5, 5, tileWidth - 10, tileHeight);

        // Labels
        ctx.fillStyle = '#2c2416';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';

        const label = `${state.hand[0]} ${state.finger === 'index' ? 'Index' : 'Middle'}`;
        ctx.fillText(label, x + tileWidth / 2, 30);

        ctx.font = '14px sans-serif';
        ctx.fillText(`Tile ${state.tile}`, x + tileWidth / 2, 50);

        // Bend amount
        const bendPercent = (state.bendAmount * 100).toFixed(0);
        ctx.fillStyle = state.isActive ? '#6fa87a' : '#5a4d3a';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`${bendPercent}%`, x + tileWidth / 2, 72);
      });

      requestAnimationFrame(draw);
    };

    draw();
  }, [fingerStates, hands, isReady]);

  const handleSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSensitivity(parseFloat(e.target.value));
  };

  const handleSave = () => {
    console.log('[SensitivityTestUI] Saving sensitivity:', sensitivity);
    onComplete(sensitivity);
  };

  if (!isReady) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>Loading Sensitivity Test</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>{loadingMessage}</p>
        <div style={{
          marginTop: '20px',
          width: '300px',
          height: '4px',
          background: 'var(--bg-accent)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: '50%',
            height: '100%',
            background: '#8b7355',
            animation: 'loading 1.5s infinite ease-in-out'
          }} />
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      gap: '20px',
      padding: '20px'
    }}>
      <div style={{
        position: 'relative',
        width: '80vw',
        maxWidth: '1280px',
        height: '60vh',
        maxHeight: '720px',
        border: '4px solid var(--border-color)',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'white',
        boxShadow: '0 8px 32px var(--shadow)'
      }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: 'scaleX(-1)',
            display: 'block'
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: 'scaleX(-1)',
            pointerEvents: 'none'
          }}
        />
      </div>

      <div style={{
        padding: '30px',
        background: 'var(--bg-secondary)',
        border: '3px solid var(--border-color)',
        borderRadius: '16px',
        textAlign: 'center',
        maxWidth: '700px',
        width: '100%',
        boxShadow: '0 4px 16px var(--shadow)'
      }}>
        <h2 style={{ margin: '0 0 15px 0', color: 'var(--text-primary)', fontSize: '2rem' }}>
          Finger Sensitivity Testing
        </h2>

        {/* Debug info */}
        <div style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          marginBottom: '15px',
          fontFamily: 'monospace',
          padding: '12px',
          background: 'white',
          border: '2px solid var(--border-color)',
          borderRadius: '8px'
        }}>
          Video: {videoRef.current?.videoWidth}x{videoRef.current?.videoHeight} |
          Tracking: {visionLoop ? 'Active' : 'Waiting...'} |
          Hands: {hands.length} detected
        </div>

        <p style={{ fontSize: '1.1rem', marginBottom: '10px', color: 'var(--text-primary)' }}>
          Bend your index and middle fingers on both hands to test detection.
        </p>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '25px' }}>
          Tile 0: Left Middle | Tile 1: Left Index | Tile 2: Right Index | Tile 3: Right Middle
        </p>

        {/* Sensitivity slider */}
        <div style={{ marginTop: '25px', marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '15px', fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            Sensitivity Threshold: {(sensitivity * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="0.8"
            step="0.05"
            value={sensitivity}
            onChange={handleSensitivityChange}
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              background: 'linear-gradient(to right, #c3e6cb, #8b7355)',
              outline: 'none',
              cursor: 'pointer',
              accentColor: '#8b7355'
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.95rem',
            color: 'var(--text-secondary)',
            marginTop: '8px',
            fontWeight: '500'
          }}>
            <span>More Sensitive</span>
            <span>Less Sensitive</span>
          </div>
        </div>

        <div style={{
          marginTop: '25px',
          fontSize: '0.95rem',
          color: 'var(--text-secondary)',
          textAlign: 'left',
          padding: '15px',
          background: 'white',
          border: '2px solid var(--border-color)',
          borderRadius: '8px'
        }}>
          <strong style={{ color: 'var(--text-primary)' }}>Instructions:</strong>
          <ul style={{ margin: '10px 0', paddingLeft: '25px' }}>
            <li>Bend each finger to see if it activates the tile</li>
            <li>Adjust the sensitivity slider until it feels responsive</li>
            <li>Lower values = more sensitive (activates with slight bend)</li>
            <li>Higher values = less sensitive (requires more bend)</li>
          </ul>
        </div>

        <div style={{ marginTop: '25px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <Button
            onClick={handleSave}
            className="button button-primary"
            style={{ fontSize: '1.1rem', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Save & Continue
          </Button>

          <Button
            onClick={onCancel}
            className="button"
            style={{ fontSize: '1.1rem', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
