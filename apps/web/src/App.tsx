import { useState, useRef, useEffect } from 'react';
import type { GameScreen, TableCalibration, HandLandmarks, TapEvent, ResultsData } from './types/shared';
import { VisionLoop } from './vision/visionLoop';
import { GameLoop } from './game/engine/gameLoop';
import { GameCanvas } from './game/GameCanvas';
import { CalibrationUI } from './vision/calibration/CalibrationUI';
import { generateProceduralBeatmap } from './game/engine/beatmap';
import { getAudioEngine } from './game/audio/audioEngine';
import { loadCalibration, hasCalibration } from './vision/calibration/storage';
import { submitScore, getLeaderboard } from './api/client';
import type { LeaderboardEntry } from './types/shared';
import './styles.css';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('landing');
  const [cameraReady, setCameraReady] = useState(false);
  const [calibration, setCalibration] = useState<TableCalibration | null>(null);
  const [showCalibration, setShowCalibration] = useState(false);
  const [hands, setHands] = useState<HandLandmarks[]>([]);
  const [gameStats, setGameStats] = useState<any>(null);
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [showDebug, setShowDebug] = useState(true); // Changed to true by default
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentTaps, setRecentTaps] = useState<TapEvent[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const visionLoopRef = useRef<VisionLoop | null>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);
  const audioEngine = getAudioEngine();

  // Initialize camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initCamera() {
      try {
        console.log('[Camera Init] Requesting camera access...');

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        });

        streamRef.current = stream;

        console.log('[Camera Init] Stream obtained:', {
          active: stream.active,
          id: stream.id,
          tracks: stream.getTracks().map(t => ({
            kind: t.kind,
            label: t.label,
            enabled: t.enabled,
            readyState: t.readyState
          }))
        });

        const video = videoRef.current;
        if (!video) {
          console.error('[Camera Init] Video ref is null!');
          return;
        }

        console.log('[Camera Init] Setting srcObject on video element');
        // Set up video element
        video.srcObject = stream;

        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            console.log('[Camera Init] Video metadata loaded:', {
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              duration: video.duration,
              readyState: video.readyState
            });

            video.play()
              .then(() => {
                console.log('[Camera Init] Video playing successfully');
                resolve();
              })
              .catch((err) => {
                console.error('[Camera Init] Play error:', err);
                resolve(); // Still resolve to continue
              });
          };
        });

        console.log('[Camera Init] Waiting for video to stabilize...');
        // Wait a bit for video to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('[Camera Init] Camera ready! Final state:', {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          paused: video.paused,
          readyState: video.readyState
        });

        setCameraReady(true);

        // Initialize vision loop
        const visionLoop = new VisionLoop(video, {
          onHands: (hands) => setHands(hands),
          onTaps: (taps) => handleTaps(taps)
        });

        await visionLoop.initialize();
        visionLoopRef.current = visionLoop;

        // Load saved calibration
        const saved = loadCalibration();
        if (saved) {
          setCalibration(saved);
          visionLoop.setCalibration(saved);
        }
      } catch (error) {
        console.error('Camera error:', error);
        alert('Failed to access camera. Please grant camera permissions and reload the page.');
      }
    }

    initCamera();

    return () => {
      // Cleanup
      if (visionLoopRef.current) {
        visionLoopRef.current.close();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      streamRef.current = null;
    };
  }, []);

  // Initialize audio on user interaction
  useEffect(() => {
    const initAudio = async () => {
      await audioEngine.initialize();
      await audioEngine.resume();
    };

    document.addEventListener('click', initAudio, { once: true });
    return () => document.removeEventListener('click', initAudio);
  }, [audioEngine]);

  const handleTaps = (taps: TapEvent[]) => {
    // Store recent taps for visualization
    setRecentTaps((prev) => {
      const now = performance.now();
      const filtered = prev.filter((t) => now - t.timestamp < 1000);
      return [...filtered, ...taps];
    });

    if (gameLoopRef.current && screen === 'gameplay') {
      for (const tap of taps) {
        gameLoopRef.current.handleTap(tap);

        // Play audio feedback
        audioEngine.playHitSound(tap.lane, 'perfect');
      }
    }
  };

  const startGame = () => {
    if (!calibration) {
      alert('Please calibrate first!');
      setShowCalibration(true);
      return;
    }

    // Initialize audio
    audioEngine.initialize();
    audioEngine.resume();

    // Start vision loop
    if (visionLoopRef.current) {
      visionLoopRef.current.start();
    }

    // Create game loop
    const gameLoop = new GameLoop({
      canvasWidth: 800,
      canvasHeight: 600,
      numLanes: 4,
      onScoreUpdate: (stats) => {
        setGameStats(stats);

        // Play combo sound at milestones
        if (stats.combo > 0 && stats.combo % 10 === 0) {
          audioEngine.playComboSound(stats.combo);
        }
      },
      onGameOver: (stats) => {
        setResultsData({
          score: stats.score,
          accuracy: stats.accuracy,
          combo: stats.maxCombo,
          perfectHits: stats.perfectHits,
          goodHits: stats.goodHits,
          misses: stats.misses
        });
        audioEngine.playGameOverSound();
        setScreen('results');
      }
    });

    gameLoopRef.current = gameLoop;

    // Generate beatmap and start
    const beatmap = generateProceduralBeatmap(60000, 'medium');
    gameLoop.start(beatmap);

    setScreen('gameplay');
  };

  const handleCalibrationComplete = (cal: TableCalibration) => {
    setCalibration(cal);
    if (visionLoopRef.current) {
      visionLoopRef.current.setCalibration(cal);
    }
    setShowCalibration(false);
  };

  const handleSubmitScore = async (name: string) => {
    if (!resultsData) return;

    try {
      await submitScore({
        songId: 'default',
        name,
        score: resultsData.score,
        accuracy: resultsData.accuracy,
        meta: { device: 'web' }
      });

      // Refresh leaderboard
      const lb = await getLeaderboard('default', 10);
      setLeaderboard(lb.entries);
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const lb = await getLeaderboard('default', 10);
      setLeaderboard(lb.entries);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  };

  // Landing screen
  if (screen === 'landing') {
    return (
      <div className="screen">
        <div className="video-container">
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              filter: 'brightness(0.4)'
            }}
          />
        </div>

        <h1>TableTiles</h1>
        <p>Turn any desk into a rhythm game</p>

        {!cameraReady && (
          <div>
            <p className="loading">Initializing camera</p>
            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>
              Please allow camera access when prompted
            </p>
          </div>
        )}

        {cameraReady && (
          <div className="button-group">
            <button className="button button-primary" onClick={startGame}>
              Start Game
            </button>
            <button
              className="button button-secondary"
              onClick={() => setShowCalibration(true)}
            >
              {hasCalibration() ? 'Re-calibrate' : 'Calibrate Table'}
            </button>
            <button
              className="button button-secondary"
              onClick={loadLeaderboard}
            >
              Leaderboard
            </button>
          </div>
        )}

        {leaderboard.length > 0 && (
          <div className="leaderboard">
            <h2>Top Scores</h2>
            {leaderboard.map((entry, idx) => (
              <div key={entry.id} className="leaderboard-entry">
                <span className={`rank ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}`}>
                  #{idx + 1}
                </span>
                <span>{entry.name}</span>
                <span>{entry.score}</span>
              </div>
            ))}
          </div>
        )}

        {showCalibration && (
          <CalibrationUI
            videoRef={videoRef}
            stream={streamRef.current}
            onComplete={handleCalibrationComplete}
            onCancel={() => setShowCalibration(false)}
          />
        )}
      </div>
    );
  }

  // Gameplay screen
  if (screen === 'gameplay') {
    const tiles = gameLoopRef.current?.getTiles() || [];

    return (
      <div className="game-container">
        <div className="video-container">
          <video ref={videoRef} autoPlay playsInline muted />
        </div>

        <GameCanvas
          width={800}
          height={600}
          tiles={tiles}
          hands={hands}
          lives={gameStats?.lives || 3}
          score={gameStats?.score || 0}
          combo={gameStats?.combo || 0}
          accuracy={gameStats?.accuracy || 1}
          videoRef={videoRef}
          showDebug={showDebug}
          recentTaps={recentTaps}
        />

        <button
          className="button button-secondary"
          style={{ position: 'absolute', top: 20, right: 20 }}
          onClick={() => setShowDebug(!showDebug)}
        >
          {showDebug ? 'Hide Debug' : 'Show Debug'}
        </button>

        <button
          className="button button-danger"
          style={{ position: 'absolute', top: 20, right: 150 }}
          onClick={() => {
            gameLoopRef.current?.stop();
            setScreen('landing');
          }}
        >
          Quit
        </button>
      </div>
    );
  }

  // Results screen
  if (screen === 'results' && resultsData) {
    const [name, setName] = useState('Player');

    return (
      <div className="screen">
        <h1>Game Over!</h1>

        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">{resultsData.score}</div>
            <div className="stat-label">Score</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{(resultsData.accuracy * 100).toFixed(1)}%</div>
            <div className="stat-label">Accuracy</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{resultsData.combo}</div>
            <div className="stat-label">Max Combo</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{resultsData.perfectHits}</div>
            <div className="stat-label">Perfect Hits</div>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            style={{
              padding: '12px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              marginRight: '10px'
            }}
          />
          <button
            className="button button-primary"
            onClick={() => handleSubmitScore(name)}
          >
            Submit Score
          </button>
        </div>

        <div className="button-group">
          <button className="button button-primary" onClick={startGame}>
            Play Again
          </button>
          <button className="button button-secondary" onClick={() => setScreen('landing')}>
            Main Menu
          </button>
        </div>
      </div>
    );
  }

  return null;
}
