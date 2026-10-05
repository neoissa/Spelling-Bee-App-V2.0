import React, { useState, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useAppContext } from '../context/AppContext';
import { processAndCompressImage } from '../utils/imageCompressor';
import { sounds } from '../utils/audio';
import {
    Camera, Upload, Sparkles, Loader2, CheckCircle2,
    Trash2, X, AlertCircle
} from 'lucide-react';

export default function PhotoListScanner({ onListCreated, onCancel, targetProfileId }) {
    const { parentApiKey, setParentApiKey, profiles, customLists, setCustomLists } = useAppContext();

    const [imagePreview, setImagePreview] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const [listTitle, setListTitle] = useState('');
    const [extractedWords, setExtractedWords] = useState([]);
    const [newWordInput, setNewWordInput] = useState('');
    const [newHintInput, setNewHintInput] = useState('');
    const [showReview, setShowReview] = useState(false);

    const [tempApiKey, setTempApiKey] = useState(parentApiKey || '');
    const [showApiKeyInput, setShowApiKeyInput] = useState(!parentApiKey);

    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        sounds.playPop();
        setErrorMessage('');
        setIsScanning(true);
        setScanStatus('Optimizing image for fast processing...');

        try {
            const compressed = await processAndCompressImage(file, 1200, 0.85);
            setImagePreview(compressed.dataUrl);

            const activeKey = parentApiKey || tempApiKey;
            if (!activeKey.trim()) {
                setIsScanning(false);
                setShowApiKeyInput(true);
                setErrorMessage('Please provide a Gemini API Key to scan your photo.');
                return;
            }

            await analyzeImageWithGemini(compressed.base64Data, activeKey.trim());
        } catch (err) {
            console.error('Image scan error:', err);
            setIsScanning(false);
            setErrorMessage(err.message || 'Failed to process image.');
            sounds.playWrong();
        }
    };

    const analyzeImageWithGemini = async (base64Data, apiKey) => {
        setScanStatus('🤖 Gemini AI reading words from photo...');

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `You are an expert reading and spelling teacher.
Analyze this photo of a spelling word list, worksheet, test, whiteboard, or textbook.
Extract ALL spelling words from the image. For each word, create or detect a simple, kid-friendly context hint.

Return ONLY a valid JSON object in this format:
{
  "title": "A short descriptive title for the list",
  "words": [
    { "word": "example", "hint": "A simple sentence or context clue." }
  ]
}`;

            const imagePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg"
                }
            };

            const result = await model.generateContent([prompt, imagePart]);
            const responseText = result.response.text();

            const cleanJson = responseText
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/```\s*$/i, '')
                .trim();

            const parsed = JSON.parse(cleanJson);

            if (parsed.words && Array.isArray(parsed.words) && parsed.words.length > 0) {
                const cleanWords = parsed.words
                    .filter(item => item && item.word)
                    .map(item => ({
                        word: String(item.word).toLowerCase().replace(/[^a-z'-]/g, '').trim(),
                        hint: String(item.hint || 'Spelling practice word').trim()
                    }))
                    .filter(item => item.word.length > 0);

                setListTitle(parsed.title || `Photo List (${new Date().toLocaleDateString()})`);
                setExtractedWords(cleanWords);
                setShowReview(true);
                sounds.playCorrect();
            } else {
                throw new Error("No spelling words could be detected in this photo. Please try a clearer photo.");
            }
        } catch (err) {
            console.error("Gemini Vision analysis error:", err);
            setErrorMessage("Could not detect words in this image. Please check your API key or take a clearer photo with good lighting.");
            sounds.playWrong();
        } finally {
            setIsScanning(false);
        }
    };

    const handleAddWordToReview = (e) => {
        e.preventDefault();
        if (!newWordInput.trim()) return;
        sounds.playPop();

        setExtractedWords(prev => [
            ...prev,
            {
                word: newWordInput.trim().toLowerCase(),
                hint: newHintInput.trim() || 'Spelling practice word'
            }
        ]);
        setNewWordInput('');
        setNewHintInput('');
    };

    const handleRemoveWord = (idx) => {
        sounds.playPop();
        setExtractedWords(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSaveApiKey = () => {
        if (!tempApiKey.trim()) return;
        setParentApiKey(tempApiKey.trim());
        setShowApiKeyInput(false);
        sounds.playCorrect();
        if (imagePreview) {
            const base64Data = imagePreview.split(',')[1];
            setIsScanning(true);
            analyzeImageWithGemini(base64Data, tempApiKey.trim());
        }
    };

    const handleSaveList = () => {
        if (!listTitle.trim() || extractedWords.length === 0) return;

        const targetId = targetProfileId || profiles[0]?.id;
        const newList = {
            id: `photo-list-${Date.now()}`,
            profileId: targetId,
            title: `📸 ${listTitle.trim()}`,
            words: extractedWords,
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: '#FEF3C7', color: '#B45309', padding: '8px', borderRadius: '12px' }}>
                        <Camera size={24} />
                    </div>
                    <div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#1E293B', margin: 0 }}>
                            Photo & Camera List Scanner
                        </h3>
                        <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
                            Snap a photo of homework or worksheets to create instant spelling lists!
                        </p>
                    </div>
                </div>

                {onCancel && (
                    <button onClick={() => { sounds.playPop(); onCancel(); }} className="btn-icon" title="Close Scanner">
                        <X size={20} />
                    </button>
                )}
            </div>

            {showApiKeyInput && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B45309', fontWeight: 700, marginBottom: '6px' }}>
                        <Sparkles size={18} /> Enter Gemini API Key for Vision AI
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#78350F', marginBottom: '10px' }}>
                        Gemini Vision reads handwriting and printed text directly from photos:
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="password"
                            placeholder="AIzaSy..."
                            value={tempApiKey}
                            onChange={e => setTempApiKey(e.target.value)}
                            className="input-field"
                            style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem', fontFamily: 'monospace' }}
                        />
                        <button onClick={handleSaveApiKey} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                            Save
                        </button>
                    </div>
                </div>
            )}

            {errorMessage && (
                <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                    <AlertCircle size={20} />
                    <span>{errorMessage}</span>
                </div>
            )}

            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
            <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />

            {!showReview && !isScanning && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        <button
                            onClick={() => { sounds.playPop(); cameraInputRef.current?.click(); }}
                            className="card-elevated"
                            style={{
                                padding: '28px 20px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
                                border: '2px solid #C7D2FE',
                                borderRadius: 'var(--radius-lg)'
                            }}
                        >
                            <div style={{
                                width: '60px',
                                height: '60px',
                                margin: '0 auto 12px',
                                background: '#4F46E5',
                                color: '#FFFFFF',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                            }}>
                                <Camera size={30} />
                            </div>
                            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#3730A3', marginBottom: '4px' }}>
                                Take Photo
                            </h4>
                            <p style={{ color: '#4338CA', fontSize: '0.85rem' }}>
                                Use your phone or tablet camera
                            </p>
                        </button>

                        <button
                            onClick={() => { sounds.playPop(); galleryInputRef.current?.click(); }}
                            className="card-elevated"
                            style={{
                                padding: '28px 20px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                                border: '2px solid #A7F3D0',
                                borderRadius: 'var(--radius-lg)'
                            }}
                        >
                            <div style={{
                                width: '60px',
                                height: '60px',
                                margin: '0 auto 12px',
                                background: '#10B981',
                                color: '#FFFFFF',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                            }}>
                                <Upload size={30} />
                            </div>
                            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#065F46', marginBottom: '4px' }}>
                                Upload Image
                            </h4>
                            <p style={{ color: '#047857', fontSize: '0.85rem' }}>
                                Select photo from photos or files
                            </p>
                        </button>
                    </div>
                </div>
            )}

            {isScanning && (
                <div className="animate-pop" style={{ textAlign: 'center', padding: '40px 20px' }}>
                    {imagePreview && (
                        <div style={{ marginBottom: '20px', position: 'relative', display: 'inline-block' }}>
                            <img
                                src={imagePreview}
                                alt="Scanning preview"
                                style={{
                                    maxWidth: '220px',
                                    maxHeight: '160px',
                                    borderRadius: 'var(--radius-md)',
                                    boxShadow: 'var(--shadow-md)',
                                    border: '3px solid #4F46E5'
                                }}
                            />
                        </div>
                    )}
                    <Loader2 size={36} className="animate-spin" style={{ color: '#4F46E5', margin: '0 auto 16px' }} />
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: '#1E293B', marginBottom: '6px' }}>
                        Scanning Photo...
                    </h4>
                    <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
                        {scanStatus}
                    </p>
                </div>
            )}

            {showReview && (
                <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#3730A3', fontSize: '0.95rem' }}>
                            ✨ Detected {extractedWords.length} Words:
                        </span>
                        <button
                            onClick={() => {
                                sounds.playPop();
                                setShowReview(false);
                                setImagePreview(null);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        >
                            📸 Retake
                        </button>
                    </div>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        maxHeight: '260px',
                        overflowY: 'auto',
                        paddingRight: '4px'
                    }}>
                        {extractedWords.map((item, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px 14px',
                                    background: '#F8FAFC',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid #E2E8F0'
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <strong style={{ fontSize: '1.05rem', color: '#1E293B', textTransform: 'capitalize' }}>
                                        {item.word}
                                    </strong>
                                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                                        {item.hint}
                                    </span>
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

                    <form onSubmit={handleAddWordToReview} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            placeholder="Add missed word..."
                            value={newWordInput}
                            onChange={e => setNewWordInput(e.target.value)}
                            className="input-field"
                            style={{ flex: 1, minWidth: '120px', padding: '8px 12px', fontSize: '0.9rem' }}
                        />
                        <input
                            type="text"
                            placeholder="Hint (optional)"
                            value={newHintInput}
                            onChange={e => setNewHintInput(e.target.value)}
                            className="input-field"
                            style={{ flex: 2, minWidth: '160px', padding: '8px 12px', fontSize: '0.9rem' }}
                        />
                        <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.9rem' }}>
                            + Add
                        </button>
                    </form>

                    <button
                        onClick={handleSaveList}
                        disabled={!listTitle.trim() || extractedWords.length === 0}
                        className="btn btn-emerald"
                        style={{ padding: '14px', fontSize: '1.1rem', marginTop: '10px' }}
                    >
                        <CheckCircle2 size={20} /> Save List & Start Practicing!
                    </button>
                </div>
            )}
        </div>
    );
}
