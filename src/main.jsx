import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STORAGE_KEYS = {
  tasks: 'archDailyWorkDesk.tasks.v2',
  daily: 'archDailyWorkDesk.dailyTaskLog.v2',
  dob: 'archDailyWorkDesk.dobNotes.v2',
  dobLinks: 'archDailyWorkDesk.dobCodeLinks.v1',
  prompts: 'archDailyWorkDesk.aiPromptLibrary.v2',
  revit: 'archDailyWorkDesk.revitTroubleShoot.v2',
};

const LEGACY_KEYS = {
  tasks: ['archDailyWorkDesk.tasks', 'tasks', 'dashboardTasks'],
  daily: ['archDailyWorkDesk.dailyTaskLog', 'dailyTaskLog'],
  dob: ['archDailyWorkDesk.dobNotes', 'dobNotes', 'quickNotes'],
  dobLinks: ['archDailyWorkDesk.dobCodeLinks', 'dobCodeLinks'],
  prompts: ['archDailyWorkDesk.aiPromptLibrary', 'aiPromptLibrary', 'promptLog'],
  revit: ['archDailyWorkDesk.revitTroubleShoot', 'revitTroubleShoot'],
};

const TABS = ['Dashboard', 'DOB Notes', 'Links', 'AI Prompt Library', 'Revit Trouble Shoot'];
const STATUS_COLUMNS = ['Not Started', 'In Progress', 'Waiting', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const FOCUS_COLUMNS = ['Urgent', 'High', 'In Progress', 'Waiting', 'Planned'];
const DOB_CATEGORIES = ['General', 'Zoning', 'Code', 'Plumbing Code', 'Energy Code', 'Building Code', 'ADA'];
const DOB_NOTES_PAGE_SIZE = 2;
const LINK_CATEGORIES = ['Code', 'Zoning', 'General', 'Info'];
const PROMPT_CATEGORIES = ['Rendering', 'Video', 'Writing', 'Code', 'DOB', 'Revit', 'Other'];
const REVIT_CATEGORIES = ['Modeling', 'Family', 'View', 'Schedule', 'Link', 'Worksharing', 'Error', 'Other'];

function uid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowTimestamp() {
  return new Date().toISOString();
}

function safeParse(value, fallback = []) {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.items)) return parsed.items;
    if (parsed && Array.isArray(parsed.data)) return parsed.data;
    return fallback;
  } catch {
    return fallback;
  }
}

function readArray(primaryKey, legacyKeys = []) {
  const primary = localStorage.getItem(primaryKey);
  if (primary) return safeParse(primary, []);
  for (const key of legacyKeys) {
    const legacy = localStorage.getItem(key);
    if (legacy) return safeParse(legacy, []);
  }
  return [];
}

function useStoredArray(primaryKey, legacyKeys = []) {
  const [items, setItems] = useState(() => readArray(primaryKey, legacyKeys));
  useEffect(() => {
    localStorage.setItem(primaryKey, JSON.stringify(items));
  }, [primaryKey, items]);

  useEffect(() => {
    function syncFromStorage(event) {
      const changedKey = event?.detail?.key || event?.key;
      if (changedKey && changedKey !== primaryKey && !legacyKeys.includes(changedKey)) return;
      setItems(readArray(primaryKey, legacyKeys));
    }

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener('archDailyWorkDesk:localDataChanged', syncFromStorage);
    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener('archDailyWorkDesk:localDataChanged', syncFromStorage);
    };
  }, [primaryKey, legacyKeys]);

  return [items, setItems];
}


function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function makeScreenshotAttachment(file) {
  if (!file || !file.type?.startsWith('image/')) return null;
  const originalDataUrl = await fileToDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const maxWidth = 1600;
  const scale = Math.min(1, maxWidth / image.width);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  return {
    id: uid(),
    name: file.name || 'Screenshot',
    type: 'image/jpeg',
    size: file.size || 0,
    width,
    height,
    dataUrl,
  };
}

