import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useStoredList } from './lib/storage.js';
import { intersects, isDated, migrateDailyLogs, taskToItem, withStatus } from './lib/tasks.js';
import { nowTimestamp } from './lib/text.js';

const DeskContext = createContext(null);
export const useDesk = () => useContext(DeskContext);

export function DeskProvider({ children }) {
  const [tasks, setTasks] = useStoredList('tasks');
  const [dailyLogs, setDailyLogs] = useStoredList('daily');
  const [dobNotes, setDobNotes] = useStoredList('dob');
  const [links, setLinks] = useStoredList('links');
  const [prompts, setPrompts] = useStoredList('prompts');
  const [revitLogs, setRevitLogs] = useStoredList('revit');

  // Daily Task Log entries live on the dashboard as Done tasks.
  useEffect(() => {
    const migration = migrateDailyLogs(dailyLogs, tasks);
    if (!migration) return;
    setTasks((current) => {
      const ids = new Set(current.map((task) => task.id));
      const added = migration.newTasks.filter((task) => !ids.has(task.id));
      return added.length ? [...added, ...current] : current;
    });
    setDailyLogs(migration.markedLogs);
  }, [dailyLogs, tasks, setTasks, setDailyLogs]);

  const items = useMemo(() => tasks.map(taskToItem), [tasks]);
  const datedItems = useMemo(() => items.filter(isDated), [items]);
  const itemsInRange = useCallback((start, end) => datedItems.filter((item) => intersects(item, start, end)), [datedItems]);

  const updateTask = useCallback((id, change) => {
    setTasks((list) => list.map((task) => (task.id === id ? { ...change(task), updatedAt: nowTimestamp() } : task)));
  }, [setTasks]);
  const addTask = useCallback((task) => setTasks((list) => [task, ...list]), [setTasks]);
  const deleteTask = useCallback((id) => setTasks((list) => list.filter((task) => task.id !== id)), [setTasks]);
  const setTaskStatus = useCallback((id, status) => updateTask(id, (task) => withStatus(task, status)), [updateTask]);
  const toggleItem = useCallback((item) => setTaskStatus(item.id, item.done ? 'Not Started' : 'Done'), [setTaskStatus]);

  const value = useMemo(() => ({
    tasks, dobNotes, links, prompts, revitLogs,
    setDobNotes, setLinks, setPrompts, setRevitLogs,
    items, datedItems, itemsInRange,
    addTask, updateTask, deleteTask, setTaskStatus, toggleItem
  }), [tasks, dobNotes, links, prompts, revitLogs, setDobNotes, setLinks, setPrompts, setRevitLogs, items, datedItems, itemsInRange, addTask, updateTask, deleteTask, setTaskStatus, toggleItem]);

  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}

// ---- UI state shared across views: sheets, day card, drawer, flashes ----

export const UiContext = createContext(null);
export const useUi = () => useContext(UiContext);
