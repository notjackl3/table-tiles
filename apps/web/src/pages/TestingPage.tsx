import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SensitivityTestUI } from '../vision/sensitivity/SensitivityTestUI';
import { VisionLoop } from '../vision/visionLoop';
import { Button } from '../components/Button';

export function TestingPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const visionLoopRef = useRef<VisionLoop | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [sensitivity, setSensitivity] = useState(0.3);

  // Initialize camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initCamera() {
      try {
        console.log('[TestingPage Camera Init] Requesting camera access...');

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        });

        streamRef.current = stream;
        console.log('[TestingPage Camera Init] Stream obtained:', stream.id);

        const video = videoRef.current;
        if (!video) {
          console.error('[TestingPage Camera Init] Video ref is null!');
          return;
        }

        video.srcObject = stream;

        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = async () => {
            console.log('[TestingPage Camera Init] Metadata loaded:', video.videoWidth, 'x', video.videoHeight);
            try {
              await video.play();
              console.log('[TestingPage Camera Init] Video playing');
              resolve();
            } catch (err) {
              console.error('[TestingPage Camera Init] Play error:', err);
              reject(err);
            }
          };
        });

        // Wait for video dimensions
        console.log('[TestingPage Camera Init] Waiting for video dimensions...');
        let attempts = 0;
        while ((video.videoWidth === 0 || video.videoHeight === 0) && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
          console.log(`[TestingPage Camera Init] Attempt ${attempts}: ${video.videoWidth}x${video.videoHeight}`);
        }

        if (video.videoWidth === 0 || video.videoHeight === 0) {
          throw new Error('Video dimensions are still 0 after waiting');
        }

        console.log('[TestingPage Camera Init] Camera ready!', video.videoWidth, 'x', video.videoHeight);
        setCameraReady(true);

        // Initialize vision loop
        console.log('[TestingPage Vision Init] Starting vision loop...');
        const visionLoop = new VisionLoop(video, {
          onHands: () => {},
          onTaps: () => {}
        });

        await visionLoop.initialize();
        console.log('[TestingPage Vision Init] Vision loop initialized');

        await visionLoop.start();
        console.log('[TestingPage Vision Init] Vision loop started');

        visionLoopRef.current = visionLoop;

        // Load saved sensitivity
        const savedSensitivity = localStorage.getItem('fingerBendSensitivity');
        if (savedSensitivity) {
          const sens = parseFloat(savedSensitivity);
          setSensitivity(sens);
          visionLoop.setSensitivity(sens);
        }

      } catch (error) {
        console.error('[TestingPage Camera Init] Error:', error);
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

  const handleSensitivityComplete = (sens: number) => {
    setSensitivity(sens);
    localStorage.setItem('fingerBendSensitivity', sens.toString());
    if (visionLoopRef.current) {
      visionLoopRef.current.setSensitivity(sens);
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'var(--bg-primary)',
      position: 'relative',
    }}>
      <Button
        className="button"
        onClick={() => navigate('/')}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        Back
      </Button>

      {cameraReady && (
        <SensitivityTestUI
          videoRef={videoRef}
          onComplete={handleSensitivityComplete}
          onCancel={() => navigate('/')}
          visionLoop={visionLoopRef.current}
        />
      )}

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

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />
    </div>
  );
}
