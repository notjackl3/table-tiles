import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { HandLandmarks, TapEvent } from '../types/shared';
import { VisionLoop } from '../vision/visionLoop';
import { GameLoop } from '../game/engine/gameLoop';
import { getAudioEngine } from '../game/audio/audioEngine';
import type { HitQuality } from '../game/audio/audioEngine';
import { HAND_LANDMARKS } from '../vision/handTracker';
import { SettingsPanel } from '../game/SettingsPanel';
import { SongSelection } from '../game/SongSelection';
import { loadSong } from '../game/songs/songLoader';
import { saveHighScore, getHighScore } from '../game/highScores';
import { Button } from '../components/Button';
import type { Beatmap } from '../game/engine/beatmap';

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
  const [combo, setCombo] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [recentTaps, setRecentTaps] = useState<TapEvent[]>([]);
  const [selectedSongId, setSelectedSongId] = useState<string | null>('simple-melody');
  const [hypeLevel, setHypeLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [currentBeatmap, setCurrentBeatmap] = useState<Beatmap | null>(null);

  // Settings toggles
  const [voiceEffectsEnabled, setVoiceEffectsEnabled] = useState(true);
  const [voiceAnnouncementsEnabled, setVoiceAnnouncementsEnabled] = useState(true);
  const [screenShakeEnabled, setScreenShakeEnabled] = useState(true);
  const [visualEffectsEnabled, setVisualEffectsEnabled] = useState(true);

  // White flash tiles for visual feedback
  interface FlashTile {
    lane: number;
    timestamp: number;
  }
  const [flashTiles, setFlashTiles] = useState<FlashTile[]>([]);

  // Screen shake effect
  const [screenShake, setScreenShake] = useState(0);

  // White flash effect for perfect hits
  const [whiteFlash, setWhiteFlash] = useState(0);

  // Green hit highlights
  interface HitHighlight {
    lane: number;
    timestamp: number;
  }
  const [hitHighlights, setHitHighlights] = useState<HitHighlight[]>([]);

  // Audio wave effects
  interface AudioWave {
    lane: number;
    timestamp: number;
  }
  const [audioWaves, setAudioWaves] = useState<AudioWave[]>([]);

  // Text announcements
  interface TextAnnouncement {
    id: number;
    text: string;
    timestamp: number;
    size: 'small' | 'medium' | 'large' | 'huge';
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right';
  }
  const [textAnnouncements, setTextAnnouncements] = useState<TextAnnouncement[]>([]);

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
      console.log('[GamePage Cleanup] Stopping camera and vision loop...');
      if (visionLoopRef.current) {
        visionLoopRef.current.close();
        visionLoopRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('[GamePage Cleanup] Stopped track:', track.kind);
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      console.log('[GamePage Cleanup] Cleanup complete');
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
        // Note: Audio will be played in onHit callback with proper note frequency
      }
    } else {
      console.log('[GamePage] NOT forwarding taps - gameLoop exists:', !!gameLoopRef.current, 'isPlaying:', gameLoopRef.current?.isPlaying());
    }
  };

  const addTextAnnouncement = (text: string, size: 'small' | 'medium' | 'large' | 'huge') => {
    // Randomly select position outside the play area
    const positions: Array<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right'> =
      ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom', 'left', 'right'];
    const randomPosition = positions[Math.floor(Math.random() * positions.length)];

    const announcement: TextAnnouncement = {
      id: Date.now() + Math.random(),
      text,
      timestamp: Date.now(),
      size,
      position: randomPosition
    };
    setTextAnnouncements(prev => [...prev, announcement]);

    // Remove announcement after animation (2 seconds)
    setTimeout(() => {
      setTextAnnouncements(prev => prev.filter(a => a.id !== announcement.id));
    }, 2000);
  };

  const handleBackButton = () => {
    // Stop game loop if running
    if (gameLoopRef.current) {
      gameLoopRef.current.stop();
      gameLoopRef.current = null;
    }

    // Stop audio engine and background track
    audioEngine.stopBackgroundTrack();

    // Reload page to reset camera and show game selection
    window.location.reload();
  };

  const startGame = () => {
    console.log('[GamePage] Starting game...');

    if (!selectedSongId) {
      alert('Please select a song first!');
      return;
    }

    // Reset game state
    setScore(0);
    setCombo(0);

    // Initialize audio with hype level
    audioEngine.initialize();
    audioEngine.resume();
    audioEngine.setHypeLevel(hypeLevel);

    // Play game start announcement (only if voice announcements enabled)
    if (voiceAnnouncementsEnabled) {
      setTimeout(() => {
        audioEngine.playGameStartSound();
        // Determine announcement size based on hype level
        const announcementSize = hypeLevel === 'high' ? 'huge' : hypeLevel === 'medium' ? 'large' : 'medium';
        addTextAnnouncement('LET\'S GO!', announcementSize);
      }, 100); // Small delay to ensure audio is initialized
    }

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

        // Stop background track
        audioEngine.stopBackgroundTrack();

        // Save high score
        if (selectedSongId) {
          const isNewHighScore = saveHighScore(selectedSongId, stats.score, stats.accuracy);

          if (isNewHighScore) {
            alert(`Game Over!\nNew High Score: ${stats.score.toLocaleString()}\nAccuracy: ${(stats.accuracy * 100).toFixed(1)}%`);
          } else {
            const currentHighScore = getHighScore(selectedSongId);
            alert(`Game Over!\nScore: ${stats.score.toLocaleString()}\nAccuracy: ${(stats.accuracy * 100).toFixed(1)}%\n\nHigh Score: ${currentHighScore?.score.toLocaleString() || 0}`);
          }
        } else {
          alert(`Game Over! Score: ${stats.score}`);
        }

        setGameStarted(false);
      },
      onHit: (lane, quality, noteFrequency, timestamp) => {
        // Add green highlight for successful hit
        console.log('[GamePage] Successful hit!', lane, quality, noteFrequency, timestamp);
        const now = performance.now();

        setHitHighlights((prev) => {
          const filtered = prev.filter((h) => now - h.timestamp < 500);
          return [...filtered, { lane, timestamp: now }];
        });

        // Add audio wave effect
        setAudioWaves((prev) => {
          const filtered = prev.filter((w) => now - w.timestamp < 1000); // Keep waves for 1 second
          return [...filtered, { lane, timestamp: now }];
        });

        // Play melodic sound LOUD (player's hit emphasis)
        // Background track plays continuously at low volume, player hits play on top
        // Skip note synthesis if in MP3-only mode (silentNotes flag)
        if (!currentBeatmap?.silentNotes) {
          audioEngine.playHitSound(lane, quality as HitQuality, noteFrequency);
        }

        // Play impact sound for successful hits (boom, bam) - only if voice effects enabled
        if (voiceEffectsEnabled) {
          audioEngine.playImpactSound(quality as HitQuality);
        }

        // Trigger screen shake and white flash for perfect hits
        if (quality === 'perfect') {
          if (screenShakeEnabled) {
            setScreenShake(Date.now());
          }
          if (visualEffectsEnabled) {
            setWhiteFlash(Date.now());
          }
        }
      },
      onComboChange: (newCombo, quality) => {
        // Update combo state
        setCombo(newCombo);

        // Only play announcements if enabled
        if (voiceAnnouncementsEnabled) {
          // Play streak announcements (British announcer for streaks 2-6)
          audioEngine.playStreakAnnouncement(newCombo);

          // Show streak 5 text
          if (newCombo === 5) {
            const size = hypeLevel === 'high' ? 'huge' : hypeLevel === 'medium' ? 'large' : 'medium';
            addTextAnnouncement('5 STREAK!', size);
          }

          // Play combo milestone sounds (10, 15, 20, 25)
          audioEngine.playComboMilestone(newCombo);

          // Show combo milestone text with scaling size
          const milestones = [10, 15, 20, 25];
          if (milestones.includes(newCombo)) {
            // Size increases with combo and hype level
            let size: 'small' | 'medium' | 'large' | 'huge' = 'medium';
            if (newCombo >= 25) {
              size = hypeLevel === 'high' ? 'huge' : hypeLevel === 'medium' ? 'huge' : 'large';
            } else if (newCombo >= 20) {
              size = hypeLevel === 'high' ? 'huge' : hypeLevel === 'medium' ? 'large' : 'medium';
            } else if (newCombo >= 15) {
              size = hypeLevel === 'high' ? 'large' : 'medium';
            } else {
              size = hypeLevel === 'high' ? 'medium' : 'small';
            }

            addTextAnnouncement(`${newCombo} COMBO!`, size);
          }
        }

        // Play celebration sound for perfect hits (occasionally) - only if voice effects enabled
        if (quality === 'perfect' && voiceEffectsEnabled) {
          audioEngine.playRandomCelebration();
        }
      }
    });

    gameLoopRef.current = gameLoop;

    // Load beatmap from selected song
    const beatmap = loadSong(selectedSongId);
    setCurrentBeatmap(beatmap);

    // Start background track (plays all notes quietly)
    audioEngine.startBackgroundTrack(beatmap);
    console.log('[GamePage] Background track started');

    gameLoop.start(beatmap);

    setGameStarted(true);
    console.log('[GamePage] Game started with song:', selectedSongId);
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

          // White column glow/sparkle effect (entire column)
          if (age < 300) { // Show sparkle for 300ms
            const sparkleOpacity = 1 - (age / 300);
            const pulseEffect = Math.sin((age / 50) * Math.PI) * 0.3 + 0.7; // Pulsing effect

            // Draw white glow for entire column
            const gradient = ctx.createLinearGradient(x + laneWidth / 2, 0, x + laneWidth / 2, height);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${sparkleOpacity * 0.2 * pulseEffect})`);
            gradient.addColorStop(0.5, `rgba(255, 255, 255, ${sparkleOpacity * 0.4 * pulseEffect})`);
            gradient.addColorStop(1, `rgba(255, 255, 255, ${sparkleOpacity * 0.2 * pulseEffect})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(x, 0, laneWidth, height);

            // Bright white glow at edges
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            ctx.shadowBlur = 20 * sparkleOpacity;
            ctx.strokeStyle = `rgba(255, 255, 255, ${sparkleOpacity * 0.6})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(x, 0, laneWidth, height);
            ctx.shadowBlur = 0; // Reset shadow
          }

          // Green flash overlay (at hit zone)
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
  }, [gameStarted, flashTiles, hitHighlights, audioWaves]);

  // Animate screen shake
  useEffect(() => {
    if (screenShake === 0) return;

    const shakeDuration = 200; // 200ms shake
    const startTime = screenShake;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < shakeDuration) {
        // Force re-render to update transform
        setScreenShake(startTime);
        requestAnimationFrame(animate);
      } else {
        setScreenShake(0); // Reset shake
      }
    };

    requestAnimationFrame(animate);
  }, [screenShake]);

  // Animate white flash
  useEffect(() => {
    if (whiteFlash === 0) return;

    const flashDuration = 150; // 150ms flash
    const startTime = whiteFlash;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < flashDuration) {
        // Force re-render to update opacity
        setWhiteFlash(startTime);
        requestAnimationFrame(animate);
      } else {
        setWhiteFlash(0); // Reset flash
      }
    };

    requestAnimationFrame(animate);
  }, [whiteFlash]);

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
        // Index finger: 5 (MCP), 6 (PIP), 7 (DIP), 8 (TIP)
        // Middle finger: 9 (MCP), 10 (PIP), 11 (DIP), 12 (TIP)
        // Wrist: 0
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
  }, [hands]);

  return (
    <div className="game-page">
      {/* Header with score */}
      <div className="game-header">
        <div className="score-display">Score: {score}</div>
      </div>

      {/* Streak counter on the right */}
      {gameStarted && (
        <div style={{
          position: 'fixed',
          top: '50%',
          right: '40px',
          transform: 'translateY(-50%)',
          background: combo > 0 ? 'rgba(139, 115, 85, 0.95)' : 'rgba(100, 100, 100, 0.7)',
          border: combo > 0 ? '4px solid #8b7355' : '4px solid #666666',
          borderRadius: '16px',
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '120px',
          boxShadow: combo > 0 ? '0 8px 32px rgba(139, 115, 85, 0.4)' : '0 4px 16px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.2s ease',
          zIndex: 1000,
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: combo > 0 ? '#f5f1e8' : '#cccccc',
            marginBottom: '8px',
            letterSpacing: '1px',
          }}>
            STREAK
          </div>
          <div style={{
            fontSize: combo >= 10 ? '56px' : '48px',
            fontWeight: 'bold',
            color: combo > 0 ? '#ffffff' : '#999999',
            lineHeight: 1,
            textShadow: combo > 0 ? '0 2px 8px rgba(0, 0, 0, 0.3)' : 'none',
            transition: 'all 0.2s ease',
          }}>
            {combo}
          </div>
          {combo >= 10 && (
            <div style={{
              marginTop: '8px',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#ffd700',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              {combo >= 25 ? 'LEGENDARY!' : combo >= 20 ? 'ON FIRE!' : combo >= 15 ? 'AMAZING!' : 'GREAT!'}
            </div>
          )}
        </div>
      )}

      {/* Text Announcements */}
      {gameStarted && textAnnouncements.map((announcement) => {
        const age = Date.now() - announcement.timestamp;

        // Animation phases (2 seconds total):
        // 0-300ms: Bouncy pop out (elastic effect)
        // 300-1400ms: Stay visible
        // 1400-2000ms: Fade out

        let opacity = 1;
        let scale = 1;

        if (age < 300) {
          // Bouncy pop-out animation
          const progress = age / 300;
          // Elastic easing out - overshoots then settles
          const elasticProgress = progress < 0.6
            ? progress * 2.5  // Fast scale up to 1.5
            : 1.5 - (progress - 0.6) * 1.25; // Settle back to 1
          scale = Math.max(0, elasticProgress);
          opacity = Math.min(1, progress * 3); // Quick fade in
        } else if (age > 1400) {
          // Fade out phase
          opacity = 1 - ((age - 1400) / 600);
        }

        // Font sizes based on announcement size
        const fontSizes = {
          small: '2.5rem',
          medium: '4rem',
          large: '6rem',
          huge: '8rem'
        };

        // Position mapping - place around the game area
        const positions = {
          'top-left': { top: '10%', left: '10%', transform: `scale(${scale})` },
          'top-right': { top: '10%', right: '10%', transform: `scale(${scale})` },
          'bottom-left': { bottom: '15%', left: '10%', transform: `scale(${scale})` },
          'bottom-right': { bottom: '15%', right: '10%', transform: `scale(${scale})` },
          'top': { top: '5%', left: '50%', transform: `translate(-50%, 0) scale(${scale})` },
          'bottom': { bottom: '10%', left: '50%', transform: `translate(-50%, 0) scale(${scale})` },
          'left': { top: '50%', left: '5%', transform: `translate(0, -50%) scale(${scale})` },
          'right': { top: '50%', right: '5%', transform: `translate(0, -50%) scale(${scale})` },
        };

        const positionStyle = positions[announcement.position];

        return (
          <div
            key={announcement.id}
            style={{
              position: 'fixed',
              ...positionStyle,
              fontSize: fontSizes[announcement.size],
              fontWeight: 900,
              color: '#ffffff',
              textShadow: `
                0 0 10px rgba(255,255,255,1),
                0 0 20px rgba(255,255,255,0.9),
                0 0 30px rgba(255,255,255,0.7),
                0 0 40px rgba(255,255,255,0.5),
                0 0 60px rgba(255,255,255,0.6),
                0 0 80px rgba(255,255,255,0.4),
                0 4px 8px rgba(0,0,0,0.8),
                0 0 100px rgba(255,255,255,0.3)
              `,
              opacity,
              pointerEvents: 'none',
              zIndex: 2000,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              letterSpacing: '0.1em',
              WebkitTextStroke: '2px rgba(0,0,0,0.8)',
              transition: 'none',
              filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.8)) drop-shadow(0 0 25px rgba(255,255,255,0.5))',
            }}
          >
            {announcement.text}
          </div>
        );
      })}

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
            <div style={{ flex: '0 1 auto', overflowY: 'auto' }}>
              <SettingsPanel visionLoop={visionLoopRef.current} />

              {/* Hype Level Selector */}
              <div style={{
                padding: '12px',
                background: '#f5f1e8',
                borderBottom: '2px solid #d4c7b0',
              }}>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  color: '#5a4d3a',
                }}>
                  Announcer Hype Level
                </h3>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}>
                  {(['low', 'medium', 'high'] as const).map((level) => (
                    <Button
                      key={level}
                      onClick={() => setHypeLevel(level)}
                      style={{
                        padding: '8px 12px',
                        background: hypeLevel === level ? '#8b7355' : '#ffffff',
                        color: hypeLevel === level ? '#ffffff' : '#5a4d3a',
                        border: `2px solid ${hypeLevel === level ? '#8b7355' : '#d4c7b0'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: hypeLevel === level ? 'bold' : 'normal',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ textTransform: 'capitalize' }}>{level}</span>
                      {hypeLevel === level && <span>✓</span>}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Audio & Visual Settings */}
              <div style={{
                padding: '12px',
                background: '#f5f1e8',
                borderBottom: '2px solid #d4c7b0',
              }}>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  color: '#5a4d3a',
                }}>
                  Audio & Visual
                </h3>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}>
                  {/* Voice Announcements Toggle */}
                  <Button
                    onClick={() => setVoiceAnnouncementsEnabled(!voiceAnnouncementsEnabled)}
                    style={{
                      padding: '8px 12px',
                      background: voiceAnnouncementsEnabled ? '#8b7355' : '#ffffff',
                      color: voiceAnnouncementsEnabled ? '#ffffff' : '#5a4d3a',
                      border: `2px solid ${voiceAnnouncementsEnabled ? '#8b7355' : '#d4c7b0'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: voiceAnnouncementsEnabled ? 'bold' : 'normal',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Announcements</span>
                    {voiceAnnouncementsEnabled && <span>✓</span>}
                  </Button>

                  {/* Voice Effects Toggle */}
                  <Button
                    onClick={() => setVoiceEffectsEnabled(!voiceEffectsEnabled)}
                    style={{
                      padding: '8px 12px',
                      background: voiceEffectsEnabled ? '#8b7355' : '#ffffff',
                      color: voiceEffectsEnabled ? '#ffffff' : '#5a4d3a',
                      border: `2px solid ${voiceEffectsEnabled ? '#8b7355' : '#d4c7b0'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: voiceEffectsEnabled ? 'bold' : 'normal',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Voice Effects</span>
                    {voiceEffectsEnabled && <span>✓</span>}
                  </Button>

                  {/* Visual Effects Toggle */}
                  <Button
                    onClick={() => setVisualEffectsEnabled(!visualEffectsEnabled)}
                    style={{
                      padding: '8px 12px',
                      background: visualEffectsEnabled ? '#8b7355' : '#ffffff',
                      color: visualEffectsEnabled ? '#ffffff' : '#5a4d3a',
                      border: `2px solid ${visualEffectsEnabled ? '#8b7355' : '#d4c7b0'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: visualEffectsEnabled ? 'bold' : 'normal',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Visual Effects</span>
                    {visualEffectsEnabled && <span>✓</span>}
                  </Button>

                  {/* Screen Shake Toggle */}
                  <Button
                    onClick={() => setScreenShakeEnabled(!screenShakeEnabled)}
                    style={{
                      padding: '8px 12px',
                      background: screenShakeEnabled ? '#8b7355' : '#ffffff',
                      color: screenShakeEnabled ? '#ffffff' : '#5a4d3a',
                      border: `2px solid ${screenShakeEnabled ? '#8b7355' : '#d4c7b0'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: screenShakeEnabled ? 'bold' : 'normal',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Screen Shake</span>
                    {screenShakeEnabled && <span>✓</span>}
                  </Button>
                </div>
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: '#ebe4d6',
              borderRight: '3px solid #d4c7b0',
              borderTop: '2px solid #d4c7b0',
            }}>
              <Button
                className="button button-primary"
                onClick={startGame}
                style={{
                  width: '100%',
                  fontSize: '1.2rem',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Start Game
              </Button>
            </div>
          </div>
        )}

        {/* Game canvas container */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', position: 'relative' }}>
          {/* Audio wave effects - Outside the game board */}
          {gameStarted && audioWaves.map((wave, index) => {
            const now = performance.now();
            const age = now - wave.timestamp;
            if (age >= 1000) return null; // Don't render expired waves

            const opacity = 1 - (age / 1000); // Fade out
            const amplitude = 40; // Wave height in pixels
            const frequency = 0.015; // Wave frequency
            const speed = age * 0.005; // Animation speed

            return (
              <div
                key={`${wave.lane}-${wave.timestamp}-${index}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: 'none',
                  zIndex: 1,
                  overflow: 'hidden',
                }}
              >
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 1000 1000"
                  preserveAspectRatio="none"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                >
                  {[0, 1, 2].map((waveNum) => {
                    const waveOpacity = opacity * (1 - waveNum * 0.25);
                    const yOffset = 250 + (waveNum * 250); // Spread waves vertically (25%, 50%, 75%)
                    const currentAmplitude = amplitude * (1 - age / 1000) * (1 - waveNum * 0.1);

                    // Create path for sine wave across full width
                    const points = 200; // Number of points for smooth wave
                    const pathData = Array.from({ length: points }, (_, i) => {
                      const x = (i / points) * 1000; // Spread across viewBox width
                      const y = yOffset + Math.sin((i * frequency) + speed + (waveNum * 0.5)) * currentAmplitude;
                      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                    }).join(' ');

                    return (
                      <path
                        key={waveNum}
                        d={pathData}
                        stroke={`rgba(139, 115, 85, ${waveOpacity * 0.5})`}
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                      />
                    );
                  })}
                </svg>
              </div>
            );
          })}

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
              transform: screenShake > 0 && Date.now() - screenShake < 200
                ? `translate(${Math.sin(Date.now() * 0.1) * 8}px, ${Math.cos(Date.now() * 0.15) * 8}px)`
                : 'none',
              transition: screenShake > 0 && Date.now() - screenShake < 200 ? 'none' : 'transform 0.1s ease-out',
            }}
          />

          {/* White flash overlay for perfect hits */}
          {whiteFlash > 0 && Date.now() - whiteFlash < 150 && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'white',
              opacity: Math.max(0, 1 - (Date.now() - whiteFlash) / 150),
              pointerEvents: 'none',
              mixBlendMode: 'screen',
            }} />
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
          </div>
        </div>

        {/* Song selection sidebar - only show before game starts */}
        {cameraReady && !gameStarted && (
          <SongSelection
            selectedSongId={selectedSongId}
            onSelectSong={setSelectedSongId}
            audioEngine={audioEngine}
          />
        )}
      </div>

      {/* Finger statistics (bottom-right) */}
      {/* <div className="game-stats">
        <h3>Finger Tracking</h3>
        {fingerStats.map((stat) => (
          <div key={stat.tile} className={`finger-stat ${stat.active ? 'active' : ''}`}>
            <span className="finger-name">{stat.name}</span>
            <span className="finger-position">
              ({(stat.x * 100).toFixed(0)}%, {(stat.y * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div> */}

      {/* Back button */}
      <Button
        className="button"
        onClick={handleBackButton}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        Back
      </Button>

      {/* Test Audio button */}
      <Button
        className="button"
        onClick={() => {
          audioEngine.initialize();
          audioEngine.resume();
          audioEngine.playTestAudio360();
        }}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'var(--accent)',
          color: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Test 3D spatial audio - listen to a sound rotate 360° around your head"
      >
        Test Audio
      </Button>
    </div>
  );
}
