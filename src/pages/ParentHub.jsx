import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { sounds } from '../utils/audio';
import { PRESET_LISTS } from '../data/presetLists';
import PhotoListScanner from '../components/PhotoListScanner';
import BulkListImporter from '../components/BulkListImporter';
import { generateShareableListUrl, exportFullBackupCode } from '../utils/syncManager';
import {
    Settings, Users, Key, BookOpen, Trash2, Plus, ArrowLeft,
    Wand2, Loader2, Trophy, Sparkles, Camera, ClipboardList,
    Share2, Download, Upload, Check, Copy, RefreshCw
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

const AVATARS = ['🦁', '🦄', '🐶', '🐱', '🦊', '🐼', '🐯', '🐰', '🚀', '🦖', '🌟', '🐬'];
const COLORS = ['#4F46E5', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4'];
const GRADES = ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade'];

export default function ParentHub() {
    const navigate = useNavigate();
    const {
        profiles,
        addProfile,
        deleteProfile,
        customLists,
        setCustomLists,
        importPresetList,
        restoreFromSyncCode,
        parentApiKey,
        setParentApiKey,
        ttsMuted,
        setTtsMuted
    } = useAppContext();

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [activeTab, setActiveTab] = useState('profiles');

    const [activeStudentId, setActiveStudentId] = useState(profiles[0]?.id || null);

    const [showAddStudent, setShowAddStudent] = useState(false);
    const [newName, setNewName] = useState('');
    const [newAvatar, setNewAvatar] = useState(AVATARS[0]);
    const [newColor, setNewColor] = useState(COLORS[0]);
    const [newGrade, setNewGrade] = useState('1st Grade');

    const [editingListId, setEditingListId] = useState(null);
    const [newListTitle, setNewListTitle] = useState('');
    const [newWord, setNewWord] = useState('');
    const [newHint, setNewHint] = useState('');

    const [showPhotoScanner, setShowPhotoScanner] = useState(false);
    const [showBulkImporter, setShowBulkImporter] = useState(false);

    const [aiTopic, setAiTopic] = useState('');
    const [aiGrade, setAiGrade] = useState('1st Grade');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiSuccessMessage, setAiSuccessMessage] = useState('');
    const [aiErrorMessage, setAiErrorMessage] = useState('');

    const [copiedListId, setCopiedListId] = useState(null);
    const [exportCode, setExportCode] = useState('');
    const [importCodeInput, setImportCodeInput] = useState('');
    const [syncMessage, setSyncMessage] = useState({ text: '', type: '' });
    const [codeCopied, setCodeCopied] = useState(false);

    const handlePinSubmit = (e) => {
        e.preventDefault();
        if (pin === '0000' || pin === '1234' || pin.trim() === '') {
            sounds.playCorrect();
            setIsAuthenticated(true);
        } else {
            sounds.playWrong();
            alert('Incorrect PIN. (Default PIN is 0000)');
            setPin('');
        }
    };

    const handleCreateStudent = (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        sounds.playCorrect();
        const id = addProfile({
            name: newName.trim(),
            avatar: newAvatar,
            color: newColor,
            grade: newGrade
        });
        setActiveStudentId(id);
        setNewName('');
        setShowAddStudent(false);
    };

    const handleDeleteStudent = (id) => {
        if (window.confirm("Are you sure you want to delete this student and their lists?")) {
            sounds.playPop();
            deleteProfile(id);
            if (activeStudentId === id) {
                const remaining = profiles.filter(p => p.id !== id);
                setActiveStudentId(remaining[0]?.id || null);
            }
        }
    };

    const handleCreateList = (e) => {
        e.preventDefault();
        if (!newListTitle.trim() || !activeStudentId) return;
        sounds.playPop();
        const created = {
            id: `list-${Date.now()}`,
            profileId: activeStudentId,
            title: newListTitle.trim(),
            words: [],
            scheduledDate: ''
        };
        setCustomLists([...customLists, created]);
        setNewListTitle('');
        setEditingListId(created.id);
    };

    const handleAddWord = (e) => {
        e.preventDefault();
        if (!newWord.trim() || !editingListId) return;
        sounds.playPop();

        setCustomLists(customLists.map(list => {
            if (list.id === editingListId) {
                return {
                    ...list,
                    words: [...list.words, { word: newWord.trim().toLowerCase(), hint: newHint.trim() || 'Spelling word' }]
                };
            }
            return list;
        }));

        setNewWord('');
        setNewHint('');
    };

    const handleDeleteWord = (listId, wordIdx) => {
        sounds.playPop();
        setCustomLists(customLists.map(list => {
            if (list.id === listId) {
                return {
                    ...list,
                    words: list.words.filter((_, idx) => idx !== wordIdx)
                };
            }
            return list;
        }));
    };

    const handleDeleteList = (listId) => {
        if (window.confirm('Delete this word list?')) {
            sounds.playPop();
            setCustomLists(customLists.filter(l => l.id !== listId));
            if (editingListId === listId) setEditingListId(null);
        }
    };

    const handleShareList = (e, list) => {
        e.stopPropagation();
        try {
            const url = generateShareableListUrl(list);
            navigator.clipboard.writeText(url);
            setCopiedListId(list.id);
            sounds.playCorrect();
            setTimeout(() => setCopiedListId(null), 3500);
        } catch (err) {
            console.error('Failed to copy share link:', err);
        }
    };

    const handleGenerateExportCode = () => {
        sounds.playPop();
        const code = exportFullBackupCode(profiles, customLists);
        setExportCode(code);
        setSyncMessage({ text: 'Sync code generated! Copy it below and paste it on Serena\'s PC.', type: 'success' });
    };

    const handleCopyExportCode = () => {
        if (!exportCode) return;
        navigator.clipboard.writeText(exportCode);
        setCodeCopied(true);
        sounds.playCorrect();
        setTimeout(() => setCodeCopied(false), 3000);
    };

    const handleImportSyncCode = (e) => {
        e.preventDefault();
        setSyncMessage({ text: '', type: '' });
        if (!importCodeInput.trim()) {
            setSyncMessage({ text: 'Please paste a sync code first.', type: 'error' });
            return;
        }
        try {
            restoreFromSyncCode(importCodeInput.trim());
            setImportCodeInput('');
            setSyncMessage({ text: '🎉 Successfully synced all profiles, lists, and stars to this device!', type: 'success' });
        } catch (err) {
            console.error('Import failed:', err);
            sounds.playWrong();
            setSyncMessage({ text: 'Invalid or incomplete sync code. Please check that you copied the full code.', type: 'error' });
        }
    };

    const handleGenerateAiList = async (e) => {
        e.preventDefault();
        setAiSuccessMessage('');
        setAiErrorMessage('');

        if (!parentApiKey.trim()) {
            setAiErrorMessage("Please set your Gemini API Key in the Settings tab first!");
            return;
        }

        if (!activeStudentId) {
            setAiErrorMessage("Please select a student profile first.");
            return;
        }

        setIsGenerating(true);

        try {
            const genAI = new GoogleGenerativeAI(parentApiKey.trim());
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `Generate a spelling word list of 8 words suitable for a ${aiGrade} elementary student on the topic of "${aiTopic}".
Return ONLY a valid JSON array of objects with keys "word" (lowercase string) and "hint" (a fun, kid-friendly sentence giving context).
Example format:
[{"word": "solar", "hint": "Relating to the sun or solar power."}]`;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const words = JSON.parse(cleanedJson);

            if (Array.isArray(words) && words.length > 0) {
                const newList = {
                    id: `ai-list-${Date.now()}`,
                    profileId: activeStudentId,
                    title: `✨ ${aiTopic}`,
                    words: words.map(w => ({ word: String(w.word).toLowerCase().trim(), hint: String(w.hint).trim() })),
                    scheduledDate: ''
                };
                setCustomLists(prev => [...prev, newList]);
                sounds.playCorrect();
                setAiSuccessMessage(`Successfully created list "${aiTopic}" with ${words.length} words!`);
                setAiTopic('');
            } else {
                throw new Error("Invalid response format from Gemini");
            }
        } catch (err) {
            console.error("Gemini AI list generation error:", err);
            setAiErrorMessage("Error generating list. Please check your API key and connection.");
            sounds.playWrong();
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="animate-pop" style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>🔒</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: '#1E293B', marginBottom: '8px' }}>
                    Parent Hub Access
                </h2>
                <p style={{ color: '#64748B', fontSize: '0.95rem', marginBottom: '24px' }}>
                    Enter PIN to manage students and settings (Default: <strong>0000</strong>)
                </p>

                <form onSubmit={handlePinSubmit} className="glass-panel" style={{ padding: '28px' }}>
                    <input
                        type="password"
                        value={pin}
                        onChange={e => setPin(e.target.value)}
                        placeholder="0000"
                        maxLength={4}
                        autoFocus
                        className="game-input"
                        style={{ width: '100%', marginBottom: '20px', letterSpacing: '12px' }}
                    />
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1.1rem' }}>
                        Unlock Dashboard 🔓
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        style={{ marginTop: '16px', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Back to Game
                    </button>
                </form>
            </div>
        );
    }

    const currentStudent = profiles.find(p => p.id === activeStudentId) || profiles[0];
    const currentStudentLists = customLists.filter(l => l.profileId === currentStudent?.id);

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => { sounds.playPop(); navigate('/'); }}
                        className="btn-icon"
                        title="Back to Game"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#1E293B' }}>
                        Parent Dashboard
                    </h2>
                </div>

                <div style={{ display: 'flex', gap: '6px', background: '#F1F5F9', padding: '4px', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
                    {[
                        { id: 'profiles', label: 'Students', icon: <Users size={16} /> },
                        { id: 'lists', label: 'Word Lists', icon: <BookOpen size={16} /> },
                        { id: 'ai', label: 'AI & Tools', icon: <Wand2 size={16} /> },
                        { id: 'leaderboard', label: 'Scoreboard', icon: <Trophy size={16} /> },
                        { id: 'settings', label: 'Settings', icon: <Settings size={16} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                sounds.playPop();
                                setActiveTab(tab.id);
                                setShowPhotoScanner(false);
                                setShowBulkImporter(false);
                            }}
                            className="btn"
                            style={{
                                padding: '8px 14px',
                                fontSize: '0.9rem',
                                background: activeTab === tab.id ? '#FFFFFF' : 'transparent',
                                color: activeTab === tab.id ? '#4F46E5' : '#64748B',
                                boxShadow: activeTab === tab.id ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                borderRadius: 'var(--radius-sm)'
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {showPhotoScanner && (
                <div style={{ marginBottom: '24px' }}>
                    <PhotoListScanner
                        targetProfileId={activeStudentId}
                        onCancel={() => setShowPhotoScanner(false)}
                        onListCreated={(created) => {
                            setShowPhotoScanner(false);
                            setEditingListId(created.id);
                        }}
                    />
                </div>
            )}

            {showBulkImporter && (
                <div style={{ marginBottom: '24px' }}>
                    <BulkListImporter
                        targetProfileId={activeStudentId}
                        onCancel={() => setShowBulkImporter(false)}
                        onListCreated={(created) => {
                            setShowBulkImporter(false);
                            setEditingListId(created.id);
                        }}
                    />
                </div>
            )}

            {/* TAB 1: STUDENT MANAGEMENT */}
            {activeTab === 'profiles' && !showPhotoScanner && !showBulkImporter && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    <div className="card-elevated" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Students ({profiles.length})</span>
                            <button
                                onClick={() => { sounds.playPop(); setShowAddStudent(!showAddStudent); }}
                                className="btn btn-primary"
                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                            >
                                <Plus size={16} /> Add Student
                            </button>
                        </div>

                        {showAddStudent && (
                            <form onSubmit={handleCreateStudent} style={{ background: '#F8FAFC', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid #E2E8F0' }}>
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Name</label>
                                    <input
                                        type="text"
                                        placeholder="Student name"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        className="input-field"
                                        required
                                        style={{ padding: '8px 12px', fontSize: '0.95rem' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Grade</label>
                                    <select
                                        value={newGrade}
                                        onChange={e => setNewGrade(e.target.value)}
                                        className="input-field"
                                        style={{ padding: '8px 12px', fontSize: '0.95rem' }}
                                    >
                                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Avatar</label>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {AVATARS.map(av => (
                                            <span
                                                key={av}
                                                onClick={() => setNewAvatar(av)}
                                                style={{
                                                    fontSize: '1.4rem',
                                                    cursor: 'pointer',
                                                    padding: '4px',
                                                    borderRadius: '6px',
                                                    background: newAvatar === av ? '#EEF2FF' : 'transparent',
                                                    border: newAvatar === av ? '2px solid #4F46E5' : '1px solid transparent'
                                                }}
                                            >
                                                {av}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-emerald" style={{ width: '100%', padding: '10px' }}>
                                    Save Student Profile
                                </button>
                            </form>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {profiles.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => { sounds.playPop(); setActiveStudentId(p.id); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 16px',
                                        borderRadius: 'var(--radius-md)',
                                        border: activeStudentId === p.id ? '2px solid #4F46E5' : '1px solid #E2E8F0',
                                        background: activeStudentId === p.id ? '#EEF2FF' : '#FFFFFF',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '1.6rem' }}>{p.avatar}</span>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#1E293B' }}>{p.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{p.grade} • {p.stars || 0} ⭐</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteStudent(p.id); }}
                                        style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                                        title="Delete student"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {currentStudent && (
                        <div className="card-elevated" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                <span style={{ fontSize: '2.5rem' }}>{currentStudent.avatar}</span>
                                <div>
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#1E293B' }}>
                                        {currentStudent.name}'s Progress
                                    </h3>
                                    <span style={{ fontSize: '0.85rem', color: '#64748B' }}>{currentStudent.grade}</span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ background: '#FEF3C7', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#B45309' }}>{currentStudent.stars || 0} ⭐</div>
                                    <div style={{ fontSize: '0.8rem', color: '#78350F' }}>Total Stars</div>
                                </div>
                                <div style={{ background: '#EEF2FF', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#3730A3' }}>{currentStudentLists.length}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#4338CA' }}>Active Lists</div>
                                </div>
                            </div>

                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '8px', color: '#475569' }}>
                                    Word Practice Analysis:
                                </div>
                                {(() => {
                                    const mastery = currentStudent.wordMastery || {};
                                    const needsPractice = Object.entries(mastery)
                                        .filter(([_, stats]) => stats.attempts > 0 && (stats.correct / stats.attempts) <= 0.5)
                                        .map(([w]) => w);

                                    if (needsPractice.length > 0) {
                                        return (
                                            <div>
                                                <div style={{ fontSize: '0.8rem', color: '#DC2626', marginBottom: '6px' }}>Words needing more practice:</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                    {needsPractice.map(w => (
                                                        <span key={w} style={{ background: '#FEE2E2', color: '#991B1B', padding: '3px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                                                            {w}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <p style={{ color: '#059669', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                            🎉 Great job! No struggling words detected.
                                        </p>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: WORD LISTS */}
            {activeTab === 'lists' && !showPhotoScanner && !showBulkImporter && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: 600, color: '#64748B' }}>Student:</span>
                            <select
                                value={activeStudentId || ''}
                                onChange={e => { sounds.playPop(); setActiveStudentId(e.target.value); setEditingListId(null); }}
                                className="input-field"
                                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.95rem' }}
                            >
                                {profiles.map(p => <option key={p.id} value={p.id}>{p.avatar} {p.name}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => { sounds.playPop(); setShowBulkImporter(true); }}
                                className="btn btn-secondary"
                                style={{ padding: '8px 14px', fontSize: '0.9rem' }}
                            >
                                <ClipboardList size={16} /> 📋 Paste Words
                            </button>

                            <button
                                onClick={() => { sounds.playPop(); setShowPhotoScanner(true); }}
                                className="btn btn-primary"
                                style={{ padding: '8px 14px', fontSize: '0.9rem' }}
                            >
                                <Camera size={16} /> 📸 Scan Photo
                            </button>

                            <form onSubmit={handleCreateList} style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="New list name..."
                                    value={newListTitle}
                                    onChange={e => setNewListTitle(e.target.value)}
                                    className="input-field"
                                    style={{ padding: '6px 12px', fontSize: '0.95rem' }}
                                />
                                <button type="submit" className="btn btn-amber" style={{ padding: '6px 14px', fontSize: '0.9rem' }}>
                                    + Create
                                </button>
                            </form>
                        </div>
                    </div>

                    <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                            📦 Import Standard Curriculum Lists:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {PRESET_LISTS.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => {
                                        sounds.playPop();
                                        importPresetList(activeStudentId, preset.id);
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                >
                                    + {preset.icon} {preset.title}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!editingListId ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                            {currentStudentLists.map(list => (
                                <div
                                    key={list.id}
                                    onClick={() => { sounds.playPop(); setEditingListId(list.id); }}
                                    className="card-elevated"
                                    style={{ padding: '16px', cursor: 'pointer' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '6px' }}>
                                        <h4 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1E293B' }}>{list.title}</h4>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <button
                                                onClick={(e) => handleShareList(e, list)}
                                                style={{
                                                    background: copiedListId === list.id ? '#D1FAE5' : '#EEF2FF',
                                                    border: 'none',
                                                    color: copiedListId === list.id ? '#065F46' : '#4F46E5',
                                                    borderRadius: '6px',
                                                    padding: '4px 8px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    cursor: 'pointer'
                                                }}
                                                title="Copy share link for Serena's PC"
                                            >
                                                {copiedListId === list.id ? <><Check size={12} /> Copied!</> : <><Share2 size={12} /> Share</>}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}
                                                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                                                title="Delete list"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748B' }}>{list.words.length} Words</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="card-elevated" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                <button
                                    onClick={() => setEditingListId(null)}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                >
                                    <ArrowLeft size={16} /> Back to all lists
                                </button>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {customLists.find(l => l.id === editingListId) && (
                                        <button
                                            onClick={(e) => handleShareList(e, customLists.find(l => l.id === editingListId))}
                                            className="btn btn-secondary"
                                            style={{
                                                padding: '6px 12px',
                                                fontSize: '0.85rem',
                                                background: copiedListId === editingListId ? '#D1FAE5' : undefined,
                                                color: copiedListId === editingListId ? '#065F46' : undefined
                                            }}
                                        >
                                            {copiedListId === editingListId ? <><Check size={14} /> Link Copied!</> : <><Share2 size={14} /> Share Link 🔗</>}
                                        </button>
                                    )}
                                    <h3 style={{ fontWeight: 700, fontSize: '1.2rem' }}>
                                        Editing: {customLists.find(l => l.id === editingListId)?.title}
                                    </h3>
                                </div>
                            </div>

                            <form onSubmit={handleAddWord} style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                <input
                                    type="text"
                                    placeholder="Word (e.g. elephant)"
                                    value={newWord}
                                    onChange={e => setNewWord(e.target.value)}
                                    className="input-field"
                                    style={{ flex: 1, minWidth: '150px' }}
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Hint (e.g. Big grey mammal with a trunk)"
                                    value={newHint}
                                    onChange={e => setNewHint(e.target.value)}
                                    className="input-field"
                                    style={{ flex: 2, minWidth: '200px' }}
                                />
                                <button type="submit" className="btn btn-primary">Add Word</button>
                            </form>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                                {customLists.find(l => l.id === editingListId)?.words.map((w, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0' }}>
                                        <div>
                                            <strong style={{ textTransform: 'capitalize', color: '#1E293B' }}>{w.word}</strong>
                                            <span style={{ fontSize: '0.85rem', color: '#64748B', marginLeft: '10px' }}>{w.hint}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteWord(editingListId, idx)}
                                            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: AI & TOOLS */}
            {activeTab === 'ai' && !showPhotoScanner && !showBulkImporter && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    {/* Option 1: Paste Text */}
                    <div className="card-elevated" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                                <div style={{ background: '#EEF2FF', padding: '10px', borderRadius: '12px', color: '#4F46E5' }}>
                                    <ClipboardList size={24} />
                                </div>
                                <div>
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: '#1E293B' }}>
                                        Paste Word List
                                    </h3>
                                    <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
                                        From documents, emails, or messages
                                    </p>
                                </div>
                            </div>
                            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '16px' }}>
                                Quickly paste any list of words separated by commas, newlines, or numbered formats. Supports automatic AI hints!
                            </p>
                        </div>

                        <button
                            onClick={() => { sounds.playPop(); setShowBulkImporter(true); }}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '14px', fontSize: '1.05rem' }}
                        >
                            <ClipboardList size={20} /> Open Paste Importer
                        </button>
                    </div>

                    {/* Option 2: Photo / Camera Scan */}
                    <div className="card-elevated" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                                <div style={{ background: '#FEF3C7', padding: '10px', borderRadius: '12px', color: '#B45309' }}>
                                    <Camera size={24} />
                                </div>
                                <div>
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: '#1E293B' }}>
                                        Scan Photo / Worksheet
                                    </h3>
                                    <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
                                        Phone camera or photo upload
                                    </p>
                                </div>
                            </div>
                            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '16px' }}>
                                Snap a photo of a test, workbook, or handwriting. Gemini Vision reads and extracts all words instantly!
                            </p>
                        </div>

                        <button
                            onClick={() => { sounds.playPop(); setShowPhotoScanner(true); }}
                            className="btn btn-amber"
                            style={{ width: '100%', padding: '14px', fontSize: '1.05rem' }}
                        >
                            <Camera size={20} /> Open Photo Scanner
                        </button>
                    </div>

                    {/* Option 3: AI Prompt Generator */}
                    <div className="card-elevated" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                            <div style={{ background: '#ECFDF5', padding: '10px', borderRadius: '12px', color: '#059669' }}>
                                <Wand2 size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: '#1E293B' }}>
                                    Generate by Topic
                                </h3>
                                <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
                                    Create themed curriculum lists
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleGenerateAiList} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Student</label>
                                <select
                                    value={activeStudentId || ''}
                                    onChange={e => setActiveStudentId(e.target.value)}
                                    className="input-field"
                                    style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                                >
                                    {profiles.map(p => <option key={p.id} value={p.id}>{p.avatar} {p.name} ({p.grade})</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Grade Level</label>
                                <select
                                    value={aiGrade}
                                    onChange={e => setAiGrade(e.target.value)}
                                    className="input-field"
                                    style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                                >
                                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Topic or Theme</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Dinosaurs, Weather, Ocean"
                                    value={aiTopic}
                                    onChange={e => setAiTopic(e.target.value)}
                                    className="input-field"
                                    style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                                    required
                                />
                            </div>

                            {aiErrorMessage && (
                                <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                                    {aiErrorMessage}
                                </div>
                            )}

                            {aiSuccessMessage && (
                                <div style={{ background: '#D1FAE5', color: '#065F46', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                                    {aiSuccessMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-emerald"
                                disabled={isGenerating || !aiTopic.trim()}
                                style={{ padding: '12px', fontSize: '1rem', marginTop: '4px' }}
                            >
                                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={16} /> Generate Words</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* TAB 4: SCOREBOARD */}
            {activeTab === 'leaderboard' && (
                <div className="card-elevated" style={{ padding: '24px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🏆 Speller Hall of Fame
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[...profiles].sort((a, b) => (b.stars || 0) - (a.stars || 0)).map((p, idx) => (
                            <div
                                key={p.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px 20px',
                                    borderRadius: 'var(--radius-md)',
                                    background: idx === 0 ? '#FEF3C7' : '#F8FAFC',
                                    border: idx === 0 ? '2px solid #F59E0B' : '1px solid #E2E8F0'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, width: '32px' }}>
                                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                    </div>
                                    <span style={{ fontSize: '2.2rem' }}>{p.avatar}</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1E293B' }}>{p.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748B' }}>{p.grade}</div>
                                    </div>
                                </div>

                                <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#B45309' }}>
                                    {p.stars || 0} ⭐
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 5: SETTINGS & CROSS-DEVICE SYNC */}
            {activeTab === 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '680px', margin: '0 auto' }}>
                    {/* Card 1: Cross-Device Sync & Family Backup */}
                    <div className="card-elevated" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                            <div style={{ background: '#EEF2FF', padding: '10px', borderRadius: '12px', color: '#4F46E5' }}>
                                <RefreshCw size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: '#1E293B' }}>
                                    Cross-Device Sync & Backup 🔄
                                </h3>
                                <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
                                    Sync all student profiles, spelling lists, and stars to Serena's PC or tablet
                                </p>
                            </div>
                        </div>

                        {syncMessage.text && (
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: 'var(--radius-sm)',
                                marginBottom: '16px',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                background: syncMessage.type === 'success' ? '#D1FAE5' : '#FEE2E2',
                                color: syncMessage.type === 'success' ? '#065F46' : '#991B1B'
                            }}>
                                {syncMessage.text}
                            </div>
                        )}

                        {/* Step 1: Export */}
                        <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1E293B', marginBottom: '4px' }}>
                                📤 1. Send Data from this Device (Export)
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '12px' }}>
                                Generate a portable sync code to load all profiles & lists onto Serena's computer.
                            </p>
                            <button
                                onClick={handleGenerateExportCode}
                                className="btn btn-primary"
                                style={{ padding: '8px 16px', fontSize: '0.9rem', marginBottom: exportCode ? '12px' : '0' }}
                            >
                                <Download size={16} /> Generate Family Sync Code
                            </button>

                            {exportCode && (
                                <div style={{ marginTop: '12px' }}>
                                    <textarea
                                        readOnly
                                        value={exportCode}
                                        rows={3}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            fontFamily: 'monospace',
                                            fontSize: '0.8rem',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid #CBD5E1',
                                            background: '#FFFFFF',
                                            resize: 'none'
                                        }}
                                        onClick={e => e.target.select()}
                                    />
                                    <button
                                        onClick={handleCopyExportCode}
                                        className="btn btn-emerald"
                                        style={{ marginTop: '8px', padding: '8px 16px', fontSize: '0.9rem' }}
                                    >
                                        {codeCopied ? <><Check size={16} /> Copied to Clipboard!</> : <><Copy size={16} /> Copy Sync Code</>}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Step 2: Import */}
                        <form onSubmit={handleImportSyncCode} style={{ background: '#F8FAFC', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1E293B', marginBottom: '4px' }}>
                                📥 2. Receive Data on Serena's PC (Import)
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '12px' }}>
                                Paste the sync code from your other device to load all words and progress here.
                            </p>
                            <textarea
                                placeholder="Paste the sync code here..."
                                value={importCodeInput}
                                onChange={e => setImportCodeInput(e.target.value)}
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid #CBD5E1',
                                    background: '#FFFFFF',
                                    marginBottom: '10px'
                                }}
                            />
                            <button
                                type="submit"
                                className="btn btn-amber"
                                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                            >
                                <Upload size={16} /> Restore & Sync to this PC
                            </button>
                        </form>
                    </div>

                    {/* Card 2: App Settings & Keys */}
                    <div className="card-elevated" style={{ padding: '24px' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Key size={20} /> App Settings & Keys
                        </h3>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px' }}>Gemini API Key</label>
                            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '8px' }}>
                                Required for AI list generation, auto-hints, and photo OCR. Stored safely in your local browser only.
                            </p>
                            <input
                                type="password"
                                value={parentApiKey}
                                onChange={e => setParentApiKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="input-field"
                                style={{ fontFamily: 'monospace' }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600 }}>
                                <input
                                    type="checkbox"
                                    checked={ttsMuted}
                                    onChange={e => setTtsMuted(e.target.checked)}
                                    style={{ width: '20px', height: '20px' }}
                                />
                                Mute speech narration & sound effects
                            </label>
                        </div>

                        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                            <button
                                onClick={() => {
                                    if (window.confirm("Reset all spelling data and restore defaults?")) {
                                        localStorage.clear();
                                        window.location.reload();
                                    }
                                }}
                                className="btn"
                                style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 16px', fontSize: '0.9rem' }}
                            >
                                Reset to Default Demo Data
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
