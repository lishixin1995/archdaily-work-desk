import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const STORAGE_KEY = "arch-daily-work-desk-v1";
const STATUS_COLUMNS = ["Not Started", "In Progress", "Waiting", "Done"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const FOCUS_COLUMNS = ["Urgent", "High", "In Progress", "Waiting", "Planned"];
const TABS = ["Dashboard", "Daily Task Log", "DOB Notes", "AI Prompt Library", "Revit Trouble Shoot"];

const defaultData = {
  dailyLogs: [],
  tasks: [],
  codeNotes: [],
  revitLogs: [],
  prompts: []
};

function uid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseJson(raw, fallback) {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function readArrayKey(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  const parsed = parseJson(raw, []);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.items)) return parsed.items;
  if (Array.isArray(parsed.data)) return parsed.data;
  return [];
}

function normalizeTask(task = {}) {
  return {
    id: task.id || uid(),
    title: task.title || task.taskTitle || task.name || "Untitled Task",
    project: task.project || "",
    startDate: task.startDate || task.date || task.dueDate || "",
    dueDate: task.dueDate || task.date || task.startDate || "",
    status: STATUS_COLUMNS.includes(task.status) ? task.status : "Not Started",
    priority: PRIORITIES.includes(task.priority) ? task.priority : "Medium",
    notes: task.notes || task.details || task.content || task.description || "",
    createdAt: task.createdAt || new Date().toISOString()
  };
}

function normalizeDailyLog(log = {}) {
  return {
    id: log.id || uid(),
    date: log.date || formatDate(new Date()),
    project: log.project || "",
    summary: log.summary || log.title || "Daily Log",
    notes: log.notes || log.content || log.text || log.body || "",
    createdAt: log.createdAt || new Date().toISOString()
  };
}

function normalizeCodeNote(note = {}) {
  return {
    id: note.id || uid(),
    title: note.title || note.subject || note.code || "DOB Note",
    category: note.category || note.type || "General",
    code: note.code || note.section || "",
    notes: note.notes || note.content || note.details || note.text || "",
    createdAt: note.createdAt || new Date().toISOString()
  };
}

function normalizePrompt(prompt = {}) {
  return {
    id: prompt.id || uid(),
    title: prompt.title || prompt.promptTitle || prompt.name || "AI Prompt",
    category: prompt.category || prompt.type || "General",
    prompt: prompt.prompt || prompt.content || prompt.notes || prompt.text || "",
    favorite: Boolean(prompt.favorite || prompt.isFavorite),
    createdAt: prompt.createdAt || new Date().toISOString()
  };
}

function normalizeRevit(log = {}) {
  return {
    id: log.id || uid(),
    issue: log.issue || log.title || log.name || "Revit Issue",
    project: log.project || "",
    category: log.category || log.type || "General",
    problem: log.problem || log.description || log.notes || "",
    solution: log.solution || log.content || log.details || "",
    status: log.status || "Open",
    createdAt: log.createdAt || new Date().toISOString()
  };
}

function mergeUnique(base, incoming) {
  const seen = new Set(base.map((item) => item.id));
  const merged = [...base];
  incoming.forEach((item) => {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  });
  return merged;
}

function migrateSplitStorage(data) {
  const migrated = { ...data };
  migrated.tasks = mergeUnique(migrated.tasks, [
    ...readArrayKey("archDailyWorkDesk.tasks.v2"),
    ...readArrayKey("archDailyWorkDesk.tasks"),
    ...readArrayKey("tasks"),
    ...readArrayKey("dashboardTasks")
  ].map(normalizeTask));
  migrated.dailyLogs = mergeUnique(migrated.dailyLogs, [
    ...readArrayKey("archDailyWorkDesk.dailyTaskLog.v2"),
    ...readArrayKey("archDailyWorkDesk.dailyTaskLog"),
    ...readArrayKey("dailyTaskLog")
  ].map(normalizeDailyLog));
  migrated.codeNotes = mergeUnique(migrated.codeNotes, [
    ...readArrayKey("archDailyWorkDesk.dobNotes.v2"),
    ...readArrayKey("archDailyWorkDesk.dobNotes"),
    ...readArrayKey("dobNotes"),
    ...readArrayKey("quickNotes")
  ].map(normalizeCodeNote));
  migrated.prompts = mergeUnique(migrated.prompts, [
    ...readArrayKey("archDailyWorkDesk.aiPromptLibrary.v2"),
    ...readArrayKey("archDailyWorkDesk.aiPromptLibrary"),
    ...readArrayKey("aiPromptLibrary"),
    ...readArrayKey("promptLog")
  ].map(normalizePrompt));
  migrated.revitLogs = mergeUnique(migrated.revitLogs, [
    ...readArrayKey("archDailyWorkDesk.revitTroubleShoot.v2"),
    ...readArrayKey("archDailyWorkDesk.revitTroubleShoot"),
    ...readArrayKey("revitTroubleShoot")
  ].map(normalizeRevit));
  return migrated;
}

