import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { sounds } from '../utils/audio';
import { PRESET_LISTS } from '../data/presetLists';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

// Initial starter profiles if localStorage is empty
const defaultProfiles = [
    { id: '1', name: 'Ali', avatar: '🦁', color: '#4F46E5', grade: '1st Grade', stars: 45, wordMastery: {} },
    { id: '2', name: 'Serena', avatar: '🦄', color: '#EC4899', grade: '3rd Grade', stars: 120, wordMastery: {} }
];

const defaultCustomLists = [
    {
        id: 'l1',
        profileId: '1',
        title: '🦁 Fun Animals',
        words: [
            { word: 'lion', hint: 'Known as the king of the jungle' },
            { word: 'zebra', hint: 'Has black and white stripes all over' },
            { word: 'tiger', hint: 'A large wild cat with orange and black stripes' },
            { word: 'puppy', hint: 'A playful baby dog' }
        ],
        scheduledDate: ''
    },
    {
        id: 'l2',
        profileId: '2',
        title: '🌌 Solar System',
        words: [
            { word: 'planet', hint: 'Earth is one of eight in our solar system' },
            { word: 'galaxy', hint: 'A massive system of millions of stars' },
            { word: 'rocket', hint: 'Blasts off from Earth into space' },
            { word: 'comet', hint: 'A glowing ball of ice and dust flying through space' }
        ],
        scheduledDate: ''
    }
];

export const AppProvider = ({ children }) => {
    const loadState = (key, defaultVal) => {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : defaultVal;
        } catch (e) {
            console.error('Failed loading localStorage key:', key, e);
            return defaultVal;
        }
    };

    const [profiles, setProfiles] = useState(() => loadState('sp_profiles_v2', defaultProfiles));
    const [activeProfileId, setActiveProfileId] = useState(() => loadState('sp_activeProfile_v2', '1'));
    const [customLists, setCustomLists] = useState(() => loadState('sp_lists_v2', defaultCustomLists));
    const [parentApiKey, setParentApiKey] = useState(() => localStorage.getItem('sp_apiKey') || '');
    const [ttsMuted, setTtsMuted] = useState(() => loadState('sp_muted', false));

    // Sync sound mute with audio engine
    useEffect(() => {
        sounds.setMuted(ttsMuted);
        localStorage.setItem('sp_muted', JSON.stringify(ttsMuted));
    }, [ttsMuted]);

    // Save state changes to localStorage
    useEffect(() => {
        localStorage.setItem('sp_profiles_v2', JSON.stringify(profiles));
    }, [profiles]);

    useEffect(() => {
        if (activeProfileId) {
            localStorage.setItem('sp_activeProfile_v2', JSON.stringify(activeProfileId));
        }
    }, [activeProfileId]);

    useEffect(() => {
        localStorage.setItem('sp_lists_v2', JSON.stringify(customLists));
    }, [customLists]);

    useEffect(() => {
        localStorage.setItem('sp_apiKey', parentApiKey);
    }, [parentApiKey]);

    // Profile Actions
    const addProfile = useCallback((profile) => {
        const newId = Date.now().toString();
        const createdProfile = {
            ...profile,
            id: newId,
            stars: 0,
            wordMastery: {}
        };
        setProfiles(prev => [...prev, createdProfile]);

        // Auto-assign starter preset list based on grade or default
        const matchingPreset = PRESET_LISTS.find(p => p.grade === profile.grade) || PRESET_LISTS[1];
        if (matchingPreset) {
            setCustomLists(prev => [...prev, {
                id: `list-${Date.now()}`,
                profileId: newId,
                title: `${matchingPreset.icon} ${matchingPreset.title}`,
                words: matchingPreset.words,
                scheduledDate: ''
            }]);
        }
        return newId;
    }, []);

    const updateProfile = useCallback((id, updates) => {
        setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }, []);

    const deleteProfile = useCallback((id) => {
        setProfiles(prev => prev.filter(p => p.id !== id));
        setCustomLists(prev => prev.filter(l => l.profileId !== id));
        if (activeProfileId === id) {
            setActiveProfileId(null);
        }
    }, [activeProfileId]);

    const addStarToActive = useCallback((amount = 1) => {
        if (!activeProfileId) return;
        setProfiles(prev => prev.map(p =>
            p.id === activeProfileId ? { ...p, stars: Math.max(0, (p.stars || 0) + amount) } : p
        ));
    }, [activeProfileId]);

    const recordWordAttempt = useCallback((word, isCorrect) => {
        if (!activeProfileId || !word) return;
        const normalized = word.trim().toLowerCase();

        setProfiles(prevProfiles => prevProfiles.map(p => {
            if (p.id !== activeProfileId) return p;

            const currentMastery = p.wordMastery || {};
            const wordStats = currentMastery[normalized] || { attempts: 0, correct: 0, lastPracticed: null };

            return {
                ...p,
                wordMastery: {
                    ...currentMastery,
                    [normalized]: {
                        attempts: wordStats.attempts + 1,
                        correct: wordStats.correct + (isCorrect ? 1 : 0),
                        lastPracticed: new Date().toISOString()
                    }
                }
            };
        }));
    }, [activeProfileId]);

    // Import preset list for a profile
    const importPresetList = useCallback((profileId, presetId) => {
        const preset = PRESET_LISTS.find(p => p.id === presetId);
        if (!preset) return;

        const newList = {
            id: `list-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            profileId,
            title: `${preset.icon} ${preset.title}`,
            words: [...preset.words],
            scheduledDate: ''
        };
        setCustomLists(prev => [...prev, newList]);
        return newList.id;
    }, []);

    const activeProfile = useMemo(() => {
        return profiles.find(p => p.id === activeProfileId) || profiles[0] || null;
    }, [profiles, activeProfileId]);

    const value = useMemo(() => ({
        profiles,
        setProfiles,
        activeProfileId,
        setActiveProfileId,
        activeProfile,
        addProfile,
        updateProfile,
        deleteProfile,
        addStarToActive,
        recordWordAttempt,
        customLists,
        setCustomLists,
        importPresetList,
        parentApiKey,
        setParentApiKey,
        ttsMuted,
        setTtsMuted
    }), [
        profiles,
        activeProfileId,
        activeProfile,
        addProfile,
        updateProfile,
        deleteProfile,
        addStarToActive,
        recordWordAttempt,
        customLists,
        importPresetList,
        parentApiKey,
        ttsMuted
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
