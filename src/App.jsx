import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from './context/AppContext';
import ProfileSelection from './pages/ProfileSelection';
import ParentHub from './pages/ParentHub';
import PlayArena from './pages/PlayArena';
import { Settings, ArrowLeft, Volume2, VolumeX, CheckCircle, X, Radio, Copy, Check } from 'lucide-react';
import { sounds } from './utils/audio';
import { generateRandomRoomCode } from './utils/cloudSync';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    activeProfile,
    ttsMuted,
    setTtsMuted,
    syncNotification,
    setSyncNotification,
    cloudRoomCode,
    cloudSyncStatus,
    connectCloudRoom,
    disconnectCloudRoom
  } = useAppContext();

  const [showSyncModal, setShowSyncModal] = useState(false);
  const [roomInput, setRoomInput] = useState('');

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
            fontSize: '0.95rem',
            marginBottom: '12px'
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

      {/* Continuous Cloud Sync Modal */}
      {showSyncModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="card-elevated animate-pop" style={{ maxWidth: '440px', width: '100%', padding: '24px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚡ Continuous Live Sync
              </h3>
              <button
                onClick={() => setShowSyncModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: '1.5', marginBottom: '20px' }}>
              Enter the <strong>same Family Room Code</strong> (e.g. <code>SERENA</code>) on both computers. Any word lists added, edited, or scanned will <strong>automatically sync live</strong>!
            </p>

            {cloudRoomCode ? (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '18px', borderRadius: 'var(--radius-md)', marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 700, marginBottom: '4px' }}>CONNECTED FAMILY ROOM:</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#15803D', letterSpacing: '2px', fontFamily: 'monospace' }}>
                  {cloudRoomCode}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#166534', marginTop: '6px', fontWeight: 600 }}>
                  🟢 Live automatic synchronization active
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'center' }}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(cloudRoomCode);
                      sounds.playCorrect();
                      setSyncNotification(`Copied Room Code "${cloudRoomCode}"! Use this code on Serena's PC.`);
                      setTimeout(() => setSyncNotification(null), 3000);
                    }}
                    className="btn btn-emerald"
                    style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                  >
                    <Copy size={16} /> Copy Code
                  </button>
                  <button
                    onClick={() => {
                      disconnectCloudRoom();
                      setShowSyncModal(false);
                    }}
                    className="btn"
                    style={{ background: '#FEE2E2', color: '#DC2626', padding: '8px 16px', fontSize: '0.9rem' }}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (roomInput.trim()) {
                    connectCloudRoom(roomInput.trim());
                    setShowSyncModal(false);
                  }
                }}
                style={{ marginBottom: '8px' }}
              >
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>
                  Family Room Code:
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <input
                    type="text"
                    placeholder="e.g. SERENA"
                    value={roomInput}
                    onChange={e => setRoomInput(e.target.value.toUpperCase())}
                    className="input-field"
                    style={{ fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setRoomInput(generateRandomRoomCode())}
                    className="btn btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                    title="Generate Random Room Code"
                  >
                    🎲 New Code
                  </button>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
                >
                  ⚡ Connect Continuous Sync
                </button>
              </form>
            )}
          </div>
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
          {/* Continuous Cloud Sync Status Pill */}
          {cloudRoomCode ? (
            <div
              onClick={() => { sounds.playPop(); setShowSyncModal(true); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#047857',
                padding: '6px 12px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Continuous Live Sync Connected (Click to manage)"
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 6px #10B981' }} />
              <span>Room: {cloudRoomCode}</span>
            </div>
          ) : (
            <div
              onClick={() => { sounds.playPop(); setShowSyncModal(true); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                color: '#475569',
                padding: '6px 12px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Click to enable continuous sync across computers"
            >
              <Radio size={14} color="#6366F1" />
              <span>Sync PCs ⚡</span>
            </div>
          )}

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
