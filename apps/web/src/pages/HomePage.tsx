import { Link } from 'react-router-dom';
import { playClickSound } from '../utils/clickSound';
import { useState } from 'react';

export function HomePage() {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  return (
    <div className="home-page">
      <div className="home-content">
        <h1>TableTiles</h1>
        <p style={{ fontSize: '1.4rem', marginBottom: '3rem' }}>
          Turn any desk into a rhythm game
        </p>

        <div className="button-group">
          <Link
            to="/game"
            className="nav-link"
            style={{
              background: '#8b7355',
              color: '#ffffff',
              borderColor: '#7a6348',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: hoveredLink === 'game'
                ? '0 0 15px 3px rgba(255, 255, 255, 0.6), 0 0 25px 5px rgba(255, 255, 255, 0.3)'
                : 'none',
              outline: hoveredLink === 'game'
                ? '2px solid rgba(255, 255, 255, 0.8)'
                : 'none',
              outlineOffset: '2px'
            }}
            onClick={playClickSound}
            onMouseEnter={() => setHoveredLink('game')}
            onMouseLeave={() => setHoveredLink(null)}
          >
            Start Game
          </Link>
          <Link
            to="/testing"
            className="nav-link"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: hoveredLink === 'testing'
                ? '0 0 15px 3px rgba(255, 255, 255, 0.6), 0 0 25px 5px rgba(255, 255, 255, 0.3)'
                : 'none',
              outline: hoveredLink === 'testing'
                ? '2px solid rgba(255, 255, 255, 0.8)'
                : 'none',
              outlineOffset: '2px'
            }}
            onClick={playClickSound}
            onMouseEnter={() => setHoveredLink('testing')}
            onMouseLeave={() => setHoveredLink(null)}
          >
            Sensitivity Testing
          </Link>
        </div>

        <div style={{ marginTop: '3rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>
          <p>Use your fingers to tap the tiles as they fall</p>
          <p>Track your score and perfect your timing</p>
        </div>
      </div>
    </div>
  );
}
