import { createContext, useContext, useRef, useState, useEffect, ReactNode } from 'react';
import type { HandLandmarks } from '../types/shared';
import { VisionLoop } from '../vision/visionLoop';

interface GameSettings {
  selectedSongId: string | null;
  hypeLevel: 'low' | 'medium' | 'high';
  voiceEffectsEnabled: boolean;
  voiceAnnouncementsEnabled: boolean;
  screenShakeEnabled: boolean;
  visualEffectsEnabled: boolean;
}

interface GameContextType {
  // Camera and vision
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  overlayCanvasRef: React.RefObject<HTMLCanvasElement>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  visionLoopRef: React.MutableRefObject<VisionLoop | null>;
  cameraReady: boolean;
  hands: HandLandmarks[];

  // Game settings
  settings: GameSettings;
  updateSettings: (updates: Partial<GameSettings>) => void;

  // Callbacks
  onTapsCallback: React.MutableRefObject<((taps: any[]) => void) | null>;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within GameProvider');
  }
  return context;
}

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const visionLoopRef = useRef<VisionLoop | null>(null);
  const onTapsCallback = useRef<((taps: any[]) => void) | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [hands, setHands] = useState<HandLandmarks[]>([]);
  const [settings, setSettings] = useState<GameSettings>({
    selectedSongId: 'simple-melody',
    hypeLevel: 'medium',
    voiceEffectsEnabled: true,
    voiceAnnouncementsEnabled: true,
    screenShakeEnabled: true,
    visualEffectsEnabled: true,
  });

  const updateSettings = (updates: Partial<GameSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  // Initialize camera on mount
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initCamera() {
      try {
        console.log('[GameContext Camera Init] Requesting camera access...');

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        });

        streamRef.current = stream;
        console.log('[GameContext Camera Init] Stream obtained:', stream.id);

        const video = videoRef.current;
        if (!video) {
          console.error('[GameContext Camera Init] Video ref is null!');
          return;
        }

        video.srcObject = stream;

        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = async () => {
            console.log('[GameContext Camera Init] Metadata loaded:', video.videoWidth, 'x', video.videoHeight);
            try {
              await video.play();
              console.log('[GameContext Camera Init] Video playing');
              resolve();
            } catch (err) {
              console.error('[GameContext Camera Init] Play error:', err);
              reject(err);
            }
          };
        });

        // Wait for video dimensions
        console.log('[GameContext Camera Init] Waiting for video dimensions...');
        let attempts = 0;
        while ((video.videoWidth === 0 || video.videoHeight === 0) && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
          console.log(`[GameContext Camera Init] Attempt ${attempts}: ${video.videoWidth}x${video.videoHeight}`);
        }

        if (video.videoWidth === 0 || video.videoHeight === 0) {
          throw new Error('Video dimensions are still 0 after waiting');
        }

        console.log('[GameContext Camera Init] Camera ready!', video.videoWidth, 'x', video.videoHeight);
        setCameraReady(true);

        // Initialize vision loop
        console.log('[GameContext Vision Init] Starting vision loop...');
        const visionLoop = new VisionLoop(video, {
          onHands: (detectedHands) => {
            setHands(detectedHands);
          },
          onTaps: (taps) => {
            if (onTapsCallback.current) {
              onTapsCallback.current(taps);
            }
          }
        });

        await visionLoop.initialize();
        console.log('[GameContext Vision Init] Vision loop initialized');

        await visionLoop.start();
        console.log('[GameContext Vision Init] Vision loop started');

        visionLoopRef.current = visionLoop;

      } catch (error) {
        console.error('[GameContext Camera Init] Error:', error);
        alert('Failed to access camera. Please grant camera permissions and reload.');
      }
    }

    initCamera();

    return () => {
      console.log('[GameContext Cleanup] Stopping camera and vision loop...');
      if (visionLoopRef.current) {
        visionLoopRef.current.close();
        visionLoopRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('[GameContext Cleanup] Stopped track:', track.kind);
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      console.log('[GameContext Cleanup] Cleanup complete');
    };
  }, []);

  const value: GameContextType = {
    videoRef,
    canvasRef,
    overlayCanvasRef,
    streamRef,
    visionLoopRef,
    cameraReady,
    hands,
    settings,
    updateSettings,
    onTapsCallback,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
