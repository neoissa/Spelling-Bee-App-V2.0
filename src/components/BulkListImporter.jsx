import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { sounds } from '../utils/audio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    ClipboardList, Sparkles, CheckCircle2, Trash2,
    X, AlertCircle, Loader2, ArrowRight
} from 'lucide-react';

export default function BulkListImporter({ onListCreated, onCancel, targetProfileId }) {
    const { profiles, customLists, setCustomLists, parentApiKey } = useAppContext();

    const [listTitle, setListTitle] = useState('');
    const [rawText, setRawText] = useState('');
    const [parsedWords, setParsedWords] = useState([]);
    const [isAutoHinting, setIsAutoHinting] = useState(false);
    const [step, setStep] = useState('input');
    const [errorMessage, setErrorMessage] = useState('');

    const handleParseText = () => {
        setErrorMessage('');
        if (!rawText.trim()) {
            setErrorMessage('Please paste or type some words first.');
            return;
        }

        sounds.playPop();

        const lines = rawText.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean);
        const extracted = [];

        lines.forEach(line => {
            let cleaned = line.replace(/^[\d]+[\.\)\-\:\s]+/, '').replace(/^[\-\*\•\>\s]+/, '').trim();
            if (!cleaned) return;

            let word = '';
            let hint = '';

            const dashMatch = cleaned.match(/^([a-zA-Z\s'-]+)\s*[-:–—]\s*(.+)$/);
            const parenMatch = cleaned.match(/^([a-zA-Z\s'-]+)\s*\((.+)\)$/);

            if (dashMatch) {
                word = dashMatch[1].trim().toLowerCase();
                hint = dashMatch[2].trim();
            } else if (parenMatch) {
                word = parenMatch[1].trim().toLowerCase();
                hint = parenMatch[2].trim();
            } else {
                const wordsInLine = cleaned.split(/\s+/).filter(Boolean);
                if (wordsInLine.length === 1) {
                    word = wordsInLine[0].trim().toLowerCase();
                    hint = `Practice spelling "${word}"`;
                } else {
                    wordsInLine.forEach(w => {
                        const cleanW = w.replace(/[^a-zA-Z'-]/g, '').trim().toLowerCase();
                        if (cleanW) {
                            extracted.push({
                                word: cleanW,
                                hint: `Practice spelling "${cleanW}"`
                            });
                        }
                    });
                    return;
                }
            }

            const cleanWord = word.replace(/[^a-zA-Z'-]/g, '').trim();
            if (cleanWord) {
                extracted.push({
                    word: cleanWord,
                    hint: hint || `Practice spelling "${cleanWord}"`
                });
            }
        });

        if (extracted.length === 0) {
            setErrorMessage('No valid spelling words could be detected. Please check your text.');
            sounds.playWrong();
            return;
        }

        const unique = [];
        const seen = new Set();
        extracted.forEach(item => {
            if (!seen.has(item.word)) {
                seen.add(item.word);
                unique.push(item);
            }
        });

        setParsedWords(unique);
        if (!listTitle.trim()) {
            setListTitle(`Spelling List (${unique.length} Words)`);
        }
        setStep('review');
        sounds.playCorrect();
    };

    const handleGenerateKidHints = async () => {
        if (!parentApiKey) {
            alert('Please add your Gemini API Key in Parent Hub Settings to use AI hints.');
            return;
        }

        setIsAutoHinting(true);
        sounds.playPop();

        try {
            const genAI = new GoogleGenerativeAI(parentApiKey.trim());
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const wordsList = parsedWords.map(w => w.word).join(', ');
            const prompt = `For each of the following elementary spelling words: [${wordsList}], write a short, fun, kid-friendly context hint or simple clue sentence.
Return ONLY a valid JSON array of objects with keys "word" and "hint".
Example: [{"word": "star", "hint": "Twinkles in the night sky."}]`;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const aiHints = JSON.parse(cleanJson);

            if (Array.isArray(aiHints)) {
                setParsedWords(prev => prev.map(item => {
                    const found = aiHints.find(h => h.word && h.word.toLowerCase() === item.word.toLowerCase());
                    return found ? { ...item, hint: found.hint } : item;
                }));
                sounds.playCorrect();
            }
        } catch (err) {
            console.error('Error generating AI hints:', err);
            sounds.playWrong();
            alert('Could not generate AI hints. Existing hints will be used.');
        } finally {
            setIsAutoHinting(false);
        }
    };

    const handleRemoveWord = (idx) => {
        sounds.playPop();
        setParsedWords(prev => prev.filter((_, i) => i !== idx));
    };

    const handleUpdateHint = (idx, newHint) => {
        setParsedWords(prev => prev.map((item, i) => i === idx ? { ...item, hint: newHint } : item));
    };

    const handleSaveList = () => {
        if (!listTitle.trim() || parsedWords.length === 0) return;

        const targetId = targetProfileId || profiles[0]?.id;
        const newList = {
            id: `bulk-list-${Date.now()}`,
            profileId: targetId,
            title: `📋 ${listTitle.trim()}`,
            words: parsedWords,
            scheduledDate: ''
        };

        setCustomLists([...customLists, newList]);
        sounds.playVictory();

        if (onListCreated) {
            onListCreated(newList);
        }
    };

    return (
        <div className="glass-panel animate-fade" style={{ padding: '24px', maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: '#EEF2FF', color: '#4F46E5', padding: '8px', borderRadius: '12px' }}>
                        <ClipboardList size={24} />
                    </div>
                    <div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#1E293B', margin: 0 }}>
                            Paste & Import Word List
                        </h3>
                        <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
                            Paste a list of words from anywhere (separated by commas, lines, or numbers)
                        </p>
                    </div>
                </div>

                {onCancel && (
                    <button onClick={() => { sounds.playPop(); onCancel(); }} className="btn-icon" title="Close">
                        <X size={20} />
                    </button>
                )}
            </div>

            {errorMessage && (
                <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                    <AlertCircle size={18} />
                    <span>{errorMessage}</span>
                </div>
            )}

            {step === 'input' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>
                            List Title (Optional):
                        </label>
                        <input
                            type="text"
                            value={listTitle}
                            onChange={e => setListTitle(e.target.value)}
                            placeholder="e.g., Week 3 Spelling Words, Science Vocabulary"
                            className="input-field"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>
                            Paste Word List Here:
                        </label>
                        <textarea
                            value={rawText}
                            onChange={e => setRawText(e.target.value)}
                            placeholder={`Paste words in any format, e.g.:

apple, banana, orange, strawberry, grape

Or line-by-line with hints:
1. planet - Earth is one
2. rocket - Blasts into outer space
3. galaxy - System of millions of stars`}
                            rows={8}
                            className="input-field"
                            style={{
                                width: '100%',
                                resize: 'vertical',
                                fontFamily: 'var(--font-body)',
                                fontSize: '0.95rem',
                                lineHeight: '1.5'
                            }}
                            autoFocus
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            onClick={handleParseText}
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '14px', fontSize: '1.05rem' }}
                            disabled={!rawText.trim()}
                        >
                            Process & Review Words <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {step === 'review' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>
                            List Title:
                        </label>
                        <input
                            type="text"
                            value={listTitle}
                            onChange={e => setListTitle(e.target.value)}
                            placeholder="List Title..."
                            className="input-field"
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#3730A3', fontSize: '0.95rem' }}>
                            ✨ Ready to Import: {parsedWords.length} Words
                        </span>

                        <div style={{ display: 'flex', gap: '6px' }}>
                            {parentApiKey && (
                                <button
                                    onClick={handleGenerateKidHints}
                                    disabled={isAutoHinting}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                    title="Auto-generate fun kid hints for these words with Gemini"
                                >
                                    {isAutoHinting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    Auto AI Hints
                                </button>
                            )}

                            <button
                                onClick={() => { sounds.playPop(); setStep('input'); }}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            >
                                Edit Raw Text
                            </button>
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        maxHeight: '280px',
                        overflowY: 'auto',
                        paddingRight: '4px'
                    }}>
                        {parsedWords.map((item, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px 14px',
                                    background: '#F8FAFC',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid #E2E8F0',
                                    gap: '10px'
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <strong style={{ fontSize: '1.05rem', color: '#1E293B', textTransform: 'capitalize' }}>
                                        {item.word}
                                    </strong>
                                    <input
                                        type="text"
                                        value={item.hint}
                                        onChange={e => handleUpdateHint(idx, e.target.value)}
                                        placeholder="Hint or sentence..."
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            color: '#64748B',
                                            fontSize: '0.85rem',
                                            outline: 'none',
                                            padding: '2px 0',
                                            width: '100%',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={() => handleRemoveWord(idx)}
                                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '6px' }}
                                    title="Remove word"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleSaveList}
                        disabled={!listTitle.trim() || parsedWords.length === 0}
                        className="btn btn-emerald"
                        style={{ padding: '14px', fontSize: '1.1rem' }}
                    >
                        <CheckCircle2 size={20} /> Save List & Start Practicing!
                    </button>
                </div>
            )}
        </div>
    );
}
