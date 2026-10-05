// Universal Cross-Device Sync & Sharing Manager

// 1. Generate a shareable URL containing the spelling list payload
export const generateShareableListUrl = (list) => {
    try {
        const payload = {
            t: list.title,
            w: list.words.map(w => ({ w: w.word, h: w.hint }))
        };
        const jsonStr = JSON.stringify(payload);
        const encoded = btoa(encodeURIComponent(jsonStr));
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}#/play?importList=${encoded}`;
    } catch (e) {
        console.error('Error generating shareable link:', e);
        return window.location.href;
    }
};

// 2. Parse shared list payload from URL parameters
export const parseSharedListFromUrl = () => {
    try {
        if (typeof window === 'undefined') return null;

        // Check hash query params or search params
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        let paramString = '';

        if (hash.includes('?')) {
            paramString = hash.split('?')[1];
        } else if (search.includes('?')) {
            paramString = search.substring(1);
        }

        const params = new URLSearchParams(paramString);
        const importData = params.get('importList');

        if (importData) {
            const decodedJson = decodeURIComponent(atob(importData));
            const parsed = JSON.parse(decodedJson);
            if (parsed.w && Array.isArray(parsed.w)) {
                return {
                    title: parsed.t || 'Shared Spelling List',
                    words: parsed.w.map(item => ({ word: item.w, hint: item.h }))
                };
            }
        }
        return null;
    } catch (e) {
        console.error('Failed to parse shared list from URL:', e);
        return null;
    }
};

// 3. Export all profiles and lists as a portable text code
export const exportFullBackupCode = (profiles, customLists) => {
    try {
        const bundle = {
            version: '2.0',
            exportedAt: new Date().toISOString(),
            profiles,
            customLists
        };
        return btoa(encodeURIComponent(JSON.stringify(bundle)));
    } catch (e) {
        console.error('Export error:', e);
        return '';
    }
};

// 4. Import all profiles and lists from a text code
export const importFullBackupCode = (codeStr) => {
    try {
        const decoded = decodeURIComponent(atob(codeStr.trim()));
        const parsed = JSON.parse(decoded);
        if (parsed.profiles && parsed.customLists) {
            return {
                profiles: parsed.profiles,
                customLists: parsed.customLists
            };
        }
        throw new Error('Invalid backup code format.');
    } catch (e) {
        console.error('Import error:', e);
        throw new Error('Could not read sync code. Please make sure the code was copied completely.');
    }
};
