
/**
 * BASTION BLOB STORE (IndexedDB Wrapper)
 * 
 * Provides persistent local storage for Encrypted Artifacts.
 * This effectively acts as the "Disk" for the Locker.
 * 
 * INVARIANTS:
 * 1. Only Encrypted Data (Ciphertext) is stored here.
 * 2. No Keys are stored here.
 * 3. Records are keyed by the Resonance ID.
 */

const DB_NAME = 'BastionSecureStore';
const STORE_NAME = 'artifacts';
const DB_VERSION = 1;

export class BlobStorage {
    
    private static async getDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
        });
    }

    /**
     * Persist an encrypted artifact to the browser's IndexedDB.
     */
    static async save(id: string, data: Uint8Array): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            
            // We store the raw Uint8Array (Buffer)
            const request = store.put(data, id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Retrieve an encrypted artifact.
     */
    static async load(id: string): Promise<Uint8Array | null> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result as Uint8Array);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete an artifact.
     */
    static async delete(id: string): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Verify if an artifact exists.
     */
    static async exists(id: string): Promise<boolean> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.count(id);

            request.onsuccess = () => resolve(request.result > 0);
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Get usage estimate.
     */
    static async getUsage(): Promise<number> {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            return estimate.usage || 0;
        }
        return 0;
    }
}
