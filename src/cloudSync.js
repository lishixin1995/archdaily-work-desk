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

    const existingTime = Date.parse(existing.updatedAt || existing.createdAt || 0) || 0;
    const localTime = Date.parse(item.updatedAt || item.createdAt || 0) || 0;
    map.set(key, localTime >= existingTime ? item : existing);
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

export async function bootCloudSync({ app, keys }) {
  const watchedKeys = new Set(keys || []);
  const nativeSetItem = window.localStorage.setItem.bind(window.localStorage);
  const nativeRemoveItem = window.localStorage.removeItem.bind(window.localStorage);
  const timers = new Map();

  window.__personalCloudSync = {
    app,
    ready: false,
    status: 'Starting cloud sync...'
  };

  function scheduleSave(key, rawValue) {
    if (!watchedKeys.has(key)) return;
    window.clearTimeout(timers.get(key));
    timers.set(key, window.setTimeout(async () => {
      try {
        const parsed = safeParseJson(rawValue, rawValue);
        await saveCloudValue(app, key, parsed);
        window.__personalCloudSync.status = 'Saved to cloud.';
      } catch (error) {
        console.warn('[cloudSync] save failed', key, error);
        window.__personalCloudSync.status = 'Cloud save failed; local copy kept.';
      }
    }, 450));
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

  window.__personalCloudSync.ready = true;
  window.__personalCloudSync.status = 'Cloud sync ready.';
}
