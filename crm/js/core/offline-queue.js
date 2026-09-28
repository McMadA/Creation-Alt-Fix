/**
 * @file crm/js/core/offline-queue.js
 * IndexedDB Write-Ahead Logging & Mutation Replay Queue.
 * Garandeert offline resiliency bij netwerkonderbrekingen.
 * Creation+Alt+Fix CRM (2026/2027)
 */

const DB_NAME = 'caf_offline_db';
const DB_VERSION = 1;
const STORE_MUTATIONS = 'pending_mutations';

export class OfflineQueue {
    static async _openDB() {
        if (typeof indexedDB === 'undefined') return null;
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_MUTATIONS)) {
                    db.createObjectStore(STORE_MUTATIONS, { keyPath: 'id', autoIncrement: true });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Voeg een mutatie toe aan de offline wachtrij
     * @param {Object} item
     * @param {'update'|'set'|'delete'} item.action
     * @param {string} item.collection
     * @param {string} item.docId
     * @param {Object} [item.data]
     */
    static async enqueue({ action, collection, docId, data = {} }) {
        const db = await this._openDB();
        if (!db) return;

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
            tx.objectStore(STORE_MUTATIONS).add({
                action,
                collection,
                docId,
                data,
                timestamp: Date.now()
            });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    /**
     * Haal alle openstaande offline mutaties op
     */
    static async getPending() {
        const db = await this._openDB();
        if (!db) return [];

        return new Promise((resolve) => {
            const tx = db.transaction(STORE_MUTATIONS, 'readonly');
            const req = tx.objectStore(STORE_MUTATIONS).getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    }

    /**
     * Spoel de wachtrij door zodra de internetverbinding hersteld is
     * @param {Object} firestoreInstance Firebase Firestore instantie
     * @param {Object} [firestoreMethods] { doc, updateDoc, setDoc, deleteDoc }
     */
    static async flush(firestoreInstance, firestoreMethods = {}) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
        const db = await this._openDB();
        if (!db || !firestoreInstance) return 0;

        const mutations = await this.getPending();
        if (mutations.length === 0) return 0;

        let processed = 0;
        const { doc, updateDoc, setDoc, deleteDoc } = firestoreMethods;

        for (const item of mutations) {
            try {
                if (typeof doc === 'function') {
                    const docRef = doc(firestoreInstance, item.collection, item.docId);
                    if (item.action === 'update' && typeof updateDoc === 'function') {
                        await updateDoc(docRef, item.data);
                    } else if (item.action === 'set' && typeof setDoc === 'function') {
                        await setDoc(docRef, item.data, { merge: true });
                    } else if (item.action === 'delete' && typeof deleteDoc === 'function') {
                        await deleteDoc(docRef);
                    }
                }
                
                // Verwijder uit IndexedDB na succesvolle cloud sync
                await this._deleteMutation(item.id);
                processed++;
            } catch (err) {
                console.error(`[OfflineQueue] Fout bij syncen item ${item.id}:`, err);
                break; // Stop tijdelijk bij conflicten of authenticatieverlies
            }
        }
        return processed;
    }

    static async _deleteMutation(id) {
        const db = await this._openDB();
        if (!db) return;
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
            tx.objectStore(STORE_MUTATIONS).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    }

    static async clearAll() {
        const db = await this._openDB();
        if (!db) return;
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
            tx.objectStore(STORE_MUTATIONS).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    }
}

// Luister automatisch naar online status indien in browseromgeving
if (typeof window !== 'undefined') {
    window.addEventListener('online', async () => {
        try {
            const { Toast } = await import('./toast.js');
            Toast.show({ title: "Verbinding hersteld", message: "Lokale wijzigingen synchroniseren met Firestore...", type: "info" });
            const { db } = await import('./firebase.js');
            const { doc, updateDoc, setDoc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
            const syncedCount = await OfflineQueue.flush(db, { doc, updateDoc, setDoc, deleteDoc });
            if (syncedCount > 0) {
                Toast.show({ title: "Gesynchroniseerd", message: `${syncedCount} offline mutaties verwerkt in cloud.`, type: "success" });
            }
        } catch (e) {
            console.warn('[OfflineQueue] Automatische flush waarschuwing:', e);
        }
    });
}
