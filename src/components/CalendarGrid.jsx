import { addDays, daysInMonth, diffDays, formatFull, formatShort, monthStart, plural, sameDay, today, weekStart } from '../lib/dates.js';
import { setHighlight } from '../lib/highlight.js';
import { moonName, moonPhase } from '../lib/moon.js';
import { activeOn, byRank, kindLabel, LEVELS, tokenFor } from '../lib/tasks.js';
import { Moon } from './Moon.jsx';

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Weekdays() {
  return (
    <div className="cal-weekdays" aria-hidden="true">
      {WEEKDAY_NAMES.map((name) => (
        <span key={name}><span className="full">{name}</span><span className="short">{name[0]}</span></span>
      ))}
    </div>
  );
}

export function Legend() {
  return (
    <div className="legend" aria-hidden="true">
      {LEVELS.map((level) => (
        <span key={level.key} className={level.key === 'waiting' ? 'lg-hollow' : ''} style={{ '--c': `var(--lv-${level.key})` }}><i />{level.label}</span>
      ))}
      <span className="lg-done"><i />Done</span>
    </div>
  );
}

function layoutSegments(items, start, end) {
  const segments = items
    .filter((item) => diffDays(item.start, end) >= 0 && diffDays(start, item.due) >= 0)
    .map((item) => {
      const from = item.start > start ? item.start : start;
      const to = item.due < end ? item.due : end;
      return {
        item,
        col: diffDays(start, from),
        span: diffDays(from, to) + 1,
        head: diffDays(item.due, end) >= 0,
        tail: diffDays(start, item.start) >= 0
      };
    })
    .sort((a, b) => a.col - b.col || b.span - a.span || byRank(a.item, b.item));
  const laneEnds = [];
  for (const segment of segments) {
    let lane = laneEnds.findIndex((endCol) => endCol < segment.col);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = segment.col + segment.span - 1;
    segment.lane = lane;
  }
  return { segments, lanes: laneEnds.length };
}

// onPick(day, rect, { touch, itemId }) opens that day.
function WeekRow({ start, items, monthRef = null, minLanes = 2, selected = null, onPick }) {
  const end = addDays(start, 6);
  const { segments, lanes } = layoutSegments(items, start, end);
  const now = today();
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));

  function pickFromTrail(event, item) {
    const layer = event.currentTarget.parentElement.getBoundingClientRect();
    const col = Math.max(0, Math.min(6, Math.floor(((event.clientX - layer.left) / layer.width) * 7)));
    const cell = event.currentTarget.closest('.week').querySelectorAll('.cell')[col];
    onPick(days[col], cell.getBoundingClientRect(), { touch: event.nativeEvent.pointerType === 'touch', itemId: item.id });
  }

  return (
    <div className="week" style={{ '--lanes': Math.max(minLanes, lanes) }}>
      {days.map((day) => {
        const phase = moonPhase(day);
        const name = moonName(phase);
        const notable = name === 'New moon' || name === 'Full moon';
        const onDay = items.filter((item) => activeOn(item, day));
        const classes = ['cell'];
        if (monthRef && day.getMonth() !== monthRef.getMonth()) classes.push('is-out');
        if (sameDay(day, now)) classes.push('is-today');
        if (selected && sameDay(day, selected)) classes.push('is-selected');
        if (notable) classes.push('is-notable');
        return (
          <button
            type="button"
            key={day.getTime()}
            className={classes.join(' ')}
            aria-label={`${formatFull(day)}, ${plural(onDay.length, 'item')}, ${name}. Select to open this day.`}
            onPointerEnter={() => setHighlight(onDay.map((item) => item.id))}
            onFocus={() => setHighlight(onDay.map((item) => item.id))}
            onClick={(event) => onPick(day, event.currentTarget.getBoundingClientRect(), { touch: event.nativeEvent.pointerType === 'touch' })}
          >
            <span className="cell-num">{day.getDate()}</span>
            <span className="cell-moon" title={name}>
              {notable ? <span className="cell-phase">{name.split(' ')[0]}</span> : null}
              <Moon date={day} size={14} />
            </span>
          </button>
        );
      })}
      <div className="trails">
        {segments.map(({ item, col, span, head, tail, lane }) => {
          const classes = ['trail'];
          if (item.done) classes.push('is-done');
          if (!item.done && diffDays(now, item.due) < 0) classes.push('is-overdue');
          if (tail) classes.push('has-tail');
          if (item.level === 'waiting' && !item.done) classes.push('is-waiting');
          return (
            <div
              key={`${item.id}-${col}`}
              className={classes.join(' ')}
              data-hl={item.id}
              style={{ '--col': col, '--span': span, '--lane': lane, '--c': `var(${tokenFor(item)})` }}
              title={`${item.title} · ${kindLabel(item)} · ${formatShort(item.start)} to ${formatShort(item.due)}`}
              onPointerEnter={() => setHighlight([item.id])}
              onClick={(event) => pickFromTrail(event, item)}
            >
              <span className="trail-label">{item.title}</span>
              <span className="trail-line" />
              {head ? <span className="trail-head" /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MonthGrid({ month, items, minLanes = 2, selected, onPick }) {
  const first = monthStart(month);
  const gridStart = weekStart(first);
  const weeks = Math.ceil((first.getDay() + daysInMonth(first.getFullYear(), first.getMonth())) / 7);
  return (
    <div className="cal-grid" onPointerLeave={() => setHighlight([])}>
      {Array.from({ length: weeks }, (_, index) => {
        const start = addDays(gridStart, index * 7);
        return <WeekRow key={start.getTime()} start={start} items={items} monthRef={first} minLanes={minLanes} selected={selected} onPick={onPick} />;
      })}
    </div>
  );
}
