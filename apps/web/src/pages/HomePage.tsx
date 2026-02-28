import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="home-page">
      <div className="home-content">
        <h1>TableTiles</h1>
        <p style={{ fontSize: '1.4rem', marginBottom: '3rem' }}>
          Turn any desk into a rhythm game
        </p>

        <div className="button-group">
          <Link to="/game" className="nav-link" style={{ background: '#8b7355', color: 'white', borderColor: '#7a6348' }}>
            Start Game
          </Link>
          <Link to="/testing" className="nav-link">
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
