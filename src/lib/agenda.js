import { formatShort, plural, sameDay, today } from './dates.js';
import { activeOn, byRank, daysLeft, isOverdue, LEVELS, rangeText, spanInfo, dueText } from './tasks.js';

// What belongs on a given day's list. Today also carries overdue work.
export function itemsForDay(items, day, now = today()) {
  const isToday = sameDay(day, now);
  return items.filter((item) => activeOn(item, day) || (isToday && isOverdue(item, now)));
}

// Open items grouped by level, then everything done.
export function groupItems(dayItems) {
  const groups = LEVELS
    .map((level) => ({
      key: level.key,
      title: level.label,
      token: `--lv-${level.key}`,
      items: dayItems.filter((item) => !item.done && item.level === level.key).sort(byRank)
    }))
    .filter((group) => group.items.length);
  const done = dayItems.filter((item) => item.done).sort(byRank);
  if (done.length) groups.push({ key: 'done', title: 'Done', token: '--done', items: done });
  return groups;
}

// The line under a task on one day's list: project, where the day falls in
// the task, and when it is due.
export function metaFor(item, day, now = today()) {
  const parts = [];
  const { total, index } = spanInfo(item, day);
  if (item.done) parts.push('Done');
  else if (isOverdue(item, now) && sameDay(day, now)) parts.push(`Overdue ${plural(-daysLeft(item, now), 'day')}`);
  if (total > 1 && index >= 1 && index <= total) parts.push(`Day ${index} of ${total}`);
  if (!sameDay(item.due, day)) parts.push(`Due ${formatShort(item.due)}`);
  else if (total > 1) parts.push(sameDay(day, now) ? 'Due today' : 'Due this day');
  if (!parts.length) parts.push(sameDay(day, now) ? 'Today' : 'This day only');
  return [item.project, ...parts].filter(Boolean).join(' · ');
}

// The line under a task on the task board: project, dates and how soon it is due.
export function boardMeta(item) {
  return [item.project, rangeText(item), item.done ? '' : dueText(item)].filter(Boolean).join(' · ');
}
