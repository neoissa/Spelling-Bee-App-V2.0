import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Volume2, Gamepad2, Brain, Shuffle, PlusCircle, Trash2, Edit2 } from 'lucide-react';

export default function PlayArena() {
    const navigate = useNavigate();
    const { activeProfile, customLists, setCustomLists, addStarToActive, recordWordAttempt, ttsMuted } = useAppContext();

    const [selectedList, setSelectedList] = useState(null);
    const [selectedMode, setSelectedMode] = useState(null); // 'classic', 'memory', 'scramble'

    // Child List Creation State
    const [isCreatingList, setIsCreatingList] = useState(false);
    const [editingListId, setEditingListId] = useState(null);
    const [newListTitle, setNewListTitle] = useState('');
    const [newWord, setNewWord] = useState('');
    const [newHint, setNewHint] = useState('');

    // Game State
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userInput, setUserInput] = useState('');
    const [feedback, setFeedback] = useState('');
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);

    // Memory Mode State
    const [showFlashWord, setShowFlashWord] = useState(false);

    // Scramble Mode State
    const [scrambledLetters, setScrambledLetters] = useState([]);
    const [scramblePlaced, setScramblePlaced] = useState([]);

    useEffect(() => {
        if (!activeProfile) navigate('/');
    }, [activeProfile, navigate]);

    const speakWord = (textToSpeak) => {
        if (ttsMuted) return;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(textToSpeak || selectedList.words[currentIndex].word);
            utterance.rate = 0.8;
            utterance.pitch = 1.2;
            window.speechSynthesis.speak(utterance);
        }
    };

    // Initialize Word State when moving to next word or mode change
    useEffect(() => {
        if (selectedMode && selectedList && !gameOver) {
            const currentWordObj = selectedList.words[currentIndex];

            if (selectedMode === 'memory') {
                setShowFlashWord(true);
                speakWord(currentWordObj.word);
                setTimeout(() => setShowFlashWord(false), 3000);
            } else if (selectedMode === 'scramble') {
                const letters = currentWordObj.word.split('');
                for (let i = letters.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [letters[i], letters[j]] = [letters[j], letters[i]];
                }
                setScrambledLetters(letters.map((char, id) => ({ char, id })));
                setScramblePlaced([]);
                speakWord(currentWordObj.word);
            } else {
                speakWord(currentWordObj.word);
            }
        }
    }, [currentIndex, selectedMode, selectedList, gameOver]);

    const handleNextWord = (isCorrect) => {
        if (selectedList && selectedList.words[currentIndex]) {
            recordWordAttempt(selectedList.words[currentIndex].word, isCorrect);
        }

        if (isCorrect) {
            setFeedback('Correct! 🌟');
            setScore(s => s + 10);
            speakWord("Correct!");
            addStarToActive(1);
        } else {
            setFeedback('Not quite, try again!');
            speakWord("Try again");
            return;
        }

        setTimeout(() => {
            setFeedback('');
            setUserInput('');
            if (currentIndex < selectedList.words.length - 1) {
                setCurrentIndex(i => i + 1);
            } else {
                setGameOver(true);
                speakWord("You finished the list! Great job!");
            }
        }, 1500);
    };

    const handleClassicSubmit = (e) => {
        e.preventDefault();
        if (!userInput.trim()) return;
        const isCorrect = userInput.trim().toLowerCase() === selectedList.words[currentIndex].word.toLowerCase();
        handleNextWord(isCorrect);
    };

    const handleMemorySubmit = handleClassicSubmit;

    const handleScrambleTileClick = (letterObj) => {
        if (scramblePlaced.find(p => p.id === letterObj.id)) return;
        const newPlaced = [...scramblePlaced, letterObj];
        setScramblePlaced(newPlaced);

        if (newPlaced.length === selectedList.words[currentIndex].word.length) {
            const formedWord = newPlaced.map(l => l.char).join('').toLowerCase();
            const targetWord = selectedList.words[currentIndex].word.toLowerCase();

            if (formedWord === targetWord) {
                handleNextWord(true);
            } else {
                setFeedback("Oops! That's not it.");
                speakWord("Oops, puzzle is mixed up. Try again.");
                setTimeout(() => { setScramblePlaced([]); setFeedback(''); }, 1500);
            }
        }
    };

    const removeScrambleTile = (indexToRemove) => {
        setScramblePlaced(scramblePlaced.filter((_, i) => i !== indexToRemove));
    };

    // --- Child List Management Logic ---
    const handleCreateChildList = (e) => {
        e.preventDefault();
        if (!newListTitle.trim()) return;
        const newList = { id: Date.now().toString(), profileId: activeProfile.id, title: newListTitle, words: [], scheduledDate: '' };
        setCustomLists([...customLists, newList]);
        setEditingListId(newList.id);
        setIsCreatingList(false); // Move to edit mode
    };

    const handleAddWordToChildList = (e) => {
        e.preventDefault();
        if (!newWord.trim() || !editingListId) return;

        setCustomLists(customLists.map(list => {
            if (list.id === editingListId) {
                return { ...list, words: [...list.words, { word: newWord.toLowerCase(), hint: newHint || "No hint provided" }] };
            }
            return list;
        }));
        setNewWord('');
        setNewHint('');
    };

    const removeWordFromChildList = (listId, wordIndex) => {
        setCustomLists(customLists.map(list => {
            if (list.id === listId) {
                return { ...list, words: list.words.filter((_, idx) => idx !== wordIndex) };
            }
            return list;
        }));
    };

    if (!activeProfile) return null;

    const sortedLists = customLists
        .filter(list => list.profileId === activeProfile.id)
        .sort((a, b) => {
            if (a.scheduledDate && !b.scheduledDate) return -1;
            if (!a.scheduledDate && b.scheduledDate) return 1;
            if (a.scheduledDate && b.scheduledDate) return new Date(a.scheduledDate) - new Date(b.scheduledDate);
            return 0;
        });

    // VIEW 3: CHILD LIST CREATOR / EDITOR
    if (isCreatingList || editingListId) {
        const activeEditingList = customLists.find(l => l.id === editingListId);

        return (
            <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px', gap: '15px' }}>
                    <button onClick={() => { setIsCreatingList(false); setEditingListId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                        <ArrowLeft size={24} /> Back to Arena
                    </button>
                    <h2 style={{ fontSize: '2rem', color: '#333', margin: 0 }}>
                        {isCreatingList ? '✨ Make a New List ✨' : '✏️ Editing Your List'}
                    </h2>
                </div>

                <div className="glass-panel" style={{ padding: '30px', background: 'white' }}>
                    {isCreatingList ? (
                        <form onSubmit={handleCreateChildList}>
                            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', fontSize: '1.2rem' }}>What do you want to call your list?</label>
                            <input
                                type="text"
                                value={newListTitle}
                                onChange={e => setNewListTitle(e.target.value)}
                                placeholder="e.g., Space Words, or May 24th"
                                required
                                style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '2px solid #ccc', fontSize: '1.2rem', marginBottom: '20px' }}
                            />
                            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '15px', fontSize: '1.2rem' }}>Start Adding Words!</button>
                        </form>
                    ) : (
                        <div>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                                Adding words to: <span style={{ color: 'var(--primary-red)' }}>{activeEditingList?.title}</span>
                            </h3>

                            <form onSubmit={handleAddWordToChildList} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px', background: '#f5f5f5', padding: '20px', borderRadius: '15px' }}>
                                <input
                                    type="text"
                                    required
                                    placeholder="Type the spelling word here..."
                                    value={newWord}
                                    onChange={e => setNewWord(e.target.value)}
                                    style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ccc', fontSize: '1.1rem' }}
                                />
                                <input
                                    type="text"
                                    placeholder="Add a fun hint! (optional)"
                                    value={newHint}
                                    onChange={e => setNewHint(e.target.value)}
                                    style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ccc', fontSize: '1.1rem' }}
                                />
                                <button type="submit" className="btn-primary" style={{ padding: '12px' }}>+ Add to List</button>
                            </form>

                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                <h4 style={{ color: '#666', marginBottom: '10px' }}>Words in this list:</h4>
                                {activeEditingList?.words.length === 0 && <p style={{ color: '#aaa', fontStyle: 'italic' }}>No words yet! Add some above.</p>}
                                {activeEditingList?.words.map((w, idx) => (
                                    <div key={idx} style={{ padding: '15px', background: 'white', border: '2px solid #eee', borderRadius: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong style={{ fontSize: '1.2rem', display: 'block' }}>{w.word}</strong>
                                            <span style={{ color: '#666' }}>{w.hint}</span>
                                        </div>
                                        <button onClick={() => removeWordFromChildList(editingListId, idx)} style={{ background: '#ffebee', border: 'none', color: '#ff4b4b', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}>
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => setEditingListId(null)} className="btn-primary" style={{ width: '100%', marginTop: '20px', background: 'var(--primary-yellow)', color: '#333' }}>
                                Done Editing!
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // VIEW 1: SELECTION MENU
    if (!selectedList || !selectedMode) {
        return (
            <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2rem' }}>
                    Welcome, {activeProfile.name}! 👋
                </h2>

                <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                    {/* List Selection */}
                    <div className="glass-panel" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>1. Pick a Word List</h3>

                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '15px' }}>
                            {sortedLists.map(list => (
                                <div
                                    key={list.id}
                                    style={{
                                        display: 'flex', alignItems: 'center', marginBottom: '10px',
                                        background: selectedList?.id === list.id ? '#e3f2fd' : 'white',
                                        border: selectedList?.id === list.id ? '2px solid #2196f3' : '2px solid #eee',
                                        borderRadius: '10px', overflow: 'hidden'
                                    }}
                                >
                                    <div
                                        onClick={() => setSelectedList(list)}
                                        style={{
                                            flex: 1, padding: '15px', cursor: 'pointer', fontWeight: 'bold',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span>{list.title}</span>
                                            {list.scheduledDate && (
                                                <span style={{ fontSize: '0.8rem', color: '#ff9800', marginTop: '4px' }}>
                                                    📅 Due: {new Date(list.scheduledDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        <span style={{ color: '#888', fontWeight: 'normal' }}>{list.words.length} words</span>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditingListId(list.id); setNewListTitle(list.title); }}
                                        style={{ padding: '0 15px', background: 'none', border: 'none', borderLeft: '1px solid #eee', color: '#666', cursor: 'pointer', height: '100%' }}
                                        title="Edit List"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {sortedLists.length === 0 && (
                                <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>No lists found.</p>
                            )}
                        </div>

                        <button
                            onClick={() => { setIsCreatingList(true); setNewListTitle(''); }}
                            className="btn-primary"
                            style={{ width: '100%', background: 'var(--primary-yellow)', color: '#333', display: 'flex', justifyContent: 'center', gap: '8px', padding: '15px' }}
                        >
                            <PlusCircle size={20} /> Create My Own List!
                        </button>
                    </div>

                    {/* Mode Selection */}
                    <div className="glass-panel" style={{ flex: 1, padding: '20px', opacity: selectedList ? 1 : 0.5, pointerEvents: selectedList ? 'auto' : 'none' }}>
                        <h3 style={{ marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>2. Choose an Arena</h3>

                        <button onClick={() => setSelectedMode('classic')} className="interactive-hover" style={{
                            width: '100%', padding: '20px', marginBottom: '15px', borderRadius: '15px', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', border: 'none', color: '#333', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '15px'
                        }}>
                            <Gamepad2 size={32} />
                            <div>
                                <strong style={{ fontSize: '1.2rem', display: 'block' }}>Classic Test</strong>
                                <span style={{ fontSize: '0.9rem' }}>Listen to the word and type it out.</span>
                            </div>
                        </button>

                        <button onClick={() => setSelectedMode('memory')} className="interactive-hover" style={{
                            width: '100%', padding: '20px', marginBottom: '15px', borderRadius: '15px', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', border: 'none', color: '#333', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '15px'
                        }}>
                            <Brain size={32} />
                            <div>
                                <strong style={{ fontSize: '1.2rem', display: 'block' }}>Memory Master</strong>
                                <span style={{ fontSize: '0.9rem' }}>Look at the word for 3 seconds, then spell it!</span>
                            </div>
                        </button>

                        <button onClick={() => setSelectedMode('scramble')} className="interactive-hover" style={{
                            width: '100%', padding: '20px', borderRadius: '15px', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', border: 'none', color: '#333', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '15px'
                        }}>
                            <Shuffle size={32} />
                            <div>
                                <strong style={{ fontSize: '1.2rem', display: 'block' }}>Word Scramble</strong>
                                <span style={{ fontSize: '0.9rem' }}>Put the mixed-up letters back in order.</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // VIEW 2: GAMEPLAY
    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <button
                    onClick={() => { setSelectedList(null); setSelectedMode(null); setGameOver(false); setCurrentIndex(0); setScore(0); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}
                >
                    <ArrowLeft size={20} /> Change Arena
                </button>
                <div style={{ background: 'var(--primary-yellow)', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold' }}>
                    Score: {score}
                </div>
            </div>

            {gameOver ? (
                <div className="glass-panel animate-fade-in" style={{ padding: '50px 20px' }}>
                    <h2>🎉 You completed the {selectedList.title} Arena! 🎉</h2>
                    <p style={{ fontSize: '1.5rem', margin: '20px 0' }}>You earned {score} points and {selectedList.words.length} stars!</p>
                    <div style={{ fontSize: '4rem', marginBottom: '30px' }}>{activeProfile.avatar}</div>
                    <button className="btn-primary" onClick={() => { setSelectedList(null); setSelectedMode(null); setGameOver(false); setCurrentIndex(0); setScore(0); }}>Play Another</button>
                </div>
            ) : (
                <div className="glass-panel" style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto' }}>

                    <div style={{ color: '#888', fontWeight: 'bold', marginBottom: '10px' }}>
                        Word {currentIndex + 1} of {selectedList.words.length}
                    </div>

                    <div style={{ width: '100%', height: '12px', background: '#e0e0e0', borderRadius: '10px', marginBottom: '20px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${((currentIndex) / selectedList.words.length) * 100}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
                            transition: 'width 0.4s ease-in-out',
                            borderRadius: '10px'
                        }} />
                    </div>

                    {!ttsMuted && (
                        <button
                            onClick={() => speakWord(selectedList.words[currentIndex].word)}
                            className="btn-speaker"
                            style={{ padding: '15px', borderRadius: '50%', marginBottom: '20px', width: '60px', height: '60px', display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}
                            title="Hear Word Again"
                        >
                            <Volume2 size={24} />
                        </button>
                    )}

                    <div className="hint-card" style={{ marginBottom: '30px' }}>
                        <p className="hint-text">Hint: "{selectedList.words[currentIndex].hint}"</p>
                    </div>


                    {/* --- MODE: CLASSIC --- */}
                    {selectedMode === 'classic' && (
                        <form onSubmit={handleClassicSubmit} className="input-section">
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="Type the word here..."
                                autoFocus
                                autoComplete="off"
                                spellCheck="false"
                            />
                            <button type="submit" className="btn-primary" disabled={!userInput}>Submit</button>
                        </form>
                    )}

                    {/* --- MODE: MEMORY MASTER --- */}
                    {selectedMode === 'memory' && (
                        <div>
                            {showFlashWord ? (
                                <div style={{ fontSize: '4rem', fontWeight: 'bold', letterSpacing: '8px', color: 'var(--primary-red)', marginBottom: '30px', animation: 'popIn 0.3s' }}>
                                    {selectedList.words[currentIndex].word.toUpperCase()}
                                </div>
                            ) : (
                                <form onSubmit={handleMemorySubmit} className="input-section animate-fade-in">
                                    <input
                                        type="text"
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        placeholder="Remember it? Type it here..."
                                        autoFocus
                                        autoComplete="off"
                                        spellCheck="false"
                                    />
                                    <button type="submit" className="btn-primary" disabled={!userInput}>Submit</button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* --- MODE: SCRAMBLE --- */}
                    {selectedMode === 'scramble' && (
                        <div>
                            {/* Placement Slots */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '30px', minHeight: '60px' }}>
                                {Array(selectedList.words[currentIndex].word.length).fill(0).map((_, i) => (
                                    <div
                                        key={i}
                                        onClick={() => i < scramblePlaced.length && removeScrambleTile(i)}
                                        style={{
                                            width: '50px', height: '60px',
                                            border: '3px dashed #ccc', borderRadius: '10px',
                                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                                            fontSize: '2rem', fontWeight: 'bold', textTransform: 'uppercase',
                                            background: scramblePlaced[i] ? 'var(--primary-yellow)' : 'transparent',
                                            cursor: scramblePlaced[i] ? 'pointer' : 'default',
                                            borderStyle: scramblePlaced[i] ? 'solid' : 'dashed',
                                            borderColor: scramblePlaced[i] ? '#e6b800' : '#ccc'
                                        }}
                                    >
                                        {scramblePlaced[i]?.char || ''}
                                    </div>
                                ))}
                            </div>

                            {/* Available Letters */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                {scrambledLetters.map((lObj) => {
                                    const isUsed = scramblePlaced.find(p => p.id === lObj.id);
                                    return (
                                        <button
                                            key={lObj.id}
                                            onClick={() => handleScrambleTileClick(lObj)}
                                            disabled={isUsed}
                                            style={{
                                                width: '50px', height: '60px',
                                                background: isUsed ? '#eee' : 'white',
                                                color: isUsed ? 'transparent' : '#333',
                                                border: '2px solid #ddd',
                                                borderRadius: '10px',
                                                fontSize: '2rem', fontWeight: 'bold', textTransform: 'uppercase',
                                                cursor: isUsed ? 'default' : 'pointer',
                                                boxShadow: isUsed ? 'none' : '0 4px 0 #ccc',
                                                transform: isUsed ? 'translateY(4px)' : 'none'
                                            }}
                                        >
                                            {lObj.char}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Global Feedback */}
                    {feedback && (
                        <div className={`feedback ${feedback.includes('Correct') ? 'success' : 'error'}`} style={{ marginTop: '20px' }}>
                            {feedback}
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}