function todayISO() {
  return formatDate(new Date());
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = String(dateString).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function sameMonth(a, b) {
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function monthLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function niceDate(value) {
  if (!value) return '—';
  const date = parseLocalDate(value);
  if (!date) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function normalize(value) {
  return String(value || '').toLowerCase().trim();
}

function normalizeDobCategory(value) {
  const category = String(value || '').trim();
  if (DOB_CATEGORIES.includes(category)) return category;
  const lower = category.toLowerCase();
  if (lower.includes('access') || lower.includes('ada')) return 'ADA';
  if (lower.includes('energy')) return 'Energy Code';
  if (lower.includes('plumb')) return 'Plumbing Code';
  if (lower.includes('build')) return 'Building Code';
  if (lower.includes('zoning')) return 'Zoning';
  if (lower.includes('code') || lower === 'dob') return 'Code';
  return 'General';
}

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function getLinkHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

function getLinkInitial(link) {
  const source = link.title || getLinkHost(link.url) || link.category || 'Link';
  return source.trim().charAt(0).toUpperCase() || 'L';
}

function getFaviconUrl(url) {
  const host = getLinkHost(url);
  return host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64` : '';
}

function normalizeLinkCategory(value) {
  const category = String(value || '').toLowerCase();
  if (category.includes('zoning')) return 'Zoning';
  if (category.includes('general')) return 'General';
  if (category.includes('info') || category.includes('accessibility') || category.includes('energy') || category.includes('bpp')) return 'Info';
  if (category.includes('code') || category.includes('dob')) return 'Code';
  return 'General';
}

function matchesQuery(item, query) {
  const q = normalize(query);
  if (!q) return true;
  return normalize(Object.values(item).join(' ')).includes(q);
}

function getTaskDateKeys(task) {
  const start = parseLocalDate(task.startDate || task.dueDate);
  const end = parseLocalDate(task.dueDate || task.startDate);
  if (!start || !end) return [];
  const from = start <= end ? start : end;
  const to = start <= end ? end : start;
  const keys = [];
  let cursor = new Date(from);
  let guard = 0;
  while (cursor <= to && guard < 370) {
    keys.push(formatDate(cursor));
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return keys;
}

function getTaskDateLabel(task) {
  if (task.startDate && task.dueDate && task.startDate !== task.dueDate) return `${task.startDate} → ${task.dueDate}`;
  return task.dueDate || task.startDate || 'No date';
}

function getTaskTone(task) {
  if (task.status === 'Done') return 'done';
  if (task.priority === 'Urgent') return 'urgent';
  if (task.priority === 'High') return 'high';
  if (task.status === 'In Progress') return 'progress';
  if (task.status === 'Waiting') return 'waiting';
  return 'planned';
}

function getTaskProjectAccent(task) {
  const source = task.project || task.title || '';
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) hash = source.charCodeAt(i) + ((hash << 5) - hash);
  return `projectAccent${Math.abs(hash) % 6}`;
}

function getTaskUrgencyRank(task) {
  if (task.status === 'Done') return 99;
  if (task.priority === 'Urgent') return 0;
  if (task.priority === 'High') return 1;
  if (task.status === 'In Progress') return 2;
  if (task.status === 'Waiting') return 3;
  if (task.priority === 'Medium') return 4;
  return 5;
}

function sortFocusTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const rank = getTaskUrgencyRank(a) - getTaskUrgencyRank(b);
    if (rank !== 0) return rank;
    const aDue = a.dueDate || a.startDate || '9999-12-31';
    const bDue = b.dueDate || b.startDate || '9999-12-31';
    const dateCompare = aDue.localeCompare(bDue);
    if (dateCompare !== 0) return dateCompare;
    return (a.title || '').localeCompare(b.title || '');
  });
}

function getFocusColumn(task) {
  if (task.priority === 'Urgent') return 'Urgent';
  if (task.priority === 'High') return 'High';
  if (task.status === 'In Progress') return 'In Progress';
  if (task.status === 'Waiting') return 'Waiting';
  return 'Planned';
}

function getMonthWeeks(currentDate) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());
  const weeks = [];
  let cursor = new Date(start);
  for (let week = 0; week < 6; week += 1) {
    const days = [];
    for (let day = 0; day < 7; day += 1) {
      days.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    weeks.push(days);
  }
  return weeks;
}

function getWeekDays(date) {
  const start = addDays(date, -date.getDay());
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function getTasksForDate(tasks, dateKey) {
  return tasks.filter((task) => getTaskDateKeys(task).includes(dateKey));
}

function getTaskSegmentsForWeek(task, weekDays) {
  const keys = getTaskDateKeys(task);
  const positions = weekDays.map((day, index) => (keys.includes(formatDate(day)) ? index + 1 : null)).filter(Boolean);
  if (!positions.length) return null;
  return { startCol: Math.min(...positions), endCol: Math.max(...positions) + 1 };
}

function FullNoteModal({ open, title, eyebrow = 'Full notes', meta = [], sections = [], images = [], copyText = '', onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function copyFullText() {
    try {
      await navigator.clipboard.writeText(copyText || sections.map(([label, text]) => `${label}\n${text}`).join('\n\n'));
    } catch {
      // Browser may block clipboard on some preview URLs.
    }
  }

  return (
    <div className="modalOverlay" onMouseDown={onClose}>
      <article className="detailModal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modalTop">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title || 'Full notes'}</h2>
          </div>
          <button type="button" className="modalClose" onClick={onClose}>×</button>
        </div>
        <div className="modalBody">
          {meta.length > 0 && (
            <div className="detailGrid">
              {meta.map(([label, value]) => (
                value ? <div key={label} className="detailStat"><span>{label}</span><strong>{value}</strong></div> : null
              ))}
            </div>
          )}
          {sections.map(([label, text], index) => (
            <section key={`${label}-${index}`} className="modalSection">
              <h3>{label}</h3>
              <p>{text || 'No notes yet.'}</p>
            </section>
          ))}
          {images.length > 0 && (
            <section className="modalSection screenshotSection">
              <h3>Saved screenshot</h3>
              <div className="modalImageGrid">
                {images.map((image, index) => (
                  <figure key={image.id || image.name || index} className="modalImageCard">
                    <img src={image.dataUrl || image.src} alt={image.name || 'Saved screenshot'} />
                    {image.name && <figcaption>{image.name}</figcaption>}
                  </figure>
                ))}
              </div>
            </section>
          )}
        </div>
        <div className="modalActions">
          <button type="button" onClick={copyFullText}>Copy full text</button>
          <button type="button" className="primary" onClick={onClose}>Done</button>
        </div>
      </article>
    </div>
  );
}

function taskModalData(task) {
  return {
    eyebrow: 'Task Detail',
    title: task.title || 'Untitled Task',
    meta: [
      ['Project', task.project || 'No project'],
      ['Priority', task.priority || 'Medium'],
      ['Status', task.status || 'Not Started'],
      ['Start date', task.startDate || '—'],
      ['Due date', task.dueDate || '—'],
    ],
    sections: [['Task notes / details', task.notes || 'No notes yet.']],
    copyText: `${task.title || 'Untitled Task'}\n${task.project || ''}\n${getTaskDateLabel(task)}\n\n${task.notes || ''}`,
  };
}

function dailyLogModalData(log) {
  return {
    eyebrow: 'Daily Task Log',
    title: log.summary || log.project || 'Daily Log',
    meta: [
      ['Date', niceDate(log.date)],
      ['Project', log.project || 'No project'],
    ],
    sections: [
      ['Quick summary', log.summary || 'No summary.'],
      ['Full daily notes', log.notes || 'No notes yet.'],
    ],
    copyText: `${log.date || ''}\n${log.project || ''}\n${log.summary || ''}\n\n${log.notes || ''}`,
  };
}

function dailyLogTaskId(log) {
  const source = log.id || `${log.date || ''}-${log.project || ''}-${log.summary || ''}`;
  return `daily-log-${encodeURIComponent(source).slice(0, 140)}`;
}

function dailyLogToDashboardTask(log) {
  const date = log.date || todayISO();
  const id = log.migratedToDashboardTaskId || dailyLogTaskId(log);
  const summary = String(log.summary || '').trim();
  const notes = String(log.notes || '').trim();
  const project = String(log.project || '').trim();
  const detailText = [
    summary ? `Quick summary: ${summary}` : '',
    notes ? `Full notes:\n${notes}` : '',
  ].filter(Boolean).join('\n\n');

  return {
    id,
    title: summary || project || `Daily Log - ${niceDate(date)}`,
    project: project || 'Daily Log',
    startDate: date,
    dueDate: date,
    priority: 'Medium',
    status: 'Done',
    notes: detailText || 'Migrated from Daily Task Log.',
    migratedFromDailyLogId: log.id || id,
    createdAt: log.createdAt || nowTimestamp(),
    updatedAt: nowTimestamp(),
  };
}

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [tasks, setTasks] = useStoredArray(STORAGE_KEYS.tasks, LEGACY_KEYS.tasks);
  const [dailyLogs, setDailyLogs] = useStoredArray(STORAGE_KEYS.daily, LEGACY_KEYS.daily);
  const [dobNotes, setDobNotes] = useStoredArray(STORAGE_KEYS.dob, LEGACY_KEYS.dob);
  const [prompts, setPrompts] = useStoredArray(STORAGE_KEYS.prompts, LEGACY_KEYS.prompts);
  const [revitLogs, setRevitLogs] = useStoredArray(STORAGE_KEYS.revit, LEGACY_KEYS.revit);
  const [openTask, setOpenTask] = useState(null);

  const sharedProps = { tasks, setTasks, dailyLogs, setDailyLogs, dobNotes, setDobNotes, prompts, setPrompts, revitLogs, setRevitLogs };

  useEffect(() => {
    if (!dailyLogs.length) return;
    const logsToMigrate = dailyLogs.filter((log) => !log.migratedToDashboardTaskId);
    if (!logsToMigrate.length) return;
    setTasks((currentTasks) => {
      const existingTaskIds = new Set(currentTasks.map((task) => task.id));
      const migratedLogIds = new Set(currentTasks.map((task) => task.migratedFromDailyLogId).filter(Boolean));
      const migratedTasks = logsToMigrate
        .filter((log) => !existingTaskIds.has(dailyLogTaskId(log)) && !migratedLogIds.has(log.id || dailyLogTaskId(log)))
        .map(dailyLogToDashboardTask);
      return migratedTasks.length ? [...migratedTasks, ...currentTasks] : currentTasks;
    });
    setDailyLogs((currentLogs) => currentLogs.map((log) => (
      log.migratedToDashboardTaskId ? log : {
        ...log,
        migratedToDashboardTaskId: dailyLogTaskId(log),
        migratedToDashboardAt: nowTimestamp(),
      }
    )));
  }, [dailyLogs, setTasks, setDailyLogs]);

  return (
    <>
      <header className="topbar">
        <button type="button" className="brandBlock brandHome" onClick={() => setActiveTab('Dashboard')} aria-label="Go to Dashboard">
          <div className="brandMark">A</div>
          <div>
            <h1>ARCH DAILY WORK DESK</h1>
            <p>notes · tasks · code memory</p>
          </div>
        </button>
        <nav className="mainNav">
          {TABS.map((tab) => (
            <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </nav>
      </header>

      <main className="pageShell">
        <section className="workspacePane">
          {activeTab === 'Dashboard' && <TaskDashboard tasks={tasks} setTasks={setTasks} onOpenTask={setOpenTask} />}
          {activeTab === 'DOB Notes' && <DobNotes dobNotes={dobNotes} setDobNotes={setDobNotes} />}
          {activeTab === 'Links' && <LinkLibrary />}
          {activeTab === 'AI Prompt Library' && <PromptLibrary prompts={prompts} setPrompts={setPrompts} />}
          {activeTab === 'Revit Trouble Shoot' && <RevitTroubleShoot revitLogs={revitLogs} setRevitLogs={setRevitLogs} />}
        </section>
        <aside className="calendarDock">
          <CalendarPanel tasks={tasks} dailyLogs={[]} onOpenTask={setOpenTask} onOpenDailyLog={() => {}} activeTab={activeTab} />
        </aside>
      </main>

      {openTask && <FullNoteModal open {...taskModalData(openTask)} onClose={() => setOpenTask(null)} />}
    </>
  );
}

function PageHeading({ eyebrow, title, children }) {
  return (
    <div className="pageHeading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}

function TaskDashboard({ tasks, setTasks, onOpenTask }) {
  const [form, setForm] = useState({ title: '', project: '', startDate: todayISO(), dueDate: todayISO(), priority: 'Medium', status: 'Not Started', notes: '' });
  const [projectFilter, setProjectFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [hideDone, setHideDone] = useState(false);
  const [search, setSearch] = useState('');

  const projects = useMemo(() => ['All', ...Array.from(new Set(tasks.map((task) => task.project).filter(Boolean)))], [tasks]);
  const filteredTasks = tasks.filter((task) => {
    if (projectFilter !== 'All' && task.project !== projectFilter) return false;
    if (priorityFilter !== 'All' && task.priority !== priorityFilter) return false;
    if (hideDone && task.status === 'Done') return false;
    return matchesQuery(task, search);
  });

  function addTask(event) {
    event.preventDefault();
    if (!form.title.trim()) return;
    const now = nowTimestamp();
    setTasks([{ ...form, title: form.title.trim(), id: uid(), createdAt: now, updatedAt: now }, ...tasks]);
    setForm({ title: '', project: form.project, startDate: todayISO(), dueDate: todayISO(), priority: 'Medium', status: 'Not Started', notes: '' });
  }

  function updateTask(id, patch) {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, ...patch, updatedAt: nowTimestamp() } : task)));
  }

  function deleteTask(id) {
    setTasks(tasks.filter((task) => task.id !== id));
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
      </section>

      <section className="kanbanGrid">
        {STATUS_COLUMNS.map((status) => {
          const columnTasks = filteredTasks.filter((task) => (task.status || 'Not Started') === status);
          return (
            <div key={status} className="kanbanColumn">
              <h3>{status}</h3>
              {columnTasks.length === 0 ? <div className="empty">No tasks here yet.</div> : columnTasks.map((task) => (
                <article key={task.id} className={`taskCard ${getTaskTone(task)} ${getTaskProjectAccent(task)}`} onClick={() => onOpenTask(task)}>
                  <div className="pillRow"><span className="priorityPill">{task.priority || 'Medium'}</span><span className="datePill">{getTaskDateLabel(task)}</span></div>
                  <h4>{task.title}</h4>
                  {task.project && <p className="mutedText">{task.project}</p>}
                  {task.notes && <p className="clampedText">{task.notes}</p>}
                  <div className="cardActions" onClick={(event) => event.stopPropagation()}>
                    <select value={task.status || 'Not Started'} onChange={(e) => updateTask(task.id, { status: e.target.value })}>{STATUS_COLUMNS.map((s) => <option key={s}>{s}</option>)}</select>
                    <button type="button" onClick={() => onOpenTask(task)}>View full notes</button>
                    <button type="button" className="danger" onClick={() => deleteTask(task.id)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          );
        })}
      </section>
    </>
  );
}

function DailyTaskLog({ dailyLogs, setDailyLogs }) {
  const [form, setForm] = useState({ date: todayISO(), project: '', summary: '', notes: '' });
  const [search, setSearch] = useState('');
  const [openLog, setOpenLog] = useState(null);
  const filtered = dailyLogs.filter((log) => matchesQuery(log, search));

  function addLog(event) {
    event.preventDefault();
    if (!form.summary.trim() && !form.notes.trim()) return;
    const now = nowTimestamp();
    setDailyLogs([{ ...form, id: uid(), createdAt: now, updatedAt: now }, ...dailyLogs]);
    setForm({ date: todayISO(), project: form.project, summary: '', notes: '' });
  }

  function deleteLog(id) {
    setDailyLogs(dailyLogs.filter((log) => log.id !== id));
  }

  return (
    <>
      <PageHeading eyebrow="Arch Daily Work Desk" title="Daily Task Log">Record what happened today, then open any card to read the full notes.</PageHeading>
      <input className="topSearch" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search daily logs..." />
      <form className="cardForm" onSubmit={addLog}>
        <label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <label>Project<input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="Project name" /></label>
        <label className="wide">Quick summary<input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="What happened today?" /></label>
        <label className="wide">Full notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Write detailed daily notes here..." /></label>
        <button type="submit" className="primary wide">Add Daily Log</button>
      </form>

      <section className="libraryGrid oneThird">
        {filtered.length === 0 ? <div className="empty wideEmpty">No daily logs yet.</div> : filtered.map((log) => (
          <article key={log.id} className="libraryCard" onClick={() => setOpenLog(log)}>
            <p className="eyebrow">{niceDate(log.date)}</p>
            <h3>{log.project || 'Daily Log'}</h3>
            {log.summary && <p className="clampedText">{log.summary}</p>}
            {log.notes && <p className="clampedText softClamp">{log.notes}</p>}
            <div className="cardActions" onClick={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => setOpenLog(log)}>View full notes</button>
              <button type="button" className="danger" onClick={() => deleteLog(log.id)}>Delete</button>
            </div>
          </article>
        ))}
      </section>

      {openLog && (
        <FullNoteModal
          open
          eyebrow="Daily Task Log"
          title={openLog.project || 'Daily Log'}
          meta={[["Date", niceDate(openLog.date)], ["Project", openLog.project || '—']]}
          sections={[["Quick summary", openLog.summary], ["Full notes", openLog.notes]]}
          copyText={`${openLog.date}\n${openLog.project || ''}\n\n${openLog.summary || ''}\n\n${openLog.notes || ''}`}
          onClose={() => setOpenLog(null)}
        />
      )}
    </>
  );
}

function DobNotes({ dobNotes, setDobNotes }) {
  const [form, setForm] = useState({ date: todayISO(), category: 'General', year: '', code: '', chapter: '', title: '', notes: '', screenshot: null });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [openNote, setOpenNote] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [dobCategoryPages, setDobCategoryPages] = useState({});
  const filtered = dobNotes.filter((note) => matchesQuery(note, search) && (category === 'All' || normalizeDobCategory(note.category) === category));

  useEffect(() => {
    setDobCategoryPages({});
  }, [search, category, dobNotes.length]);

  async function handleScreenshotFiles(files) {
    const file = Array.from(files || []).find((item) => item.type?.startsWith('image/'));
    if (!file) return;
    const screenshot = await makeScreenshotAttachment(file);
    if (screenshot) setForm((current) => ({ ...current, screenshot }));
  }

  function resetDobNoteForm(nextCategory = form.category) {
    setEditingNoteId(null);
    setForm({ date: todayISO(), category: normalizeDobCategory(nextCategory), year: '', code: '', chapter: '', title: '', notes: '', screenshot: null });
  }

  function startEditDobNote(note) {
    setEditingNoteId(note.id);
    setOpenNote(null);
    setForm({
      date: note.date || todayISO(),
      category: normalizeDobCategory(note.category),
      year: note.year || '',
      code: note.code || '',
      chapter: note.chapter || '',
      title: note.title || '',
      notes: note.notes || '',
      screenshot: note.screenshot || null,
    });
    window.setTimeout(() => {
      document.querySelector('[data-dob-note-form]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  function saveNote(event) {
    event.preventDefault();
    if (!form.title.trim() && !form.notes.trim() && !form.screenshot) return;
    const now = nowTimestamp();
    const nextForm = { ...form, year: form.year.trim(), code: form.code.trim(), chapter: form.chapter.trim(), title: form.title.trim(), updatedAt: now };

    if (editingNoteId) {
      setDobNotes(dobNotes.map((note) => note.id === editingNoteId ? { ...note, ...nextForm } : note));
    } else {
      setDobNotes([{ ...nextForm, id: uid(), createdAt: now }, ...dobNotes]);
    }

    resetDobNoteForm(form.category);
  }

  function deleteDobNote(id) {
    setDobNotes(dobNotes.filter((note) => note.id !== id));
    if (editingNoteId === id) resetDobNoteForm();
  }

  return (
    <>
      <PageHeading eyebrow="Code / DOB Memory" title="DOB Notes">Compact cards with full-note modal for long code notes.</PageHeading>
      <div className="libraryFilters"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search DOB notes..." /><select value={category} onChange={(e) => setCategory(e.target.value)}><option>All</option>{DOB_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select></div>
      <DobNoteCategorySections
        items={filtered}
        pages={dobCategoryPages}
        setPages={setDobCategoryPages}
        onOpen={setOpenNote}
        onEdit={startEditDobNote}
        onDelete={deleteDobNote}
      />
      <form className="cardForm" onSubmit={saveNote} data-dob-note-form>
        {editingNoteId && (
          <div className="wide editFormNotice">
            <strong>Editing saved DOB note</strong>
            <button type="button" onClick={() => resetDobNoteForm()}>Cancel edit</button>
          </div>
        )}
        <label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{DOB_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select></label>
        <label>Year<input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="e.g. 2022" /></label>
        <label>Code<input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. NYC Building Code" /></label>
        <label>Chapter<input value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} placeholder="e.g. Chapter 3 / 310.3" /></label>
        <label className="wide">Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Code / DOB quick note title" /></label>
        <label className="wide">Full note<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Write the complete DOB/code note here..." /></label>
        <label
          className={`wide screenshotDrop ${form.screenshot ? 'hasScreenshot' : ''}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            handleScreenshotFiles(event.dataTransfer.files);
          }}
        >
          Screenshot upload
          <input type="file" accept="image/*" onChange={(e) => handleScreenshotFiles(e.target.files)} />
          <span>Drag a screenshot here, or click to browse/upload.</span>
          {form.screenshot && (
            <div className="screenshotPreview">
              <img src={form.screenshot.dataUrl} alt={form.screenshot.name || 'Screenshot preview'} />
              <div>
                <strong>{form.screenshot.name || 'Screenshot saved'}</strong>
                <button type="button" onClick={(event) => { event.preventDefault(); setForm({ ...form, screenshot: null }); }}>Remove</button>
              </div>
            </div>
          )}
        </label>
        <button type="submit" className="primary wide">{editingNoteId ? 'Save DOB Note Changes' : 'Add DOB Note'}</button>
      </form>

      {false && (
      <section className="dobLinkPanel">
        <div className="dobLinkHead">
          <div>
            <p className="eyebrow">DOB Code Links</p>
            <h3>Quick Access Buttons</h3>
            <p>Save DOB/code reference URLs here. Each saved link becomes a button you can open anytime.</p>
          </div>
        </div>
        <form className="dobLinkForm" onSubmit={addDobLink}>
          <input value={linkForm.title} onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })} placeholder="Button name, e.g. DOB BIS / Zoning Text" />
          <input value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} placeholder="Paste DOB/code link" />
          <select value={linkForm.category} onChange={(e) => setLinkForm({ ...linkForm, category: e.target.value })}>
            <option>Code</option>
            <option>DOB</option>
            <option>Zoning</option>
            <option>BPP</option>
            <option>Energy</option>
            <option>Accessibility</option>
          </select>
          <button type="submit" className="primary">Add Link</button>
        </form>
        <div className="dobLinkButtons">
          {dobLinks.length === 0 ? (
            <div className="empty compact">No DOB code links saved yet.</div>
          ) : dobLinks.map((link) => {
            const faviconUrl = getFaviconUrl(link.url);
            return (
              <div key={link.id} className="dobLinkChip">
                <a href={link.url} target="_blank" rel="noreferrer" aria-label={`Open ${link.title}`}>
                  <span className="dobLinkLogo">
                    {faviconUrl ? <img src={faviconUrl} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : null}
                    <span>{getLinkInitial(link)}</span>
                  </span>
                  <strong>{link.title}</strong>
                </a>
                <div className="dobLinkMeta">
                  <span>{link.category || 'Code'}</span>
                  <button type="button" aria-label={`Delete ${link.title}`} onClick={() => deleteDobLink(link.id)}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      )}

      {openNote && <FullNoteModal open eyebrow="DOB Notes" title={openNote.title || 'DOB Note'} meta={[["Date", niceDate(openNote.date)], ["Category", openNote.category], ["Year", openNote.year || '—'], ["Code", openNote.code || '—'], ["Chapter", openNote.chapter || '—'], ["Screenshot", openNote.screenshot ? 'Attached' : '—']]} sections={[["Full DOB note", openNote.notes]]} images={openNote.screenshot ? [openNote.screenshot] : []} copyText={openNote.notes || ''} onClose={() => setOpenNote(null)} />}
    </>
  );
}

