import { useMemo, useState } from 'react';
import { formatDate, getMonthWeeks, getWeekDays, monthLabel, sameMonth } from '../lib/dates.js';
import { FOCUS_COLUMNS, getFocusColumn, getTaskDateKeys, getTaskDateLabel, getTaskSegmentsForWeek, getTaskTone, sortFocusTasks } from '../lib/tasks.js';

const WEEK_BARS = 4;

// Calendar pinned beside every section. Tasks stretch from start date to due date.
export function CalendarPanel({ tasks, onOpenTask }) {
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [view, setView] = useState('Month');

  function shiftCalendar(amount) {
    setCalendarDate((date) => {
      const next = new Date(date);
      if (view === 'Today') next.setDate(next.getDate() + amount);
      if (view === 'Week') next.setDate(next.getDate() + amount * 7);
      if (view === 'Month') next.setMonth(next.getMonth() + amount);
      if (view === 'Year') next.setFullYear(next.getFullYear() + amount);
      return next;
    });
  }

  const title = view === 'Year' ? calendarDate.getFullYear() : view === 'Week' ? 'This Week' : view === 'Today' ? 'Today' : monthLabel(calendarDate);

  return (
    <section className="calendarPanel">
      <div className="calendarTop">
        <div>
          <p className="eyebrow">Pinned Monthly Calendar</p>
          <h2>{title}</h2>
          <p className="calendarHint">Visible in every section. Tasks stretch from start date to due date.</p>
        </div>
        <div className="calendarNavButtons"><button type="button" onClick={() => shiftCalendar(-1)}>←</button><button type="button" onClick={() => shiftCalendar(1)}>→</button></div>
      </div>
      <div className="calendarMode">
        {['Today', 'Week', 'Month', 'Year'].map((mode) => (
          <button key={mode} type="button" className={view === mode ? 'active' : ''} onClick={() => { setView(mode); if (mode === 'Today') setCalendarDate(new Date()); }}>{mode}</button>
        ))}
      </div>
      <div className="calendarLegend"><span><i className="legendDot planned"></i>Planned</span><span><i className="legendDot progress"></i>In progress</span><span><i className="legendDot urgent"></i>Urgent</span></div>

      {view === 'Today' && <TodayCalendarView date={calendarDate} tasks={tasks} onOpenTask={onOpenTask} />}
      {view === 'Week' && <WeekCalendarView date={calendarDate} tasks={tasks} onOpenTask={onOpenTask} />}
      {view === 'Month' && <MonthCalendarView calendarDate={calendarDate} tasks={tasks} onOpenTask={onOpenTask} />}
      {view === 'Year' && <YearCalendarView calendarDate={calendarDate} tasks={tasks} />}
    </section>
  );
}

