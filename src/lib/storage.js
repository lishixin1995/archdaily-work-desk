import { useCallback, useSyncExternalStore } from 'react';

// Every list lives in localStorage under these keys. cloudSync.js mirrors each
// write to the cloud database, so the key names must never change.
export const STORAGE_KEYS = {
  tasks: 'archDailyWorkDesk.tasks.v2',
  daily: 'archDailyWorkDesk.dailyTaskLog.v2',
  dob: 'archDailyWorkDesk.dobNotes.v2',
  links: 'archDailyWorkDesk.dobCodeLinks.v1',
  prompts: 'archDailyWorkDesk.aiPromptLibrary.v2',
  revit: 'archDailyWorkDesk.revitTroubleShoot.v2',
};

// Older versions of the site saved under these names.
const LEGACY_KEYS = {
  tasks: ['archDailyWorkDesk.tasks', 'tasks', 'dashboardTasks'],
  daily: ['archDailyWorkDesk.dailyTaskLog', 'dailyTaskLog'],
  dob: ['archDailyWorkDesk.dobNotes', 'dobNotes', 'quickNotes'],
  links: ['archDailyWorkDesk.dobCodeLinks', 'dobCodeLinks'],
  prompts: ['archDailyWorkDesk.aiPromptLibrary', 'aiPromptLibrary', 'promptLog'],
  revit: ['archDailyWorkDesk.revitTroubleShoot', 'revitTroubleShoot'],
};

export const CLOUD_KEYS = Object.values(STORAGE_KEYS);

function safeParse(value) {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.items)) return parsed.items;
    if (parsed && Array.isArray(parsed.data)) return parsed.data;
    return [];
  } catch {
    return [];
  }
}

// A list found only under a legacy key is copied to the current key, so it
// syncs from then on. Runs once, before the first render.
export function promoteLegacyLists() {
  for (const [name, key] of Object.entries(STORAGE_KEYS)) {
    if (localStorage.getItem(key) !== null) continue;
    const legacy = LEGACY_KEYS[name].map((old) => localStorage.getItem(old)).find(Boolean);
    if (legacy && safeParse(legacy).length) localStorage.setItem(key, JSON.stringify(safeParse(legacy)));
  }
}

const cache = new Map();
const listeners = new Map();

function read(name) {
  if (!cache.has(name)) cache.set(name, safeParse(localStorage.getItem(STORAGE_KEYS[name])));
  return cache.get(name);
}

function emit(name) {
  (listeners.get(name) || []).forEach((listener) => listener());
}

function write(name, value) {
  cache.set(name, value);
  localStorage.setItem(STORAGE_KEYS[name], JSON.stringify(value));
  emit(name);
}

// Another tab changed a list.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    const name = Object.keys(STORAGE_KEYS).find((key) => STORAGE_KEYS[key] === event.key);
    if (!name) return;
    cache.delete(name);
    emit(name);
  });
}

function subscribe(name, listener) {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name).add(listener);
  return () => listeners.get(name).delete(listener);
}

// One stored list. The setter takes a value or an updater function, and the
// updater always gets the latest stored list, so quick edits never undo each other.
export function useStoredList(name) {
  const items = useSyncExternalStore(useCallback((listener) => subscribe(name, listener), [name]), () => read(name));
  const update = useCallback((next) => {
    const current = read(name);
    const value = typeof next === 'function' ? next(current) : next;
    if (value !== current) write(name, value);
  }, [name]);
  return [items, update];
}
