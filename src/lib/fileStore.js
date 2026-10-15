import { loadCloudValue, saveCloudValue } from './cloudSync.js';
import { CLOUD_APP } from './storage.js';

// Attachment contents are too big to live inside the notes: localStorage holds
// about 5 MB for the whole site, and one cloud request at most 4.5 MB. Each file
// is kept in IndexedDB on this device and in the cloud table as its own rows,
// split into parts. A note keeps only the file's name, type, size and part count.
const DB_NAME = 'archDailyWorkDesk.files';
const STORE = 'files';
const PART = 3 * 1024 * 1024;

const memory = new Map();
const loading = new Map();
const uploading = new Map();

const partCount = (dataUrl) => Math.max(1, Math.ceil(dataUrl.length / PART));
const partKey = (id, index) => `archDailyWorkDesk.file.${id}.${index}`;

let dbPromise = null;
function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}

async function run(mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

const writeLocal = (record) => run('readwrite', (store) => store.put(record));
const readLocal = (id) => run('readonly', (store) => store.get(id)).catch(() => undefined);

async function upload(id, dataUrl) {
  for (let index = 0; index < partCount(dataUrl); index += 1) {
    await saveCloudValue(CLOUD_APP, partKey(id, index), dataUrl.slice(index * PART, (index + 1) * PART));
  }
}

// Sends a file to the cloud, then marks this device's copy as synced.
function uploadOnce(id, dataUrl) {
  if (!uploading.has(id)) {
    uploading.set(id, upload(id, dataUrl)
      .then(() => writeLocal({ id, dataUrl, synced: true }).catch(() => {}))
      .finally(() => uploading.delete(id)));
  }
  return uploading.get(id);
}

// Keeps a file on this device and starts its cloud upload. Resolves to the
// number of cloud parts, or 0 when the file could not be kept anywhere.
export async function storeFile(id, dataUrl) {
  memory.set(id, dataUrl);
  try {
    await writeLocal({ id, dataUrl, synced: false });
    uploadOnce(id, dataUrl).catch((error) => console.warn('[files] upload failed; retrying on next start', id, error));
  } catch {
    // No IndexedDB in this browser: the cloud copy is the only one.
    try {
      await uploadOnce(id, dataUrl);
    } catch {
      memory.delete(id);
      return 0;
    }
  }
  return partCount(dataUrl);
}

// The file's contents if they are already in memory.
export function cachedFile(file) {
  return file?.dataUrl || memory.get(file?.id) || '';
}

// The file's contents as a data: URL, from memory, this device or the cloud.
export function loadFile(file) {
  const cached = cachedFile(file);
  if (cached) return Promise.resolve(cached);
  const { id } = file;
  if (!loading.has(id)) {
    loading.set(id, (async () => {
      const local = await readLocal(id);
      if (local?.dataUrl) return local.dataUrl;
      const parts = await Promise.all(Array.from({ length: file.parts || 1 }, (_, index) => loadCloudValue(CLOUD_APP, partKey(id, index))));
      if (parts.some((part) => typeof part !== 'string')) throw new Error('This file is not in the cloud yet.');
      const dataUrl = parts.join('');
      writeLocal({ id, dataUrl, synced: true }).catch(() => {});
      return dataUrl;
    })()
      .then((dataUrl) => { memory.set(id, dataUrl); return dataUrl; })
      .finally(() => loading.delete(id)));
  }
  return loading.get(id);
}

// Uploads files that were kept on this device while the cloud was out of reach.
export async function uploadPendingFiles() {
  let records = [];
  try {
    records = await run('readonly', (store) => store.getAll());
  } catch {
    return;
  }
  for (const record of records) {
    if (!record.synced) await uploadOnce(record.id, record.dataUrl).catch(() => {});
  }
}