function MonthCalendarView({ calendarDate, tasks, onOpenTask }) {
  const weeks = useMemo(() => getMonthWeeks(calendarDate), [calendarDate]);
  const todayKey = formatDate(new Date());

  return (
    <div className="monthCalendarWrap">
      <div className="monthCalendarHead">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => <div key={day} className="weekday">{day}</div>)}
      </div>
      <div className="monthCalendarRows">
        {weeks.map((week, weekIndex) => {
          const weekTasks = sortFocusTasks(tasks.filter((task) => getTaskSegmentsForWeek(task, week)));
          return (
            <div key={`week-${weekIndex}`} className="monthWeekRow">
              <div className="monthWeekCells">
                {week.map((day) => {
                  const key = formatDate(day);
                  return (
                    <div key={key} className={`monthCell ${!sameMonth(day, calendarDate) ? 'muted' : ''} ${key === todayKey ? 'today' : ''}`} style={{ paddingTop: `${38 + weekTasks.length * 22}px` }}>
                      <strong>{day.getDate()}</strong>
                    </div>
                  );
                })}
              </div>
              {weekTasks.length > 0 && (
                <div className="monthTaskOverlay" style={{ gridTemplateRows: `repeat(${weekTasks.length}, 18px)` }}>
                  {weekTasks.map((task, rowIndex) => {
                    const segment = getTaskSegmentsForWeek(task, week);
                    return (
                      <button
                        key={`${task.id}-${weekIndex}`}
                        type="button"
                        className={`calendarTaskBar monthSpanTask ${getTaskTone(task)}`}
                        style={{ gridColumn: `${segment.startCol} / ${segment.endCol}`, gridRow: rowIndex + 1 }}
                        title={`${task.title} • ${getTaskDateLabel(task)}`}
                        onClick={() => onOpenTask(task)}
                      >
                        {task.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TodayCalendarView({ date, tasks, onOpenTask }) {
  const key = formatDate(date);
  const todayTasks = sortFocusTasks(tasks.filter((task) => task.status !== 'Done' && getTaskDateKeys(task).includes(key)));
  return (
    <div className="focusWrap">
      <div className="focusDate"><h3>{date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h3><p>{todayTasks.length} active task{todayTasks.length === 1 ? '' : 's'} today.</p></div>
      <FocusTaskBoard tasks={todayTasks} onOpenTask={onOpenTask} emptyText="No active tasks today." />
    </div>
  );
}

function WeekCalendarView({ date, tasks, onOpenTask }) {
  const weekDays = useMemo(() => getWeekDays(date), [date]);
  const weekTasks = sortFocusTasks(tasks.filter((task) => task.status !== 'Done' && getTaskSegmentsForWeek(task, weekDays)));
  const weekBarTasks = weekTasks.slice(0, WEEK_BARS);

  return (
    <div className="weekCalendar">
      <div className="weekTimeline">
        <div className="weekDays weekDayCells">
          {weekDays.map((day) => (
            <div key={formatDate(day)} className="weekDay" style={{ paddingTop: `${52 + weekBarTasks.length * 24}px` }}>
              <div className="weekDayTop">
                <strong>{day.toLocaleDateString(undefined, { weekday: 'short' })}</strong>
                <span>{day.getDate()}</span>
              </div>
            </div>
          ))}
        </div>
        {weekBarTasks.length > 0 && (
          <div className="weekTaskOverlay" style={{ gridTemplateRows: `repeat(${weekBarTasks.length}, 20px)` }}>
            {weekBarTasks.map((task, rowIndex) => {
              const segment = getTaskSegmentsForWeek(task, weekDays);
              return (
                <button
                  key={task.id}
                  type="button"
                  className={`calendarTaskBar weekSpanTask ${getTaskTone(task)}`}
                  style={{ gridColumn: `${segment.startCol} / ${segment.endCol}`, gridRow: rowIndex + 1 }}
                  title={task.title}
                  onClick={() => onOpenTask(task)}
                >
                  {task.title}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {weekTasks.length > weekBarTasks.length && <div className="logMarker weekMoreMarker">+{weekTasks.length - weekBarTasks.length} more task{weekTasks.length - weekBarTasks.length > 1 ? 's' : ''} in focus board</div>}
      <div className="miniSectionTitle">This Week Focus</div>
      <FocusTaskBoard tasks={weekTasks} onOpenTask={onOpenTask} emptyText="No active tasks scheduled for this week." />
    </div>
  );
}

function FocusTaskBoard({ tasks, onOpenTask, emptyText }) {
  if (!tasks.length) return <div className="empty compact">{emptyText}</div>;
  return (
    <div className="focusColumns">
      {FOCUS_COLUMNS.map((column) => {
        const columnTasks = tasks.filter((task) => getFocusColumn(task) === column);
        return (
          <section key={column} className="focusColumn">
            <h4>{column}</h4>
            {columnTasks.length === 0 ? <p className="focusEmpty">Clear</p> : columnTasks.map((task) => (
              <button key={task.id} type="button" className={`focusTask ${getTaskTone(task)}`} onClick={() => onOpenTask(task)}>
                <span className="focusTaskTitle">{task.title}</span>
                <span>{task.project || 'No project'}</span>
                <small>{getTaskDateLabel(task)}</small>
              </button>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function YearCalendarView({ calendarDate, tasks }) {
  const year = calendarDate.getFullYear();
  const todayKey = formatDate(new Date());
  const taskDays = useMemo(() => new Set(tasks.flatMap(getTaskDateKeys)), [tasks]);
  return (
    <div className="yearGrid">
      {Array.from({ length: 12 }, (_, monthIndex) => {
        const monthDate = new Date(year, monthIndex, 1);
        return (
          <section key={monthIndex} className="miniMonth">
            <h4>{monthDate.toLocaleDateString(undefined, { month: 'short' })}</h4>
            <div className="miniMonthGrid">
              {getMonthWeeks(monthDate).flat().map((day) => {
                const key = formatDate(day);
                return <span key={key} className={`${!sameMonth(day, monthDate) ? 'muted' : ''} ${key === todayKey ? 'today' : ''} ${taskDays.has(key) ? 'hasTask' : ''}`}>{day.getDate()}</span>;
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
