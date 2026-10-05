import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { sounds } from '../utils/audio';
import { PRESET_LISTS } from '../data/presetLists';
import { parseSharedListFromUrl, importFullBackupCode } from '../utils/syncManager';
import { pushStateToCloudRoom, fetchStateFromCloudRoom, normalizeRoomCode } from '../utils/cloudSync';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

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
    const [activeProfileId, setActiveProfileId] = useState(() => loadState('sp_activeProfile_v2', '2')); // Default to Serena ('2') or 1
    const [customLists, setCustomLists] = useState(() => loadState('sp_lists_v2', defaultCustomLists));
    const [parentApiKey, setParentApiKey] = useState(() => localStorage.getItem('sp_apiKey') || '');
    const [ttsMuted, setTtsMuted] = useState(() => loadState('sp_muted', false));
    const [syncNotification, setSyncNotification] = useState(null);

    // Continuous Cloud Sync State
    const [cloudRoomCode, setCloudRoomCode] = useState(() => localStorage.getItem('sp_cloud_room') || '');
    const [cloudSyncStatus, setCloudSyncStatus] = useState(() => localStorage.getItem('sp_cloud_room') ? 'connected' : 'disconnected');
    const lastCloudTimestampRef = useRef(0);
    const isLocalPushingRef = useRef(false);

    const connectCloudRoom = useCallback(async (code) => {
        const clean = normalizeRoomCode(code);
        if (!clean) return;
        setCloudSyncStatus('syncing');
        localStorage.setItem('sp_cloud_room', clean);
        setCloudRoomCode(clean);

        // Try fetching existing cloud room data
        const remote = await fetchStateFromCloudRoom(clean);
        if (remote && remote.profiles && remote.customLists) {
            setProfiles(remote.profiles);
            setCustomLists(remote.customLists);
            lastCloudTimestampRef.current = remote.updatedAt || Date.now();
            setCloudSyncStatus('connected');
            sounds.playVictory();
            setSyncNotification(`⚡ Connected to Family Room "${clean}"! Synced all lists.`);
        } else {
            // Create initial state in cloud room
            const pushRes = await pushStateToCloudRoom(clean, profiles, customLists);
            lastCloudTimestampRef.current = pushRes?.updatedAt || Date.now();
            setCloudSyncStatus('connected');
            sounds.playVictory();
            setSyncNotification(`⚡ Created Family Room "${clean}"! Connect other devices with this code.`);
        }
        setTimeout(() => setSyncNotification(null), 5000);
    }, [profiles, customLists]);

    const disconnectCloudRoom = useCallback(() => {
        localStorage.removeItem('sp_cloud_room');
        setCloudRoomCode('');
        setCloudSyncStatus('disconnected');
        sounds.playPop();
        setSyncNotification('Disconnected from Cloud Sync Room.');
        setTimeout(() => setSyncNotification(null), 3000);
    }, []);

    // Continuous Background Sync - Polling & Tab Focus
    useEffect(() => {
        if (!cloudRoomCode) return;

        const checkRemote = async () => {
            if (isLocalPushingRef.current) return;
            try {
                const remote = await fetchStateFromCloudRoom(cloudRoomCode);
                if (remote && remote.updatedAt > (lastCloudTimestampRef.current + 500)) {
                    lastCloudTimestampRef.current = remote.updatedAt;
                    setProfiles(remote.profiles);
                    setCustomLists(remote.customLists);
                    sounds.playPop();
                    setSyncNotification(`⚡ Live Sync: Updated word lists from family device!`);
                    setTimeout(() => setSyncNotification(null), 4000);
                }
            } catch (e) {
                console.error('Background poll error:', e);
            }
        };

        const intervalId = setInterval(checkRemote, 4000);
        const handleFocus = () => checkRemote();
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleFocus);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleFocus);
        };
    }, [cloudRoomCode]);

    // Continuous Push on Local State Changes
    useEffect(() => {
        if (!cloudRoomCode) return;

        const timer = setTimeout(async () => {
            isLocalPushingRef.current = true;
            try {
                const res = await pushStateToCloudRoom(cloudRoomCode, profiles, customLists);
                if (res && res.updatedAt) {
                    lastCloudTimestampRef.current = res.updatedAt;
                    setCloudSyncStatus('connected');
                }
            } catch (e) {
                console.error('Cloud auto-push error:', e);
            } finally {
                isLocalPushingRef.current = false;
            }
        }, 1200);

        return () => clearTimeout(timer);
    }, [profiles, customLists, cloudRoomCode]);

    // Auto-import shared list if opened via shareable URL link on Serena's PC
    useEffect(() => {
        const shared = parseSharedListFromUrl();
        if (shared && shared.words && shared.words.length > 0) {
            // Find Serena's profile or active profile
            const targetProfile = profiles.find(p => p.name.toLowerCase() === 'serena') || profiles[0];
            const targetId = targetProfile ? targetProfile.id : '2';

            const newList = {
                id: `shared-${Date.now()}`,
                profileId: targetId,
                title: shared.title || '📥 Shared Word List',
                words: shared.words,
                scheduledDate: ''
            };

            setCustomLists(prev => {
                // Avoid duplicate if list title and word count already exists
                const exists = prev.some(l => l.profileId === targetId && l.title === newList.title && l.words.length === newList.words.length);
                if (exists) return prev;
                return [newList, ...prev];
            });

            if (targetProfile) {
                setActiveProfileId(targetProfile.id);
            }

            setSyncNotification(`✨ Added "${newList.title}" with ${newList.words.length} words to ${targetProfile?.name || 'profile'}!`);
            sounds.playVictory();

            // Clear URL parameter cleanly without reloading page
            const cleanUrl = window.location.href.split('?')[0];
            window.history.replaceState({}, document.title, cleanUrl);

            setTimeout(() => setSyncNotification(null), 6000);
        }
    }, [profiles]);

    useEffect(() => {
        sounds.setMuted(ttsMuted);
        localStorage.setItem('sp_muted', JSON.stringify(ttsMuted));
    }, [ttsMuted]);

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

    const addProfile = useCallback((profile) => {
        const newId = Date.now().toString();
        const createdProfile = {
            ...profile,
            id: newId,
            stars: 0,
            wordMastery: {}
        };
        setProfiles(prev => [...prev, createdProfile]);

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

    const recordWordAttempt = useCallback((word, isCorrect, hint = '') => {
        if (!activeProfileId || !word) return;
        const normalized = word.trim().toLowerCase();

        setProfiles(prevProfiles => prevProfiles.map(p => {
            if (p.id !== activeProfileId) return p;

            const currentMastery = p.wordMastery || {};
            const wordStats = currentMastery[normalized] || {
                attempts: 0,
                correct: 0,
                consecutiveCorrect: 0,
                graduated: false,
                hint: hint || 'Spelling word',
                lastPracticed: null
            };

            const newConsecutive = isCorrect ? (wordStats.consecutiveCorrect || 0) + 1 : 0;
            const willGraduate = newConsecutive >= 3;

            return {
                ...p,
                wordMastery: {
                    ...currentMastery,
                    [normalized]: {
                        ...wordStats,
                        hint: hint || wordStats.hint || 'Spelling word',
                        attempts: (wordStats.attempts || 0) + 1,
                        correct: (wordStats.correct || 0) + (isCorrect ? 1 : 0),
                        consecutiveCorrect: newConsecutive,
                        graduated: willGraduate,
                        lastPracticed: new Date().toISOString(),
                        lastResult: isCorrect ? 'correct' : 'wrong'
                    }
                }
            };
        }));
    }, [activeProfileId]);

    const getTrickyWords = useCallback((profileId = activeProfileId) => {
        const target = profiles.find(p => p.id === profileId);
        if (!target || !target.wordMastery) return [];

        return Object.entries(target.wordMastery)
            .filter(([_, stats]) => !stats.graduated && (stats.attempts > stats.correct || (stats.consecutiveCorrect || 0) < 3))
            .map(([word, stats]) => ({
                word,
                hint: stats.hint || 'Review word',
                consecutive: stats.consecutiveCorrect || 0,
                attempts: stats.attempts || 0,
                correct: stats.correct || 0
            }));
    }, [profiles, activeProfileId]);

    const getGraduatedWords = useCallback((profileId = activeProfileId) => {
        const target = profiles.find(p => p.id === profileId);
        if (!target || !target.wordMastery) return [];

        return Object.entries(target.wordMastery)
            .filter(([_, stats]) => stats.graduated || (stats.consecutiveCorrect || 0) >= 3)
            .map(([word, stats]) => ({
                word,
                hint: stats.hint || 'Mastered word',
                consecutive: stats.consecutiveCorrect || 3,
                attempts: stats.attempts || 0,
                correct: stats.correct || 0
            }));
    }, [profiles, activeProfileId]);

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

    // Full backup restoration
    const restoreFromSyncCode = useCallback((codeString) => {
        const data = importFullBackupCode(codeString);
        setProfiles(data.profiles);
        setCustomLists(data.customLists);
        if (data.profiles.length > 0) {
            setActiveProfileId(data.profiles[0].id);
        }
        sounds.playVictory();
        setSyncNotification('🎉 All student profiles & word lists synced successfully!');
        setTimeout(() => setSyncNotification(null), 5000);
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
        restoreFromSyncCode,
        syncNotification,
        setSyncNotification,
        parentApiKey,
        setParentApiKey,
        ttsMuted,
        setTtsMuted,
        cloudRoomCode,
        cloudSyncStatus,
        connectCloudRoom,
        disconnectCloudRoom,
        getTrickyWords,
        getGraduatedWords
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
        restoreFromSyncCode,
        syncNotification,
        parentApiKey,
        ttsMuted,
        cloudRoomCode,
        cloudSyncStatus,
        connectCloudRoom,
        disconnectCloudRoom,
        getTrickyWords,
        getGraduatedWords
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
