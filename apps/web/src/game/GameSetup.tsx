import { useNavigate } from 'react-router-dom';
import { useGameContext } from './GameContext';
import { SettingsPanel } from './SettingsPanel';
import { SongSelection } from './SongSelection';
import { getAudioEngine } from './audio/audioEngine';
import { Button } from '../components/Button';
import { playClickSound } from '../utils/clickSound';

export function GameSetup() {
  const navigate = useNavigate();
  const { cameraReady, visionLoopRef, settings, updateSettings } = useGameContext();
  const audioEngine = getAudioEngine();

  const handleStartGame = () => {
    console.log('[GameSetup] Starting game...');

    if (!settings.selectedSongId) {
      alert('Please select a song first!');
      return;
    }

    // Navigate to gameplay
    navigate('/game/play');
  };

  const handleBackButton = () => {
    playClickSound();
    navigate('/');
  };

  return (
    <>
      {/* Header with title */}
      <div className="game-header">
        <div className="score-display">Game Setup</div>
      </div>

      {/* Main game area with sidebar */}
      <div className="game-main" style={{ display: 'flex', padding: 0, gap: 0, alignItems: 'flex-start' }}>
        {/* Settings sidebar - left */}
        {cameraReady && (
          <div style={{
            width: '320px',
            maxHeight: '100%',
            flexShrink: 0,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignSelf: 'flex-start', // Align to top
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
                      onClick={() => updateSettings({ hypeLevel: level })}
                      style={{
                        padding: '8px 12px',
                        background: settings.hypeLevel === level ? '#8b7355' : '#ffffff',
                        color: settings.hypeLevel === level ? '#ffffff' : '#5a4d3a',
                        border: `2px solid ${settings.hypeLevel === level ? '#8b7355' : '#d4c7b0'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: settings.hypeLevel === level ? 'bold' : 'normal',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ textTransform: 'capitalize' }}>{level}</span>
                      {settings.hypeLevel === level && <span>✓</span>}
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
                    onClick={() => updateSettings({ voiceAnnouncementsEnabled: !settings.voiceAnnouncementsEnabled })}
                    style={{
                      padding: '8px 12px',
                      background: settings.voiceAnnouncementsEnabled ? '#8b7355' : '#ffffff',
                      color: settings.voiceAnnouncementsEnabled ? '#ffffff' : '#5a4d3a',
                      border: `2px solid ${settings.voiceAnnouncementsEnabled ? '#8b7355' : '#d4c7b0'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: settings.voiceAnnouncementsEnabled ? 'bold' : 'normal',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Announcements</span>
                    {settings.voiceAnnouncementsEnabled && <span>✓</span>}
                  </Button>

                  {/* Voice Effects Toggle */}
                  <Button
                    onClick={() => updateSettings({ voiceEffectsEnabled: !settings.voiceEffectsEnabled })}
                    style={{
                      padding: '8px 12px',
                      background: settings.voiceEffectsEnabled ? '#8b7355' : '#ffffff',
                      color: settings.voiceEffectsEnabled ? '#ffffff' : '#5a4d3a',
                      border: `2px solid ${settings.voiceEffectsEnabled ? '#8b7355' : '#d4c7b0'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: settings.voiceEffectsEnabled ? 'bold' : 'normal',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Voice Effects</span>
                    {settings.voiceEffectsEnabled && <span>✓</span>}
                  </Button>

                  {/* Visual Effects Toggle */}
                  <Button
                    onClick={() => updateSettings({ visualEffectsEnabled: !settings.visualEffectsEnabled })}
                    style={{
                      padding: '8px 12px',
                      background: settings.visualEffectsEnabled ? '#8b7355' : '#ffffff',
                      color: settings.visualEffectsEnabled ? '#ffffff' : '#5a4d3a',
                      border: `2px solid ${settings.visualEffectsEnabled ? '#8b7355' : '#d4c7b0'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: settings.visualEffectsEnabled ? 'bold' : 'normal',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Visual Effects</span>
                    {settings.visualEffectsEnabled && <span>✓</span>}
                  </Button>

                  {/* Screen Shake Toggle */}
                  <Button
                    onClick={() => updateSettings({ screenShakeEnabled: !settings.screenShakeEnabled })}
                    style={{
                      padding: '8px 12px',
                      background: settings.screenShakeEnabled ? '#8b7355' : '#ffffff',
                      color: settings.screenShakeEnabled ? '#ffffff' : '#5a4d3a',
                      border: `2px solid ${settings.screenShakeEnabled ? '#8b7355' : '#d4c7b0'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: settings.screenShakeEnabled ? 'bold' : 'normal',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Screen Shake</span>
                    {settings.screenShakeEnabled && <span>✓</span>}
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
                onClick={handleStartGame}
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

        {/* Center area - camera shows through from GameLayout */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Camera video shows through from GameLayout background */}
        </div>

        {/* Song selection sidebar - right */}
        {cameraReady && (
          <SongSelection
            selectedSongId={settings.selectedSongId}
            onSelectSong={(songId) => updateSettings({ selectedSongId: songId })}
            audioEngine={audioEngine}
          />
        )}
      </div>

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
    </>
  );
}