function loadData() {
  const saved = parseJson(localStorage.getItem(STORAGE_KEY), null);
  const data = saved && typeof saved === "object" ? { ...defaultData, ...saved } : { ...defaultData };
  const normalized = {
    dailyLogs: Array.isArray(data.dailyLogs) ? data.dailyLogs.map(normalizeDailyLog) : [],
    tasks: Array.isArray(data.tasks) ? data.tasks.map(normalizeTask) : [],
    codeNotes: Array.isArray(data.codeNotes) ? data.codeNotes.map(normalizeCodeNote) : [],
    revitLogs: Array.isArray(data.revitLogs) ? data.revitLogs.map(normalizeRevit) : [],
    prompts: Array.isArray(data.prompts) ? data.prompts.map(normalizePrompt) : []
  };
  return migrateSplitStorage(normalized);
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayKey() {
  return formatDate(new Date());
}

function parseLocalDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = String(dateString).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function monthLabel(date) {
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function shortDate(value) {
  if (!value) return "—";
  const date = parseLocalDate(value);
  if (!date) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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
  return task.dueDate || task.startDate || "No date";
}

function getTaskTone(task) {
  if (task.status === "Done") return "done";
  if (task.priority === "Urgent") return "urgent";
  if (task.priority === "High") return "high";
  if (task.status === "In Progress") return "progress";
  if (task.status === "Waiting") return "waiting";
  return "planned";
}

function getTaskProjectAccent(task) {
  const source = task.project || task.title || "";
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) hash = source.charCodeAt(i) + ((hash << 5) - hash);
  return `projectAccent${Math.abs(hash) % 6}`;
}

function getTaskUrgencyRank(task) {
  if (task.status === "Done") return 99;
  if (task.priority === "Urgent") return 0;
  if (task.priority === "High") return 1;
  if (task.status === "In Progress") return 2;
  if (task.status === "Waiting") return 3;
  if (task.priority === "Medium") return 4;
  return 5;
}

function sortFocusTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const rank = getTaskUrgencyRank(a) - getTaskUrgencyRank(b);
    if (rank !== 0) return rank;
    const aDue = a.dueDate || a.startDate || "9999-12-31";
    const bDue = b.dueDate || b.startDate || "9999-12-31";
    const dateCompare = aDue.localeCompare(bDue);
    if (dateCompare !== 0) return dateCompare;
    return (a.title || "").localeCompare(b.title || "");
  });
}

function getFocusColumn(task) {
  if (task.priority === "Urgent") return "Urgent";
  if (task.priority === "High") return "High";
  if (task.status === "In Progress") return "In Progress";
  if (task.status === "Waiting") return "Waiting";
  return "Planned";
}

