import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { TestingPage } from './pages/TestingPage';
import { GameLayout } from './game/GameLayout';
import { GameSetup } from './game/GameSetup';
import { GamePlay } from './game/GamePlay';
import './styles.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game" element={<GameLayout />}>
          <Route index element={<GameSetup />} />
          <Route path="play" element={<GamePlay />} />
        </Route>
        <Route path="/testing" element={<TestingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
