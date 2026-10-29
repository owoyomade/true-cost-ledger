// Minimal IndexedDB wrapper: one object store of records keyed by `id`.
// IndexedDB (rather than localStorage) is the browser's real database: it holds far more data,
// survives as an installed app's storage, and doesn't block the page while saving.
// Kept from the app's first version so records already saved on a device still load.
const DB_NAME = "cloverelle-ledger";
const STORE = "records";

let dbPromise = null;
function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result && "result" in result ? result.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const getAll = () => tx("readonly", s => s.getAll());
export const put = rec => tx("readwrite", s => { s.put(rec); });
export const remove = id => tx("readwrite", s => { s.delete(id); });
export const putMany = recs => tx("readwrite", s => { recs.forEach(r => s.put(r)); });
export const replaceAll = recs => tx("readwrite", s => { s.clear(); recs.forEach(r => s.put(r)); });

// For tests: drop the cached connection.
export function _reset() { dbPromise = null; }
