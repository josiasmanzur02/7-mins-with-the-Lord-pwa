(() => {
  const DB_NAME = 'sevenMinutes';
  const DB_VERSION = 1;
  const STORE = 'appState';
  const STREAK_KEY_LEGACY = 'sevenMinutes:streak';
  const PREFS_KEY_LEGACY = 'sevenMinutes:prefs';
  const DEFAULT_STATE = {
    id: 'singleton',
    schemaVersion: 1,
    updatedAt: null,
    settings: {
      theme: 'light',
      language: 'en',
      sound: { enabled: true, volume: 0.7 },
      alarm: {
        enabled: false,
        time: '07:00',
        days: [], // 0 (Sun) - 6 (Sat)
        lastTriggeredAt: null,
      },
    },
    streak: { count: 0, lastCheckDate: null },
    logs: [],
  };

  let dbPromise = null;

  function deepMerge(base, patch) {
    if (Array.isArray(base) || Array.isArray(patch)) return patch ?? base;
    if (typeof base !== 'object' || typeof patch !== 'object' || !patch) return patch ?? base;
    const out = { ...base };
    for (const key of Object.keys(patch)) {
      out[key] = deepMerge(base[key], patch[key]);
    }
    return out;
  }

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function readRecord() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.get('singleton');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function writeRecord(record) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  }

  function migrateLegacyLocalStorage() {
    const legacy = { streak: null, prefs: null };
    try {
      const raw = localStorage.getItem(STREAK_KEY_LEGACY);
      legacy.streak = raw ? JSON.parse(raw) : null;
    } catch (_) {}
    try {
      const raw = localStorage.getItem(PREFS_KEY_LEGACY);
      legacy.prefs = raw ? JSON.parse(raw) : null;
    } catch (_) {}
    if (!legacy.streak && !legacy.prefs) return null;
    const base = JSON.parse(JSON.stringify(DEFAULT_STATE));
    if (legacy.streak) {
      base.streak = {
        count: Number(legacy.streak.streak) || 0,
        lastCheckDate: legacy.streak.last || null,
      };
    }
    if (legacy.prefs) {
      base.settings.theme = legacy.prefs.theme || base.settings.theme;
      base.settings.language = legacy.prefs.language || base.settings.language;
    }
    base.updatedAt = new Date().toISOString();
    return base;
  }

  function applyDefaults(state) {
    const merged = deepMerge(DEFAULT_STATE, state || {});
    if (!merged.id) merged.id = 'singleton';
    if (!merged.schemaVersion) merged.schemaVersion = DEFAULT_STATE.schemaVersion;
    return merged;
  }

  async function getState() {
    const existing = await readRecord();
    if (existing) return applyDefaults(existing);
    const migrated = migrateLegacyLocalStorage();
    const toStore = applyDefaults(migrated || DEFAULT_STATE);
    if (typeof document !== 'undefined') {
      toStore.settings.language = document.documentElement.lang || toStore.settings.language;
    }
    toStore.updatedAt = new Date().toISOString();
    await writeRecord(toStore);
    return toStore;
  }

  async function saveState(next) {
    const prepared = applyDefaults(next);
    prepared.updatedAt = new Date().toISOString();
    await writeRecord(prepared);
    return prepared;
  }

  async function updateState(mutator) {
    const current = await getState();
    const next = mutator ? mutator(JSON.parse(JSON.stringify(current))) : current;
    return saveState(next);
  }

  async function exportState() {
    const state = await getState();
    return JSON.stringify(state, null, 2);
  }

  function validateImported(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('Invalid file');
    if (typeof obj.schemaVersion !== 'number') throw new Error('Missing schemaVersion');
    return applyDefaults(obj);
  }

  async function importState(obj) {
    const valid = validateImported(obj);
    return saveState(valid);
  }

  async function resetState() {
    return saveState(DEFAULT_STATE);
  }

  window.AppStorage = {
    getState,
    updateState,
    exportState,
    importState,
    resetState,
    _migrateLegacy: migrateLegacyLocalStorage,
  };
})();
