import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STORAGE_KEYS = {
  tasks: 'archDailyWorkDesk.tasks.v2',
  daily: 'archDailyWorkDesk.dailyTaskLog.v2',
  dob: 'archDailyWorkDesk.dobNotes.v2',
  prompts: 'archDailyWorkDesk.aiPromptLibrary.v2',
  revit: 'archDailyWorkDesk.revitTroubleShoot.v2',
};

const olderStorageKeys = {
  tasks: ['archDailyWorkDesk.tasks', 'tasks', 'dashboardTasks'],
  daily: ['archDailyWorkDesk.dailyTaskLog', 'dailyTaskLog'],
  dob: ['archDailyWorkDesk.dobNotes', 'dobNotes', 'quickNotes'],
  prompts: ['archDailyWorkDesk.aiPromptLibrary', 'aiPromptLibrary', 'promptLog'],
  revit: ['archDailyWorkDesk.revitTroubleShoot', 'revitTroubleShoot'],
};

const STATUS_COLUMNS = ['Not Started', 'In Progress', 'Waiting', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const TABS = ['Dashboard', 'Daily Task Log', 'DOB Notes', 'AI Prompt Library', 'Revit Trouble Shoot'];

const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function readStorage(primaryKey, legacyKeys = []) {
  const primary = localStorage.getItem(primaryKey);
  if (primary) return safeParse(primary, []);
  for (const key of legacyKeys) {
    const legacy = localStorage.getItem(key);
    if (legacy) return safeParse(legacy, []);
  }
  return [];
}

function useLocalArray(storageKey, legacyKeys = []) {
  const [items, setItems] = useState(() => readStorage(storageKey, legacyKeys));
  const save = (next) => {
    const value = typeof next === 'function' ? next(items) : next;
    setItems(value);
    localStorage.setItem(storageKey, JSON.stringify(value));
  };
  return [items, save];
}

function formatDate(value) {
  if (!value) return 'No date';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isBetween(date, start, end) {
  const current = new Date(`${date}T00:00:00`).getTime();
  const a = new Date(`${start || end || date}T00:00:00`).getTime();
  const b = new Date(`${end || start || date}T00:00:00`).getTime();
  return current >= Math.min(a, b) && current <= Math.max(a, b);
}

function sortByPriority(items) {
  const weight = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
  return [...items].sort((a, b) => (weight[a.priority] ?? 9) - (weight[b.priority] ?? 9));
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button className={`btn ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

function EmptyState({ children }) {
  return <div className="empty-state">{children}</div>;
}

function DetailModal({ open, title, eyebrow, children, footer, onClose }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="detail-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            {eyebrow && <p className="modal-eyebrow">{eyebrow}</p>}
            <h2>{title || 'Full notes'}</h2>
          </div>
          <button className="modal-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </section>
    </div>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FullText({ label, value }) {
  return (
    <div className="full-text-block">
      <h3>{label}</h3>
      <div className="full-text">{value || 'No notes yet.'}</div>
    </div>
  );
}

function PreviewCard({ title, meta, badge, text, onOpen, children, className = '' }) {
  return (
    <article className={`preview-card ${className}`} onClick={onOpen} tabIndex={0} onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') onOpen?.();
    }}>
      <div className="card-topline">
        {badge && <span className={`pill ${String(badge).toLowerCase().replaceAll(' ', '-')}`}>{badge}</span>}
        {meta && <span className="card-meta">{meta}</span>}
      </div>
      <h3>{title || 'Untitled'}</h3>
      {text && <p className="line-clamp">{text}</p>}
      {children && <div className="card-actions" onClick={(event) => event.stopPropagation()}>{children}</div>}
    </article>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <header className="section-header">
      <div>
        <p className="section-kicker">ARCH DAILY WORK DESK</p>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </header>
  );
}

function TopNav({ activeTab, setActiveTab }) {
  return (
    <nav className="top-nav">
      <div className="brand">
        <span className="brand-mark">A</span>
        <div>
          <strong>ARCH DAILY WORK DESK</strong>
          <small>notes · tasks · code memory</small>
        </div>
      </div>
      <div className="tab-row">
        {TABS.map((tab) => (
          <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>
    </nav>
  );
}

function useTaskForm() {
  const [form, setForm] = useState({
    title: '',
    project: '',
    priority: 'Medium',
    status: 'Not Started',
    startDate: todayISO(),
    dueDate: todayISO(),
    notes: '',
  });
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const reset = () => setForm({
    title: '',
    project: '',
    priority: 'Medium',
    status: 'Not Started',
    startDate: todayISO(),
    dueDate: todayISO(),
    notes: '',
  });
  return { form, set, reset };
}

function Dashboard({ tasks, setTasks }) {
  const { form, set, reset } = useTaskForm();
  const [projectFilter, setProjectFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [hideDone, setHideDone] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const projects = useMemo(() => ['All', ...Array.from(new Set(tasks.map((t) => t.project).filter(Boolean)))], [tasks]);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    if (projectFilter !== 'All' && task.project !== projectFilter) return false;
    if (priorityFilter !== 'All' && task.priority !== priorityFilter) return false;
    if (hideDone && task.status === 'Done') return false;
    return true;
  }), [tasks, projectFilter, priorityFilter, hideDone]);

  const addTask = (event) => {
    event.preventDefault();
    if (!form.title.trim() && !form.notes.trim()) return;
    const nextTask = {
      id: uid(),
      createdAt: new Date().toISOString(),
      title: form.title.trim() || 'Untitled Task',
      project: form.project.trim(),
      priority: form.priority,
      status: form.status,
      startDate: form.startDate,
      dueDate: form.dueDate,
      notes: form.notes.trim(),
    };
    setTasks([nextTask, ...tasks]);
    reset();
  };

  const updateStatus = (id, status) => {
    setTasks(tasks.map((task) => task.id === id ? { ...task, status } : task));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter((task) => task.id !== id));
    setSelectedTask(null);
  };

  return (
    <>
      <div className="dashboard-grid">
        <main>
          <SectionHeader
            title="Task Dashboard"
            subtitle="Compact cards stay clean. Open any card to read the full notes/details."
          />

          <form className="panel task-form" onSubmit={addTask}>
            <div className="form-grid four">
              <Field label="Task title">
                <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Fix revit model and facade skeleton set" />
              </Field>
              <Field label="Project">
                <input value={form.project} onChange={(e) => set('project', e.target.value)} placeholder="2421 - 1587 3rd Ave" />
              </Field>
              <Field label="Start date">
                <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
              </Field>
              <Field label="Due date">
                <input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
              </Field>
              <Field label="Priority">
                <select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                  {PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {STATUS_COLUMNS.map((status) => <option key={status}>{status}</option>)}
                </select>
              </Field>
              <Field label="Task notes / details">
                <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="What needs attention? What should I remember when I open this task?" />
              </Field>
            </div>
            <Button type="submit" className="wide">Add Task</Button>
          </form>

          <div className="panel filters">
            <Field label="Project filter">
              <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                {projects.map((project) => <option key={project}>{project}</option>)}
              </select>
            </Field>
            <Field label="Priority filter">
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                {['All', ...PRIORITIES].map((priority) => <option key={priority}>{priority}</option>)}
              </select>
            </Field>
            <label className="checkbox-line">
              <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
              Hide Done
            </label>
          </div>

          <div className="board">
            {STATUS_COLUMNS.map((status) => {
              const columnTasks = sortByPriority(filteredTasks.filter((task) => task.status === status));
              return (
                <section className="board-column" key={status}>
                  <h2>{status}</h2>
                  {columnTasks.length === 0 && <EmptyState>No tasks here yet.</EmptyState>}
                  <div className="card-stack">
                    {columnTasks.map((task) => (
                      <PreviewCard
                        key={task.id}
                        title={task.title}
                        meta={`${task.startDate || 'No start'} → ${task.dueDate || 'No due'}`}
                        badge={task.priority}
                        text={`${task.project ? `${task.project}\n` : ''}${task.notes || ''}`}
                        onOpen={() => setSelectedTask(task)}
                      >
                        <select value={task.status} onChange={(e) => updateStatus(task.id, e.target.value)}>
                          {STATUS_COLUMNS.map((option) => <option key={option}>{option}</option>)}
                        </select>
                        <Button variant="ghost-danger" onClick={() => deleteTask(task.id)}>Delete</Button>
                      </PreviewCard>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </main>
        <PinnedCalendar tasks={tasks} onOpenTask={setSelectedTask} />
      </div>

      <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} onDelete={deleteTask} />
    </>
  );
}

function TaskModal({ task, onClose, onDelete }) {
  return (
    <DetailModal
      open={!!task}
      title={task?.title}
      eyebrow="Task details"
      onClose={onClose}
      footer={task && <Button variant="ghost-danger" onClick={() => onDelete(task.id)}>Delete task</Button>}
    >
      {task && (
        <>
          <div className="detail-grid">
            <DetailRow label="Project" value={task.project || 'No project'} />
            <DetailRow label="Priority" value={task.priority} />
            <DetailRow label="Status" value={task.status} />
            <DetailRow label="Start date" value={formatDate(task.startDate)} />
            <DetailRow label="Due date" value={formatDate(task.dueDate)} />
            <DetailRow label="Created" value={task.createdAt ? new Date(task.createdAt).toLocaleString() : ''} />
          </div>
          <FullText label="Full notes / details" value={task.notes} />
        </>
      )}
    </DetailModal>
  );
}

function PinnedCalendar({ tasks, onOpenTask }) {
  const [view, setView] = useState('Month');
  const [cursor, setCursor] = useState(() => new Date());
  const today = todayISO();

  const monthLabel = cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const d = new Date(start);
      d.setDate(start.getDate() + index);
      const iso = d.toISOString().slice(0, 10);
      return { date: d, iso, inMonth: d.getMonth() === month };
    });
  }, [month, year]);

  const changeMonth = (direction) => {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  };

  const weekStart = useMemo(() => {
    const d = new Date(`${today}T00:00:00`);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [today]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toISOString().slice(0, 10);
  }), [weekStart]);

  const todayTasks = sortByPriority(tasks.filter((task) => isBetween(today, task.startDate, task.dueDate) && task.status !== 'Done'));
  const weekTasks = sortByPriority(tasks.filter((task) => weekDays.some((day) => isBetween(day, task.startDate, task.dueDate)) && task.status !== 'Done'));

  return (
    <aside className="calendar-panel">
      <div className="calendar-header">
        <div>
          <p>PINNED MONTHLY CALENDAR</p>
          <h2>{monthLabel}</h2>
          <span>Tasks stretch from start date to due date.</span>
        </div>
        <button className="round-btn" onClick={() => changeMonth(-1)}>←</button>
        <button className="round-btn" onClick={() => changeMonth(1)}>→</button>
      </div>

      <div className="segmented">
        {['Today', 'Week', 'Month'].map((item) => (
          <button key={item} className={view === item ? 'active' : ''} onClick={() => setView(item)}>{item}</button>
        ))}
      </div>

      <div className="legend">
        <span><i className="dot planned" /> Planned</span>
        <span><i className="dot progress" /> In progress</span>
        <span><i className="dot urgent" /> Urgent</span>
      </div>

      {view === 'Month' && (
        <div className="month-view">
          {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day) => <b key={day}>{day}</b>)}
          {days.map((day) => {
            const dayTasks = tasks.filter((task) => isBetween(day.iso, task.startDate, task.dueDate));
            return (
              <div key={day.iso} className={`day-cell ${!day.inMonth ? 'muted' : ''} ${day.iso === today ? 'today' : ''}`}>
                <strong>{day.date.getDate()}</strong>
                <div className="mini-bars">
                  {sortByPriority(dayTasks).slice(0, 3).map((task) => (
                    <button key={task.id} className={`task-bar ${task.priority === 'Urgent' ? 'urgent' : task.status === 'In Progress' ? 'progress' : 'planned'}`} onClick={() => onOpenTask(task)}>
                      {task.title}
                    </button>
                  ))}
                  {dayTasks.length > 3 && <span className="more-count">+{dayTasks.length - 3}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'Today' && (
        <div className="agenda-view">
          <h3>Today · {formatDate(today)}</h3>
          {todayTasks.length === 0 && <EmptyState>No active tasks for today.</EmptyState>}
          {todayTasks.map((task) => (
            <button key={task.id} className="agenda-item" onClick={() => onOpenTask(task)}>
              <span className={`pill ${task.priority.toLowerCase()}`}>{task.priority}</span>
              <strong>{task.title}</strong>
              <small>{task.project || 'No project'} · {task.status}</small>
            </button>
          ))}
        </div>
      )}

      {view === 'Week' && (
        <div className="agenda-view">
          <h3>This Week · urgent first</h3>
          {weekTasks.length === 0 && <EmptyState>No active tasks this week.</EmptyState>}
          {weekTasks.map((task) => (
            <button key={task.id} className="agenda-item" onClick={() => onOpenTask(task)}>
              <span className={`pill ${task.priority.toLowerCase()}`}>{task.priority}</span>
              <strong>{task.title}</strong>
              <small>{formatDate(task.startDate)} → {formatDate(task.dueDate)}</small>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

function DailyTaskLog({ logs, setLogs }) {
  const [form, setForm] = useState({ date: todayISO(), title: '', notes: '' });
  const [selected, setSelected] = useState(null);

  const add = (event) => {
    event.preventDefault();
    if (!form.title.trim() && !form.notes.trim()) return;
    setLogs([{ id: uid(), createdAt: new Date().toISOString(), ...form, title: form.title.trim() || 'Daily log', notes: form.notes.trim() }, ...logs]);
    setForm({ date: todayISO(), title: '', notes: '' });
  };

  const remove = (id) => {
    setLogs(logs.filter((item) => item.id !== id));
    setSelected(null);
  };

  return (
    <main className="single-page">
      <SectionHeader title="Daily Task Log" subtitle="Daily notes stay compact on the page and open full screen when needed." />
      <form className="panel" onSubmit={add}>
        <div className="form-grid three">
          <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What happened today?" /></Field>
          <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Paste all work notes here. Long notes can be opened later." /></Field>
        </div>
        <Button type="submit" className="wide">Save Daily Log</Button>
      </form>
      <CardGrid items={logs} render={(log) => (
        <PreviewCard key={log.id} title={log.title} meta={formatDate(log.date)} badge="Daily" text={log.notes} onOpen={() => setSelected(log)}>
          <Button variant="ghost-danger" onClick={() => remove(log.id)}>Delete</Button>
        </PreviewCard>
      )} />
      <DetailModal open={!!selected} title={selected?.title} eyebrow={selected && formatDate(selected.date)} onClose={() => setSelected(null)} footer={selected && <Button variant="ghost-danger" onClick={() => remove(selected.id)}>Delete</Button>}>
        {selected && <FullText label="Full daily notes" value={selected.notes} />}
      </DetailModal>
    </main>
  );
}

function DOBNotes({ notes, setNotes }) {
  const [form, setForm] = useState({ title: '', category: '', date: todayISO(), content: '' });
  const [selected, setSelected] = useState(null);

  const add = (event) => {
    event.preventDefault();
    if (!form.title.trim() && !form.content.trim()) return;
    setNotes([{ id: uid(), createdAt: new Date().toISOString(), ...form, title: form.title.trim() || 'DOB Note', content: form.content.trim() }, ...notes]);
    setForm({ title: '', category: '', date: todayISO(), content: '' });
  };

  const remove = (id) => {
    setNotes(notes.filter((item) => item.id !== id));
    setSelected(null);
  };

  return (
    <main className="single-page">
      <SectionHeader title="DOB Notes" subtitle="Quick DOB/code notes now open full detail views, so long text never gets trapped in a card." />
      <form className="panel" onSubmit={add}>
        <div className="form-grid three">
          <Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="BC 1108 wheelchair seating" /></Field>
          <Field label="Category"><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Accessibility / Egress / Zoning" /></Field>
          <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Full DOB note"><textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Paste the code section, DOB comment, or office note here." /></Field>
        </div>
        <Button type="submit" className="wide">Save DOB Note</Button>
      </form>
      <CardGrid items={notes} render={(note) => (
        <PreviewCard key={note.id} title={note.title} meta={formatDate(note.date)} badge={note.category || 'DOB'} text={note.content || note.notes} onOpen={() => setSelected(note)}>
          <Button variant="ghost-danger" onClick={() => remove(note.id)}>Delete</Button>
        </PreviewCard>
      )} />
      <DetailModal open={!!selected} title={selected?.title} eyebrow="DOB note" onClose={() => setSelected(null)} footer={selected && <Button variant="ghost-danger" onClick={() => remove(selected.id)}>Delete</Button>}>
        {selected && (
          <>
            <div className="detail-grid">
              <DetailRow label="Category" value={selected.category || 'DOB'} />
              <DetailRow label="Date" value={formatDate(selected.date)} />
            </div>
            <FullText label="Full DOB notes" value={selected.content || selected.notes} />
          </>
        )}
      </DetailModal>
    </main>
  );
}

function AIPromptLibrary({ prompts, setPrompts }) {
  const [form, setForm] = useState({ title: '', category: '', date: todayISO(), prompt: '' });
  const [selected, setSelected] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const copyPrompt = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '');
    } catch {
      const area = document.createElement('textarea');
      area.value = text || '';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
  };

  const addOrUpdate = (event) => {
    event.preventDefault();
    if (!form.title.trim() && !form.prompt.trim()) return;
    if (editingId) {
      setPrompts(prompts.map((item) => item.id === editingId ? { ...item, ...form, title: form.title.trim() || 'AI Prompt', prompt: form.prompt.trim(), updatedAt: new Date().toISOString() } : item));
      setEditingId(null);
    } else {
      setPrompts([{ id: uid(), createdAt: new Date().toISOString(), ...form, title: form.title.trim() || 'AI Prompt', prompt: form.prompt.trim() }, ...prompts]);
    }
    setForm({ title: '', category: '', date: todayISO(), prompt: '' });
  };

  const edit = (prompt) => {
    setForm({ title: prompt.title || '', category: prompt.category || '', date: prompt.date || todayISO(), prompt: prompt.prompt || prompt.content || '' });
    setEditingId(prompt.id);
    setSelected(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = (id) => {
    setPrompts(prompts.filter((item) => item.id !== id));
    setSelected(null);
  };

  return (
    <main className="single-page">
      <SectionHeader title="AI Prompt Library" subtitle="Prompt cards show a preview; click any prompt to read/copy the full version." />
      <form className="panel" onSubmit={addOrUpdate}>
        <div className="form-grid three">
          <Field label="Prompt title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Rendering correction prompt" /></Field>
          <Field label="Category"><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Render / Email / Code / ARE" /></Field>
          <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Full prompt"><textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} placeholder="Paste the full prompt here. The card will only show preview text." /></Field>
        </div>
        <div className="button-row">
          <Button type="submit" className="wide">{editingId ? 'Update Prompt' : 'Save Prompt'}</Button>
          {editingId && <Button variant="secondary" type="button" onClick={() => { setEditingId(null); setForm({ title: '', category: '', date: todayISO(), prompt: '' }); }}>Cancel Edit</Button>}
        </div>
      </form>
      <CardGrid items={prompts} render={(prompt) => (
        <PreviewCard key={prompt.id} title={prompt.title} meta={formatDate(prompt.date)} badge={prompt.category || 'Prompt'} text={prompt.prompt || prompt.content} onOpen={() => setSelected(prompt)}>
          <Button variant="secondary" onClick={() => copyPrompt(prompt.prompt || prompt.content)}>Copy</Button>
          <Button variant="secondary" onClick={() => edit(prompt)}>Edit</Button>
          <Button variant="ghost-danger" onClick={() => remove(prompt.id)}>Delete</Button>
        </PreviewCard>
      )} />
      <DetailModal
        open={!!selected}
        title={selected?.title}
        eyebrow="AI prompt"
        onClose={() => setSelected(null)}
        footer={selected && (
          <>
            <Button variant="secondary" onClick={() => copyPrompt(selected.prompt || selected.content)}>Copy full prompt</Button>
            <Button variant="secondary" onClick={() => edit(selected)}>Edit</Button>
            <Button variant="ghost-danger" onClick={() => remove(selected.id)}>Delete</Button>
          </>
        )}
      >
        {selected && (
          <>
            <div className="detail-grid">
              <DetailRow label="Category" value={selected.category || 'Prompt'} />
              <DetailRow label="Date" value={formatDate(selected.date)} />
            </div>
            <FullText label="Full prompt" value={selected.prompt || selected.content} />
          </>
        )}
      </DetailModal>
    </main>
  );
}

function RevitTroubleShoot({ items, setItems }) {
  const [form, setForm] = useState({ title: '', project: '', category: '', date: todayISO(), problem: '', solution: '' });
  const [selected, setSelected] = useState(null);

  const add = (event) => {
    event.preventDefault();
    if (!form.title.trim() && !form.problem.trim() && !form.solution.trim()) return;
    setItems([{ id: uid(), createdAt: new Date().toISOString(), ...form, title: form.title.trim() || 'Revit Troubleshooting Note', problem: form.problem.trim(), solution: form.solution.trim() }, ...items]);
    setForm({ title: '', project: '', category: '', date: todayISO(), problem: '', solution: '' });
  };

  const remove = (id) => {
    setItems(items.filter((item) => item.id !== id));
    setSelected(null);
  };

  return (
    <main className="single-page">
      <SectionHeader title="Revit Trouble Shoot" subtitle="Issue cards are compact, but the full problem and solution open in a modal." />
      <form className="panel" onSubmit={add}>
        <div className="form-grid three">
          <Field label="Issue title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Bind link keeps repeating errors" /></Field>
          <Field label="Project"><input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="Project name / number" /></Field>
          <Field label="Category"><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Link / Family / View / Sheet" /></Field>
          <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Problem description"><textarea value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} placeholder="What went wrong? Error message? Context?" /></Field>
          <Field label="Solution / notes"><textarea value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} placeholder="What fixed it? What should I remember next time?" /></Field>
        </div>
        <Button type="submit" className="wide">Save Revit Note</Button>
      </form>
      <CardGrid items={items} render={(item) => (
        <PreviewCard key={item.id} title={item.title} meta={formatDate(item.date)} badge={item.category || 'Revit'} text={`${item.project ? `${item.project}\n` : ''}${item.problem || ''}\n${item.solution || ''}`} onOpen={() => setSelected(item)}>
          <Button variant="ghost-danger" onClick={() => remove(item.id)}>Delete</Button>
        </PreviewCard>
      )} />
      <DetailModal open={!!selected} title={selected?.title} eyebrow="Revit trouble shoot" onClose={() => setSelected(null)} footer={selected && <Button variant="ghost-danger" onClick={() => remove(selected.id)}>Delete</Button>}>
        {selected && (
          <>
            <div className="detail-grid">
              <DetailRow label="Project" value={selected.project || 'No project'} />
              <DetailRow label="Category" value={selected.category || 'Revit'} />
              <DetailRow label="Date" value={formatDate(selected.date)} />
            </div>
            <FullText label="Problem description" value={selected.problem} />
            <FullText label="Solution / notes" value={selected.solution} />
          </>
        )}
      </DetailModal>
    </main>
  );
}

function CardGrid({ items, render }) {
  if (!items.length) return <EmptyState>No saved items yet. Add one above.</EmptyState>;
  return <div className="note-grid">{items.map(render)}</div>;
}

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [tasks, setTasks] = useLocalArray(STORAGE_KEYS.tasks, olderStorageKeys.tasks);
  const [logs, setLogs] = useLocalArray(STORAGE_KEYS.daily, olderStorageKeys.daily);
  const [dobNotes, setDobNotes] = useLocalArray(STORAGE_KEYS.dob, olderStorageKeys.dob);
  const [prompts, setPrompts] = useLocalArray(STORAGE_KEYS.prompts, olderStorageKeys.prompts);
  const [revitItems, setRevitItems] = useLocalArray(STORAGE_KEYS.revit, olderStorageKeys.revit);

  return (
    <div className="app-shell">
      <TopNav activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === 'Dashboard' && <Dashboard tasks={tasks} setTasks={setTasks} />}
      {activeTab === 'Daily Task Log' && <DailyTaskLog logs={logs} setLogs={setLogs} />}
      {activeTab === 'DOB Notes' && <DOBNotes notes={dobNotes} setNotes={setDobNotes} />}
      {activeTab === 'AI Prompt Library' && <AIPromptLibrary prompts={prompts} setPrompts={setPrompts} />}
      {activeTab === 'Revit Trouble Shoot' && <RevitTroubleShoot items={revitItems} setItems={setRevitItems} />}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
