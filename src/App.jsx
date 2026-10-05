import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from './context/AppContext';
import ProfileSelection from './pages/ProfileSelection';
import ParentHub from './pages/ParentHub';
import PlayArena from './pages/PlayArena';
import { Settings, ArrowLeft, Volume2, VolumeX, CheckCircle, X } from 'lucide-react';
import { sounds } from './utils/audio';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeProfile, ttsMuted, setTtsMuted, syncNotification, setSyncNotification } = useAppContext();

  const isHome = location.pathname === '/';

  const handleToggleSound = () => {
    sounds.playPop();
    setTtsMuted(!ttsMuted);
  };

  return (
    <div className="app-container">
      {/* Cross-Device Sync Notification Banner */}
      {syncNotification && (
        <div
          className="animate-pop"
          style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: 'white',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-md)',
            fontWeight: 600,
            fontSize: '0.95rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={20} />
            <span>{syncNotification}</span>
          </div>
          <button
            onClick={() => setSyncNotification(null)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Top Header & Navigation */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!isHome && (
            <button
              onClick={() => { sounds.playPop(); navigate(-1); }}
              className="btn-icon"
              title="Go Back"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          <div
            onClick={() => { sounds.playPop(); navigate('/'); }}
            className="logo-brand"
            title="Apple Bee Home"
          >
            <span style={{ fontSize: '1.8rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>🍎</span>
            <span className="logo-title">Apple Bee</span>
            <span className="badge-version">v2.0</span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Active Profile Pill */}
          {activeProfile && (
            <div
              onClick={() => { sounds.playPop(); navigate('/'); }}
              className="profile-chip"
              style={{ cursor: 'pointer' }}
              title="Switch Player"
            >
              <span style={{ fontSize: '1.2rem' }}>{activeProfile.avatar}</span>
              <span style={{ fontWeight: 700 }}>{activeProfile.name}</span>
              <span style={{ color: '#F59E0B', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                ⭐ {activeProfile.stars || 0}
              </span>
            </div>
          )}

          {/* Quick Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className="btn-icon"
            style={{ color: ttsMuted ? '#94A3B8' : '#4F46E5' }}
            title={ttsMuted ? "Unmute Sound" : "Mute Sound"}
            aria-label="Toggle Sound"
          >
            {ttsMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          {/* Parent Hub Button */}
          <button
            onClick={() => { sounds.playPop(); navigate('/hub'); }}
            className="btn-icon"
            style={{ background: location.pathname === '/hub' ? '#EEF2FF' : '#F1F5F9', color: location.pathname === '/hub' ? '#4F46E5' : '#475569' }}
            title="Parent Hub"
            aria-label="Parent Hub"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="glass-panel" style={{ padding: '24px', minHeight: '520px' }}>
        <Routes>
          <Route path="/" element={<ProfileSelection />} />
          <Route path="/hub" element={<ParentHub />} />
          <Route path="/play" element={<PlayArena />} />
        </Routes>
      </main>
    </div>
  );
}
