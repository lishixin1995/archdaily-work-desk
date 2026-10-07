// Dates are stored as local "YYYY-MM-DD" strings. In memory they are Date
// objects pinned to noon, so adding days never trips over daylight saving.

export const DAY_MS = 864e5;

export function atNoon(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

export function today() {
  return atNoon(new Date());
}

export function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return atNoon(copy);
}

export function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
}

export function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

export function weekStart(date) {
  return addDays(date, -date.getDay());
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function diffDays(from, to) {
  return Math.round((atNoon(to) - atNoon(from)) / DAY_MS);
}

export function sameDay(a, b) {
  return Boolean(a && b) && diffDays(a, b) === 0;
}

const pad = (value) => String(value).padStart(2, '0');

export function toISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO() {
  return toISO(new Date());
}

export function fromISO(value) {
  const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 12);
}

const formatter = (options) => new Intl.DateTimeFormat('en-US', options);
const fmt = {
  short: formatter({ month: 'short', day: 'numeric' }),
  weekShort: formatter({ weekday: 'short', month: 'short', day: 'numeric' }),
  long: formatter({ weekday: 'long', month: 'long', day: 'numeric' }),
  full: formatter({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  month: formatter({ month: 'long', year: 'numeric' }),
  monthName: formatter({ month: 'long' }),
  weekday: formatter({ weekday: 'short' }),
  dateYear: formatter({ month: 'short', day: 'numeric', year: 'numeric' })
};

export const formatShort = (date) => (date ? fmt.short.format(date) : 'No date');
export const formatWeekShort = (date) => (date ? fmt.weekShort.format(date) : 'No date');
export const formatLong = (date) => fmt.long.format(date);
export const formatFull = (date) => fmt.full.format(date);
export const formatMonth = (date) => fmt.month.format(date);
export const formatMonthName = (date) => fmt.monthName.format(date);
export const formatWeekday = (date) => fmt.weekday.format(date);
export const formatDateYear = (date) => (date ? fmt.dateYear.format(date) : 'No date');
export const formatISO = (value) => (fromISO(value) ? formatDateYear(fromISO(value)) : 'No date');

export function relativeDay(date, now = today()) {
  const days = diffDays(now, date);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
}

export function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
