import { useCallback, useEffect, useState } from 'react';

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

// Older versions of the site saved under these names. They are read only when
// the current key is empty.
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

function readList(name) {
  const primary = localStorage.getItem(STORAGE_KEYS[name]);
  if (primary) return safeParse(primary);
  for (const key of LEGACY_KEYS[name]) {
    const legacy = localStorage.getItem(key);
    if (legacy) return safeParse(legacy);
  }
  return [];
}

// One stored list as React state. The setter accepts a value or an updater
// function, and always works from the latest stored list.
export function useStoredList(name) {
  const [items, setItems] = useState(() => readList(name));

  // Copy a list found only under a legacy key to the current key, so it syncs.
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEYS[name]) === null && items.length) {
      localStorage.setItem(STORAGE_KEYS[name], JSON.stringify(items));
    }
    // Runs once, with the list read on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  useEffect(() => {
    const keys = [STORAGE_KEYS[name], ...LEGACY_KEYS[name]];
    function syncFromStorage(event) {
      if (event?.key && !keys.includes(event.key)) return;
      setItems(readList(name));
    }
    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, [name]);

  const update = useCallback((next) => {
    setItems((current) => {
      const value = typeof next === 'function' ? next(current) : next;
      localStorage.setItem(STORAGE_KEYS[name], JSON.stringify(value));
      return value;
    });
  }, [name]);

  return [items, update];
}
