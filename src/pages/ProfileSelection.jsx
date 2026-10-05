import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { sounds } from '../utils/audio';
import { Sparkles, PlusCircle, Trophy } from 'lucide-react';

export default function ProfileSelection() {
    const navigate = useNavigate();
    const { profiles, setActiveProfileId } = useAppContext();

    const handleSelectProfile = (id) => {
        sounds.playPop();
        setActiveProfileId(id);
        navigate('/play');
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#FEF3C7', color: '#B45309', padding: '6px 16px', borderRadius: '9999px', fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px' }}>
                    <Sparkles size={16} /> Let's Practice Spelling!
                </div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', color: '#1E293B', letterSpacing: '-0.5px' }}>
                    Who is playing today?
                </h1>
                <p style={{ color: '#64748B', fontSize: '1.1rem', marginTop: '6px' }}>
                    Pick your character to continue your learning streak!
                </p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
            }}>
                {profiles.map(profile => (
                    <div
                        key={profile.id}
                        onClick={() => handleSelectProfile(profile.id)}
                        className="card-elevated"
                        style={{
                            cursor: 'pointer',
                            padding: '28px 20px',
                            textAlign: 'center',
                            borderTop: `6px solid ${profile.color || '#4F46E5'}`,
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{
                            fontSize: '4.5rem',
                            marginBottom: '12px',
                            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            userSelect: 'none'
                        }}>
                            {profile.avatar}
                        </div>

                        <h3 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.6rem',
                            color: '#1E293B',
                            marginBottom: '4px'
                        }}>
                            {profile.name}
                        </h3>

                        <div style={{
                            display: 'inline-block',
                            background: '#F1F5F9',
                            color: '#475569',
                            padding: '3px 12px',
                            borderRadius: '9999px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            marginBottom: '14px'
                        }}>
                            {profile.grade || 'Speller'}
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            background: '#FFFBEB',
                            border: '1px solid #FDE68A',
                            padding: '6px 12px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            color: '#B45309',
                            fontSize: '1.1rem'
                        }}>
                            <span>⭐</span>
                            <span>{profile.stars || 0} Stars</span>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                    onClick={() => { sounds.playPop(); navigate('/hub'); }}
                    className="btn btn-secondary"
                >
                    <PlusCircle size={18} /> Add New Student Profile
                </button>

                <button
                    onClick={() => { sounds.playPop(); navigate('/hub'); }}
                    className="btn btn-secondary"
                >
                    <Trophy size={18} /> View Leaderboard
                </button>
            </div>
        </div>
    );
}
