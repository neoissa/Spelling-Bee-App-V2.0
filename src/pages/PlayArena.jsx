import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { sounds, speakWord } from '../utils/audio';
import { triggerConfetti } from '../utils/confetti';
import { PRESET_LISTS } from '../data/presetLists';
import { generateShareableListUrl } from '../utils/syncManager';
import PhotoListScanner from '../components/PhotoListScanner';
import BulkListImporter from '../components/BulkListImporter';
import {
    ArrowLeft, Volume2, Gamepad2, Brain, Shuffle, PlusCircle,
    Trash2, Sparkles, Flame, CheckCircle2, RotateCcw, Award, Play,
    Camera, ClipboardList, Share2, Check, Edit3
} from 'lucide-react';

export default function PlayArena() {
    const navigate = useNavigate();
    const {
        activeProfile,
        customLists,
        setCustomLists,
        addStarToActive,
        recordWordAttempt,
        importPresetList,
        ttsMuted,
        setSyncNotification,
        getTrickyWords,
        getGraduatedWords
    } = useAppContext();

    const [selectedList, setSelectedList] = useState(null);
    const [selectedMode, setSelectedMode] = useState('classic');

    // Modals / Creation Views
    const [isCreatingList, setIsCreatingList] = useState(false);
    const [isScanningPhoto, setIsScanningPhoto] = useState(false);
    const [isBulkImporting, setIsBulkImporting] = useState(false);
    const [isEditingActiveList, setIsEditingActiveList] = useState(false);
    const [editingListObj, setEditingListObj] = useState(null);
    const [editWordInput, setEditWordInput] = useState('');
    const [editHintInput, setEditHintInput] = useState('');

    const [newListTitle, setNewListTitle] = useState('');
    const [newWord, setNewWord] = useState('');
    const [newHint, setNewHint] = useState('');
    const [createdWords, setCreatedWords] = useState([]);
    const [copiedListId, setCopiedListId] = useState(null);

    // Game State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userInput, setUserInput] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [highestStreak, setHighestStreak] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);

    // Memory Mode State
    const [memoryCountdown, setMemoryCountdown] = useState(3);
    const [isShowingFlash, setIsShowingFlash] = useState(false);

    // Scramble Mode State
    const [scrambledLetters, setScrambledLetters] = useState([]);
    const [scramblePlaced, setScramblePlaced] = useState([]);

    const inputRef = useRef(null);

    useEffect(() => {
        if (!activeProfile) {
            navigate('/');
        }
    }, [activeProfile, navigate]);

    const studentLists = customLists.filter(list => list.profileId === activeProfile?.id);
    const trickyWords = getTrickyWords ? getTrickyWords(activeProfile?.id) : [];
    const graduatedWords = getGraduatedWords ? getGraduatedWords(activeProfile?.id) : [];

    useEffect(() => {
        if (!selectedList && studentLists.length > 0) {
            setSelectedList(studentLists[0]);
        }
    }, [studentLists, selectedList]);

    useEffect(() => {
        if (!isPlaying || !selectedList || gameOver) return;

        const currentWordObj = selectedList.words[currentIndex];
        if (!currentWordObj) return;

        setUserInput('');
        setFeedback(null);

        speakWord(currentWordObj.word);

        if (selectedMode === 'memory') {
            setIsShowingFlash(true);
            setMemoryCountdown(3);

            const timer = setInterval(() => {
                setMemoryCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setIsShowingFlash(false);
                        setTimeout(() => inputRef.current?.focus(), 50);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        } else if (selectedMode === 'scramble') {
            const chars = currentWordObj.word.split('').map((char, id) => ({ char, id }));
            for (let i = chars.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [chars[i], chars[j]] = [chars[j], chars[i]];
            }
            setScrambledLetters(chars);
            setScramblePlaced([]);
        } else {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [currentIndex, isPlaying, selectedMode, selectedList, gameOver]);

    useEffect(() => {
        if (!isPlaying || selectedMode !== 'scramble' || gameOver || !selectedList) return;

        const handleKeyDown = (e) => {
            const currentWord = selectedList.words[currentIndex]?.word.toLowerCase();
            if (!currentWord) return;

            if (e.key === 'Backspace') {
                if (scramblePlaced.length > 0) {
                    sounds.playPop();
                    setScramblePlaced(prev => prev.slice(0, -1));
                }
            } else if (/^[a-zA-Z]$/.test(e.key)) {
                const pressedChar = e.key.toLowerCase();
                const available = scrambledLetters.find(l =>
                    l.char.toLowerCase() === pressedChar && !scramblePlaced.some(p => p.id === l.id)
                );
                if (available && scramblePlaced.length < currentWord.length) {
                    handlePlaceScrambleTile(available);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, selectedMode, scrambledLetters, scramblePlaced, currentIndex, selectedList, gameOver]);

    const handleEvaluateWord = (isCorrect) => {
        const currentWord = selectedList.words[currentIndex]?.word;
        const currentHint = selectedList.words[currentIndex]?.hint;
        recordWordAttempt(currentWord, isCorrect, currentHint);

        if (isCorrect) {
            sounds.playCorrect();
            const newStreak = streak + 1;
            setStreak(newStreak);
            if (newStreak > highestStreak) setHighestStreak(newStreak);
            if (newStreak % 3 === 0) sounds.playStreak();

            const earnedPoints = 10 + (newStreak > 1 ? newStreak * 2 : 0);
            setScore(s => s + earnedPoints);
            setCorrectCount(c => c + 1);
            addStarToActive(1);

            // Check if this correct attempt graduates the word (3 in a row)
            const normalized = (currentWord || '').trim().toLowerCase();
            const wordStats = activeProfile?.wordMastery?.[normalized];
            const isGraduating = wordStats && (wordStats.consecutiveCorrect || 0) + 1 >= 3;

            if (isGraduating) {
                triggerConfetti();
                sounds.playVictory();
                addStarToActive(2); // +2 bonus stars!
                setFeedback({
                    type: 'success',
                    message: `🎓 WORD MASTERED! You spelled "${currentWord}" 3 times in a row! +2 Bonus ⭐`
                });
            } else {
                setFeedback({
                    type: 'success',
                    message: newStreak > 2 ? `🔥 ${newStreak} in a row! Awesome!` : '⭐ Fantastic! Correct!'
                });
            }

            setTimeout(() => {
                if (currentIndex < selectedList.words.length - 1) {
                    setCurrentIndex(i => i + 1);
                } else {
                    setGameOver(true);
                    sounds.playVictory();
                    triggerConfetti();
                }
            }, isGraduating ? 1600 : 1200);
        } else {
            sounds.playWrong();
            setStreak(0);
            setFeedback({
                type: 'error',
                message: `Not quite! Saved to your "Tricky Words" basket for practice.`
            });
            speakWord("Try again. " + currentWord);
        }
    };

    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (!userInput.trim()) return;

        const targetWord = selectedList.words[currentIndex].word.trim().toLowerCase();
        const isMatch = userInput.trim().toLowerCase() === targetWord;
        handleEvaluateWord(isMatch);
    };

    const handlePlaceScrambleTile = (tileObj) => {
        sounds.playPop();
        const newPlaced = [...scramblePlaced, tileObj];
        setScramblePlaced(newPlaced);

        const targetWord = selectedList.words[currentIndex].word.toLowerCase();
        if (newPlaced.length === targetWord.length) {
            const formed = newPlaced.map(t => t.char).join('').toLowerCase();
            if (formed === targetWord) {
                handleEvaluateWord(true);
            } else {
                sounds.playWrong();
                setFeedback({ type: 'error', message: 'Letters are mixed up. Try again!' });
                setTimeout(() => {
                    setScramblePlaced([]);
                    setFeedback(null);
                }, 1000);
            }
        }
    };

    const handleRemoveScrambleTile = (index) => {
        sounds.playPop();
        setScramblePlaced(prev => prev.filter((_, i) => i !== index));
    };

    const handleStartGame = () => {
        if (!selectedList || selectedList.words.length === 0) return;
        sounds.playPop();
        setCurrentIndex(0);
        setScore(0);
        setStreak(0);
        setCorrectCount(0);
        setGameOver(false);
        setIsPlaying(true);
    };

    const handleResetArena = () => {
        sounds.playPop();
        setIsPlaying(false);
        setGameOver(false);
        setCurrentIndex(0);
        setScore(0);
        setStreak(0);
    };

    const handleSaveNewList = (e) => {
        e.preventDefault();
        if (!newListTitle.trim() || createdWords.length === 0) return;

        const created = {
            id: `list-${Date.now()}`,
            profileId: activeProfile.id,
            title: newListTitle,
            words: createdWords,
            scheduledDate: ''
        };

        setCustomLists([...customLists, created]);
        setSelectedList(created);
        setIsCreatingList(false);
        setNewListTitle('');
        setCreatedWords([]);
        sounds.playCorrect();
    };

    const handleAddWordToNewList = (e) => {
        e.preventDefault();
        if (!newWord.trim()) return;
        sounds.playPop();
        setCreatedWords([...createdWords, {
            word: newWord.trim().toLowerCase(),
            hint: newHint.trim() || 'Spelling practice word'
        }]);
        setNewWord('');
        setNewHint('');
    };

    const handleShareList = (e, list) => {
        e.stopPropagation();
        sounds.playPop();
        const url = generateShareableListUrl(list);
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url);
            setCopiedListId(list.id);
            setSyncNotification(`🔗 Copied share link for "${list.title}" to clipboard! Open it on Serena's PC.`);
            setTimeout(() => setCopiedListId(null), 3000);
        } else {
            prompt('Copy this shareable link and open it on Serena\'s PC:', url);
        }
    };

    const handleOpenEditList = (listToEdit) => {
        sounds.playPop();
        setEditingListObj({ ...listToEdit, words: [...listToEdit.words] });
        setIsEditingActiveList(true);
    };

    const handleSaveEditedList = (e) => {
        e.preventDefault();
        if (!editingListObj || editingListObj.words.length === 0) return;
        sounds.playVictory();

        setCustomLists(customLists.map(l => l.id === editingListObj.id ? editingListObj : l));
        setSelectedList(editingListObj);
        setIsEditingActiveList(false);
        setSyncNotification(`✨ Updated "${editingListObj.title}" with ${editingListObj.words.length} words!`);
        setTimeout(() => setSyncNotification(null), 3000);
    };

    const handleAddWordToEditList = (e) => {
        e.preventDefault();
        if (!editWordInput.trim()) return;
        sounds.playPop();
        setEditingListObj(prev => ({
            ...prev,
            words: [...prev.words, {
                word: editWordInput.trim().toLowerCase(),
                hint: editHintInput.trim() || 'Spelling practice word'
            }]
        }));
        setEditWordInput('');
        setEditHintInput('');
    };

    const handleRemoveWordFromEditList = (index) => {
        sounds.playPop();
        setEditingListObj(prev => ({
            ...prev,
            words: prev.words.filter((_, i) => i !== index)
        }));
    };

    const handleDeleteCustomList = (listId) => {
        if (window.confirm("Are you sure you want to delete this word list?")) {
            sounds.playPop();
            setCustomLists(customLists.filter(l => l.id !== listId));
            setIsEditingActiveList(false);
            if (selectedList?.id === listId) {
                const remaining = studentLists.filter(l => l.id !== listId);
                setSelectedList(remaining[0] || null);
            }
        }
    };

    if (!activeProfile) return null;

    if (isScanningPhoto) {
        return (
            <PhotoListScanner
                targetProfileId={activeProfile.id}
                onCancel={() => setIsScanningPhoto(false)}
                onListCreated={(createdList) => {
                    setSelectedList(createdList);
                    setIsScanningPhoto(false);
                }}
            />
        );
    }

    if (isBulkImporting) {
        return (
            <BulkListImporter
                targetProfileId={activeProfile.id}
                onCancel={() => setIsBulkImporting(false)}
                onListCreated={(createdList) => {
                    setSelectedList(createdList);
                    setIsBulkImporting(false);
                }}
            />
        );
    }

    if (isEditingActiveList && editingListObj) {
        return (
            <div className="animate-fade" style={{ maxWidth: '680px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                    <button
                        onClick={() => { sounds.playPop(); setIsEditingActiveList(false); }}
                        className="btn btn-secondary"
                    >
                        <ArrowLeft size={18} /> Back to Lists
                    </button>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: '#1E293B' }}>
                        ✏️ Edit Word List
                    </h2>
                    <button
                        onClick={() => handleDeleteCustomList(editingListObj.id)}
                        className="btn"
                        style={{ background: '#FEE2E2', color: '#DC2626', padding: '6px 12px', fontSize: '0.85rem' }}
                        title="Delete this entire list"
                    >
                        <Trash2 size={16} /> Delete List
                    </button>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px' }}>List Name</label>
                        <input
                            type="text"
                            value={editingListObj.title}
                            onChange={e => setEditingListObj({ ...editingListObj, title: e.target.value })}
                            className="input-field"
                            required
                            style={{ fontSize: '1.1rem', fontWeight: 600 }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => { sounds.playPop(); setIsBulkImporting(true); }}
                            className="btn btn-secondary"
                            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                        >
                            <ClipboardList size={16} /> 📋 Paste Extra Words
                        </button>
                        <button
                            type="button"
                            onClick={() => { sounds.playPop(); setIsScanningPhoto(true); }}
                            className="btn btn-primary"
                            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                        >
                            <Camera size={16} /> 📸 Scan More Words
                        </button>
                    </div>

                    {/* Add Word Form */}
                    <form onSubmit={handleAddWordToEditList} style={{ background: '#F8FAFC', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontWeight: 700, marginBottom: '10px', color: '#475569' }}>Add Word to List:</div>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <input
                                type="text"
                                placeholder="Word (e.g. delicious)"
                                value={editWordInput}
                                onChange={e => setEditWordInput(e.target.value)}
                                className="input-field"
                                style={{ flex: 1 }}
                            />
                            <button type="submit" className="btn btn-emerald" disabled={!editWordInput.trim()}>
                                + Add Word
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Optional clue / hint sentence"
                            value={editHintInput}
                            onChange={e => setEditHintInput(e.target.value)}
                            className="input-field"
                            style={{ fontSize: '0.9rem' }}
                        />
                    </form>

                    {/* Words List Container */}
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ fontWeight: 700, marginBottom: '10px', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Words in List ({editingListObj.words.length}):</span>
                            <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>Click ✕ to remove any word</span>
                        </div>

                        {editingListObj.words.length === 0 ? (
                            <p style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: '0.95rem' }}>No words in this list. Add some above!</p>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '220px', overflowY: 'auto', padding: '4px' }}>
                                {editingListObj.words.map((w, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            background: '#EEF2FF',
                                            color: '#3730A3',
                                            padding: '8px 14px',
                                            borderRadius: '9999px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontWeight: 600,
                                            border: '1px solid #C7D2FE',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                        }}
                                    >
                                        <span style={{ fontSize: '1rem', textTransform: 'lowercase' }}>{w.word}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveWordFromEditList(idx)}
                                            style={{
                                                background: '#FEE2E2',
                                                border: 'none',
                                                color: '#DC2626',
                                                cursor: 'pointer',
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold'
                                            }}
                                            title="Delete word"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSaveEditedList}
                        className="btn btn-emerald"
                        style={{ width: '100%', fontSize: '1.15rem', padding: '14px' }}
                        disabled={!editingListObj.title.trim() || editingListObj.words.length === 0}
                    >
                        💾 Save & Practice Now!
                    </button>
                </div>
            </div>
        );
    }

    if (isCreatingList) {
        return (
            <div className="animate-fade" style={{ maxWidth: '640px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <button
                        onClick={() => { sounds.playPop(); setIsCreatingList(false); }}
                        className="btn btn-secondary"
                    >
                        <ArrowLeft size={18} /> Back
                    </button>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem' }}>✨ Create Word List</h2>
                    <div style={{ width: '80px' }} />
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px' }}>List Name</label>
                        <input
                            type="text"
                            placeholder="e.g., Friday Spelling Test, Dinosaur Words..."
                            value={newListTitle}
                            onChange={e => setNewListTitle(e.target.value)}
                            className="input-field"
                            required
                        />
                    </div>

                    <form onSubmit={handleAddWordToNewList} style={{ background: '#F8FAFC', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontWeight: 700, marginBottom: '10px', color: '#475569' }}>Add Words:</div>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <input
                                type="text"
                                placeholder="Word (e.g., butterfly)"
                                value={newWord}
                                onChange={e => setNewWord(e.target.value)}
                                className="input-field"
                                style={{ flex: 1 }}
                            />
                            <button type="submit" className="btn btn-primary" disabled={!newWord.trim()}>
                                + Add
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Hint or sentence clue (optional)"
                            value={newHint}
                            onChange={e => setNewHint(e.target.value)}
                            className="input-field"
                            style={{ fontSize: '0.95rem' }}
                        />
                    </form>

                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontWeight: 700, marginBottom: '8px', color: '#475569' }}>
                            Words Added ({createdWords.length}):
                        </div>
                        {createdWords.length === 0 ? (
                            <p style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: '0.95rem' }}>No words added yet. Add some above!</p>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                                {createdWords.map((w, idx) => (
                                    <div key={idx} style={{ background: '#EEF2FF', color: '#3730A3', padding: '6px 12px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                        <span>{w.word}</span>
                                        <button
                                            onClick={() => { sounds.playPop(); setCreatedWords(createdWords.filter((_, i) => i !== idx)); }}
                                            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex' }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSaveNewList}
                        className="btn btn-emerald"
                        style={{ width: '100%', fontSize: '1.1rem' }}
                        disabled={!newListTitle.trim() || createdWords.length === 0}
                    >
                        Save & Start Playing!
                    </button>
                </div>
            </div>
        );
    }

    if (isPlaying && selectedList) {
        const currentWord = selectedList.words[currentIndex];

        if (gameOver) {
            return (
                <div className="animate-pop" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: '5rem', marginBottom: '16px' }}>🏆</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', color: '#1E293B', marginBottom: '8px' }}>
                        Awesome Job, {activeProfile.name}!
                    </h2>
                    <p style={{ color: '#64748B', fontSize: '1.15rem', marginBottom: '24px' }}>
                        You completed <strong>{selectedList.title}</strong>!
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
                        <div className="glass-panel" style={{ padding: '16px' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#4F46E5' }}>{score}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>Total Score</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '16px' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#F59E0B' }}>+{selectedList.words.length} ⭐</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>Stars Earned</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '16px' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#EA580C' }}>🔥 {highestStreak}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>Best Streak</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <button onClick={handleStartGame} className="btn btn-primary" style={{ padding: '14px 28px' }}>
                            <RotateCcw size={18} /> Play Again
                        </button>
                        <button onClick={handleResetArena} className="btn btn-secondary" style={{ padding: '14px 28px' }}>
                            Choose Another List
                        </button>
                    </div>
                </div>
            );
        }

        const progressPercent = ((currentIndex) / selectedList.words.length) * 100;

        return (
            <div className="animate-fade" style={{ maxWidth: '640px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <button
                        onClick={handleResetArena}
                        className="btn btn-secondary"
                        style={{ padding: '8px 14px', fontSize: '0.9rem' }}
                    >
                        <ArrowLeft size={16} /> Exit
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {streak > 1 && (
                            <div className="streak-badge">
                                <Flame size={16} /> {streak} Streak!
                            </div>
                        )}
                        <div style={{ background: '#FEF3C7', color: '#B45309', fontWeight: 700, padding: '6px 14px', borderRadius: '9999px', fontSize: '0.95rem' }}>
                            Score: {score}
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748B', fontWeight: 700, marginBottom: '6px' }}>
                        <span>Word {currentIndex + 1} of {selectedList.words.length}</span>
                        <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #4F46E5 0%, #06B6D4 100%)',
                            transition: 'width 0.4s ease-out'
                        }} />
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '32px 24px', textAlign: 'center' }}>
                    {!ttsMuted && (
                        <button
                            onClick={() => speakWord(currentWord?.word)}
                            className="btn-icon"
                            style={{
                                width: '64px',
                                height: '64px',
                                margin: '0 auto 16px',
                                background: '#EEF2FF',
                                color: '#4F46E5',
                                border: '2px solid #C7D2FE',
                                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)'
                            }}
                            title="Hear word again"
                        >
                            <Volume2 size={32} />
                        </button>
                    )}

                    <div style={{
                        background: '#F8FAFC',
                        border: '1px dashed #CBD5E1',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 20px',
                        marginBottom: '28px',
                        color: '#475569',
                        fontSize: '1.05rem',
                        fontStyle: 'italic'
                    }}>
                        "{currentWord?.hint || 'Listen carefully to the word'}"
                    </div>

                    {selectedMode === 'classic' && (
                        <form onSubmit={handleTextSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={userInput}
                                onChange={e => setUserInput(e.target.value)}
                                placeholder="Type the word here..."
                                className="game-input"
                                autoFocus
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck="false"
                            />
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ padding: '16px', fontSize: '1.2rem' }}
                                disabled={!userInput.trim()}
                            >
                                Submit Answer ✨
                            </button>
                        </form>
                    )}

                    {selectedMode === 'memory' && (
                        <div>
                            {isShowingFlash ? (
                                <div className="animate-pop" style={{ padding: '20px 0' }}>
                                    <div style={{ fontSize: '0.9rem', color: '#6B21A8', fontWeight: 700, marginBottom: '8px' }}>
                                        👀 Remember this word! ({memoryCountdown}s)
                                    </div>
                                    <div style={{
                                        fontFamily: 'var(--font-display)',
                                        fontSize: '3.5rem',
                                        fontWeight: 700,
                                        letterSpacing: '6px',
                                        color: '#6B21A8',
                                        textTransform: 'uppercase'
                                    }}>
                                        {currentWord?.word}
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleTextSubmit} className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={userInput}
                                        onChange={e => setUserInput(e.target.value)}
                                        placeholder="Remember it? Type here..."
                                        className="game-input"
                                        autoFocus
                                        autoComplete="off"
                                        spellCheck="false"
                                    />
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ padding: '16px', fontSize: '1.2rem', background: '#8B5CF6', boxShadow: '0 4px 0 #6D28D9' }}
                                        disabled={!userInput.trim()}
                                    >
                                        Check Memory 🧠
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {selectedMode === 'scramble' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                                {Array(currentWord?.word.length || 0).fill(0).map((_, i) => (
                                    <div
                                        key={i}
                                        onClick={() => i < scramblePlaced.length && handleRemoveScrambleTile(i)}
                                        className={`letter-tile ${scramblePlaced[i] ? 'slot-filled' : 'slot-tile'}`}
                                    >
                                        {scramblePlaced[i]?.char || ''}
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                {scrambledLetters.map((tile) => {
                                    const isUsed = scramblePlaced.some(p => p.id === tile.id);
                                    return (
                                        <button
                                            key={tile.id}
                                            onClick={() => handlePlaceScrambleTile(tile)}
                                            disabled={isUsed}
                                            className={`letter-tile available-tile ${isUsed ? 'tile-disabled' : ''}`}
                                        >
                                            {tile.char}
                                        </button>
                                    );
                                })}
                            </div>

                            <p style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
                                💡 Tap letters or use your keyboard to spell the word!
                            </p>
                        </div>
                    )}

                    {feedback && (
                        <div className={`feedback-box ${feedback.type === 'success' ? 'feedback-success' : 'feedback-error'}`}>
                            {feedback.message}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: '#1E293B' }}>
                        Ready to Play, {activeProfile.name}? 🚀
                    </h2>
                    <p style={{ color: '#64748B', fontSize: '1rem' }}>
                        Select a list and your favorite game mode to begin!
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => { sounds.playPop(); setIsBulkImporting(true); }}
                        className="btn btn-secondary"
                        style={{ padding: '10px 16px', fontSize: '0.95rem' }}
                    >
                        <ClipboardList size={18} /> 📋 Paste Words
                    </button>

                    <button
                        onClick={() => { sounds.playPop(); setIsScanningPhoto(true); }}
                        className="btn btn-primary"
                        style={{ padding: '10px 16px', fontSize: '0.95rem' }}
                    >
                        <Camera size={18} /> 📸 Scan Photo
                    </button>

                    <button
                        onClick={() => { sounds.playPop(); setIsCreatingList(true); }}
                        className="btn btn-amber"
                        style={{ padding: '10px 16px', fontSize: '0.95rem' }}
                    >
                        <PlusCircle size={18} /> + Custom List
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                <div className="card-elevated" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1E293B' }}>1. Choose Word List</span>
                        <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>
                            {studentLists.length} Lists
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                        {/* Spaced Repetition Tricky Words Review Card */}
                        {trickyWords.length > 0 && (
                            <div
                                onClick={() => {
                                    sounds.playPop();
                                    setSelectedList({
                                        id: 'tricky-words-virtual',
                                        profileId: activeProfile.id,
                                        title: '🔥 Tricky Words Power-Up',
                                        words: trickyWords.map(tw => ({ word: tw.word, hint: tw.hint || 'Tricky practice word' }))
                                    });
                                }}
                                style={{
                                    background: selectedList?.id === 'tricky-words-virtual' ? 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' : '#FFFBEB',
                                    border: selectedList?.id === 'tricky-words-virtual' ? '2px solid #F59E0B' : '1px solid #FCD34D',
                                    padding: '14px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: '6px',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '1.4rem' }}>🔥</span>
                                        <div>
                                            <strong style={{ color: '#92400E', fontSize: '1rem', display: 'block' }}>
                                                Tricky Words Power-Up ({trickyWords.length})
                                            </strong>
                                            <span style={{ fontSize: '0.75rem', color: '#B45309' }}>
                                                Spell correctly 3 times in a row to graduate!
                                            </span>
                                        </div>
                                    </div>
                                    {selectedList?.id === 'tricky-words-virtual' && <CheckCircle2 size={20} color="#D97706" />}
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                    {trickyWords.slice(0, 6).map(tw => (
                                        <span
                                            key={tw.word}
                                            style={{
                                                background: '#FFFFFF',
                                                border: '1px solid #FDE68A',
                                                color: '#78350F',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            {tw.word}
                                            <span style={{ color: '#F59E0B', fontSize: '0.65rem' }}>
                                                {tw.consecutive === 0 ? '☆☆☆' : tw.consecutive === 1 ? '⭐☆☆' : '⭐⭐☆'}
                                            </span>
                                        </span>
                                    ))}
                                    {trickyWords.length > 6 && (
                                        <span style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 600, alignSelf: 'center' }}>
                                            +{trickyWords.length - 6} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {studentLists.map(list => {
                            const isSelected = selectedList?.id === list.id;
                            const isCopied = copiedListId === list.id;
                            return (
                                <div
                                    key={list.id}
                                    onClick={() => { sounds.playPop(); setSelectedList(list); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 16px',
                                        borderRadius: 'var(--radius-md)',
                                        border: isSelected ? '2px solid #4F46E5' : '1px solid #E2E8F0',
                                        background: isSelected ? '#EEF2FF' : '#FFFFFF',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 700, color: isSelected ? '#3730A3' : '#1E293B', fontSize: '1rem' }}>
                                            {list.title}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                                            {list.words.length} words
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {/* Edit Words Button */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenEditList(list); }}
                                            style={{
                                                background: '#EEF2FF',
                                                border: '1px solid #C7D2FE',
                                                color: '#4F46E5',
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                            title="Edit or add words to this list"
                                        >
                                            <Edit3 size={13} /> Edit
                                        </button>

                                        {/* Share Link Button for Serena's PC */}
                                        <button
                                            onClick={(e) => handleShareList(e, list)}
                                            style={{
                                                background: isCopied ? '#D1FAE5' : '#F1F5F9',
                                                border: '1px solid #CBD5E1',
                                                color: isCopied ? '#065F46' : '#475569',
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                            title="Copy link to send to Serena's PC"
                                        >
                                            {isCopied ? <Check size={13} /> : <Share2 size={13} />}
                                            {isCopied ? 'Copied!' : 'Share'}
                                        </button>
                                        {isSelected && <CheckCircle2 size={20} color="#4F46E5" />}
                                    </div>
                                </div>
                            );
                        })}

                        <div style={{ marginTop: '12px', borderTop: '1px dashed #E2E8F0', paddingTop: '10px' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                                💡 Preset Curriculums (Click to Add):
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {PRESET_LISTS.map(preset => (
                                    <button
                                        key={preset.id}
                                        onClick={() => {
                                            sounds.playPop();
                                            importPresetList(activeProfile.id, preset.id);
                                        }}
                                        style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            background: '#F1F5F9',
                                            border: '1px solid #CBD5E1',
                                            cursor: 'pointer',
                                            color: '#475569'
                                        }}
                                    >
                                        + {preset.icon} {preset.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card-elevated" style={{ padding: '20px' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1E293B', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                        2. Choose Game Mode
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div
                            onClick={() => { sounds.playPop(); setSelectedMode('classic'); }}
                            className={`mode-card mode-classic`}
                            style={{
                                outline: selectedMode === 'classic' ? '3px solid #4F46E5' : 'none'
                            }}
                        >
                            <Gamepad2 size={28} />
                            <div>
                                <strong style={{ fontSize: '1.05rem', display: 'block' }}>Classic Test</strong>
                                <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>Listen to the word and type it out.</span>
                            </div>
                        </div>

                        <div
                            onClick={() => { sounds.playPop(); setSelectedMode('memory'); }}
                            className={`mode-card mode-memory`}
                            style={{
                                outline: selectedMode === 'memory' ? '3px solid #8B5CF6' : 'none'
                            }}
                        >
                            <Brain size={28} />
                            <div>
                                <strong style={{ fontSize: '1.05rem', display: 'block' }}>Memory Flash</strong>
                                <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>See word for 3s, then spell from memory!</span>
                            </div>
                        </div>

                        <div
                            onClick={() => { sounds.playPop(); setSelectedMode('scramble'); }}
                            className={`mode-card mode-scramble`}
                            style={{
                                outline: selectedMode === 'scramble' ? '3px solid #10B981' : 'none'
                            }}
                        >
                            <Shuffle size={28} />
                            <div>
                                <strong style={{ fontSize: '1.05rem', display: 'block' }}>Word Scramble</strong>
                                <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>Unscramble the jumbled letter tiles.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ textAlign: 'center' }}>
                <button
                    onClick={handleStartGame}
                    disabled={!selectedList || selectedList.words.length === 0}
                    className="btn btn-coral"
                    style={{
                        padding: '16px 48px',
                        fontSize: '1.3rem',
                        borderRadius: 'var(--radius-lg)',
                        width: '100%',
                        maxWidth: '400px'
                    }}
                >
                    <Play size={24} /> Play Now!
                </button>
            </div>
        </div>
    );
}
