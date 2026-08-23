const DB_NAME = 'signal-vault';
const DB_VERSION = 1;
const STORE = 'libraries';
const CURRENT_KEY = 'signal-vault-current-library';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function runTransaction(mode, operation) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    const request = operation(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function saveLibrary(catalog) {
  await runTransaction('readwrite', (store) => store.put({ id: catalog.id, catalog, updatedAt: new Date().toISOString() }));
  localStorage.setItem(CURRENT_KEY, catalog.id);
}

export async function loadCurrentLibrary() {
  const id = localStorage.getItem(CURRENT_KEY);
  if (!id) return null;
  try {
    const record = await runTransaction('readonly', (store) => store.get(id));
    return record?.catalog || null;
  } catch {
    return null;
  }
}

export async function forgetCurrentLibrary() {
  const id = localStorage.getItem(CURRENT_KEY);
  if (!id) return null;
  try { await runTransaction('readwrite', (store) => store.delete(id)); } catch { /* Local cleanup can still continue. */ }
  localStorage.removeItem(CURRENT_KEY);
  return id;
}
