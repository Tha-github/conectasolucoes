// Imagens enviadas pelo painel e ainda não integradas ao repositório.
// Ficam no IndexedDB deste navegador (localStorage seria pequeno demais).
// Sem IndexedDB (navegação privada, bloqueio), usa memória e avisa que as
// imagens se perdem ao recarregar.

const DB_NAME = 'conecta-solucoes-painel';
const STORE = 'imagens';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'src' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run(db, mode, action) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve(request?.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/**
 * @typedef {{ src: string, type: string, blob: Blob }} StoredImage
 * @returns {Promise<{ persistent: boolean, get(src: string): Promise<StoredImage | undefined>, put(record: StoredImage): Promise<void>, remove(src: string): Promise<void>, keys(): Promise<string[]> }>}
 */
export async function createImageStore() {
  try {
    if (!('indexedDB' in globalThis)) throw new Error('IndexedDB indisponível');
    const db = await openDb();
    return {
      persistent: true,
      get: (src) => run(db, 'readonly', (store) => store.get(src)),
      put: (record) => run(db, 'readwrite', (store) => store.put(record)),
      remove: (src) => run(db, 'readwrite', (store) => store.delete(src)),
      keys: () => run(db, 'readonly', (store) => store.getAllKeys()),
    };
  } catch {
    const memory = new Map();
    return {
      persistent: false,
      get: async (src) => memory.get(src),
      put: async (record) => void memory.set(record.src, record),
      remove: async (src) => void memory.delete(src),
      keys: async () => [...memory.keys()],
    };
  }
}