function getMonthWeeks(currentDate) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function getWeekDays(date) {
  const start = addDays(date, -date.getDay());
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function matchesSearch(text, query) {
  if (!query.trim()) return true;
  return String(text || "").toLowerCase().includes(query.trim().toLowerCase());
}

function App() {
  const [data, setDataState] = useState(loadData);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("Month");

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  function setData(next) {
    const value = typeof next === "function" ? next(data) : next;
    setDataState(value);
    saveData(value);
  }

  return (
    <div className="pageShell">
      <header className="topBar">
        <div className="brandMark">A</div>
        <div className="brandText">
          <strong>ARCH DAILY WORK DESK</strong>
          <span>notes · tasks · code memory</span>
        </div>
        <nav className="tabNav" aria-label="Main sections">
          {TABS.map((tab) => (
            <button key={tab} type="button" className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </nav>
      </header>

      <main className="mainShell">
        {activeTab === "Dashboard" ? (
          <div className="dashboardGrid">
            <TaskDashboard data={data} setData={setData} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            <CalendarPanel
              currentDate={currentDate}
              calendarDate={calendarDate}
              setCalendarDate={setCalendarDate}
              calendarView={calendarView}
              setCalendarView={setCalendarView}
              tasks={data.tasks}
              dailyLogs={data.dailyLogs}
            />
          </div>
        ) : (
          <section className="sectionPage">
            <PageTitle tab={activeTab} />
            {activeTab === "Daily Task Log" && <DailyTaskLog data={data} setData={setData} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />}
            {activeTab === "DOB Notes" && <DOBNotes data={data} setData={setData} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />}
            {activeTab === "AI Prompt Library" && <PromptLibrary data={data} setData={setData} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />}
            {activeTab === "Revit Trouble Shoot" && <RevitTroubleShoot data={data} setData={setData} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />}
          </section>
        )}
      </main>
    </div>
  );
}

function PageTitle({ tab }) {
  const descriptions = {
    "Daily Task Log": "Record what happened today, then open any card to read the full notes.",
    "DOB Notes": "Keep code, zoning, DOB, and quick reference notes searchable and readable.",
    "AI Prompt Library": "Save project prompts and open the full prompt whenever you need it.",
    "Revit Trouble Shoot": "Track Revit problems, causes, and solutions for future use."
  };
  return (
    <div className="pageTitle">
      <p className="eyebrow">ARCH DAILY WORK DESK</p>
      <h1>{tab}</h1>
      <p>{descriptions[tab]}</p>
    </div>
  );
}

function SectionSearch({ value, onChange, placeholder = "Search notes..." }) {
  return (
    <div className="searchBar">
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function EmptyState({ children }) {
  return <div className="empty">{children}</div>;
}

function FullDetailModal({ eyebrow = "Full Notes", title, subtitle, meta = [], sections = [], copyText, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function copyFullText() {
    try {
      await navigator.clipboard.writeText(copyText || sections.map((section) => `${section.title}\n${section.body}`).join("\n\n"));
    } catch {
      // Clipboard may be unavailable in preview mode.
    }
  }

  return (
    <div className="modalOverlay" onClick={onClose}>
      <article className="detailModal" onClick={(event) => event.stopPropagation()}>
        <div className="modalTop">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title || "Full notes"}</h2>
            {subtitle && <p className="modalDate">{subtitle}</p>}
          </div>
          <button type="button" className="modalClose" onClick={onClose}>×</button>
        </div>
        {meta.length > 0 && (
          <div className="detailGrid">
            {meta.map(([label, value]) => value ? (
              <div key={label} className="detailStat">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ) : null)}
          </div>
        )}
        <div className="modalBody">
          {sections.map((section) => (
            <section className="modalSection" key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.body || "No notes yet."}</p>
            </section>
          ))}
        </div>
        <div className="modalActions">
          <button type="button" onClick={copyFullText}>Copy full text</button>
          <button type="button" className="primary" onClick={onClose}>Done</button>
        </div>
      </article>
    </div>
  );
}

function TaskDashboard({ data, setData, searchQuery, setSearchQuery }) {
  const [form, setForm] = useState({
    title: "",
    project: "",
    startDate: todayKey(),
    dueDate: todayKey(),
    status: "Not Started",
    priority: "Medium",
    notes: ""
  });
  const [projectFilter, setProjectFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [hideDone, setHideDone] = useState(false);
  const [openTask, setOpenTask] = useState(null);

  const projects = useMemo(() => {
    const values = data.tasks.map((task) => task.project).filter(Boolean);
    return ["All", ...Array.from(new Set(values)).sort()];
  }, [data.tasks]);

  const filteredTasks = useMemo(() => {
    return data.tasks.filter((task) => {
      if (projectFilter !== "All" && task.project !== projectFilter) return false;
      if (priorityFilter !== "All" && task.priority !== priorityFilter) return false;
      if (hideDone && task.status === "Done") return false;
      return matchesSearch(`${task.title} ${task.project} ${task.notes}`, searchQuery);
    });
  }, [data.tasks, projectFilter, priorityFilter, hideDone, searchQuery]);

  function addTask(event) {
    event.preventDefault();
    if (!form.title.trim()) return;
    const nextTask = normalizeTask({ ...form, id: uid(), createdAt: new Date().toISOString() });
    setData({ ...data, tasks: [nextTask, ...data.tasks] });
    setForm({ title: "", project: form.project, startDate: todayKey(), dueDate: todayKey(), status: "Not Started", priority: "Medium", notes: "" });
  }

  function updateTask(id, patch) {
    setData({ ...data, tasks: data.tasks.map((task) => task.id === id ? { ...task, ...patch } : task) });
  }

  function deleteTask(id) {
    setData({ ...data, tasks: data.tasks.filter((task) => task.id !== id) });
  }

  return (
    <section className="dashboardMain">
      <div className="pageTitle compactTitle">
        <p className="eyebrow">ARCH DAILY WORK DESK</p>
        <h1>Task Dashboard</h1>
        <p>Compact cards stay clean. Open any card to read the full notes/details.</p>
      </div>

      <form className="panel taskForm" onSubmit={addTask}>
        <label>
          Task title
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Fix revit model and facade skeleton set" />
        </label>
        <label>
          Project
          <input value={form.project} onChange={(event) => setForm({ ...form, project: event.target.value })} placeholder="2421 - 1587 3rd Ave" />
        </label>
        <label>
          Start date
          <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
        </label>
        <label>
          Due date
          <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
        </label>
        <label>
          Priority
          <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
            {PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
          </select>
        </label>
        <label>
          Status
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            {STATUS_COLUMNS.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label className="wide">
          Task notes / details
          <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="What needs attention? What should I remember when I open this task?" />
        </label>
        <button type="submit" className="primary wide">Add Task</button>
      </form>

      <div className="panel filterPanel">
        <label>
          Project filter
          <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
            {projects.map((project) => <option key={project}>{project}</option>)}
          </select>
        </label>
        <label>
          Priority filter
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
            <option>All</option>
            {PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
          </select>
        </label>
        <label className="checkboxLabel">
          <input type="checkbox" checked={hideDone} onChange={(event) => setHideDone(event.target.checked)} />
          Hide Done
        </label>
        <SectionSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search dashboard tasks..." />
      </div>

      <div className="kanbanBoard">
        {STATUS_COLUMNS.map((column) => {
          const columnTasks = filteredTasks.filter((task) => task.status === column);
          return (
            <section className="kanbanColumn" key={column}>
              <h3>{column}</h3>
              {columnTasks.length === 0 ? (
                <EmptyState>No tasks here yet.</EmptyState>
              ) : (
                columnTasks.map((task) => (
                  <article key={task.id} className={`taskCard ${getTaskTone(task)}`} onClick={() => setOpenTask(task)}>
                    <span className="pill">{task.priority}</span>
                    <span className="dateChip">{getTaskDateLabel(task)}</span>
                    <h4>{task.title}</h4>
                    {task.project && <p className="mutedText">{task.project}</p>}
                    {task.notes && <p className="clampedText">{task.notes}</p>}
                    <button type="button" className="viewButton" onClick={(event) => { event.stopPropagation(); setOpenTask(task); }}>View full notes</button>
                    <select value={task.status} onClick={(event) => event.stopPropagation()} onChange={(event) => updateTask(task.id, { status: event.target.value })}>
                      {STATUS_COLUMNS.map((status) => <option key={status}>{status}</option>)}
                    </select>
                    <button type="button" className="ghostButton" onClick={(event) => { event.stopPropagation(); deleteTask(task.id); }}>Delete</button>
                  </article>
                ))
              )}
            </section>
          );
        })}
      </div>

      {openTask && (
        <FullDetailModal
          eyebrow="Task Detail"
          title={openTask.title}
          subtitle={`${openTask.project || "No project"} · ${getTaskDateLabel(openTask)}`}
          meta={[["Priority", openTask.priority], ["Status", openTask.status], ["Start", openTask.startDate || "—"], ["Due", openTask.dueDate || "—"]]}
          sections={[{ title: "Task notes / details", body: openTask.notes || "No notes yet." }]}
          onClose={() => setOpenTask(null)}
        />
      )}
    </section>
  );
}

function CalendarPanel({ currentDate, calendarDate, setCalendarDate, calendarView, setCalendarView, tasks, dailyLogs }) {
  function shift(amount) {
    if (calendarView === "Week") setCalendarDate(addDays(calendarDate, amount * 7));
    else if (calendarView === "Year") setCalendarDate(new Date(calendarDate.getFullYear() + amount, calendarDate.getMonth(), 1));
    else setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + amount, 1));
  }

  return (
    <aside className="calendarPanel">
      <div className="calendarTop">
        <div>
          <p className="eyebrow">Pinned Monthly Calendar</p>
          <h2>{calendarView === "Year" ? calendarDate.getFullYear() : calendarView === "Week" ? "This Week" : calendarView === "Today" ? "Today" : monthLabel(calendarDate)}</h2>
          <p className="calendarHint">Tasks stretch from start date to due date.</p>
          <div className="calendarLegend">
            <span><i className="legendDot planned"></i>Planned</span>
            <span><i className="legendDot progress"></i>In progress</span>
            <span><i className="legendDot urgent"></i>Urgent</span>
          </div>
        </div>
        <div className="calendarArrows">
          <button type="button" onClick={() => shift(-1)}>←</button>
          <button type="button" onClick={() => shift(1)}>→</button>
        </div>
      </div>
      <div className="viewToggle">
        {["Today", "Week", "Month", "Year"].map((view) => (
          <button key={view} type="button" className={calendarView === view ? "active" : ""} onClick={() => setCalendarView(view)}>{view}</button>
        ))}
      </div>
      {calendarView === "Today" && <TodayCalendarView currentDate={currentDate} tasks={tasks} dailyLogs={dailyLogs} />}
      {calendarView === "Week" && <WeekCalendarView currentDate={currentDate} calendarDate={calendarDate} tasks={tasks} dailyLogs={dailyLogs} />}
      {calendarView === "Month" && <MonthCalendarView currentDate={currentDate} calendarDate={calendarDate} tasks={tasks} dailyLogs={dailyLogs} />}
      {calendarView === "Year" && <YearCalendarView currentDate={currentDate} calendarDate={calendarDate} tasks={tasks} dailyLogs={dailyLogs} />}
    </aside>
  );
}

function MonthCalendarView({ currentDate, calendarDate, tasks, dailyLogs }) {
  const weeks = useMemo(() => getMonthWeeks(calendarDate), [calendarDate]);
  const today = formatDate(currentDate);
  const month = calendarDate.getMonth();
  return (
    <div className="monthGrid">
      {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => <strong key={day} className="dayName">{day}</strong>)}
      {weeks.map((date) => {
        const key = formatDate(date);
        const dayTasks = tasks.filter((task) => getTaskDateKeys(task).includes(key)).slice(0, 3);
        const hasLog = dailyLogs.some((log) => log.date === key);
        return (
          <div key={key} className={`monthCell ${date.getMonth() !== month ? "other" : ""} ${key === today ? "today" : ""}`}>
            <span>{date.getDate()}</span>
            {dayTasks.map((task) => <div key={task.id} className={`calendarBar ${getTaskTone(task)}`}>{task.title}</div>)}
            {hasLog && <i className="logDot" title="Daily log" />}
          </div>
        );
      })}
    </div>
  );
}

function TodayCalendarView({ currentDate, tasks, dailyLogs }) {
  const today = formatDate(currentDate);
  const todayTasks = sortFocusTasks(tasks.filter((task) => task.status !== "Done" && getTaskDateKeys(task).includes(today)));
  const todayLogs = dailyLogs.filter((log) => log.date === today);
  return (
    <section className="todayPanel">
      <p className="eyebrow">Today</p>
      <h3>{currentDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h3>
      <FocusTaskBoard title="Today Focus" tasks={todayTasks} emptyText="No active tasks today." />
      {todayLogs.length > 0 && (
        <div className="miniList">
          <p className="miniSectionTitle">Daily logs</p>
          {todayLogs.map((log) => <article className="miniLog" key={log.id}><strong>{log.project || "Daily Log"}</strong><span>{log.summary}</span></article>)}
        </div>
      )}
    </section>
  );
}

function WeekCalendarView({ currentDate, calendarDate, tasks, dailyLogs }) {
  const days = useMemo(() => getWeekDays(calendarDate), [calendarDate]);
  const today = formatDate(currentDate);
  const weekKeys = days.map(formatDate);
  const weekTasks = sortFocusTasks(tasks.filter((task) => task.status !== "Done" && getTaskDateKeys(task).some((key) => weekKeys.includes(key))));
  return (
    <section className="weekPanel">
      <div className="weekGrid">
        {days.map((day) => {
          const key = formatDate(day);
          const dayTasks = tasks.filter((task) => getTaskDateKeys(task).includes(key)).slice(0, 4);
          const logs = dailyLogs.filter((log) => log.date === key);
          return (
            <div className={`weekCell ${key === today ? "today" : ""}`} key={key}>
              <strong>{day.toLocaleDateString(undefined, { weekday: "short" })}</strong>
              <span>{day.getMonth() + 1}/{day.getDate()}</span>
              {dayTasks.map((task) => <div key={task.id} className={`calendarBar ${getTaskTone(task)}`}>{task.title}</div>)}
              {logs.length > 0 && <small>{logs.length} log</small>}
            </div>
          );
        })}
      </div>
      <FocusTaskBoard title="This Week Focus" tasks={weekTasks} emptyText="No active tasks scheduled for this week." />
    </section>
  );
}

function YearCalendarView({ currentDate, calendarDate, tasks, dailyLogs }) {
  const year = calendarDate.getFullYear();
  const today = formatDate(currentDate);
  return (
    <div className="yearGrid">
      {Array.from({ length: 12 }, (_, month) => new Date(year, month, 1)).map((date) => (
        <section key={date.getMonth()} className="miniMonth">
          <h4>{date.toLocaleDateString(undefined, { month: "short" })}</h4>
          <div className="miniMonthGrid">
            {getMonthWeeks(date).slice(0, 35).map((day) => {
              const key = formatDate(day);
              const busy = tasks.some((task) => getTaskDateKeys(task).includes(key));
              const log = dailyLogs.some((item) => item.date === key);
              return <span key={key} className={`${day.getMonth() !== date.getMonth() ? "other" : ""} ${key === today ? "today" : ""} ${busy ? "busy" : ""} ${log ? "hasLog" : ""}`}>{day.getDate()}</span>;
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function FocusTaskBoard({ title, tasks, emptyText }) {
  const [openTask, setOpenTask] = useState(null);
  const grouped = FOCUS_COLUMNS.reduce((acc, column) => {
    acc[column] = tasks.filter((task) => getFocusColumn(task) === column);
    return acc;
  }, {});

  return (
    <section className="focusPanel">
      <div className="focusHead">
        <div>
          <p className="eyebrow">Focus Board</p>
          <h3>{title}</h3>
        </div>
        <span className="focusCount">{tasks.length} task{tasks.length === 1 ? "" : "s"}</span>
      </div>
      {tasks.length === 0 ? <EmptyState>{emptyText}</EmptyState> : (
        <div className="focusColumns">
          {FOCUS_COLUMNS.map((column) => (
            <section key={column} className="focusColumn">
              <h4>{column}</h4>
              {grouped[column].length === 0 ? <p className="focusEmpty">Clear</p> : grouped[column].map((task) => (
                <button key={task.id} type="button" className={`focusTask ${getTaskTone(task)}`} onClick={() => setOpenTask(task)}>
                  <span>{task.title}</span>
                  <small>{task.project || "No project"}</small>
                  <small>{getTaskDateLabel(task)}</small>
                </button>
              ))}
            </section>
          ))}
        </div>
      )}
      {openTask && (
        <FullDetailModal
          eyebrow="Task Detail"
          title={openTask.title}
          subtitle={`${openTask.project || "No project"} · ${getTaskDateLabel(openTask)}`}
          meta={[["Priority", openTask.priority], ["Status", openTask.status], ["Start", openTask.startDate || "—"], ["Due", openTask.dueDate || "—"]]}
          sections={[{ title: "Task notes / details", body: openTask.notes || "No notes yet." }]}
          onClose={() => setOpenTask(null)}
        />
      )}
    </section>
  );
}

function DailyTaskLog({ data, setData, searchQuery, setSearchQuery }) {
  const [form, setForm] = useState({ date: todayKey(), project: "", summary: "", notes: "" });
  const [openLog, setOpenLog] = useState(null);
  const logs = data.dailyLogs.filter((log) => matchesSearch(`${log.date} ${log.project} ${log.summary} ${log.notes}`, searchQuery));

  function addLog(event) {
    event.preventDefault();
    const nextLog = normalizeDailyLog({ ...form, id: uid(), createdAt: new Date().toISOString() });
    setData({ ...data, dailyLogs: [nextLog, ...data.dailyLogs] });
    setForm({ date: todayKey(), project: form.project, summary: "", notes: "" });
  }

  function deleteLog(id) {
    setData({ ...data, dailyLogs: data.dailyLogs.filter((log) => log.id !== id) });
  }

  return (
    <>
      <SectionSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search daily logs..." />
      <form className="panel libraryForm" onSubmit={addLog}>
        <label>Date<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
        <label>Project<input value={form.project} onChange={(event) => setForm({ ...form, project: event.target.value })} placeholder="Project name" /></label>
        <label className="wide">Quick summary<input value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="What happened today?" /></label>
        <label className="wide">Full notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Write detailed daily notes here..." /></label>
        <button type="submit" className="primary wide">Add Daily Log</button>
      </form>
      <div className="cardGrid">
        {logs.length === 0 ? <EmptyState>No daily logs yet.</EmptyState> : logs.map((log) => (
          <article key={log.id} className="libraryCard" onClick={() => setOpenLog(log)}>
            <span className="dateChip">{shortDate(log.date)}</span>
            <h3>{log.summary || "Daily Log"}</h3>
            {log.project && <p className="mutedText">{log.project}</p>}
            <p className="clampedText">{log.notes || "No full notes yet."}</p>
            <button type="button" className="viewButton" onClick={(event) => { event.stopPropagation(); setOpenLog(log); }}>View full notes</button>
            <button type="button" className="ghostButton" onClick={(event) => { event.stopPropagation(); deleteLog(log.id); }}>Delete</button>
          </article>
        ))}
      </div>
      {openLog && <FullDetailModal eyebrow="Daily Task Log" title={openLog.summary || "Daily Log"} subtitle={`${shortDate(openLog.date)} · ${openLog.project || "No project"}`} sections={[{ title: "Full daily notes", body: openLog.notes || "No notes yet." }]} onClose={() => setOpenLog(null)} />}
    </>
  );
}

function DOBNotes({ data, setData, searchQuery, setSearchQuery }) {
  const [form, setForm] = useState({ title: "", category: "General", code: "", notes: "" });
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [openNote, setOpenNote] = useState(null);
  const categories = ["All", ...Array.from(new Set(data.codeNotes.map((note) => note.category).filter(Boolean))).sort()];
  const notes = data.codeNotes.filter((note) => (categoryFilter === "All" || note.category === categoryFilter) && matchesSearch(`${note.title} ${note.category} ${note.code} ${note.notes}`, searchQuery));

  function addNote(event) {
    event.preventDefault();
    if (!form.title.trim() && !form.notes.trim()) return;
    const nextNote = normalizeCodeNote({ ...form, id: uid(), createdAt: new Date().toISOString() });
    setData({ ...data, codeNotes: [nextNote, ...data.codeNotes] });
    setForm({ title: "", category: form.category, code: "", notes: "" });
  }

  function deleteNote(id) {
    setData({ ...data, codeNotes: data.codeNotes.filter((note) => note.id !== id) });
  }

  return (
    <>
      <SectionSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search DOB notes..." />
      <form className="panel libraryForm" onSubmit={addNote}>
        <label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Wheelchair seating / zoning note" /></label>
        <label>Category<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="DOB / Zoning / Code" /></label>
        <label className="wide">Code / section<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="BC 1108.2.2.1" /></label>
        <label className="wide">Full notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Paste the full DOB/code note here..." /></label>
        <button type="submit" className="primary wide">Save DOB Note</button>
      </form>
      <div className="panel filterPanel singleLine">
        <label>Category filter<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>{categories.map((cat) => <option key={cat}>{cat}</option>)}</select></label>
      </div>
      <div className="cardGrid">
        {notes.length === 0 ? <EmptyState>No DOB notes yet.</EmptyState> : notes.map((note) => (
          <article key={note.id} className="libraryCard" onClick={() => setOpenNote(note)}>
            <span className="pill">{note.category}</span>
            <h3>{note.title}</h3>
            {note.code && <p className="mutedText">{note.code}</p>}
            <p className="clampedText">{note.notes || "No notes yet."}</p>
            <button type="button" className="viewButton" onClick={(event) => { event.stopPropagation(); setOpenNote(note); }}>View full notes</button>
            <button type="button" className="ghostButton" onClick={(event) => { event.stopPropagation(); deleteNote(note.id); }}>Delete</button>
          </article>
        ))}
      </div>
      {openNote && <FullDetailModal eyebrow="DOB Notes" title={openNote.title} subtitle={openNote.category} meta={[["Code / Section", openNote.code]]} sections={[{ title: "Full DOB notes", body: openNote.notes || "No notes yet." }]} onClose={() => setOpenNote(null)} />}
    </>
  );
}

function PromptLibrary({ data, setData, searchQuery, setSearchQuery }) {
  const [form, setForm] = useState({ title: "", category: "General", prompt: "", favorite: false });
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [openPrompt, setOpenPrompt] = useState(null);
  const prompts = data.prompts.filter((prompt) => (!favoritesOnly || prompt.favorite) && matchesSearch(`${prompt.title} ${prompt.category} ${prompt.prompt}`, searchQuery));

  function addPrompt(event) {
    event.preventDefault();
    if (!form.title.trim() && !form.prompt.trim()) return;
    const nextPrompt = normalizePrompt({ ...form, id: uid(), createdAt: new Date().toISOString() });
    setData({ ...data, prompts: [nextPrompt, ...data.prompts] });
    setForm({ title: "", category: form.category, prompt: "", favorite: false });
  }

  function updatePrompt(id, patch) {
    setData({ ...data, prompts: data.prompts.map((prompt) => prompt.id === id ? { ...prompt, ...patch } : prompt) });
  }

  function deletePrompt(id) {
    setData({ ...data, prompts: data.prompts.filter((prompt) => prompt.id !== id) });
  }

  async function copyPrompt(prompt, event) {
    event.stopPropagation();
    try { await navigator.clipboard.writeText(prompt.prompt || ""); } catch {}
  }

  return (
    <>
      <SectionSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search prompts..." />
      <form className="panel libraryForm" onSubmit={addPrompt}>
        <label>Prompt title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Rendering cleanup prompt" /></label>
        <label>Category<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Rendering / Email / Code" /></label>
        <label className="checkboxLabel"><input type="checkbox" checked={form.favorite} onChange={(event) => setForm({ ...form, favorite: event.target.checked })} /> Favorite</label>
        <label className="wide">Full prompt<textarea value={form.prompt} onChange={(event) => setForm({ ...form, prompt: event.target.value })} placeholder="Paste the entire prompt here..." /></label>
        <button type="submit" className="primary wide">Save Prompt</button>
      </form>
      <div className="panel filterPanel singleLine">
        <label className="checkboxLabel"><input type="checkbox" checked={favoritesOnly} onChange={(event) => setFavoritesOnly(event.target.checked)} /> Favorites only</label>
      </div>
      <div className="cardGrid">
        {prompts.length === 0 ? <EmptyState>No prompts yet.</EmptyState> : prompts.map((prompt) => (
          <article key={prompt.id} className="libraryCard" onClick={() => setOpenPrompt(prompt)}>
            <span className="pill">{prompt.favorite ? "★ Favorite" : prompt.category}</span>
            <h3>{prompt.title}</h3>
            <p className="clampedText">{prompt.prompt || "No prompt text yet."}</p>
            <button type="button" className="viewButton" onClick={(event) => { event.stopPropagation(); setOpenPrompt(prompt); }}>View full prompt</button>
            <div className="cardActions">
              <button type="button" onClick={(event) => copyPrompt(prompt, event)}>Copy</button>
              <button type="button" onClick={(event) => { event.stopPropagation(); updatePrompt(prompt.id, { favorite: !prompt.favorite }); }}>{prompt.favorite ? "Unfavorite" : "Favorite"}</button>
              <button type="button" className="ghostButton" onClick={(event) => { event.stopPropagation(); deletePrompt(prompt.id); }}>Delete</button>
            </div>
          </article>
        ))}
      </div>
      {openPrompt && <FullDetailModal eyebrow="AI Prompt Library" title={openPrompt.title} subtitle={openPrompt.category} sections={[{ title: "Full prompt", body: openPrompt.prompt || "No prompt yet." }]} copyText={openPrompt.prompt} onClose={() => setOpenPrompt(null)} />}
    </>
  );
}

function RevitTroubleShoot({ data, setData, searchQuery, setSearchQuery }) {
  const [form, setForm] = useState({ issue: "", project: "", category: "General", problem: "", solution: "", status: "Open" });
  const [openLog, setOpenLog] = useState(null);
  const logs = data.revitLogs.filter((log) => matchesSearch(`${log.issue} ${log.project} ${log.category} ${log.problem} ${log.solution}`, searchQuery));

  function addLog(event) {
    event.preventDefault();
    if (!form.issue.trim() && !form.problem.trim()) return;
    const nextLog = normalizeRevit({ ...form, id: uid(), createdAt: new Date().toISOString() });
    setData({ ...data, revitLogs: [nextLog, ...data.revitLogs] });
    setForm({ issue: "", project: form.project, category: form.category, problem: "", solution: "", status: "Open" });
  }

  function deleteLog(id) {
    setData({ ...data, revitLogs: data.revitLogs.filter((log) => log.id !== id) });
  }

  return (
    <>
      <SectionSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search Revit troubleshooting..." />
      <form className="panel libraryForm" onSubmit={addLog}>
        <label>Issue title<input value={form.issue} onChange={(event) => setForm({ ...form, issue: event.target.value })} placeholder="Viewport title not showing" /></label>
        <label>Project<input value={form.project} onChange={(event) => setForm({ ...form, project: event.target.value })} placeholder="Project" /></label>
        <label>Category<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Family / View / Model" /></label>
        <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Open</option><option>Testing</option><option>Solved</option></select></label>
        <label className="wide">Problem description<textarea value={form.problem} onChange={(event) => setForm({ ...form, problem: event.target.value })} placeholder="What went wrong?" /></label>
        <label className="wide">Solution / notes<textarea value={form.solution} onChange={(event) => setForm({ ...form, solution: event.target.value })} placeholder="How did you fix it?" /></label>
        <button type="submit" className="primary wide">Save Revit Note</button>
      </form>
      <div className="cardGrid">
        {logs.length === 0 ? <EmptyState>No Revit troubleshooting notes yet.</EmptyState> : logs.map((log) => (
          <article key={log.id} className="libraryCard" onClick={() => setOpenLog(log)}>
            <span className="pill">{log.status}</span>
            <h3>{log.issue}</h3>
            {log.project && <p className="mutedText">{log.project} · {log.category}</p>}
            <p className="clampedText">{log.problem || log.solution || "No notes yet."}</p>
            <button type="button" className="viewButton" onClick={(event) => { event.stopPropagation(); setOpenLog(log); }}>View full notes</button>
            <button type="button" className="ghostButton" onClick={(event) => { event.stopPropagation(); deleteLog(log.id); }}>Delete</button>
          </article>
        ))}
      </div>
      {openLog && <FullDetailModal eyebrow="Revit Trouble Shoot" title={openLog.issue} subtitle={`${openLog.project || "No project"} · ${openLog.category}`} meta={[["Status", openLog.status]]} sections={[{ title: "Problem description", body: openLog.problem || "No problem description yet." }, { title: "Solution / notes", body: openLog.solution || "No solution yet." }]} onClose={() => setOpenLog(null)} />}
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
