import { useRef, useState, useEffect } from 'react';
import type { Point2D, TableCalibration } from '../../types/shared';
import { computeHomography, validateCorners, applyHomography } from './homography';
import { saveCalibration } from './storage';

interface CalibrationUIProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onComplete: (calibration: TableCalibration) => void;
  onCancel: () => void;
  stream?: MediaStream | null;
}

export function CalibrationUI({ videoRef, onComplete, onCancel, stream }: CalibrationUIProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [corners, setCorners] = useState<Point2D[]>([]);
  const [testMode, setTestMode] = useState(false);
  const [testPoint, setTestPoint] = useState<Point2D | null>(null);
  const [calibration, setCalibration] = useState<TableCalibration | null>(null);

  // Set up local video element with the stream
  useEffect(() => {
    const localVideo = localVideoRef.current;
    if (!localVideo || !stream) return;

    console.log('[CalibrationUI] Setting up local video with stream');
    localVideo.srcObject = stream;
    localVideo.play().catch(err => {
      console.error('[CalibrationUI] Failed to play video:', err);
    });
  }, [stream]);

  // Draw the calibration overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = localVideoRef.current || videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw corners
      corners.forEach((corner, index) => {
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '16px monospace';
        ctx.fillText(`${index + 1}`, corner.x + 15, corner.y + 5);
      });

      // Draw lines between corners
      if (corners.length > 1) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) {
          ctx.lineTo(corners[i].x, corners[i].y);
        }
        if (corners.length === 4) {
          ctx.lineTo(corners[0].x, corners[0].y);
        }
        ctx.stroke();
      }

      // Draw test point if in test mode
      if (testMode && testPoint && calibration) {
        const tableUV = applyHomography(calibration.homographyMatrix, testPoint);

        // Draw point on video
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.arc(testPoint.x, testPoint.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Draw UV coordinates
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px monospace';
        ctx.fillText(
          `UV: (${tableUV.x.toFixed(2)}, ${tableUV.y.toFixed(2)})`,
          testPoint.x + 15,
          testPoint.y - 10
        );

        // Determine lane (assuming 4 lanes)
        const lane = Math.floor(tableUV.x * 4);
        ctx.fillText(
          `Lane: ${Math.max(0, Math.min(3, lane))}`,
          testPoint.x + 15,
          testPoint.y + 10
        );
      }

      requestAnimationFrame(draw);
    };

    draw();
  }, [corners, testMode, testPoint, calibration, videoRef, localVideoRef]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (testMode) {
      setTestPoint({ x, y });
    } else if (corners.length < 4) {
      setCorners([...corners, { x, y }]);
    }
  };

  const handleReset = () => {
    setCorners([]);
    setTestMode(false);
    setTestPoint(null);
    setCalibration(null);
  };

  const handleCompute = () => {
    if (corners.length !== 4) return;

    const validation = validateCorners(corners);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const H = computeHomography(
      corners as [Point2D, Point2D, Point2D, Point2D]
    );

    const newCalibration: TableCalibration = {
      corners: corners as [Point2D, Point2D, Point2D, Point2D],
      homographyMatrix: H,
      timestamp: Date.now()
    };

    setCalibration(newCalibration);
    setTestMode(true);
  };

  const handleSave = () => {
    if (!calibration) return;
    saveCalibration(calibration);
    onComplete(calibration);
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
          onClick={handleCanvasClick}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            cursor: 'crosshair',
            transform: 'scaleX(-1)',
            pointerEvents: 'auto'
          }}
        />
      </div>

      <div style={{
        padding: '20px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '8px',
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        <h2 style={{ margin: '0 0 10px 0' }}>Table Calibration</h2>

        {/* Debug info */}
        {localVideoRef.current && (
          <div style={{
            fontSize: '11px',
            opacity: 0.6,
            marginBottom: '10px',
            fontFamily: 'monospace'
          }}>
            Video: {localVideoRef.current.videoWidth}x{localVideoRef.current.videoHeight} |
            Ready: {localVideoRef.current.readyState} |
            Paused: {localVideoRef.current.paused ? 'Yes' : 'No'}
            {localVideoRef.current.videoWidth === 0 && (
              <div style={{ color: '#ff0000', marginTop: '5px' }}>
                Video dimensions are 0! Check console for errors.
              </div>
            )}
          </div>
        )}

        {!testMode ? (
          <>
            <p>Click the 4 corners of your table area in order:</p>
            <p>1. Top-left → 2. Top-right → 3. Bottom-right → 4. Bottom-left</p>
            <p style={{ color: '#00ff00' }}>Corners selected: {corners.length}/4</p>
          </>
        ) : (
          <>
            <p style={{ color: '#00ff00' }}>Calibration computed!</p>
            <p>Click anywhere on the table to test the mapping.</p>
          </>
        )}

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={handleReset}
            style={{
              padding: '10px 20px',
              background: '#333',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Reset
          </button>

          {corners.length === 4 && !testMode && (
            <button
              onClick={handleCompute}
              style={{
                padding: '10px 20px',
                background: '#00aa00',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Compute Calibration
            </button>
          )}

          {testMode && (
            <button
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                background: '#0066ff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Save & Continue
            </button>
          )}

          <button
            onClick={onCancel}
            style={{
                padding: '10px 20px',
              background: '#aa0000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
