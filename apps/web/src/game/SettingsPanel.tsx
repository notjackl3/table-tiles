import { useState, useEffect } from 'react';
import type { VisionLoop } from '../vision/visionLoop';

interface SettingsPanelProps {
  visionLoop: VisionLoop | null;
}

export function SettingsPanel({ visionLoop }: SettingsPanelProps) {
  const [sensitivity, setSensitivity] = useState(0.25);
  const [velocityThreshold, setVelocityThreshold] = useState(1.0);
  const [cooldown, setCooldown] = useState(100);
  const [tapMotionTimeout, setTapMotionTimeout] = useState(250);
  const [fingerStates, setFingerStates] = useState<any[]>([]);

  // Load initial values from vision loop
  useEffect(() => {
    if (visionLoop) {
      setSensitivity(visionLoop.getSensitivity());
      setVelocityThreshold(visionLoop.getVelocityThreshold());
      setCooldown(visionLoop.getCooldown());
      setTapMotionTimeout(visionLoop.getTapMotionTimeout());
    }
  }, [visionLoop]);

  // Update finger states for real-time feedback
  useEffect(() => {
    if (!visionLoop) return;

    const interval = setInterval(() => {
      const states = visionLoop.getFingerStates();
      setFingerStates(states);
    }, 50); // Update 20 times per second

    return () => clearInterval(interval);
  }, [visionLoop]);

  const handleSensitivityChange = (value: number) => {
    setSensitivity(value);
    visionLoop?.setSensitivity(value);
  };

  const handleVelocityThresholdChange = (value: number) => {
    setVelocityThreshold(value);
    visionLoop?.setVelocityThreshold(value);
  };

  const handleCooldownChange = (value: number) => {
    setCooldown(value);
    visionLoop?.setCooldown(value);
  };

  const handleTapMotionTimeoutChange = (value: number) => {
    setTapMotionTimeout(value);
    visionLoop?.setTapMotionTimeout(value);
  };

  return (
    <div className="settings-panel">
      <h2 style={{ marginBottom: '16px', fontSize: '1.1rem', color: '#2c2416' }}>Detection Settings</h2>

      <div className="settings-grid">
        {/* Sensitivity Slider */}
        <div className="setting-item">
          <label>
            <div className="setting-label">
              Sensitivity
              <span className="setting-value">{sensitivity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.05"
              value={sensitivity}
              onChange={(e) => handleSensitivityChange(parseFloat(e.target.value))}
              className="slider"
            />
          </label>
        </div>

        {/* Velocity Threshold Slider */}
        <div className="setting-item">
          <label>
            <div className="setting-label">
              Velocity Threshold
              <span className="setting-value">{velocityThreshold.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={velocityThreshold}
              onChange={(e) => handleVelocityThresholdChange(parseFloat(e.target.value))}
              className="slider"
            />
          </label>
        </div>

        {/* Cooldown Slider */}
        <div className="setting-item">
          <label>
            <div className="setting-label">
              Cooldown
              <span className="setting-value">{cooldown}ms</span>
            </div>
            <input
              type="range"
              min="50"
              max="300"
              step="10"
              value={cooldown}
              onChange={(e) => handleCooldownChange(parseInt(e.target.value))}
              className="slider"
            />
          </label>
        </div>

        {/* Tap Motion Timeout Slider */}
        <div className="setting-item">
          <label>
            <div className="setting-label">
              Tap Timeout
              <span className="setting-value">{tapMotionTimeout}ms</span>
            </div>
            <input
              type="range"
              min="100"
              max="500"
              step="50"
              value={tapMotionTimeout}
              onChange={(e) => handleTapMotionTimeoutChange(parseInt(e.target.value))}
              className="slider"
            />
          </label>
        </div>
      </div>

      {/* Real-time Finger State Feedback */}
      <div className="finger-feedback">
        <h3 style={{ marginTop: '0', marginBottom: '10px', fontSize: '1rem', color: '#2c2416' }}>
          Live Finger State
        </h3>
        <div className="finger-states-grid">
          {fingerStates.length > 0 ? (
            fingerStates.map((state, idx) => (
              <div key={idx} className="finger-state-card">
                <div className="finger-state-header">
                  <span className="finger-name">{state.hand[0]} {state.finger}</span>
                  <span className="tile-number">Tile {state.tile}</span>
                </div>
                <div className="finger-state-bar">
                  <div className="bar-label">Bend</div>
                  <div className="bar-container">
                    <div
                      className={`bar-fill ${state.isInTapMotion ? 'tapping' : ''}`}
                      style={{ width: `${state.bendAmount * 100}%` }}
                    />
                  </div>
                  <div className="bar-value">{(state.bendAmount * 100).toFixed(0)}%</div>
                </div>
                <div className="finger-state-info">
                  <span className={`status-badge ${state.isInTapMotion ? 'active' : ''}`}>
                    {state.isInTapMotion ? 'Tapping' : 'Resting'}
                  </span>
                  <span className="velocity">
                    v: {state.bendVelocity.toFixed(1)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-hands-message">
              No hands detected - show your hands to the camera
            </div>
          )}
        </div>
      </div>

      <style>{`
        .settings-panel {
          background: #ebe4d6;
          padding: 20px;
          color: #2c2416;
          height: 100%;
          overflow-y: auto;
          border-right: 3px solid #d4c7b0;
        }

        .settings-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 16px;
        }

        .setting-item {
          background: white;
          padding: 12px;
          border-radius: 8px;
          border: 2px solid #d4c7b0;
          box-shadow: 0 2px 4px rgba(44, 36, 22, 0.1);
        }

        .setting-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: bold;
          margin-bottom: 4px;
          font-size: 0.9rem;
          color: #2c2416;
        }

        .setting-value {
          color: #8b7355;
          font-family: monospace;
          font-size: 1rem;
          font-weight: 700;
        }

        .setting-description {
          font-size: 0.75rem;
          color: #5a4d3a;
          margin-bottom: 8px;
          line-height: 1.2;
        }

        .slider {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: #e0d4bf;
          outline: none;
          cursor: pointer;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #8b7355;
          cursor: pointer;
          border: 2px solid #7a6348;
          transition: all 0.2s;
        }

        .slider::-webkit-slider-thumb:hover {
          background: #7a6348;
          transform: scale(1.1);
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #8b7355;
          cursor: pointer;
          border: 2px solid #7a6348;
          transition: all 0.2s;
        }

        .slider::-moz-range-thumb:hover {
          background: #7a6348;
          transform: scale(1.1);
        }

        .slider-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          color: #5a4d3a;
          margin-top: 4px;
        }

        .finger-feedback {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 2px solid #d4c7b0;
        }

        .finger-states-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .finger-state-card {
          background: white;
          padding: 10px;
          border-radius: 8px;
          border: 2px solid #d4c7b0;
          box-shadow: 0 2px 4px rgba(44, 36, 22, 0.1);
        }

        .finger-state-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .finger-name {
          font-weight: bold;
          font-size: 0.85rem;
          color: #2c2416;
        }

        .tile-number {
          background: #c3e6cb;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.75rem;
          color: #2c5a34;
          font-weight: 600;
        }

        .finger-state-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }

        .bar-label {
          font-size: 0.75rem;
          color: #5a4d3a;
          min-width: 32px;
        }

        .bar-container {
          flex: 1;
          height: 16px;
          background: #e0d4bf;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
          border: 1px solid #d4c7b0;
        }

        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #8b7355, #7a6348);
          transition: width 0.1s ease;
          border-radius: 8px;
        }

        .bar-fill.tapping {
          background: linear-gradient(90deg, #c3e6cb, #6fa87a);
          animation: pulse 0.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .bar-value {
          font-family: monospace;
          font-size: 0.75rem;
          min-width: 35px;
          text-align: right;
          color: #8b7355;
          font-weight: 600;
        }

        .finger-state-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .status-badge {
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 4px;
          background: #e0d4bf;
          color: #5a4d3a;
          font-weight: 600;
        }

        .status-badge.active {
          background: #c3e6cb;
          color: #2c5a34;
        }

        .velocity {
          font-family: monospace;
          font-size: 0.75rem;
          color: #5a4d3a;
        }

        .no-hands-message {
          text-align: center;
          padding: 20px;
          color: #5a4d3a;
          font-style: italic;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
