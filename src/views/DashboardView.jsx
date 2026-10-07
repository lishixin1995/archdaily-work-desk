import { useCallback, useMemo, useState } from 'react';
import { useTodayAgenda } from '../components/AgendaDrawer.jsx';
import { Legend, MonthGrid, Weekdays } from '../components/CalendarGrid.jsx';
import { Orbit } from '../components/Orbit.jsx';
import { useDesk, useUi } from '../desk.jsx';
import { addDays, addMonths, formatMonth, monthStart, today, weekStart } from '../lib/dates.js';
import { daysLeft, LEVELS } from '../lib/tasks.js';
import { TaskBoard } from './TaskBoard.jsx';

export function DashboardView() {
  const { datedItems, itemsInRange } = useDesk();
  const { flashId, openDay, setDrawer, navigate, dayCard, focusItem } = useUi();
  const agenda = useTodayAgenda();
  const [month, setMonth] = useState(() => monthStart(today()));

  const stats = useMemo(() => {
    const open = datedItems.filter((item) => !item.done);
    return {
      overdue: open.filter((item) => daysLeft(item) < 0).length,
      today: open.filter((item) => daysLeft(item) === 0).length,
      week: open.filter((item) => daysLeft(item) >= 0 && daysLeft(item) <= 7).length
    };
  }, [datedItems]);

  const first = monthStart(month);
  const gridStart = weekStart(first);
  const monthItems = useMemo(() => itemsInRange(gridStart, addDays(gridStart, 41)), [itemsInRange, gridStart.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSelect = useCallback((item, rect, touch) => focusItem(item, rect, touch), [focusItem]);

  return (
    <div className="view">
      <section className="orbit-wrap" aria-label="Orbit">
        <Orbit items={datedItems} flashId={flashId} onSelect={onSelect} />
        <div className="orbit-overlay">
          <p className="eyebrow">Orbit · days until due</p>
          <h1 className="sr-only">Arch Daily Work Desk</h1>
          <h2>Closer to the sun means due sooner.</h2>
          <div className="stats">
            <span className={`stat${stats.overdue ? ' stat-danger' : ''}`}><b>{stats.overdue}</b> overdue</span>
            <span className="stat"><b>{stats.today}</b> due today</span>
            <span className="stat"><b>{stats.week}</b> due within 7 days</span>
            <button type="button" className="stat stat-action" data-keeps-drawer onClick={() => setDrawer({ open: true, pinned: true })}>
              <b>{agenda.open}</b> on today's list
            </button>
          </div>
        </div>
        <div className="orbit-legend" aria-hidden="true">
          <span className="ramp">
            {LEVELS.map((level) => <i key={level.key} style={{ '--c': `var(--lv-${level.key})` }} />)}
            <em>Tasks by level</em>
          </span>
          <span className="lg-done"><i />Done</span>
          <span className="lg-overdue"><i />Overdue</span>
        </div>
      </section>

      <TaskBoard />

      <section className="cal" aria-labelledby="cover-cal-title">
        <div className="cal-head">
          <div>
            <p className="eyebrow">Calendar</p>
            <h2 id="cover-cal-title">{formatMonth(first)}</h2>
          </div>
          <div className="cal-tools">
            <div className="cal-nav">
              <button type="button" className="btn btn-icon" aria-label="Previous month" onClick={() => setMonth(addMonths(first, -1))}>&lsaquo;</button>
              <button type="button" className="btn" onClick={() => setMonth(monthStart(today()))}>Today</button>
              <button type="button" className="btn btn-icon" aria-label="Next month" onClick={() => setMonth(addMonths(first, 1))}>&rsaquo;</button>
            </div>
            <button type="button" className="btn" onClick={() => navigate('calendar', null, { view: 'month', date: first })}>Open calendar</button>
          </div>
        </div>
        <Legend />
        <Weekdays />
        <MonthGrid month={first} items={monthItems} selected={dayCard?.date} onPick={openDay} />
        <p className="cal-foot">
          Select any day to add a task to it. Each trail runs from the start date to the due date, and the bright head marks the due date.
          The moon in each day shows that night's phase.
        </p>
      </section>
    </div>
  );
}