function DobNoteCategorySections({ items, pages, setPages, onOpen, onEdit, onDelete }) {
  const groups = DOB_CATEGORIES
    .map((category) => ({
      category,
      items: items.filter((item) => normalizeDobCategory(item.category) === category),
    }))
    .filter((group) => group.items.length > 0);

  function changePage(category, page) {
    setPages((current) => ({ ...current, [category]: page }));
  }

  if (!items.length) return <section className="dobNotesGroupedSaved"><div className="empty wideEmpty">No saved items yet.</div></section>;

  return (
    <section className="dobNotesGroupedSaved">
      {groups.map((group) => {
        const totalPages = Math.max(1, Math.ceil(group.items.length / DOB_NOTES_PAGE_SIZE));
        const currentPage = Math.min(Math.max(pages[group.category] || 0, 0), totalPages - 1);
        const pageItems = group.items.slice(currentPage * DOB_NOTES_PAGE_SIZE, currentPage * DOB_NOTES_PAGE_SIZE + DOB_NOTES_PAGE_SIZE);

        return (
          <section key={group.category} className="dobCategorySection">
            <div className="dobCategoryHead">
              <div>
                <p className="eyebrow">Saved DOB Notes</p>
                <h3>{group.category}</h3>
              </div>
              <div className="dobCategoryPager">
                <button type="button" aria-label={`Previous ${group.category} notes page`} onClick={() => changePage(group.category, Math.max(0, currentPage - 1))} disabled={currentPage <= 0}>&lt;</button>
                <span>{currentPage + 1} / {totalPages}</span>
                <button type="button" aria-label={`Next ${group.category} notes page`} onClick={() => changePage(group.category, Math.min(totalPages - 1, currentPage + 1))} disabled={currentPage + 1 >= totalPages}>&gt;</button>
              </div>
            </div>
            <section className="libraryGrid dobCategoryCards">
              {pageItems.map((item) => (
                <article key={item.id} className="libraryCard" onClick={() => onOpen(item)}>
                  <p className="eyebrow">{group.category}</p>
                  <h3>{item.title || item.category || 'DOB Note'}</h3>
                  <p className="clampedText">{item.notes}</p>
                  <div className="cardActions" onClick={(event) => event.stopPropagation()}>
                    <button type="button" onClick={() => onOpen(item)}>View full notes</button>
                    {onEdit && <button type="button" className="savedNotesEditButton" onClick={() => onEdit(item)}>Edit</button>}
                    <button type="button" className="danger" onClick={() => onDelete(item.id)}>Delete</button>
                  </div>
                </article>
              ))}
            </section>
          </section>
        );
      })}
    </section>
  );
}

