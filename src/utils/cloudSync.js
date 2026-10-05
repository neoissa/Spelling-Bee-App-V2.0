// Continuous Cloud Room Sync Engine for Multi-Device Real-Time Synchronization

const CLOUD_API_BASE = 'https://api.restful-api.dev/objects';

/**
 * Hash or normalize room code for clean ID matching
 */
export const normalizeRoomCode = (code) => {
    if (!code) return '';
    return code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
};

/**
 * Generate a cute kid-friendly room code (e.g. BEE-824)
 */
export const generateRandomRoomCode = () => {
    const prefixes = ['BEE', 'STAR', 'SPELL', 'BUZZ', 'HONEY', 'HERO', 'MAGIC', 'CHAMP'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${num}`;
};

/**
 * Push local state to Cloud Sync Room
 */
export const pushStateToCloudRoom = async (roomCode, profiles, customLists) => {
    try {
        const cleanCode = normalizeRoomCode(roomCode);
        if (!cleanCode) return null;

        const payload = {
            name: `SPELLING_BEE_ROOM_${cleanCode}`,
            data: {
                roomCode: cleanCode,
                updatedAt: Date.now(),
                version: '2.0',
                profiles,
                customLists
            }
        };

        const existingRecordId = localStorage.getItem(`sp_cloud_rec_${cleanCode}`);

        if (existingRecordId) {
            try {
                const putRes = await fetch(`${CLOUD_API_BASE}/${existingRecordId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (putRes.ok) {
                    const result = await putRes.json();
                    return { success: true, recordId: existingRecordId, updatedAt: payload.data.updatedAt };
                }
            } catch (err) {
                console.warn('PUT failed, falling back to POST:', err);
            }
        }

        // Otherwise create new record
        const postRes = await fetch(CLOUD_API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (postRes.ok) {
            const result = await postRes.json();
            if (result && result.id) {
                localStorage.setItem(`sp_cloud_rec_${cleanCode}`, result.id);
                return { success: true, recordId: result.id, updatedAt: payload.data.updatedAt };
            }
        }

        return null;
    } catch (e) {
        console.error('pushStateToCloudRoom error:', e);
        return null;
    }
};

/**
 * Fetch latest state from Cloud Sync Room
 */
export const fetchStateFromCloudRoom = async (roomCode) => {
    try {
        const cleanCode = normalizeRoomCode(roomCode);
        if (!cleanCode) return null;

        let recordId = localStorage.getItem(`sp_cloud_rec_${cleanCode}`);

        if (recordId) {
            try {
                const getRes = await fetch(`${CLOUD_API_BASE}/${recordId}`);
                if (getRes.ok) {
                    const record = await getRes.json();
                    if (record && record.data && record.data.profiles && record.data.customLists) {
                        return {
                            profiles: record.data.profiles,
                            customLists: record.data.customLists,
                            updatedAt: record.data.updatedAt || 0,
                            recordId: record.id
                        };
                    }
                }
            } catch (e) {
                console.warn('Direct record fetch failed:', e);
            }
        }

        return null;
    } catch (e) {
        console.error('fetchStateFromCloudRoom error:', e);
        return null;
    }
};
