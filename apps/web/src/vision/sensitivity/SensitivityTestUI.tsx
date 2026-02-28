import { useRef, useState, useEffect } from 'react';
import { FingerBendDetector, type FingerBendState } from '../fingerBend/fingerBendDetector';
import { HandTracker } from '../handTracker';
import type { HandLandmarks } from '../../types/shared';

interface SensitivityTestUIProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onComplete: (sensitivity: number) => void;
  onCancel: () => void;
  stream?: MediaStream | null;
}

export function SensitivityTestUI({ videoRef, onComplete, onCancel, stream }: SensitivityTestUIProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [sensitivity, setSensitivity] = useState(0.3);
  const [fingerStates, setFingerStates] = useState<FingerBendState[]>([]);
  const [handTracker] = useState(() => new HandTracker());
  const [bendDetector] = useState(() => new FingerBendDetector(0.3, 100));
  const [isRunning, setIsRunning] = useState(false);

  // Set up local video element with the stream
  useEffect(() => {
    const localVideo = localVideoRef.current;
    if (!localVideo || !stream) return;

    console.log('[SensitivityTestUI] Setting up local video with stream');
    localVideo.srcObject = stream;
    localVideo.play().catch(err => {
      console.error('[SensitivityTestUI] Failed to play video:', err);
    });
  }, [stream]);

  // Initialize hand tracking
  useEffect(() => {
    const localVideo = localVideoRef.current;
    if (!localVideo || !stream) return;

    let mounted = true;

    const initTracking = async () => {
      try {
        await handTracker.initialize(
          localVideo,
          (hands: HandLandmarks[]) => {
            if (!mounted) return;
            const timestamp = performance.now();
            bendDetector.detect(hands, timestamp);
            const states = bendDetector.getFingerStates();
            setFingerStates(states);
          },
          {
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
          }
        );

        await handTracker.start();
        setIsRunning(true);
      } catch (error) {
        console.error('[SensitivityTestUI] Failed to initialize hand tracking:', error);
      }
    };

    // Wait for video to be ready
    if (localVideo.readyState >= 2) {
      initTracking();
    } else {
      localVideo.addEventListener('loadeddata', initTracking, { once: true });
    }

    return () => {
      mounted = false;
      handTracker.close();
    };
  }, [stream, handTracker, bendDetector]);

  // Update sensitivity when slider changes
  useEffect(() => {
    bendDetector.setSensitivity(sensitivity);
  }, [sensitivity, bendDetector]);

  // Draw the visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = localVideoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        requestAnimationFrame(draw);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw tile indicators at the top
      const tileWidth = canvas.width / 4;
      const tileHeight = 80;

      fingerStates.forEach((state) => {
        const x = state.tile * tileWidth;

        // Background
        ctx.fillStyle = state.isActive ? 'rgba(0, 255, 0, 0.5)' : 'rgba(100, 100, 100, 0.3)';
        ctx.fillRect(x, 0, tileWidth - 2, tileHeight);

        // Border
        ctx.strokeStyle = state.isActive ? '#00ff00' : '#666666';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, 0, tileWidth - 2, tileHeight);

        // Labels
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';

        const label = `${state.hand[0]} ${state.finger === 'index' ? 'Index' : 'Middle'}`;
        ctx.fillText(label, x + tileWidth / 2, 25);

        ctx.font = '14px monospace';
        ctx.fillText(`Tile ${state.tile}`, x + tileWidth / 2, 45);

        // Bend amount
        const bendPercent = (state.bendAmount * 100).toFixed(0);
        ctx.fillStyle = state.isActive ? '#00ff00' : '#ffffff';
        ctx.fillText(`${bendPercent}%`, x + tileWidth / 2, 65);
      });

      requestAnimationFrame(draw);
    };

    draw();
  }, [fingerStates]);

  const handleSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSensitivity(parseFloat(e.target.value));
  };

  const handleSave = () => {
    onComplete(sensitivity);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.95)',
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
        border: '2px solid rgba(255,255,255,0.3)',
        borderRadius: '8px',
        overflow: 'hidden',
        background: '#000'
      }}>
        <video
          ref={localVideoRef}
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
        padding: '20px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '8px',
        textAlign: 'center',
        maxWidth: '600px',
        width: '100%'
      }}>
        <h2 style={{ margin: '0 0 10px 0' }}>Finger Sensitivity Testing</h2>

        {/* Debug info */}
        {localVideoRef.current && (
          <div style={{
            fontSize: '11px',
            opacity: 0.6,
            marginBottom: '10px',
            fontFamily: 'monospace'
          }}>
            Video: {localVideoRef.current.videoWidth}x{localVideoRef.current.videoHeight} |
            Tracking: {isRunning ? 'Active' : 'Initializing...'}
            {localVideoRef.current.videoWidth === 0 && (
              <div style={{ color: '#ff0000', marginTop: '5px' }}>
                ⚠️ Video dimensions are 0! Check console for errors.
              </div>
            )}
          </div>
        )}

        <p>Bend your index and middle fingers on both hands to test detection.</p>
        <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '20px' }}>
          Tile 0: Left Index | Tile 1: Left Middle | Tile 2: Right Index | Tile 3: Right Middle
        </p>

        {/* Sensitivity slider */}
        <div style={{ marginTop: '20px', marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '10px' }}>
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
              height: '6px',
              borderRadius: '3px',
              background: 'linear-gradient(to right, #00ff00, #ff0000)',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#aaa',
            marginTop: '5px'
          }}>
            <span>More Sensitive</span>
            <span>Less Sensitive</span>
          </div>
        </div>

        <div style={{
          marginTop: '20px',
          fontSize: '13px',
          color: '#aaa',
          textAlign: 'left',
          padding: '10px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '4px'
        }}>
          <strong>Instructions:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            <li>Bend each finger to see if it activates the tile</li>
            <li>Adjust the sensitivity slider until it feels responsive</li>
            <li>Lower values = more sensitive (activates with slight bend)</li>
            <li>Higher values = less sensitive (requires more bend)</li>
          </ul>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              background: '#0066ff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Save & Continue
          </button>

          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              background: '#aa0000',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}