function LinkLibrary() {
  const [linkForm, setLinkForm] = useState({ title: '', url: '', category: 'Code' });
  const [dobLinks, setDobLinks] = useStoredArray(STORAGE_KEYS.dobLinks, LEGACY_KEYS.dobLinks);
  const [editingLinkId, setEditingLinkId] = useState(null);
  const [linkPages, setLinkPages] = useState({});
  const pageSize = 4;

  function resetLinkForm(nextCategory = linkForm.category) {
    setEditingLinkId(null);
    setLinkForm({ title: '', url: '', category: nextCategory || 'Code' });
  }

  function saveLink(event) {
    event.preventDefault();
    const url = normalizeUrl(linkForm.url);
    const title = linkForm.title.trim();
    if (!title || !url) return;
    const category = normalizeLinkCategory(linkForm.category);
    const now = nowTimestamp();

    if (editingLinkId) {
      setDobLinks(dobLinks.map((link) => link.id === editingLinkId ? { ...link, title, url, category, updatedAt: now } : link));
    } else {
      setDobLinks([{ title, url, category, id: uid(), createdAt: now, updatedAt: now }, ...dobLinks]);
    }

    setLinkPages((current) => ({ ...current, [category]: 0 }));
    resetLinkForm(category);
  }

  function startEditLink(link) {
    const category = normalizeLinkCategory(link.category);
    setEditingLinkId(link.id);
    setLinkForm({ title: link.title || '', url: link.url || '', category });
    window.setTimeout(() => {
      document.querySelector('[data-link-form]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  function deleteLink(id) {
    setDobLinks(dobLinks.filter((link) => link.id !== id));
    if (editingLinkId === id) resetLinkForm();
  }

  function changeLinkPage(category, amount, pageCount) {
    setLinkPages((current) => {
      const currentPage = current[category] || 0;
      const nextPage = Math.min(Math.max(currentPage + amount, 0), Math.max(0, pageCount - 1));
      return { ...current, [category]: nextPage };
    });
  }

  return (
    <>
      <PageHeading eyebrow="Quick Access" title="Links">DOB, code, zoning, general, and info links.</PageHeading>

      <form className="cardForm linkLibraryForm" onSubmit={saveLink} data-link-form>
        {editingLinkId && (
          <div className="wide editFormNotice">
            <strong>Editing saved link</strong>
            <button type="button" onClick={() => resetLinkForm()}>Cancel edit</button>
          </div>
        )}
        <label>Button name<input value={linkForm.title} onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })} placeholder="DOB BIS / Zoning Text" /></label>
        <label className="linkUrlField">URL<input value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} placeholder="Paste link" /></label>
        <label>Category<select value={linkForm.category} onChange={(e) => setLinkForm({ ...linkForm, category: e.target.value })}>{LINK_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select></label>
        <button type="submit" className="primary">{editingLinkId ? 'Save Link Changes' : 'Add Link'}</button>
      </form>

      <section className="linkCategoryGrid">
        {LINK_CATEGORIES.map((category) => {
          const links = dobLinks.filter((link) => normalizeLinkCategory(link.category) === category);
          const pageCount = Math.max(1, Math.ceil(links.length / pageSize));
          const currentPage = Math.min(linkPages[category] || 0, pageCount - 1);
          const visibleLinks = links.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

          return (
            <article key={category} className="linkCategoryCard">
              <div className="linkCategoryHead">
                <div>
                  <p className="eyebrow">{category.toUpperCase()}</p>
                  <h3>{category}</h3>
                </div>
                <div className="linkPageControls">
                  <button type="button" onClick={() => changeLinkPage(category, -1, pageCount)} disabled={currentPage <= 0}>Prev</button>
                  <span>{links.length ? currentPage + 1 : 0} / {links.length ? pageCount : 0}</span>
                  <button type="button" onClick={() => changeLinkPage(category, 1, pageCount)} disabled={!links.length || currentPage + 1 >= pageCount}>Next</button>
                </div>
              </div>

              <div className="dobLinkButtons linkCategoryButtons">
                {visibleLinks.length === 0 ? (
                  <div className="empty compact">No links yet.</div>
                ) : visibleLinks.map((link) => {
                  const faviconUrl = getFaviconUrl(link.url);
                  return (
                    <div key={link.id} className="dobLinkChip linkLibraryChip">
                      <a href={link.url} target="_blank" rel="noreferrer" aria-label={`Open ${link.title}`}>
                        <span className="dobLinkLogo">
                          {faviconUrl ? <img src={faviconUrl} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : null}
                          <span>{getLinkInitial(link)}</span>
                        </span>
                        <strong>{link.title}</strong>
                      </a>
                      <div className="dobLinkMeta">
                        <span>{category}</span>
                        <button type="button" onClick={() => startEditLink(link)}>Edit</button>
                        <button type="button" className="linkDeleteButton" aria-label={`Delete ${link.title}`} onClick={() => deleteLink(link.id)}>X</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}

function PromptLibrary({ prompts, setPrompts }) {
  const [form, setForm] = useState({ category: 'Rendering', title: '', prompt: '', favorite: false });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [openPrompt, setOpenPrompt] = useState(null);
  const filtered = prompts.filter((prompt) => matchesQuery(prompt, search) && (category === 'All' || prompt.category === category) && (!favoritesOnly || prompt.favorite));

  function addPrompt(event) {
    event.preventDefault();
    if (!form.title.trim() && !form.prompt.trim()) return;
    const now = nowTimestamp();
    setPrompts([{ ...form, id: uid(), createdAt: now, updatedAt: now }, ...prompts]);
    setForm({ category: form.category, title: '', prompt: '', favorite: false });
  }

  function toggleFavorite(id) {
    setPrompts(prompts.map((prompt) => prompt.id === id ? { ...prompt, favorite: !prompt.favorite, updatedAt: nowTimestamp() } : prompt));
  }

  return (
    <>
      <PageHeading eyebrow="AI Prompt Memory" title="AI Prompt Library">Save long prompts as compact cards. Open any card to read or copy the full prompt.</PageHeading>
      <div className="libraryFilters"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search prompts..." /><select value={category} onChange={(e) => setCategory(e.target.value)}><option>All</option>{PROMPT_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select><label className="checkLine"><input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} /> Favorites only</label></div>
      <form className="cardForm" onSubmit={addPrompt}>
        <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{PROMPT_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select></label>
        <label className="checkLine lowerCheck"><input type="checkbox" checked={form.favorite} onChange={(e) => setForm({ ...form, favorite: e.target.checked })} /> Favorite</label>
        <label className="wide">Prompt title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Prompt title" /></label>
        <label className="wide">Full prompt<textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} placeholder="Paste full AI prompt here..." /></label>
        <button type="submit" className="primary wide">Add Prompt</button>
      </form>
      <section className="libraryGrid">
        {filtered.length === 0 ? <div className="empty wideEmpty">No prompts yet.</div> : filtered.map((prompt) => (
          <article key={prompt.id} className="libraryCard" onClick={() => setOpenPrompt(prompt)}>
            <p className="eyebrow">{prompt.favorite ? '★ ' : ''}{prompt.category || 'Prompt'}</p>
            <h3>{prompt.title || 'Untitled Prompt'}</h3>
            <p className="clampedText">{prompt.prompt}</p>
            <div className="cardActions" onClick={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => setOpenPrompt(prompt)}>View full prompt</button>
              <button type="button" onClick={() => navigator.clipboard?.writeText(prompt.prompt || '')}>Copy</button>
              <button type="button" onClick={() => toggleFavorite(prompt.id)}>{prompt.favorite ? 'Unstar' : 'Star'}</button>
              <button type="button" className="danger" onClick={() => setPrompts(prompts.filter((item) => item.id !== prompt.id))}>Delete</button>
            </div>
          </article>
        ))}
      </section>
      {openPrompt && <FullNoteModal open eyebrow="AI Prompt Library" title={openPrompt.title || 'Untitled Prompt'} meta={[["Category", openPrompt.category], ["Favorite", openPrompt.favorite ? 'Yes' : 'No']]} sections={[["Full prompt", openPrompt.prompt]]} copyText={openPrompt.prompt || ''} onClose={() => setOpenPrompt(null)} />}
    </>
  );
}

function RevitTroubleShoot({ revitLogs, setRevitLogs }) {
  const [form, setForm] = useState({ date: todayISO(), category: 'Modeling', issue: '', problem: '', solution: '' });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [openLog, setOpenLog] = useState(null);
  const filtered = revitLogs.filter((log) => matchesQuery(log, search) && (category === 'All' || log.category === category));

  function addLog(event) {
    event.preventDefault();
    if (!form.issue.trim() && !form.problem.trim() && !form.solution.trim()) return;
    const now = nowTimestamp();
    setRevitLogs([{ ...form, id: uid(), createdAt: now, updatedAt: now }, ...revitLogs]);
    setForm({ date: todayISO(), category: form.category, issue: '', problem: '', solution: '' });
  }

  return (
    <>
      <PageHeading eyebrow="Revit Memory" title="Revit Trouble Shoot">Keep troubleshooting cards compact, then open the full problem and solution.</PageHeading>
      <div className="libraryFilters"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Revit troubleshooting..." /><select value={category} onChange={(e) => setCategory(e.target.value)}><option>All</option>{REVIT_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select></div>
      <section className="savedMemoryHeader">
        <p className="eyebrow">Saved Revit Memory</p>
        <h2>Trouble Shoot Cards</h2>
      </section>
      <section className="libraryGrid">
        {filtered.length === 0 ? <div className="empty wideEmpty">No Revit troubleshooting notes yet.</div> : filtered.map((log) => (
          <article key={log.id} className="libraryCard" onClick={() => setOpenLog(log)}>
            <p className="eyebrow">{log.category || 'Revit'}</p>
            <h3>{log.issue || 'Untitled Issue'}</h3>
            <p className="clampedText">{log.problem || log.solution}</p>
            <div className="cardActions" onClick={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => setOpenLog(log)}>View full notes</button>
              <button type="button" className="danger" onClick={() => setRevitLogs(revitLogs.filter((item) => item.id !== log.id))}>Delete</button>
            </div>
          </article>
        ))}
      </section>
      <form className="cardForm" onSubmit={addLog}>
        <label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{REVIT_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select></label>
        <label className="wide">Issue title<input value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} placeholder="What went wrong?" /></label>
        <label className="wide">Problem description<textarea value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} placeholder="Describe the Revit problem..." /></label>
        <label className="wide">Solution / notes<textarea value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} placeholder="How did you fix it?" /></label>
        <button type="submit" className="primary wide">Add Trouble Shoot</button>
      </form>
      {openLog && <FullNoteModal open eyebrow="Revit Trouble Shoot" title={openLog.issue || 'Untitled Issue'} meta={[["Date", niceDate(openLog.date)], ["Category", openLog.category]]} sections={[["Problem description", openLog.problem], ["Solution / notes", openLog.solution]]} copyText={`${openLog.issue || ''}\n\n${openLog.problem || ''}\n\n${openLog.solution || ''}`} onClose={() => setOpenLog(null)} />}
    </>
  );
}

function NoteCards({ items, kind, onOpen, onDelete, onEdit, getTitle, getBody, className = '' }) {
  return (
    <section className={`libraryGrid ${className}`.trim()}>
      {items.length === 0 ? <div className="empty wideEmpty">No saved items yet.</div> : items.map((item) => (
        <article key={item.id} className="libraryCard" onClick={() => onOpen(item)}>
          <p className="eyebrow">{item.category || kind}{item.screenshot ? ' · Screenshot' : ''}</p>
          <h3>{getTitle(item)}</h3>
          <p className="clampedText">{getBody(item)}</p>
          <div className="cardActions" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => onOpen(item)}>View full notes</button>
            {onEdit && <button type="button" className="savedNotesEditButton" onClick={() => onEdit(item)}>Edit</button>}
            <button type="button" className="danger" onClick={() => onDelete(item.id)}>Delete</button>
          </div>
        </article>
      ))}
    </section>
  );
}

function CalendarPanel({ tasks, dailyLogs, onOpenTask, onOpenDailyLog, activeTab }) {
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [view, setView] = useState('Month');
  const today = new Date();

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

  return (
    <section className="calendarPanel">
      <div className="calendarTop">
        <div>
          <p className="eyebrow">Pinned Monthly Calendar</p>
          <h2>{view === 'Year' ? calendarDate.getFullYear() : view === 'Week' ? 'This Week' : view === 'Today' ? 'Today' : monthLabel(calendarDate)}</h2>
          <p className="calendarHint">Visible in every section. Tasks stretch from start date to due date.</p>
        </div>
        <div className="calendarNavButtons"><button type="button" onClick={() => shiftCalendar(-1)}>←</button><button type="button" onClick={() => shiftCalendar(1)}>→</button></div>
      </div>
      <div className="calendarMode"><button className={view === 'Today' ? 'active' : ''} onClick={() => { setView('Today'); setCalendarDate(new Date()); }}>Today</button><button className={view === 'Week' ? 'active' : ''} onClick={() => setView('Week')}>Week</button><button className={view === 'Month' ? 'active' : ''} onClick={() => setView('Month')}>Month</button><button className={view === 'Year' ? 'active' : ''} onClick={() => setView('Year')}>Year</button></div>
      <div className="calendarLegend"><span><i className="legendDot planned"></i>Planned</span><span><i className="legendDot progress"></i>In progress</span><span><i className="legendDot urgent"></i>Urgent</span></div>

      {view === 'Today' && <TodayCalendarView date={calendarDate} tasks={tasks} dailyLogs={dailyLogs} onOpenTask={onOpenTask} onOpenDailyLog={onOpenDailyLog} />}
      {view === 'Week' && <WeekCalendarView date={calendarDate} tasks={tasks} dailyLogs={dailyLogs} onOpenTask={onOpenTask} onOpenDailyLog={onOpenDailyLog} />}
      {view === 'Month' && <MonthCalendarView currentDate={today} calendarDate={calendarDate} tasks={tasks} dailyLogs={dailyLogs} onOpenTask={onOpenTask} onOpenDailyLog={onOpenDailyLog} />}
      {view === 'Year' && <YearCalendarView currentDate={today} calendarDate={calendarDate} tasks={tasks} dailyLogs={dailyLogs} />}
    </section>
  );
}

function MonthCalendarView({ currentDate, calendarDate, tasks, dailyLogs, onOpenTask, onOpenDailyLog }) {
  const weeks = useMemo(() => getMonthWeeks(calendarDate), [calendarDate]);
  const todayKey = formatDate(currentDate);

  return (
    <div className="monthCalendarWrap">
      <div className="monthCalendarHead">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => <div key={day} className="weekday">{day}</div>)}
      </div>

      <div className="monthCalendarRows">
        {weeks.map((week, weekIndex) => {
          const weekTasks = sortFocusTasks(tasks.filter((task) => getTaskSegmentsForWeek(task, week))).slice(0, 4);
          const taskRows = weekTasks.length;
          const cellPaddingTop = 34 + taskRows * 20;

          return (
            <div key={`week-${weekIndex}`} className="monthWeekRow">
              <div className="monthWeekCells">
                {week.map((day) => {
                  const key = formatDate(day);
                  const dayLogs = dailyLogs.filter((log) => log.date === key).slice(0, 2);
                  const logCount = dailyLogs.filter((log) => log.date === key).length;
                  return (
                    <div
                      key={key}
                      className={`monthCell ${!sameMonth(day, calendarDate) ? 'muted' : ''} ${key === todayKey ? 'today' : ''}`}
                      style={{ paddingTop: `${cellPaddingTop}px` }}
                    >
                      <strong>{day.getDate()}</strong>
                      <div className="monthItems">
                        {dayLogs.map((log) => (
                          <button key={log.id} type="button" className="calendarLogBar" title={log.summary || log.project || 'Daily Log'} onClick={() => onOpenDailyLog(log)}>
                            {log.summary || log.project || 'Daily Log'}
                          </button>
                        ))}
                        {logCount > dayLogs.length && <span className="logMarker">+{logCount - dayLogs.length} more log{logCount - dayLogs.length > 1 ? 's' : ''}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {weekTasks.length > 0 && (
                <div className="monthTaskOverlay" style={{ gridTemplateRows: `repeat(${weekTasks.length}, 18px)` }}>
                  {weekTasks.map((task, rowIndex) => {
                    const segment = getTaskSegmentsForWeek(task, week);
                    if (!segment) return null;
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

function TodayCalendarView({ date, tasks, dailyLogs, onOpenTask, onOpenDailyLog }) {
  const key = formatDate(date);
  const todayTasks = sortFocusTasks(tasks.filter((task) => task.status !== 'Done' && getTaskDateKeys(task).includes(key)));
  const todayLogs = dailyLogs.filter((log) => log.date === key);
  return (
    <div className="focusWrap">
      <div className="focusDate"><h3>{date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h3><p>{todayTasks.length} active task{todayTasks.length === 1 ? '' : 's'} today.</p></div>
      <FocusTaskBoard tasks={todayTasks} onOpenTask={onOpenTask} emptyText="No active tasks today." />
      {todayLogs.length > 0 && (
        <div className="dailyMarkers">
          <p className="miniSectionTitle">Daily logs</p>
          {todayLogs.map((log) => (
            <button key={log.id} type="button" className="miniLog calendarLogCard" onClick={() => onOpenDailyLog(log)}>
              <strong>{log.project || 'Daily Log'}</strong>
              <span>{log.summary || 'No summary'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WeekCalendarView({ date, tasks, dailyLogs, onOpenTask, onOpenDailyLog }) {
  const weekDays = useMemo(() => getWeekDays(date), [date]);
  const weekTasks = sortFocusTasks(tasks.filter((task) => task.status !== 'Done' && getTaskSegmentsForWeek(task, weekDays)));
  const weekBarTasks = weekTasks.slice(0, 4);
  const dayPaddingTop = 52 + (weekBarTasks.length * 24);

  return (
    <div className="weekCalendar">
      <div className="weekTimeline">
        <div className="weekDays weekDayCells">
          {weekDays.map((day) => {
            const key = formatDate(day);
            const dayLogs = dailyLogs.filter((log) => log.date === key).slice(0, 3);
            return (
              <div key={key} className="weekDay" style={{ paddingTop: `${dayPaddingTop}px` }}>
                <div className="weekDayTop">
                  <strong>{day.toLocaleDateString(undefined, { weekday: 'short' })}</strong>
                  <span>{day.getDate()}</span>
                </div>
                {dayLogs.map((log) => <button key={log.id} type="button" className="calendarLogBar" onClick={() => onOpenDailyLog(log)}>{log.summary || log.project || 'Daily Log'}</button>)}
              </div>
            );
          })}
        </div>

        {weekBarTasks.length > 0 && (
          <div className="weekTaskOverlay" style={{ gridTemplateRows: `repeat(${weekBarTasks.length}, 20px)` }}>
            {weekBarTasks.map((task, rowIndex) => {
              const segment = getTaskSegmentsForWeek(task, weekDays);
              if (!segment) return null;
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
  const grouped = FOCUS_COLUMNS.reduce((acc, column) => ({ ...acc, [column]: tasks.filter((task) => getFocusColumn(task) === column) }), {});
  return (
    <div className="focusColumns">
      {FOCUS_COLUMNS.map((column) => (
        <section key={column} className="focusColumn">
          <h4>{column}</h4>
          {grouped[column].length === 0 ? <p className="focusEmpty">Clear</p> : grouped[column].map((task) => (
            <button key={task.id} type="button" className={`focusTask ${getTaskTone(task)}`} onClick={() => onOpenTask(task)}>
              <span className="focusTaskTitle">{task.title}</span>
              <span>{task.project || 'No project'}</span>
              <small>{getTaskDateLabel(task)}</small>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

function YearCalendarView({ currentDate, calendarDate, tasks, dailyLogs }) {
  const year = calendarDate.getFullYear();
  const todayKey = formatDate(currentDate);
  return (
    <div className="yearGrid">
      {Array.from({ length: 12 }, (_, monthIndex) => {
        const monthDate = new Date(year, monthIndex, 1);
        const weeks = getMonthWeeks(monthDate).slice(0, 6);
        return (
          <section key={monthIndex} className="miniMonth">
            <h4>{monthDate.toLocaleDateString(undefined, { month: 'short' })}</h4>
            <div className="miniMonthGrid">
              {weeks.flat().map((day) => {
                const key = formatDate(day);
                const hasTask = getTasksForDate(tasks, key).length > 0;
                const hasLog = dailyLogs.some((log) => log.date === key);
                return <span key={key} className={`${!sameMonth(day, monthDate) ? 'muted' : ''} ${key === todayKey ? 'today' : ''} ${hasTask ? 'hasTask' : ''} ${hasLog ? 'hasLog' : ''}`}>{day.getDate()}</span>;
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
