// Small IndexedDB cache so the Devices / Order Summary / Audit tabs can show the
// last-known device list instantly while fresh data loads in the background.
// Every call is best-effort: if IndexedDB is unavailable (private mode, blocked
// storage) the app simply falls back to loading from the database.

const DB_NAME = 'lead-inventory-cache';
const STORE = 'kv';
const VERSION = 1;

export interface CachedDevices<T> {
  rows: T[];
  /** Highest updated_at seen in rows (server time) — used for incremental refresh. */
  lastUpdatedAt: string | null;
  savedAt: number;
}

const openDb = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

export async function readDeviceCache<T>(key: string): Promise<CachedDevices<T> | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as CachedDevices<T>) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function writeDeviceCache<T>(key: string, value: CachedDevices<T>): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export const maxUpdatedAt = (rows: { updated_at?: string | null }[]): string | null => {
  let max: string | null = null;
  for (const r of rows) {
    const u = r.updated_at;
    if (u && (!max || new Date(u).getTime() > new Date(max).getTime())) max = u;
  }
  return max;
};
