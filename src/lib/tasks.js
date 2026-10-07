import { diffDays, formatShort, fromISO, todayISO, today } from './dates.js';
import { nowTimestamp, uid } from './text.js';

// Tasks are stored as { title, project, startDate, dueDate, priority, status,
// notes }. Priority and status values are the ones the site has always saved.
export const PRIORITIES = ['Urgent', 'High', 'Medium', 'Low'];
export const STATUSES = ['Not Started', 'In Progress', 'Waiting', 'Done'];

export const PRIORITY_TOKEN = { Urgent: '--lv-urgent', High: '--lv-high', Medium: '--lv-normal', Low: '--lv-low' };
export const STATUS_TOKEN = { 'Not Started': '--accent', 'In Progress': '--lv-progress', Waiting: '--lv-waiting', Done: '--done' };

// A task's level combines priority and status, in the order the dashboard has
// always ranked work: Urgent, High, In progress, Waiting, then Medium and Low.
export const LEVELS = [
  { key: 'urgent', label: 'Urgent', size: 4.6 },
  { key: 'high', label: 'High', size: 3.8 },
  { key: 'progress', label: 'In progress', size: 3.3 },
  { key: 'waiting', label: 'Waiting', size: 2.5 },
  { key: 'normal', label: 'Medium', size: 2.9 },
  { key: 'low', label: 'Low', size: 2.2 }
];
export const LEVEL = Object.fromEntries(LEVELS.map((level, rank) => [level.key, { ...level, rank }]));

export const priorityOf = (task) => (PRIORITIES.includes(task.priority) ? task.priority : 'Medium');
export const statusOf = (task) => (STATUSES.includes(task.status) ? task.status : 'Not Started');

export function levelOf(task) {
  if (task.priority === 'Urgent') return 'urgent';
  if (task.priority === 'High') return 'high';
  if (task.status === 'In Progress') return 'progress';
  if (task.status === 'Waiting') return 'waiting';
  if (task.priority === 'Low') return 'low';
  return 'normal';
}

export function newTask({ title, project = '', priority = 'Medium', status = 'Not Started', startDate, dueDate, notes = '' }) {
  const now = nowTimestamp();
  const start = startDate || todayISO();
  return {
    id: uid(),
    title: title.trim(),
    project: project.trim(),
    startDate: start,
    dueDate: dueDate && dueDate >= start ? dueDate : start,
    priority,
    status,
    notes,
    createdAt: now,
    updatedAt: now
  };
}

export function withStatus(task, status) {
  return { ...task, status, updatedAt: nowTimestamp() };
}

export function taskCopyText(task) {
  const dates = task.startDate && task.dueDate && task.startDate !== task.dueDate ? `${task.startDate} → ${task.dueDate}` : task.dueDate || task.startDate || 'No date';
  return `${task.title || 'Untitled Task'}\n${task.project || ''}\n${dates}\n\n${task.notes || ''}`;
}

// ---- Calendar items: one per task, with dates as Date objects ----

export function taskToItem(task) {
  let start = fromISO(task.startDate || task.dueDate);
  let due = fromISO(task.dueDate || task.startDate);
  if (start && due && start > due) [start, due] = [due, start];
  return {
    id: task.id,
    kind: 'task',
    title: task.title || 'Untitled task',
    project: task.project || '',
    start,
    due,
    level: levelOf(task),
    status: statusOf(task),
    done: task.status === 'Done',
    task
  };
}

export const isDated = (item) => Boolean(item.start && item.due);

export function activeOn(item, day) {
  return isDated(item) && diffDays(item.start, day) >= 0 && diffDays(day, item.due) >= 0;
}

export function intersects(item, rangeStart, rangeEnd) {
  return isDated(item) && diffDays(item.start, rangeEnd) >= 0 && diffDays(rangeStart, item.due) >= 0;
}

export const daysLeft = (item, now = today()) => (item.due ? diffDays(now, item.due) : Infinity);

export const isOverdue = (item, now = today()) => !item.done && daysLeft(item, now) < 0;

export const rankOf = (item) => LEVEL[item.level]?.rank ?? LEVEL.normal.rank;

export function byRank(a, b) {
  return (a.done - b.done)
    || (isOverdue(b) - isOverdue(a))
    || (rankOf(a) - rankOf(b))
    || ((a.due || Infinity) - (b.due || Infinity))
    || String(a.title).localeCompare(String(b.title));
}

export function tokenFor(item) {
  return item.done ? '--done' : `--lv-${item.level}`;
}

export function kindLabel(item) {
  return LEVEL[item.level]?.label || 'Medium';
}

export function dueText(item, now = today()) {
  if (item.done) return 'Done';
  if (!item.due) return 'No date';
  const days = daysLeft(item, now);
  if (days < 0) return `Overdue ${days === -1 ? '1 day' : `${-days} days`}`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

export function rangeText(item) {
  if (!isDated(item)) return 'No date';
  return diffDays(item.start, item.due) ? `${formatShort(item.start)} → ${formatShort(item.due)}` : formatShort(item.due);
}

export function spanInfo(item, day) {
  return { total: diffDays(item.start, item.due) + 1, index: diffDays(item.start, day) + 1 };
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
    title: summary || project || `Daily Log - ${formatShort(fromISO(date))}`,
    project: project || 'Daily Log',
    startDate: date,
    dueDate: date,
    priority: 'Medium',
    status: 'Done',
    notes: detailText || 'Migrated from Daily Task Log.',
    migratedFromDailyLogId: log.id || id,
    createdAt: log.createdAt || nowTimestamp(),
    updatedAt: nowTimestamp()
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
    migratedToDashboardAt: nowTimestamp()
  }));
  return { newTasks, markedLogs };
}
