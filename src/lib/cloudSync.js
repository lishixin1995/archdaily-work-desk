function safeParseJson(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function stableStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function itemIdentity(item, index) {
  if (item && typeof item === 'object') {
    return item.id || item.createdAt || item.title || item.url || item.date || `item-${index}`;
  }
  return `item-${index}-${String(item)}`;
}

function itemUpdatedTime(item) {
  return Date.parse(item?.updatedAt || item?.createdAt || 0) || 0;
}

function chooseNewestItem(existing, incoming) {
  const existingTime = itemUpdatedTime(existing);
  const incomingTime = itemUpdatedTime(incoming);

  if (incomingTime > existingTime) return incoming;
  if (existingTime > incomingTime) return existing;

  const existingStatus = existing?.status;
  const incomingStatus = incoming?.status;
  if (existingStatus !== incomingStatus) {
    if (incomingStatus === 'Done') return incoming;
    if (existingStatus === 'Done') return existing;
  }

  if (incoming?.updatedAt && !existing?.updatedAt) return incoming;
  if (existing?.updatedAt && !incoming?.updatedAt) return existing;

  return incoming;
}

function mergeArrays(remote = [], local = []) {
  const map = new Map();

  remote.forEach((item, index) => {
    map.set(itemIdentity(item, index), item);
  });

  local.forEach((item, index) => {
    const key = itemIdentity(item, index);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
      return;
    }

    map.set(key, chooseNewestItem(existing, item));
  });

  return Array.from(map.values());
}

function mergeValues(remote, local) {
  if (Array.isArray(remote) || Array.isArray(local)) {
    return mergeArrays(Array.isArray(remote) ? remote : [], Array.isArray(local) ? local : []);
  }

  if (local !== null && local !== undefined) return local;
  return remote;
}

async function loadCloudValue(app, key) {
  const response = await fetch(`/api/cloud-data?app=${encodeURIComponent(app)}&key=${encodeURIComponent(key)}`);
  if (!response.ok) throw new Error('Unable to load cloud data.');
  const payload = await response.json();
  return payload.data;
}

async function saveCloudValue(app, key, data) {
  const response = await fetch('/api/cloud-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app, key, data })
  });

  if (!response.ok) throw new Error('Unable to save cloud data.');
  return response.json();
}

function sendCloudBeacon(app, key, data) {
  if (!navigator.sendBeacon) return false;
  try {
    const payload = JSON.stringify({ app, key, data });
    return navigator.sendBeacon('/api/cloud-data', new Blob([payload], { type: 'application/json' }));
  } catch {
    return false;
  }
}

export async function bootCloudSync({ app, keys }) {
  const watchedKeys = new Set(keys || []);
  const nativeSetItem = window.localStorage.setItem.bind(window.localStorage);
  const nativeRemoveItem = window.localStorage.removeItem.bind(window.localStorage);
  const timers = new Map();
  const pending = new Map();

  window.__personalCloudSync = {
    app,
    ready: false,
    status: 'Starting cloud sync...',
    async saveNow(key, rawValue = window.localStorage.getItem(key)) {
      return saveNow(key, rawValue);
    }
  };

  async function saveNow(key, rawValue = window.localStorage.getItem(key)) {
    if (!watchedKeys.has(key)) return;
    window.clearTimeout(timers.get(key));
    timers.delete(key);

    try {
      const parsed = safeParseJson(rawValue, rawValue);
      pending.set(key, parsed);
      await saveCloudValue(app, key, parsed);
      pending.delete(key);
      window.__personalCloudSync.status = 'Saved to cloud.';
    } catch (error) {
      console.warn('[cloudSync] save failed', key, error);
      window.__personalCloudSync.status = 'Cloud save failed; local cache kept until retry.';
    }
  }

  window.__archDailySaveCloudNow = saveNow;
  window.__personalSaveCloudNow = saveNow;

  function scheduleSave(key, rawValue) {
    if (!watchedKeys.has(key)) return;
    const parsed = safeParseJson(rawValue, rawValue);
    pending.set(key, parsed);
    window.clearTimeout(timers.get(key));
    timers.set(key, window.setTimeout(() => {
      saveNow(key, rawValue);
    }, 80));
  }

  function flushPendingWithBeacon() {
    for (const key of watchedKeys) {
      const rawValue = window.localStorage.getItem(key);
      if (rawValue === null && !pending.has(key)) continue;
      const data = pending.has(key) ? pending.get(key) : safeParseJson(rawValue, rawValue);
      sendCloudBeacon(app, key, data);
    }
  }

  for (const key of watchedKeys) {
    try {
      const localValue = safeParseJson(window.localStorage.getItem(key), null);
      const cloudValue = await loadCloudValue(app, key);
      const merged = mergeValues(cloudValue, localValue);

      if (merged !== null && merged !== undefined) {
        const mergedRaw = stableStringify(merged);
        nativeSetItem(key, mergedRaw);
        await saveCloudValue(app, key, merged);
      }
    } catch (error) {
      console.warn('[cloudSync] load failed', key, error);
    }
  }

  window.localStorage.setItem = function patchedSetItem(key, value) {
    nativeSetItem(key, value);
    scheduleSave(key, value);
  };

  window.localStorage.removeItem = function patchedRemoveItem(key) {
    nativeRemoveItem(key);
    if (watchedKeys.has(key)) scheduleSave(key, 'null');
  };

  window.addEventListener('archDailyWorkDesk:localDataChanged', (event) => {
    const key = event?.detail?.key;
    if (watchedKeys.has(key)) saveNow(key);
  });
  window.addEventListener('pagehide', flushPendingWithBeacon);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingWithBeacon();
  });

  window.__personalCloudSync.ready = true;
  window.__personalCloudSync.status = 'Cloud sync ready.';
}
