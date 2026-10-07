import { useMemo, useState } from 'react';
import { EditDialog } from '../components/EditDialog.jsx';
import { CategoryPager, useCategoryPages } from '../components/Pager.jsx';
import { PageHeading } from '../components/PageHeading.jsx';
import { todayISO } from '../lib/dates.js';
import { getTaskDateLabel, getTaskRange, getTaskTone, PRIORITIES, STATUS_COLUMNS } from '../lib/tasks.js';
import { matchesQuery, nowTimestamp, uid } from '../lib/text.js';

const emptyTask = (project = '') => ({ title: '', project, startDate: todayISO(), dueDate: todayISO(), priority: 'Medium', status: 'Not Started', notes: '' });

function TaskFields({ draft, setDraft }) {
  const set = (field) => (event) => setDraft({ ...draft, [field]: event.target.value });
  return (
    <>
      <label className="wide">Task title<input value={draft.title} onChange={set('title')} required /></label>
      <label>Project<input value={draft.project || ''} onChange={set('project')} /></label>
      <label>Priority<select value={draft.priority || 'Medium'} onChange={set('priority')}>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
      <label>Status<select value={draft.status || 'Not Started'} onChange={set('status')}>{STATUS_COLUMNS.map((status) => <option key={status}>{status}</option>)}</select></label>
      <label>Start date<input type="date" value={draft.startDate || ''} onChange={set('startDate')} /></label>
      <label>Due date<input type="date" value={draft.dueDate || ''} onChange={set('dueDate')} /></label>
      <label className="wide">Task notes / details<textarea value={draft.notes || ''} onChange={set('notes')} /></label>
    </>
  );
}

export function TaskDashboard({ tasks, setTasks, onOpenTask }) {
  const [form, setForm] = useState(() => emptyTask());
  const [projectFilter, setProjectFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [hideDone, setHideDone] = useState(false);
  const [search, setSearch] = useState('');
  const [startFrom, setStartFrom] = useState('');
  const [dueBy, setDueBy] = useState('');
  const [editing, setEditing] = useState(null);
  const [slides, setSlide] = useCategoryPages(`${search}|${projectFilter}|${priorityFilter}|${hideDone}|${startFrom}|${dueBy}`);

  const projects = useMemo(() => ['All', ...new Set(tasks.map((task) => task.project).filter(Boolean))], [tasks]);
  const filteredTasks = tasks.filter((task) => {
    if (projectFilter !== 'All' && task.project !== projectFilter) return false;
    if (priorityFilter !== 'All' && task.priority !== priorityFilter) return false;
    if (hideDone && task.status === 'Done') return false;
    const [start, end] = getTaskRange(task);
    if (startFrom && end && end < startFrom) return false;
    if (dueBy && start && start > dueBy) return false;
    return matchesQuery(task, search);
  });

  function addTask(event) {
    event.preventDefault();
    if (!form.title.trim()) return;
    const now = nowTimestamp();
    setTasks((list) => [{ ...form, title: form.title.trim(), id: uid(), createdAt: now, updatedAt: now }, ...list]);
    setForm(emptyTask(form.project));
  }

  function updateTask(id, patch) {
    setTasks((list) => list.map((task) => (task.id === id ? { ...task, ...patch, updatedAt: nowTimestamp() } : task)));
  }

  function saveEdit() {
    updateTask(editing.id, { ...editing, title: editing.title.trim(), project: (editing.project || '').trim() });
    setEditing(null);
  }

  return (
    <>
      <PageHeading eyebrow="Arch Daily Work Desk" title="Task Dashboard">Compact cards stay clean. Open any card to read the full notes/details.</PageHeading>

      <form className="cardForm taskForm" onSubmit={addTask}>
        <label>Task title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Fix revit model and facade skeleton set" /></label>
        <label>Project<input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="2421 - 1587 3rd Ave" /></label>
        <label>Start date<input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
        <label>Due date<input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
        <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
        <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUS_COLUMNS.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label className="wide">Task notes / details<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="What needs attention? What should I remember when I open this task?" /></label>
        <button type="submit" className="primary wide">Add Task</button>
      </form>

      <section className="filterCard">
        <label>Project filter<select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>{projects.map((project) => <option key={project}>{project}</option>)}</select></label>
        <label>Priority filter<select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}><option>All</option>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
        <label className="checkLine"><input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Hide Done</label>
        <input className="filterSearch" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search dashboard tasks..." />
        <div className="taskDateFilters">
          <label>Start from<input type="date" value={startFrom} onChange={(e) => setStartFrom(e.target.value)} /></label>
          <label>Due by<input type="date" value={dueBy} onChange={(e) => setDueBy(e.target.value)} /></label>
          <button type="button" onClick={() => { setStartFrom(''); setDueBy(''); }}>Clear dates</button>
        </div>
      </section>

      <section className="kanbanGrid">
        {STATUS_COLUMNS.map((status) => {
          const columnTasks = filteredTasks.filter((task) => (task.status || 'Not Started') === status);
          const index = Math.min(slides[status] || 0, Math.max(0, columnTasks.length - 1));
          const task = columnTasks[index];
          return (
            <div key={status} className="kanbanColumn">
              <h3>{status}</h3>
              {columnTasks.length > 0 && <CategoryPager className="columnSlide" label={status} page={index} pages={columnTasks.length} onPage={(page) => setSlide(status, page)} />}
              {!task ? <div className="empty">No tasks here yet.</div> : (
                <article key={task.id} className={`taskCard ${getTaskTone(task)}`} onClick={() => onOpenTask(task)}>
                  <div className="pillRow"><span className="priorityPill">{task.priority || 'Medium'}</span><span className="datePill">{getTaskDateLabel(task)}</span></div>
                  <h4>{task.title}</h4>
                  {task.project && <p className="mutedText">{task.project}</p>}
                  {task.notes && <p className="clampedText">{task.notes}</p>}
                  <div className="cardActions" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="editButton" onClick={() => setEditing({ ...task })}>Edit</button>
                    <select value={task.status || 'Not Started'} onChange={(e) => updateTask(task.id, { status: e.target.value })}>{STATUS_COLUMNS.map((s) => <option key={s}>{s}</option>)}</select>
                    <button type="button" onClick={() => onOpenTask(task)}>View full notes</button>
                    <button type="button" className="danger" onClick={() => setTasks((list) => list.filter((item) => item.id !== task.id))}>Delete</button>
                  </div>
                </article>
              )}
            </div>
          );
        })}
      </section>

      {editing && (
        <EditDialog title="Edit Dashboard Task" onSave={saveEdit} onClose={() => setEditing(null)}>
          <TaskFields draft={editing} setDraft={setEditing} />
        </EditDialog>
      )}
    </>
  );
}
