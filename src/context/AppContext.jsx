import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, doc, setDoc, onSnapshot } from '../firebase';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

// Initial mock data if no local storage
const defaultProfiles = [
    { id: '1', name: 'Ali', avatar: '🦁', color: '#ff4b4b', grade: '1st Grade', stars: 120, history: [], wordMastery: {} },
    { id: '2', name: 'Serena', avatar: '🦄', color: '#4facfe', grade: '3rd Grade', stars: 350, history: [], wordMastery: {} }
];

const defaultCustomLists = [
    { id: 'l1', profileId: '1', title: 'Animals', words: [{ word: 'Lion', hint: 'King of the jungle' }, { word: 'Zebra', hint: 'Has black and white stripes' }], scheduledDate: '' },
    { id: 'l2', profileId: '2', title: 'Space', words: [{ word: 'Star', hint: 'Twinkles in the night sky' }, { word: 'Planet', hint: 'Earth is one' }], scheduledDate: '' }
];

export const AppProvider = ({ children }) => {
    // Load initial state from local storage or use defaults
    const loadState = (key, defaultVal) => {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultVal;
    };

    const [profiles, setProfiles] = useState(() => loadState('sp_profiles', defaultProfiles));
    const [activeProfileId, setActiveProfileId] = useState(() => loadState('sp_activeProfile', null));
    const [customLists, setCustomLists] = useState(() => loadState('sp_lists', defaultCustomLists));
    const [parentApiKey, setParentApiKey] = useState(() => localStorage.getItem('sp_apiKey') || '');

    // Game state
    const [ttsMuted, setTtsMuted] = useState(false);

    // Save state changes to localStorage
    useEffect(() => {
        localStorage.setItem('sp_profiles', JSON.stringify(profiles));
    }, [profiles]);

    useEffect(() => {
        if (activeProfileId) localStorage.setItem('sp_activeProfile', JSON.stringify(activeProfileId));
    }, [activeProfileId]);

    useEffect(() => {
        localStorage.setItem('sp_lists', JSON.stringify(customLists));
    }, [customLists]);

    useEffect(() => {
        localStorage.setItem('sp_apiKey', parentApiKey);
    }, [parentApiKey]);

    // Actions
    const addProfile = (profile) => setProfiles([...profiles, { ...profile, id: Date.now().toString(), stars: 0, history: [], wordMastery: {} }]);
    const deleteProfile = (id) => setProfiles(profiles.filter(p => p.id !== id));

    const addStarToActive = (amount) => {
        setProfiles(profiles.map(p => p.id === activeProfileId ? { ...p, stars: p.stars + amount } : p));
    };

    const recordWordAttempt = (word, isCorrect) => {
        if (!activeProfileId) return;
        setProfiles(prevProfiles => prevProfiles.map(p => {
            if (p.id !== activeProfileId) return p;

            const currentMastery = p.wordMastery || {};
            const wordStats = currentMastery[word.toLowerCase()] || { attempts: 0, correct: 0 };

            return {
                ...p,
                wordMastery: {
                    ...currentMastery,
                    [word.toLowerCase()]: {
                        attempts: wordStats.attempts + 1,
                        correct: wordStats.correct + (isCorrect ? 1 : 0)
                    }
                }
            };
        }));
    };

    const activeProfile = profiles.find(p => p.id === activeProfileId);

    const value = {
        profiles,
        setProfiles,
        activeProfileId,
        setActiveProfileId,
        activeProfile,
        addProfile,
        deleteProfile,
        addStarToActive,
        recordWordAttempt,
        customLists,
        setCustomLists,
        parentApiKey,
        setParentApiKey,
        ttsMuted,
        setTtsMuted
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
