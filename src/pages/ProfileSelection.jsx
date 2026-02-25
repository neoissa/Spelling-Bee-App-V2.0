import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function ProfileSelection() {
    const navigate = useNavigate();
    const { profiles, setActiveProfileId } = useAppContext();

    const handleSelectProfile = (id) => {
        setActiveProfileId(id);
        navigate('/play');
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2rem', color: '#555' }}>
                Who is playing today?
            </h2>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '40px'
            }}>
                {profiles.map(profile => (
                    <div key={profile.id} style={{ position: 'relative' }}>
                        <div
                            onClick={() => handleSelectProfile(profile.id)}
                            className="glass-panel interactive-hover"
                            style={{
                                cursor: 'pointer',
                                textAlign: 'center',
                                padding: '30px',
                                borderTop: `8px solid ${profile.color}`
                            }}
                        >
                            <div style={{ fontSize: '4rem', marginBottom: '10px' }}>{profile.avatar}</div>
                            <h3 style={{ margin: '10px 0', fontSize: '1.5rem' }}>{profile.name}</h3>
                            <p style={{ color: '#666', margin: '5px 0' }}>{profile.grade}</p>
                            <div style={{ fontWeight: 'bold', color: '#ffb300', marginTop: '10px' }}>
                                {profile.stars} ⭐
                            </div>
                        </div>
                    </div>
                ))}
                {profiles.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#888' }}>
                        <p>No profiles found! Ask a parent to create one in the Parent Hub.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
