import { useMemo } from 'react';
import { AddForm } from '../components/AddForm.jsx';
import { Legend, MonthGrid, Weekdays, WeekRow, YearGrid } from '../components/CalendarGrid.jsx';
import { Groups } from '../components/ItemList.jsx';
import { Moon } from '../components/Moon.jsx';
import { useDesk, useUi } from '../desk.jsx';
import { groupItems, itemsForDay, boardMeta } from '../lib/agenda.js';
import { addDays, addMonths, formatFull, formatMonth, formatShort, monthStart, today, weekStart } from '../lib/dates.js';
import { setHighlight } from '../lib/highlight.js';
import { moonLit, moonName, moonPhase } from '../lib/moon.js';

const VIEWS = [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year']];

function rangeFor(view, date) {
  if (view === 'day') return [date, date];
  if (view === 'week') {
    const start = weekStart(date);
    return [start, addDays(start, 6)];
  }
  if (view === 'month') {
    const start = weekStart(monthStart(date));
    return [start, addDays(start, 41)];
  }
  return [new Date(date.getFullYear(), 0, 1, 12), new Date(date.getFullYear(), 11, 31, 12)];
}

function titleFor(view, date) {
  if (view === 'day') return formatFull(date);
  if (view === 'week') {
    const start = weekStart(date);
    const end = addDays(start, 6);
    return `${formatShort(start)} – ${formatShort(end)}, ${end.getFullYear()}`;
  }
  if (view === 'month') return formatMonth(date);
  return String(date.getFullYear());
}

function DayPanel({ date }) {
  const { datedItems } = useDesk();
  const groups = useMemo(() => groupItems(itemsForDay(datedItems, date, today())), [date, datedItems]);
  const phase = moonPhase(date);

  return (
    <div className="dayview">
      <div className="dayview-main" onPointerLeave={() => setHighlight([])}>
        <Groups groups={groups} day={date} span empty="Nothing is on this day yet. Add the first task here." />
      </div>
      <div className="dayview-side">
        <div className="moon-card">
          <Moon date={date} size={72} />
          <div>
            <p className="eyebrow">That night's moon</p>
            <p className="moon-name">{moonName(phase)}</p>
            <p className="moon-sub">{Math.round(moonLit(phase) * 100)}% lit</p>
          </div>
        </div>
        <div className="side-form">
          <AddForm key={date.getTime()} date={date} idPrefix="dayview" />
        </div>
      </div>
    </div>
  );
}

// The week's open tasks, grouped by level, under the week strip.
function WeekFocus({ items }) {
  const groups = useMemo(() => groupItems(items.filter((item) => !item.done)), [items]);
  return (
    <div className="week-focus">
      <p className="eyebrow">This week's focus</p>
      <Groups groups={groups} meta={boardMeta} empty="No open tasks this week." />
    </div>
  );
}

export function CalendarView() {
  const { itemsInRange } = useDesk();
  const { calendar, setCalendar, openDay, dayCard } = useUi();
  const { view, date } = calendar;
  const [rangeStart, rangeEnd] = rangeFor(view, date);
  const items = useMemo(() => itemsInRange(rangeStart, rangeEnd), [itemsInRange, rangeStart.getTime(), rangeEnd.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  function shift(direction) {
    if (view === 'day') setCalendar({ view, date: addDays(date, direction) });
    else if (view === 'week') setCalendar({ view, date: addDays(date, direction * 7) });
    else if (view === 'month') setCalendar({ view, date: addMonths(date, direction) });
    else setCalendar({ view, date: new Date(date.getFullYear() + direction, date.getMonth(), 1, 12) });
  }

  return (
    <div className="view">
      <section className="cal cal-page" aria-labelledby="cal-page-title">
        <div className="cal-head">
          <div>
            <p className="eyebrow">Calendar · {VIEWS.find(([key]) => key === view)[1]}</p>
            <h1 id="cal-page-title">{titleFor(view, date)}</h1>
          </div>
          <div className="cal-tools">
            <div className="view-switch" role="group" aria-label="Calendar view">
              {VIEWS.map(([key, label]) => (
                <button key={key} type="button" aria-pressed={view === key} onClick={() => setCalendar({ view: key, date })}>{label}</button>
              ))}
            </div>
            <div className="cal-nav">
              <button type="button" className="btn btn-icon" aria-label="Previous" onClick={() => shift(-1)}>&lsaquo;</button>
              <button type="button" className="btn" onClick={() => setCalendar({ view, date: today() })}>Today</button>
              <button type="button" className="btn btn-icon" aria-label="Next" onClick={() => shift(1)}>&rsaquo;</button>
            </div>
          </div>
        </div>
        <Legend />
        {view === 'month' ? (
          <>
            <Weekdays />
            <MonthGrid month={monthStart(date)} items={items} minLanes={3} selected={dayCard?.date} onPick={openDay} />
          </>
        ) : null}
        {view === 'week' ? (
          <>
            <div className="cal-grid" onPointerLeave={() => setHighlight([])}>
              <WeekRow start={weekStart(date)} items={items} large minLanes={6} selected={dayCard?.date} onPick={openDay} />
            </div>
            <WeekFocus items={items} />
          </>
        ) : null}
        {view === 'day' ? <DayPanel date={date} /> : null}
        {view === 'year' ? <YearGrid year={date.getFullYear()} items={items} onPick={(day) => setCalendar({ view: 'day', date: day })} /> : null}
      </section>
    </div>
  );
}
