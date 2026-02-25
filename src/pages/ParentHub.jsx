import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Settings, Users, Key, BookOpen, Trash2, Plus, ArrowLeft, Wand2, Loader2, PlusCircle } from 'lucide-react';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const AVATARS = ['🦁', '🦄', '🐶', '🐱', '🦊', '🐼', '🐯', '🐰'];
const COLORS = ['#ff4b4b', '#4facfe', '#8bc34a', '#ff9800', '#9c27b0', '#00bcd4'];
const GRADES = ['Pre-K', 'Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];

export default function ParentHub() {
    const navigate = useNavigate();
    const { profiles, addProfile, deleteProfile, customLists, setCustomLists, parentApiKey, setParentApiKey, ttsMuted, setTtsMuted } = useAppContext();

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [activeTab, setActiveTab] = useState('settings');

    // Profile Management State
    const [activeStudentId, setActiveStudentId] = useState(null);
    const [showAddProfileForm, setShowAddProfileForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newAvatar, setNewAvatar] = useState(AVATARS[0]);
    const [newColor, setNewColor] = useState(COLORS[0]);
    const [newGrade, setNewGrade] = useState('1st Grade');

    // List Management State
    const [newListTitle, setNewListTitle] = useState('');
    const [newWord, setNewWord] = useState('');
    const [newHint, setNewHint] = useState('');
    const [editingListId, setEditingListId] = useState(null);

    // AI Generation State
    const [aiTopic, setAiTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showAiModal, setShowAiModal] = useState(false);

    const handlePinSubmit = (e) => {
        e.preventDefault();
        if (pin === '0000') {
            setIsAuthenticated(true);
        } else {
            alert('Incorrect PIN. Default is 0000.');
            setPin('');
        }
    };

    const handleCreateProfile = (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        addProfile({ name: newName, avatar: newAvatar, color: newColor, grade: newGrade });
        setNewName('');
        setShowAddProfileForm(false);
    };

    const handleDeleteProfile = (id) => {
        if (confirm("Are you sure you want to delete this profile AND all of their custom lists?")) {
            deleteProfile(id);
            setCustomLists(customLists.filter(l => l.profileId !== id));
            if (activeStudentId === id) setActiveStudentId(null);
        }
    };

    const createList = (e) => {
        e.preventDefault();
        if (!newListTitle.trim() || !activeStudentId) return;
        const newList = { id: Date.now().toString(), profileId: activeStudentId, title: newListTitle, words: [], scheduledDate: '' };
        setCustomLists([...customLists, newList]);
        setNewListTitle('');
        setEditingListId(newList.id);
    };

    const addWordToList = (e) => {
        e.preventDefault();
        if (!newWord.trim()) return;

        setCustomLists(customLists.map(list => {
            if (list.id === editingListId) {
                return { ...list, words: [...list.words, { word: newWord.toLowerCase(), hint: newHint }] };
            }
            return list;
        }));

        setNewWord('');
        setNewHint('');
    };

    const deleteWord = (listId, wordIndex) => {
        setCustomLists(customLists.map(list => {
            if (list.id === listId) {
                return { ...list, words: list.words.filter((_, idx) => idx !== wordIndex) };
            }
            return list;
        }));
    };

    const deleteList = (listId) => {
        if (confirm('Are you sure you want to delete this list?')) {
            setCustomLists(customLists.filter(l => l.id !== listId));
            if (editingListId === listId) setEditingListId(null);
        }
    };

    const handleGenerateList = async (e) => {
        e.preventDefault();
        if (!parentApiKey) {
            alert("Please configure your Gemini API Key in the Settings tab first.");
            setActiveTab('settings');
            setShowAiModal(false);
            return;
        }
        if (!activeStudentId) return;

        if (!aiTopic.trim()) return;
        setIsGenerating(true);

        try {
            const genAI = new GoogleGenerativeAI(parentApiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const schema = {
                type: SchemaType.ARRAY,
                description: "List of spelling words with kid-friendly hints/sentences.",
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        word: { type: SchemaType.STRING, description: "The spelling word itself, all lowercase" },
                        hint: { type: SchemaType.STRING, description: "A kid-friendly hint or sentence providing context for the word" }
                    },
                    required: ["word", "hint"]
                }
            };

            const prompt = `Generate a spelling word list of 10 words suitable for elementary school kids on the topic of "${aiTopic}". The hint should be a fun, descriptive sentence that gives context.`;

            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                    temperature: 0.7
                }
            });

            const responseText = result.response.text();
            const generatedWords = JSON.parse(responseText);

            const newList = { id: Date.now().toString(), profileId: activeStudentId, title: `AI: ${aiTopic}`, words: generatedWords, scheduledDate: '' };
            setCustomLists([...customLists, newList]);
            setEditingListId(newList.id);

            setAiTopic('');
            setShowAiModal(false);
        } catch (err) {
            console.error(err);
            alert("Error generating list. Please check your API key and try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center' }}>
                <h2 style={{ marginBottom: '20px' }}>Parent Hub Access</h2>
                <div className="glass-panel" style={{ padding: '30px' }}>
                    <p style={{ marginBottom: '20px', color: '#666' }}>Please enter the PIN to continue. (Default: 0000)</p>
                    <form onSubmit={handlePinSubmit}>
                        <input
                            type="password"
                            value={pin}
                            onChange={e => setPin(e.target.value)}
                            placeholder="Enter PIN"
                            maxLength={4}
                            style={{ width: '100%', fontSize: '2rem', letterSpacing: '8px', textAlign: 'center', marginBottom: '20px' }}
                        />
                        <button type="submit" className="btn-primary" style={{ width: '100%' }}>Unlock 🔓</button>
                    </form>
                    <button onClick={() => navigate('/')} style={{ marginTop: '15px', background: 'none', border: 'none', color: '#ff4b4b', cursor: 'pointer', fontWeight: 'bold' }}>
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    const activeStudentLists = customLists.filter(l => l.profileId === activeStudentId);

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px', gap: '15px' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <ArrowLeft size={24} />
                </button>
                <h2 style={{ fontSize: '2rem', color: '#333', margin: 0 }}>Parent Dashboard</h2>
            </div>

            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                {/* Sidebar Nav */}
                <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                        { id: 'settings', icon: <Settings />, label: 'Settings & API' },
                        { id: 'profiles', icon: <Users />, label: 'Student Management' },
                        { id: 'scoreboard', icon: <span style={{ fontSize: '1.2rem' }}>🏆</span>, label: 'Scoreboard' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setActiveStudentId(null); setEditingListId(null); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '15px 20px',
                                background: activeTab === tab.id ? 'var(--primary-red)' : 'white',
                                color: activeTab === tab.id ? 'white' : '#555',
                                border: 'none',
                                borderRadius: '15px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '1.1rem',
                                boxShadow: activeTab === tab.id ? '0 4px 10px rgba(255, 75, 75, 0.3)' : '0 2px 5px rgba(0,0,0,0.05)'
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="glass-panel" style={{ flex: '3 1 500px', padding: '30px', background: 'white' }}>

                    {/* Scoreboard Tab */}
                    {activeTab === 'scoreboard' && (
                        <div>
                            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.5rem' }}>🏆</span> Global Scoreboard
                            </h3>
                            {profiles.length === 0 ? (
                                <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>No students yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {[...profiles].sort((a, b) => b.stars - a.stars).map((p, index) => (
                                        <div key={p.id} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px',
                                            background: index === 0 ? 'linear-gradient(135deg, #ffd70033 0%, #fff8e1 100%)' :
                                                index === 1 ? 'linear-gradient(135deg, #e0e0e033 0%, #f5f5f5 100%)' :
                                                    index === 2 ? 'linear-gradient(135deg, #ffb30033 0%, #fff3e0 100%)' : 'white',
                                            border: index === 0 ? '2px solid #ffd700' :
                                                index === 1 ? '2px solid #e0e0e0' :
                                                    index === 2 ? '2px solid #ffb300' : '1px solid #eee',
                                            borderRadius: '15px',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '30px', color: '#888', textAlign: 'center' }}>
                                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                                </div>
                                                <span style={{ fontSize: '2rem' }}>{p.avatar}</span>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <strong style={{ fontSize: '1.2rem' }}>{p.name}</strong>
                                                    <span style={{ fontSize: '0.9rem', color: '#666' }}>{p.grade}</span>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#ff9800', background: '#fff3e0', padding: '5px 15px', borderRadius: '20px' }}>
                                                {p.stars} ⭐
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Settings Tab */}
                    {activeTab === 'settings' && (
                        <div>
                            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Key /> App Settings
                            </h3>

                            <div style={{ marginBottom: '30px', padding: '20px', background: '#fff3e0', borderLeft: '4px solid #ff9800', borderRadius: '4px' }}>
                                <h4 style={{ color: '#e65100', marginBottom: '10px' }}>⚠️ Gemini API Key</h4>
                                <p style={{ fontSize: '0.9rem', color: '#333', marginBottom: '15px' }}>
                                    To use the AI List Generation feature, provide a valid Gemini API key. <br />
                                    <strong>Note:</strong> This key is stored securely only in this browser's local storage. Do not use this feature on public computers.
                                </p>
                                <input
                                    type="password"
                                    value={parentApiKey}
                                    onChange={e => setParentApiKey(e.target.value)}
                                    placeholder="AIzaSy..."
                                    style={{ width: '100%', padding: '10px', fontFamily: 'monospace' }}
                                />
                            </div>

                            <div>
                                <h4 style={{ marginBottom: '10px' }}>Accessibility</h4>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={ttsMuted}
                                        onChange={e => setTtsMuted(e.target.checked)}
                                        style={{ width: '24px', height: '24px' }}
                                    />
                                    Mute all Text-to-Speech voices globally
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Profiles Tab */}
                    {activeTab === 'profiles' && (
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>

                            {/* Left Pane: Roster */}
                            <div style={{ flex: '1 1 250px', borderRight: '1px solid #eee', paddingRight: '20px' }}>
                                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Users /> Student Roster
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                    {profiles.map(p => (
                                        <div
                                            key={p.id}
                                            onClick={() => { setActiveStudentId(p.id); setEditingListId(null); }}
                                            style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '10px 15px',
                                                border: activeStudentId === p.id ? `2px solid ${p.color}` : '2px solid transparent',
                                                background: activeStudentId === p.id ? '#f0f8ff' : '#f9f9f9',
                                                borderRadius: '10px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '1.5rem' }}>{p.avatar}</span>
                                                <strong>{p.name}</strong>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteProfile(p.id); }}
                                                style={{ background: 'none', border: 'none', color: '#ff4b4b', cursor: 'pointer' }}
                                                title="Delete Profile"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setShowAddProfileForm(!showAddProfileForm)}
                                    className="btn-primary"
                                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'var(--primary-yellow)', color: '#333' }}
                                >
                                    <PlusCircle size={18} /> Add New Student
                                </button>

                                {/* Add Profile Form Inline */}
                                {showAddProfileForm && (
                                    <form onSubmit={handleCreateProfile} style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '10px' }}>
                                        <input
                                            type="text" placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)}
                                            style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px' }} required
                                        />
                                        <select value={newGrade} onChange={e => setNewGrade(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
                                            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>

                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                            {AVATARS.map(avatar => (
                                                <span key={avatar} onClick={() => setNewAvatar(avatar)} style={{ cursor: 'pointer', padding: '5px', background: newAvatar === avatar ? '#fff' : 'transparent', borderRadius: '5px', border: newAvatar === avatar ? '1px solid #ccc' : '1px solid transparent' }}>{avatar}</span>
                                            ))}
                                        </div>

                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '15px' }}>
                                            {COLORS.map(color => (
                                                <div key={color} onClick={() => setNewColor(color)} style={{ width: '25px', height: '25px', borderRadius: '50%', background: color, cursor: 'pointer', border: newColor === color ? '2px solid #333' : '2px solid transparent' }} />
                                            ))}
                                        </div>

                                        <button type="submit" className="btn-primary" style={{ width: '100%' }}>Save Student</button>
                                    </form>
                                )}
                            </div>

                            {/* Right Pane: Selected Student Details & Lists */}
                            <div style={{ flex: '1 1 300px' }}>
                                {!activeStudentId ? (
                                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                                        <p>Select a student from the roster to view their stats and manage their word lists.</p>
                                    </div>
                                ) : (
                                    <div>
                                        {/* Student Stats Summary */}
                                        {(() => {
                                            const p = profiles.find(x => x.id === activeStudentId);
                                            // Handle case where profile was deleted but state update lagged
                                            if (!p) return null;

                                            const strugglingWords = Object.entries(p.wordMastery || {})
                                                .filter(([word, stats]) => stats.attempts > 0 && (stats.correct / stats.attempts) <= 0.5)
                                                .map(([word]) => word);

                                            return (
                                                <div style={{ marginBottom: '30px', padding: '20px', background: '#fafafa', borderRadius: '10px', borderLeft: `6px solid ${p.color}` }}>
                                                    <h4 style={{ marginBottom: '10px', fontSize: '1.4rem' }}>{p.avatar} {p.name}'s Progress ({p.grade})</h4>
                                                    <p style={{ margin: '0 0 10px 0', color: '#666' }}>Total Stars: <strong>{p.stars} ⭐</strong></p>

                                                    {strugglingWords.length > 0 ? (
                                                        <div>
                                                            <strong style={{ color: '#d32f2f', fontSize: '0.9rem' }}>📉 Needs Practice:</strong>
                                                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' }}>
                                                                {strugglingWords.map(word => (
                                                                    <span key={word} style={{ background: '#ffebee', color: '#c62828', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem' }}>{word}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p style={{ color: '#4caf50', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>Doing great! No struggling words currently.</p>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Nested Word Lists Manager */}
                                        <h4 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <BookOpen size={18} /> Manage {profiles.find(x => x.id === activeStudentId)?.name}'s Lists
                                        </h4>

                                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                            <form onSubmit={createList} style={{ display: 'flex', flex: 1, gap: '10px' }}>
                                                <input
                                                    type="text" value={newListTitle} onChange={e => setNewListTitle(e.target.value)}
                                                    placeholder="New List Title" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                                                />
                                                <button type="submit" className="btn-primary" style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px' }}><Plus size={16} /> Create</button>
                                            </form>
                                            <button onClick={() => setShowAiModal(true)} className="btn-primary" style={{ background: 'var(--accent-gradient)', padding: '8px 15px', display: 'flex', gap: '5px', alignItems: 'center', fontSize: '0.9rem' }}>
                                                <Wand2 size={16} /> AI List
                                            </button>
                                        </div>

                                        {/* Master/Detail for Lists */}
                                        {!editingListId ? (
                                            <div>
                                                {activeStudentLists.length === 0 ? (
                                                    <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>No word lists assigned yet.</p>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        {activeStudentLists.map(list => (
                                                            <div
                                                                key={list.id}
                                                                onClick={() => setEditingListId(list.id)}
                                                                style={{ padding: '15px', background: 'white', border: '1px solid #eee', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                                                            >
                                                                <div>
                                                                    <strong>{list.title}</strong> <span style={{ color: '#888', fontSize: '0.9rem' }}>({list.words.length} words)</span>
                                                                    {list.scheduledDate && <div style={{ fontSize: '0.8rem', color: '#ff9800', marginTop: '4px' }}>📅 Due: {new Date(list.scheduledDate).toLocaleDateString()}</div>}
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); deleteList(list.id); }} style={{ background: 'none', border: 'none', color: '#ff4b4b', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* Active Editing View */
                                            <div style={{ border: '1px solid #eee', padding: '20px', borderRadius: '10px', background: '#fcfcfc' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                                    <div>
                                                        <h5 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>Editing: {customLists.find(l => l.id === editingListId)?.title}</h5>
                                                        <button onClick={() => setEditingListId(null)} style={{ background: 'none', border: 'none', color: '#2196f3', cursor: 'pointer', padding: 0, fontSize: '0.9rem' }}>
                                                            ← Back to all lists
                                                        </button>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>📅 Target Date</label>
                                                        <input
                                                            type="date" value={customLists.find(l => l.id === editingListId)?.scheduledDate || ''}
                                                            onChange={(e) => {
                                                                const newDate = e.target.value;
                                                                setCustomLists(customLists.map(l => l.id === editingListId ? { ...l, scheduledDate: newDate } : l));
                                                            }}
                                                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'inherit' }}
                                                        />
                                                    </div>
                                                </div>

                                                <form onSubmit={addWordToList} style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexDirection: 'column', background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        <input type="text" required placeholder="Word (e.g., Galaxy)" value={newWord} onChange={e => setNewWord(e.target.value)} style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                                                        <button type="submit" className="btn-primary" style={{ padding: '8px 15px' }}>Add Word</button>
                                                    </div>
                                                    <input type="text" required placeholder="Hint/Sentence Context" value={newHint} onChange={e => setNewHint(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                                                </form>

                                                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                                    {customLists.find(l => l.id === editingListId)?.words.map((w, idx) => (
                                                        <div key={idx} style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div>
                                                                <strong style={{ display: 'block' }}>{w.word}</strong>
                                                                <span style={{ fontSize: '0.85rem', color: '#666' }}>{w.hint}</span>
                                                            </div>
                                                            <button onClick={() => deleteWord(editingListId, idx)} style={{ background: 'none', border: 'none', color: '#ff4b4b', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Generate Modal */}
            {showAiModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ background: 'white', padding: '30px', width: '100%', maxWidth: '500px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <Wand2 className="text-gradient" /> Generate List with AI
                        </h3>
                        <p style={{ color: '#666', marginBottom: '20px' }}>
                            Enter a topic, and our AI will generate a spelling list specifically for <strong>{profiles.find(x => x.id === activeStudentId)?.name}</strong>!
                        </p>
                        <form onSubmit={handleGenerateList}>
                            <input
                                type="text" value={aiTopic} onChange={e => setAiTopic(e.target.value)}
                                placeholder="Topic (e.g., Dinosaurs, Kitchen Items)" required disabled={isGenerating}
                                style={{ width: '100%', padding: '15px', borderRadius: '10px', border: '2px solid #ccc', fontSize: '1.1rem', marginBottom: '20px' }}
                            />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="submit" className="btn-primary" disabled={isGenerating} style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                    {isGenerating ? <Loader2 className="animate-spin" /> : 'Generate'}
                                </button>
                                <button type="button" onClick={() => setShowAiModal(false)} disabled={isGenerating} style={{ padding: '15px 30px', borderRadius: '15px', border: 'none', background: '#eee', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
