import { useMemo, useState } from 'react';
import { useDesk, useUi } from '../desk.jsx';
import { todayISO } from '../lib/dates.js';
import { newTask, priorityOf, statusOf, taskCopyText } from '../lib/tasks.js';
import { copyText } from '../lib/text.js';
import { ConfirmButton } from './ConfirmButton.jsx';
import { PriorityPills, StatusPills } from './LevelPills.jsx';
import { Modal } from './Modal.jsx';
import { useToast } from './Toast.jsx';

// Opens a saved task with every field editable, or a blank one to add.
function TaskForm({ task, onClose }) {
  const { tasks, addTask, updateTask, deleteTask } = useDesk();
  const { flash } = useUi();
  const toast = useToast();
  const isNew = !task.id;
  const [draft, setDraft] = useState(() => ({
    title: task.title || '',
    project: task.project || '',
    priority: priorityOf(task),
    status: statusOf(task),
    startDate: task.startDate || task.dueDate || todayISO(),
    dueDate: task.dueDate || task.startDate || todayISO(),
    notes: task.notes || ''
  }));
  const [error, setError] = useState('');
  const set = (field) => (value) => { setDraft((current) => ({ ...current, [field]: value })); setError(''); };
  const projects = useMemo(() => [...new Set(tasks.map((item) => item.project).filter(Boolean))].sort(), [tasks]);
  const done = task.status === 'Done';

  function save(event) {
    event?.preventDefault();
    if (!draft.title.trim()) {
      setError('Give the task a title first.');
      return;
    }
    if (draft.dueDate && draft.startDate && draft.dueDate < draft.startDate) {
      setError('The due date has to be on or after the start date.');
      return;
    }
    if (isNew) {
      const created = newTask(draft);
      addTask(created);
      flash(created.id);
      toast(`Added "${created.title}".`);
    } else {
      updateTask(task.id, (current) => ({ ...current, ...draft, title: draft.title.trim(), project: draft.project.trim() }));
      toast(`Saved "${draft.title.trim()}".`);
    }
    onClose();
  }

  const footer = isNew ? (
    <>
      <span className="foot-spacer" />
      <button type="button" className="btn" onClick={onClose}>Cancel</button>
      <button type="button" className="btn btn-primary" onClick={save}>Add task</button>
    </>
  ) : (
    <>
      <ConfirmButton onConfirm={() => { deleteTask(task.id); toast(`Deleted "${task.title}".`); onClose(); }} />
      <span className="foot-spacer" />
      <button type="button" className="btn" onClick={async () => toast((await copyText(taskCopyText(task))) ? 'Copied the full task.' : 'Copy did not work here. Select the text and copy it instead.')}>Copy full text</button>
      <button type="button" className="btn" onClick={() => { updateTask(task.id, (current) => ({ ...current, status: done ? 'Not Started' : 'Done' })); onClose(); }}>
        {done ? 'Reopen' : 'Mark done'}
      </button>
      <button type="button" className="btn btn-primary" onClick={save}>Save changes</button>
    </>
  );

  return (
    <Modal eyebrow={isNew ? 'Task dashboard' : `Task${task.project ? ` · ${task.project}` : ''}${done ? ' · Done' : ''}`} title={isNew ? 'New task' : task.title || 'Untitled task'} onClose={onClose} footer={footer} wide>
      <form className="sheet-form" onSubmit={save} noValidate>
        <label className="field field-wide">
          <span>Task title</span>
          <input type="text" value={draft.title} placeholder="Fix Revit model and facade skeleton set" onChange={(event) => set('title')(event.target.value)} />
        </label>
        <div className="field field-wide">
          <span>Priority</span>
          <PriorityPills name={`sheet-priority-${task.id || 'new'}`} value={draft.priority} onChange={set('priority')} />
        </div>
        <div className="field field-wide">
          <span>Status</span>
          <StatusPills name={`sheet-status-${task.id || 'new'}`} value={draft.status} onChange={set('status')} />
        </div>
        <label className="field">
          <span>Project</span>
          <input type="text" list="project-names" value={draft.project} placeholder="2421 - 1587 3rd Ave" onChange={(event) => set('project')(event.target.value)} />
          <datalist id="project-names">{projects.map((name) => <option key={name} value={name} />)}</datalist>
        </label>
        <label className="field">
          <span>Start date</span>
          <input
            type="date"
            value={draft.startDate}
            onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value, dueDate: current.dueDate < event.target.value ? event.target.value : current.dueDate }))}
          />
        </label>
        <label className="field">
          <span>Due date</span>
          <input type="date" value={draft.dueDate} min={draft.startDate} onChange={(event) => set('dueDate')(event.target.value)} />
        </label>
        <label className="field field-wide">
          <span>Task notes / details</span>
          <textarea rows={8} value={draft.notes} placeholder="What needs attention? What should I remember when I open this task?" onChange={(event) => set('notes')(event.target.value)} />
        </label>
        {error ? <p className="form-error field-wide" role="alert">{error}</p> : null}
        <button type="submit" hidden>Save</button>
      </form>
    </Modal>
  );
}

export function TaskSheet() {
  const { tasks } = useDesk();
  const { sheet, closeItem } = useUi();
  if (!sheet) return null;
  if (sheet.kind === 'new') return <TaskForm key="new" task={sheet.task || {}} onClose={closeItem} />;
  const task = tasks.find((entry) => entry.id === sheet.id);
  if (!task) return null;
  return <TaskForm key={task.id} task={task} onClose={closeItem} />;
}
