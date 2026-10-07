import { addDays, formatDate, niceDate, parseLocalDate, todayISO } from './dates.js';
import { nowTimestamp } from './text.js';

export const STATUS_COLUMNS = ['Not Started', 'In Progress', 'Waiting', 'Done'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const FOCUS_COLUMNS = ['Urgent', 'High', 'In Progress', 'Waiting', 'Planned'];

export function getTaskDateKeys(task) {
  const start = parseLocalDate(task.startDate || task.dueDate);
  const end = parseLocalDate(task.dueDate || task.startDate);
  if (!start || !end) return [];
  const from = start <= end ? start : end;
  const to = start <= end ? end : start;
  const keys = [];
  for (let cursor = new Date(from), guard = 0; cursor <= to && guard < 370; cursor = addDays(cursor, 1), guard += 1) {
    keys.push(formatDate(cursor));
  }
  return keys;
}

export function getTaskDateLabel(task) {
  if (task.startDate && task.dueDate && task.startDate !== task.dueDate) return `${task.startDate} → ${task.dueDate}`;
  return task.dueDate || task.startDate || 'No date';
}

// The task's start and end as "YYYY-MM-DD", in order.
export function getTaskRange(task) {
  const start = task.startDate || task.dueDate || '';
  const end = task.dueDate || task.startDate || '';
  return start <= end ? [start, end] : [end, start];
}

export function getTaskTone(task) {
  if (task.status === 'Done') return 'done';
  if (task.priority === 'Urgent') return 'urgent';
  if (task.priority === 'High') return 'high';
  if (task.status === 'In Progress') return 'progress';
  if (task.status === 'Waiting') return 'waiting';
  return 'planned';
}

function getTaskUrgencyRank(task) {
  if (task.status === 'Done') return 99;
  if (task.priority === 'Urgent') return 0;
  if (task.priority === 'High') return 1;
  if (task.status === 'In Progress') return 2;
  if (task.status === 'Waiting') return 3;
  if (task.priority === 'Medium') return 4;
  return 5;
}

export function sortFocusTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const rank = getTaskUrgencyRank(a) - getTaskUrgencyRank(b);
    if (rank !== 0) return rank;
    const dateCompare = (a.dueDate || a.startDate || '9999-12-31').localeCompare(b.dueDate || b.startDate || '9999-12-31');
    if (dateCompare !== 0) return dateCompare;
    return (a.title || '').localeCompare(b.title || '');
  });
}

export function getFocusColumn(task) {
  if (task.priority === 'Urgent') return 'Urgent';
  if (task.priority === 'High') return 'High';
  if (task.status === 'In Progress') return 'In Progress';
  if (task.status === 'Waiting') return 'Waiting';
  return 'Planned';
}

export function getTaskSegmentsForWeek(task, weekDays) {
  const keys = getTaskDateKeys(task);
  const positions = weekDays.map((day, index) => (keys.includes(formatDate(day)) ? index + 1 : null)).filter(Boolean);
  if (!positions.length) return null;
  return { startCol: Math.min(...positions), endCol: Math.max(...positions) + 1 };
}

export function taskCopyText(task) {
  return `${task.title || 'Untitled Task'}\n${task.project || ''}\n${getTaskDateLabel(task)}\n\n${task.notes || ''}`;
}

// ---- Daily Task Log entries become Done tasks on the dashboard ----

function dailyLogTaskId(log) {
  const source = log.id || `${log.date || ''}-${log.project || ''}-${log.summary || ''}`;
  return `daily-log-${encodeURIComponent(source).slice(0, 140)}`;
}

function dailyLogToDashboardTask(log) {
  const date = log.date || todayISO();
  const summary = String(log.summary || '').trim();
  const notes = String(log.notes || '').trim();
  const project = String(log.project || '').trim();
  const detailText = [summary ? `Quick summary: ${summary}` : '', notes ? `Full notes:\n${notes}` : ''].filter(Boolean).join('\n\n');
  const id = log.migratedToDashboardTaskId || dailyLogTaskId(log);
  return {
    id,
    title: summary || project || `Daily Log - ${niceDate(date)}`,
    project: project || 'Daily Log',
    startDate: date,
    dueDate: date,
    priority: 'Medium',
    status: 'Done',
    notes: detailText || 'Migrated from Daily Task Log.',
    migratedFromDailyLogId: log.id || id,
    createdAt: log.createdAt || nowTimestamp(),
    updatedAt: nowTimestamp(),
  };
}

// Returns the new tasks for daily logs that have not been moved yet, and the
// logs marked as moved. Returns null when there is nothing to do.
export function migrateDailyLogs(dailyLogs, tasks) {
  const logsToMigrate = dailyLogs.filter((log) => !log.migratedToDashboardTaskId);
  if (!logsToMigrate.length) return null;
  const existingTaskIds = new Set(tasks.map((task) => task.id));
  const migratedLogIds = new Set(tasks.map((task) => task.migratedFromDailyLogId).filter(Boolean));
  const newTasks = logsToMigrate
    .filter((log) => !existingTaskIds.has(dailyLogTaskId(log)) && !migratedLogIds.has(log.id || dailyLogTaskId(log)))
    .map(dailyLogToDashboardTask);
  const markedLogs = dailyLogs.map((log) => (log.migratedToDashboardTaskId ? log : {
    ...log,
    migratedToDashboardTaskId: dailyLogTaskId(log),
    migratedToDashboardAt: nowTimestamp(),
  }));
  return { newTasks, markedLogs };
}
