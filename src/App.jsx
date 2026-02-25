import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from './context/AppContext';
import ProfileSelection from './pages/ProfileSelection';
import ParentHub from './pages/ParentHub';
import PlayArena from './pages/PlayArena';
import { Settings, Home, ArrowLeft } from 'lucide-react';
import './index.css';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeProfile } = useAppContext();

  return (
    <div className="app-container">
      {/* Global Navigation / Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--primary-red)',
        padding: '10px 20px',
        borderRadius: '20px 20px 0 0',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Global Back Button (hide on home) */}
          {location.pathname !== '/' && (
            <button
              onClick={() => navigate(-1)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Go Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          {/* Global Home Button (hide on home) */}
          {location.pathname !== '/' && (
            <button
              onClick={() => navigate('/')}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Home"
            >
              <Home size={20} />
            </button>
          )}

          <div
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer', fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem', marginLeft: location.pathname !== '/' ? '10px' : '0', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            🍎 Apple Bee 🐝
            <span style={{ fontSize: '0.8rem', background: '#ffeb3b', color: '#d84315', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', fontFamily: 'sans-serif' }}>v2.0</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {activeProfile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '5px 12px', borderRadius: '20px' }}>
              <span style={{ fontSize: '1.2rem' }}>{activeProfile.avatar}</span>
              <span style={{ fontWeight: 'bold' }}>{activeProfile.stars} ⭐</span>
            </div>
          )}

          <button
            onClick={() => navigate('/hub')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Parent Hub"
          >
            <Settings size={24} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="game-board" style={{ borderRadius: '0 0 30px 30px', borderTop: 'none', padding: '20px' }}>
        <Routes>
          <Route path="/" element={<ProfileSelection />} />
          <Route path="/hub" element={<ParentHub />} />
          <Route path="/play" element={<PlayArena />} />
        </Routes>
      </div>
    </div>
  );
}
