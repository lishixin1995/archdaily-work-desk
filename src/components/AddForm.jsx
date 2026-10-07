import { useState } from 'react';
import { useDesk, useUi } from '../desk.jsx';
import { diffDays, formatShort, formatWeekShort, fromISO, sameDay, toISO, today } from '../lib/dates.js';
import { newTask } from '../lib/tasks.js';
import { PriorityPills } from './LevelPills.jsx';
import { useToast } from './Toast.jsx';

// Adds a task starting on `date`. Give it a key per date so it resets.
export function AddForm({ date, idPrefix, withEnds = true, placeholder = 'What needs doing?' }) {
  const { addTask } = useDesk();
  const { flash } = useUi();
  const toast = useToast();
  const startISO = toISO(date);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [ends, setEnds] = useState(startISO);
  const [error, setError] = useState('');
  const isToday = sameDay(date, today());

  function submit(event) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Type what needs doing first.');
      return;
    }
    const due = withEnds && ends ? ends : startISO;
    if (due < startISO) {
      setError('The end date has to be on or after the start date.');
      return;
    }
    const task = newTask({ title, priority, startDate: startISO, dueDate: due });
    addTask(task);
    flash(task.id);
    const days = diffDays(date, fromISO(due)) + 1;
    toast(`Added "${task.title}" to ${isToday ? 'today' : formatWeekShort(date)} as ${priority}${days > 1 ? `, through ${formatShort(fromISO(due))}` : ''}.`);
    setTitle('');
    setEnds(startISO);
    setError('');
  }

  return (
    <form className="add-form" onSubmit={submit} noValidate>
      <label className="eyebrow" htmlFor={`${idPrefix}-title`}>{isToday ? 'Add a task for today' : 'Add a task on this day'}</label>
      <input
        id={`${idPrefix}-title`}
        type="text"
        autoComplete="off"
        value={title}
        placeholder={placeholder}
        onChange={(event) => { setTitle(event.target.value); if (error) setError(''); }}
      />
      <PriorityPills name={`${idPrefix}-priority`} value={priority} onChange={setPriority} />
      {withEnds ? (
        <div className="ends-row">
          <label htmlFor={`${idPrefix}-ends`}>Due on</label>
          <input id={`${idPrefix}-ends`} type="date" value={ends} min={startISO} onChange={(event) => setEnds(event.target.value)} />
        </div>
      ) : null}
      <div className="add-row">
        <p className={`add-hint${error ? ' is-error' : ''}`} aria-live="polite">
          {error || (withEnds ? 'Pick a later due date for a multi-day task.' : 'Open a task to add its project and notes.')}
        </p>
        <button className="btn btn-primary" type="submit">Add</button>
      </div>
    </form>
  );
}
