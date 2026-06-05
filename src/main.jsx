import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const STORAGE_KEY = "arch-daily-work-desk-v1";

const defaultData = {
  dailyLogs: [],
  tasks: [],
  codeNotes: [],
  revitLogs: [],
  prompts: []
};

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
  } catch {
    return defaultData;
  }
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

function parseLocalDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);
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
  if (task.startDate && task.dueDate && task.startDate !== task.dueDate) {
    return `${task.startDate} → ${task.dueDate}`;
  }
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
  for (let i = 0; i < source.length; i++) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `projectAccent${Math.abs(hash) % 6}`;
}

function getMonthWeeks(currentDate) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());

  const weeks = [];
  let cursor = new Date(start);

  for (let week = 0; week < 6; week++) {
    const days = [];
    for (let day = 0; day < 7; day++) {
      days.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    weeks.push(days);
  }

  return weeks;
}

function getWeekDays(currentDate) {
  const start = addDays(currentDate, -currentDate.getDay());
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function getTaskSegmentsForWeek(task, weekDays) {
  const start = parseLocalDate(task.startDate || task.dueDate);
  const end = parseLocalDate(task.dueDate || task.startDate);
  if (!start || !end) return null;

  const taskStart = start <= end ? start : end;
  const taskEnd = start <= end ? end : start;
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  if (taskEnd < weekStart || taskStart > weekEnd) return null;

  const visibleStart = taskStart > weekStart ? taskStart : weekStart;
  const visibleEnd = taskEnd < weekEnd ? taskEnd : weekEnd;
  const startCol = visibleStart.getDay() + 1;
  const endCol = visibleEnd.getDay() + 2;

  return { startCol, endCol };
}

function includesText(value, query) {
  return String(value || "").toLowerCase().includes(query.toLowerCase());
}

function searchRecord(record, query) {
  if (!query.trim()) return true;
  return Object.values(record).some((value) => includesText(value, query));
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function App() {
  const [data, setData] = useState(loadData);
  const [activeTab, setActiveTab] = useState("Daily Desk");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("Month");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    saveData(data);
  }, [data]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const tabs = [
    "Daily Desk",
    "Task Dashboard",
    "Code / DOB Quick Notes",
    "Revit Troubleshoot Log",
    "AI Prompt Library"
  ];

  return (
    <div className="app">
      <main className="shell">
        <section className="hero">
          <div className="brandBlock">
            <p className="eyebrow">Personal Architecture Work System</p>
            <h1>ARCH DAILY WORK DESK</h1>
            <p className="heroText">
              Daily logs, task planning, DOB/code notes, Revit troubleshooting, and prompt references in one clean desk.
            </p>
          </div>
          <TodayCard currentDate={currentDate} data={data} />
        </section>

        <ActionBar
          data={data}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <nav className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "tab active" : "tab"}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === "Daily Desk" && <DailyDesk data={data} setData={setData} currentDate={currentDate} searchQuery={searchQuery} />}
        {activeTab === "Task Dashboard" && <TaskDashboard data={data} setData={setData} searchQuery={searchQuery} />}
        {activeTab === "Code / DOB Quick Notes" && <CodeNotes data={data} setData={setData} searchQuery={searchQuery} />}
        {activeTab === "Revit Troubleshoot Log" && <RevitLog data={data} setData={setData} searchQuery={searchQuery} />}
        {activeTab === "AI Prompt Library" && <PromptLibrary data={data} setData={setData} searchQuery={searchQuery} />}
      </main>

      <CalendarPanel
        currentDate={currentDate}
        calendarDate={calendarDate}
        setCalendarDate={setCalendarDate}
        calendarView={calendarView}
        setCalendarView={setCalendarView}
        tasks={data.tasks}
      />
    </div>
  );
}

function ActionBar({ data, searchQuery, setSearchQuery }) {
  function exportPdfReport() {
    const openTasks = data.tasks.filter((task) => task.status !== "Done");
    const doneTasks = data.tasks.filter((task) => task.status === "Done");

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>ARCH DAILY WORK DESK Report</title>
  <style>
    @page { size: letter; margin: 0.55in; }
    body {
      font-family: Inter, Arial, sans-serif;
      color: #1f2933;
      background: #fffaf0;
      margin: 0;
    }
    .report {
      padding: 0;
    }
    .cover {
      border-bottom: 3px solid #9b5c2e;
      padding-bottom: 18px;
      margin-bottom: 22px;
    }
    .eyebrow {
      color: #9b5c2e;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 10px;
      font-weight: 800;
      margin: 0 0 8px;
    }
    h1 {
      font-size: 34px;
      line-height: 0.95;
      letter-spacing: -0.05em;
      margin: 0;
    }
    h2 {
      font-size: 18px;
      margin: 24px 0 10px;
      border-bottom: 1px solid #e7dccd;
      padding-bottom: 6px;
    }
    .meta {
      color: #667085;
      margin-top: 10px;
      font-size: 12px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 18px 0;
    }
    .stat {
      border: 1px solid #e7dccd;
      border-radius: 14px;
      padding: 12px;
      background: #fff;
    }
    .stat strong {
      display: block;
      font-size: 22px;
    }
    .card {
      break-inside: avoid;
      border: 1px solid #e7dccd;
      border-left: 6px solid #9b5c2e;
      border-radius: 14px;
      background: #fff;
      margin: 8px 0;
      padding: 12px 14px;
    }
    .card h3 {
      margin: 0 0 6px;
      font-size: 14px;
    }
    .muted {
      color: #667085;
      font-size: 11px;
    }
    p {
      font-size: 12px;
      line-height: 1.45;
      margin: 5px 0;
    }
    .urgent { border-left-color: #b42318; }
    .progress { border-left-color: #4f6f8f; }
    .waiting { border-left-color: #8a6f3d; }
    .done { border-left-color: #6f8a62; }
    .sectionNote {
      color: #667085;
      font-size: 11px;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <main class="report">
    <section class="cover">
      <p class="eyebrow">Personal Architecture Work System</p>
      <h1>ARCH DAILY WORK DESK</h1>
      <p class="meta">Generated ${new Date().toLocaleString()}</p>
    </section>

    <section class="grid">
      <div class="stat"><strong>${data.tasks.length}</strong><span class="muted">Tasks</span></div>
      <div class="stat"><strong>${openTasks.length}</strong><span class="muted">Open tasks</span></div>
      <div class="stat"><strong>${data.codeNotes.length}</strong><span class="muted">Code notes</span></div>
      <div class="stat"><strong>${data.revitLogs.length}</strong><span class="muted">Revit logs</span></div>
    </section>

    <h2>Open Tasks</h2>
    <p class="sectionNote">Tasks are grouped as a clean work report instead of a direct webpage print.</p>
    ${openTasks.map((task) => `
      <article class="card ${getTaskTone(task)}">
        <h3>${escapeHTML(task.title)}</h3>
        <p class="muted">${escapeHTML(task.project)} ${escapeHTML(getTaskDateLabel(task))}</p>
        <p>${escapeHTML(task.priority)} · ${escapeHTML(task.status)}</p>
      </article>
    `).join("") || "<p>No open tasks.</p>"}

    <h2>Recent Daily Logs</h2>
    ${data.dailyLogs.slice(0, 8).map((log) => `
      <article class="card">
        <h3>${escapeHTML(log.project || "Daily Log")}</h3>
        <p class="muted">${escapeHTML(log.date)}</p>
        <p>${escapeHTML(log.summary)}</p>
        ${log.nextSteps ? `<p><strong>Next:</strong> ${escapeHTML(log.nextSteps)}</p>` : ""}
      </article>
    `).join("") || "<p>No daily logs yet.</p>"}

    <h2>Code / DOB Quick Notes</h2>
    ${data.codeNotes.slice(0, 8).map((note) => `
      <article class="card">
        <h3>${escapeHTML(note.title || "Code Note")}</h3>
        <p class="muted">${escapeHTML(note.codeSource)} ${escapeHTML(note.section)}</p>
        <p>${escapeHTML(note.note)}</p>
      </article>
    `).join("") || "<p>No code notes yet.</p>"}

    <h2>Revit Troubleshoot Log</h2>
    ${data.revitLogs.slice(0, 8).map((log) => `
      <article class="card">
        <h3>${escapeHTML(log.issue)}</h3>
        <p class="muted">${escapeHTML(log.project)} ${escapeHTML(log.category)}</p>
        <p>${escapeHTML(log.solution)}</p>
      </article>
    `).join("") || "<p>No Revit logs yet.</p>"}

    <h2>Completed Tasks</h2>
    ${doneTasks.slice(0, 8).map((task) => `
      <article class="card done">
        <h3>${escapeHTML(task.title)}</h3>
        <p class="muted">${escapeHTML(task.project)} ${escapeHTML(getTaskDateLabel(task))}</p>
      </article>
    `).join("") || "<p>No completed tasks yet.</p>"}
  </main>

  <script>
    window.onload = () => {
      window.print();
    };
  </script>
</body>
</html>`;

    const reportWindow = window.open("", "_blank");
    reportWindow.document.write(html);
    reportWindow.document.close();
  }

  return (
    <section className="actionBar">
      <label className="searchBox">
        <span>Search desk</span>
        <input
          placeholder="Search tasks, code notes, Revit logs, prompts..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </label>

      <div className="actionButtons">
        <button type="button" onClick={exportPdfReport}>Export PDF Report</button>
      </div>
    </section>
  );
}

function CalendarPanel({ currentDate, calendarDate, setCalendarDate, calendarView, setCalendarView, tasks }) {
  function shift(amount) {
    if (calendarView === "Week") {
      setCalendarDate(addDays(calendarDate, amount * 7));
    } else if (calendarView === "Year") {
      setCalendarDate(new Date(calendarDate.getFullYear() + amount, calendarDate.getMonth(), 1));
    } else {
      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + amount, 1));
    }
  }

  function goToday() {
    setCalendarDate(new Date());
    setCalendarView("Today");
  }

  return (
    <aside className="calendarDock">
      <div className="calendarTop">
        <div>
          <p className="eyebrow">Pinned Monthly Calendar</p>
          <h2>{calendarView === "Year" ? calendarDate.getFullYear() : calendarView === "Week" ? "This Week" : monthLabel(calendarDate)}</h2>
          <p className="calendarHint">Tasks stretch from start date to due date.</p>
          <div className="calendarLegend">
            <span><i className="legendDot planned"></i>Planned</span>
            <span><i className="legendDot progress"></i>In progress</span>
            <span><i className="legendDot urgent"></i>Urgent</span>
          </div>
        </div>
        <div className="calendarNav">
          <div className="calendarActions">
            <button onClick={() => shift(-1)}>←</button>
            <button onClick={goToday}>Today</button>
            <button onClick={() => shift(1)}>→</button>
          </div>
          <div className="viewSwitch">
            {["Today", "Week", "Month", "Year"].map((view) => (
              <button
                key={view}
                className={calendarView === view ? "active" : ""}
                onClick={() => {
                  setCalendarView(view);
                  if (view === "Today") setCalendarDate(new Date());
                }}
              >
                {view}
              </button>
            ))}
          </div>
        </div>
      </div>

      {calendarView === "Today" && <TodayCalendarView currentDate={currentDate} tasks={tasks} />}
      {calendarView === "Week" && <WeekCalendarView currentDate={currentDate} calendarDate={calendarDate} tasks={tasks} />}
      {calendarView === "Month" && <MonthCalendarView currentDate={currentDate} calendarDate={calendarDate} tasks={tasks} />}
      {calendarView === "Year" && <YearCalendarView currentDate={currentDate} calendarDate={calendarDate} tasks={tasks} />}
    </aside>
  );
}

function MonthCalendarView({ currentDate, calendarDate, tasks }) {
  const weeks = useMemo(() => getMonthWeeks(calendarDate), [calendarDate]);
  const today = formatDate(currentDate);
  const currentMonth = calendarDate.getMonth();

  const activeTasks = useMemo(() => {
    return tasks
      .filter((task) => task.startDate || task.dueDate)
      .sort((a, b) => {
        const aDate = a.startDate || a.dueDate || "";
        const bDate = b.startDate || b.dueDate || "";
        return aDate.localeCompare(bDate);
      });
  }, [tasks]);

  return (
    <>
      <div className="weekGrid weekdayRow">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="calendarWeeks">
        {weeks.map((weekDays, weekIndex) => (
          <div className="calendarWeek" key={`week-${weekIndex}`}>
            <div className="weekGrid dayLayer">
              {weekDays.map((date) => {
                const dateKey = formatDate(date);
                const isToday = dateKey === today;
                const isMuted = date.getMonth() !== currentMonth;
                return (
                  <div
                    key={dateKey}
                    className={["dayCell", isToday ? "today" : "", isMuted ? "mutedDay" : ""].join(" ")}
                  >
                    <div className="dayNumber">{date.getDate()}</div>
                  </div>
                );
              })}
            </div>

            <div className="barLayer">
              {activeTasks.map((task, taskIndex) => {
                const segment = getTaskSegmentsForWeek(task, weekDays);
                if (!segment) return null;

                const lane = taskIndex % 4;
                return (
                  <div
                    key={`${task.id}-${weekIndex}`}
                    className={`calendarSpanBar ${getTaskTone(task)} ${getTaskProjectAccent(task)}`}
                    style={{
                      gridColumn: `${segment.startCol} / ${segment.endCol}`,
                      top: `${26 + lane * 18}px`
                    }}
                    title={`${task.title} • ${getTaskDateLabel(task)}`}
                  >
                    {task.title}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function TodayCalendarView({ currentDate, tasks }) {
  const todayKey = formatDate(currentDate);
  const todayTasks = tasks.filter((task) => getTaskDateKeys(task).includes(todayKey));

  return (
    <section className="todayView">
      <div className="todayDateCard">
        <p className="eyebrow">Today</p>
        <h3>{currentDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h3>
      </div>
      <div className="miniList">
        {todayTasks.length === 0 ? (
          <div className="empty compact">No active tasks today.</div>
        ) : (
          todayTasks.map((task) => (
            <article key={task.id} className={`miniTask ${getTaskTone(task)}`}>
              <strong>{task.title}</strong>
              <span>{task.project || "No project"} · {getTaskDateLabel(task)}</span>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function WeekCalendarView({ currentDate, calendarDate, tasks }) {
  const weekDays = useMemo(() => getWeekDays(calendarDate), [calendarDate]);
  const today = formatDate(currentDate);
  const activeTasks = tasks.filter((task) => task.startDate || task.dueDate);

  return (
    <>
      <div className="weekGrid weekdayRow">
        {weekDays.map((date) => (
          <div key={formatDate(date)}>{date.toLocaleDateString(undefined, { weekday: "short" })}</div>
        ))}
      </div>
      <div className="calendarWeek weekOnly">
        <div className="weekGrid dayLayer">
          {weekDays.map((date) => (
            <div key={formatDate(date)} className={`dayCell ${formatDate(date) === today ? "today" : ""}`}>
              <div className="dayNumber">{date.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="barLayer">
          {activeTasks.map((task, index) => {
            const segment = getTaskSegmentsForWeek(task, weekDays);
            if (!segment) return null;
            return (
              <div
                key={task.id}
                className={`calendarSpanBar ${getTaskTone(task)} ${getTaskProjectAccent(task)}`}
                style={{ gridColumn: `${segment.startCol} / ${segment.endCol}`, top: `${32 + (index % 8) * 20}px` }}
              >
                {task.title}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function YearCalendarView({ currentDate, calendarDate, tasks }) {
  const year = calendarDate.getFullYear();
  const today = formatDate(currentDate);

  return (
    <div className="yearGrid">
      {Array.from({ length: 12 }, (_, monthIndex) => {
        const monthDate = new Date(year, monthIndex, 1);
        const monthTasks = tasks.filter((task) =>
          getTaskDateKeys(task).some((dateKey) => Number(dateKey.slice(0, 4)) === year && Number(dateKey.slice(5, 7)) === monthIndex + 1)
        );
        return (
          <button
            key={monthIndex}
            className={`monthMini ${formatDate(monthDate).slice(0, 7) === today.slice(0, 7) ? "current" : ""}`}
          >
            <strong>{monthDate.toLocaleString(undefined, { month: "short" })}</strong>
            <span>{monthTasks.length} task{monthTasks.length === 1 ? "" : "s"}</span>
          </button>
        );
      })}
    </div>
  );
}

function TodayCard({ currentDate, data }) {
  const today = formatDate(currentDate);
  const todayTasks = data.tasks.filter((task) => getTaskDateKeys(task).includes(today) && task.status !== "Done");
  return (
    <aside className="todayCard">
      <p className="eyebrow">Today</p>
      <h3>{currentDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</h3>
      <p>{todayTasks.length} active task{todayTasks.length === 1 ? "" : "s"} today</p>
    </aside>
  );
}

function DailyDesk({ data, setData, currentDate, searchQuery }) {
  const [form, setForm] = useState({
    date: formatDate(currentDate),
    project: "",
    summary: "",
    blockers: "",
    nextSteps: ""
  });

  const filteredLogs = data.dailyLogs.filter((item) => searchRecord(item, searchQuery));

  function addLog(e) {
    e.preventDefault();
    if (!form.summary.trim() && !form.project.trim()) return;
    setData({
      ...data,
      dailyLogs: [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...form }, ...data.dailyLogs]
    });
    setForm({ ...form, project: "", summary: "", blockers: "", nextSteps: "" });
  }

  return (
    <Workspace title="Daily Desk" subtitle="Use this as your daily work journal and project progress record.">
      <form className="formGrid" onSubmit={addLog}>
        <label>
          Date
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </label>
        <label>
          Project
          <input placeholder="Freeport Loop, 416 East 189th..." value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} />
        </label>
        <label className="wide">
          What did I work on?
          <textarea placeholder="Massing study, Revit cleanup, DOB note, client comments..." value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        </label>
        <label>
          Blockers / Questions
          <textarea placeholder="What needs clarification?" value={form.blockers} onChange={(e) => setForm({ ...form, blockers: e.target.value })} />
        </label>
        <label>
          Next steps
          <textarea placeholder="What should I do next?" value={form.nextSteps} onChange={(e) => setForm({ ...form, nextSteps: e.target.value })} />
        </label>
        <button className="primary wide" type="submit">Save Daily Log</button>
      </form>

      <CardList
        items={filteredLogs}
        empty={searchQuery ? "No daily logs match your search." : "No daily logs yet."}
        render={(item) => (
          <article className="card" key={item.id}>
            <div className="cardHead">
              <h3>{item.project || "Untitled Daily Log"}</h3>
              <span>{item.date}</span>
            </div>
            <p>{item.summary}</p>
            {item.blockers && <p><strong>Blockers:</strong> {item.blockers}</p>}
            {item.nextSteps && <p><strong>Next:</strong> {item.nextSteps}</p>}
            <DeleteButton onClick={() => setData({ ...data, dailyLogs: data.dailyLogs.filter((x) => x.id !== item.id) })} />
          </article>
        )}
      />
    </Workspace>
  );
}

function TaskDashboard({ data, setData, searchQuery }) {
  const [form, setForm] = useState({
    title: "",
    project: "",
    startDate: "",
    dueDate: "",
    status: "Not Started",
    priority: "Medium"
  });

  const filteredTasks = data.tasks.filter((task) => searchRecord(task, searchQuery));

  function addTask(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setData({
      ...data,
      tasks: [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...form }, ...data.tasks]
    });
    setForm({ title: "", project: "", startDate: "", dueDate: "", status: "Not Started", priority: "Medium" });
  }

  function updateTask(id, patch) {
    setData({
      ...data,
      tasks: data.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task))
    });
  }

  return (
    <Workspace title="Task Dashboard" subtitle="Tasks with start and due dates will stretch across the fixed side calendar.">
      <form className="formGrid" onSubmit={addTask}>
        <label>
          Task
          <input placeholder="Submit markup, check code, fix Revit model..." value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label>
          Project
          <input placeholder="Project name" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} />
        </label>
        <label>
          Start date
          <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </label>
        <label>
          Due date
          <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </label>
        <label>
          Priority
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Urgent</option>
          </select>
        </label>
        <button className="primary wide" type="submit">Add Task</button>
      </form>

      <div className="taskBoard">
        {["Not Started", "In Progress", "Waiting", "Done"].map((status) => (
          <section key={status} className="taskColumn">
            <h3>{status}</h3>
            {filteredTasks.filter((task) => task.status === status).map((task) => (
              <article key={task.id} className={`card smallCard taskCard ${getTaskTone(task)}`}>
                <div className="pillRow">
                  <span className={`pill tonePill ${getTaskTone(task)}`}>{task.priority}</span>
                  {(task.startDate || task.dueDate) && <span className="pill muted">{getTaskDateLabel(task)}</span>}
                </div>
                <h4>{task.title}</h4>
                {task.project && <p>{task.project}</p>}
                <select value={task.status} onChange={(e) => updateTask(task.id, { status: e.target.value })}>
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Waiting</option>
                  <option>Done</option>
                </select>
                <DeleteButton onClick={() => setData({ ...data, tasks: data.tasks.filter((x) => x.id !== task.id) })} />
              </article>
            ))}
          </section>
        ))}
      </div>
    </Workspace>
  );
}

function CodeNotes({ data, setData, searchQuery }) {
  const [form, setForm] = useState({
    title: "",
    codeSource: "",
    section: "",
    note: "",
    projectUse: ""
  });

  const filteredNotes = data.codeNotes.filter((item) => searchRecord(item, searchQuery));

  function addNote(e) {
    e.preventDefault();
    if (!form.title.trim() && !form.note.trim()) return;
    setData({
      ...data,
      codeNotes: [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...form }, ...data.codeNotes]
    });
    setForm({ title: "", codeSource: "", section: "", note: "", projectUse: "" });
  }

  return (
    <Workspace title="Code / DOB Quick Notes" subtitle="Fast place to record code sections, DOB comments, zoning notes, and reusable language.">
      <form className="formGrid" onSubmit={addNote}>
        <label>
          Title
          <input placeholder="Wheelchair seating, rear yard, PAR..." value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label>
          Source
          <input placeholder="NYC BC, ZR, ADA, DOB, DOT..." value={form.codeSource} onChange={(e) => setForm({ ...form, codeSource: e.target.value })} />
        </label>
        <label>
          Section
          <input placeholder="BC 1108.2.2.1, ZR 23-..." value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
        </label>
        <label className="wide">
          Note
          <textarea placeholder="Paste the requirement or your interpretation here." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>
        <label className="wide">
          Project use / Reminder
          <textarea placeholder="How would I apply this on drawings?" value={form.projectUse} onChange={(e) => setForm({ ...form, projectUse: e.target.value })} />
        </label>
        <button className="primary wide" type="submit">Save Code Note</button>
      </form>

      <CardList
        items={filteredNotes}
        empty={searchQuery ? "No code notes match your search." : "No code notes yet."}
        render={(item) => (
          <article className="card" key={item.id}>
            <div className="cardHead">
              <h3>{item.title || "Untitled Code Note"}</h3>
              <span>{item.codeSource}</span>
            </div>
            {item.section && <p><strong>Section:</strong> {item.section}</p>}
            <p>{item.note}</p>
            {item.projectUse && <p><strong>Use:</strong> {item.projectUse}</p>}
            <DeleteButton onClick={() => setData({ ...data, codeNotes: data.codeNotes.filter((x) => x.id !== item.id) })} />
          </article>
        )}
      />
    </Workspace>
  );
}

function RevitLog({ data, setData, searchQuery }) {
  const [form, setForm] = useState({
    issue: "",
    project: "",
    category: "Modeling",
    solution: "",
    keywords: ""
  });

  const filteredLogs = data.revitLogs.filter((item) => searchRecord(item, searchQuery));

  function addLog(e) {
    e.preventDefault();
    if (!form.issue.trim()) return;
    setData({
      ...data,
      revitLogs: [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...form }, ...data.revitLogs]
    });
    setForm({ issue: "", project: "", category: "Modeling", solution: "", keywords: "" });
  }

  return (
    <Workspace title="Revit Troubleshoot Log" subtitle="Keep Revit problems and fixes searchable for future projects.">
      <form className="formGrid" onSubmit={addLog}>
        <label>
          Issue
          <input placeholder="Bind link errors, view range, family visibility..." value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} />
        </label>
        <label>
          Project
          <input placeholder="Project name" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} />
        </label>
        <label>
          Category
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option>Modeling</option>
            <option>Family</option>
            <option>View / Sheet</option>
            <option>Link / Coordinate</option>
            <option>Schedule</option>
            <option>Export / Print</option>
          </select>
        </label>
        <label>
          Keywords
          <input placeholder="bind, central, scope box..." value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
        </label>
        <label className="wide">
          Solution
          <textarea placeholder="What fixed it?" value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} />
        </label>
        <button className="primary wide" type="submit">Save Revit Log</button>
      </form>

      <CardList
        items={filteredLogs}
        empty={searchQuery ? "No Revit logs match your search." : "No Revit logs yet."}
        render={(item) => (
          <article className="card" key={item.id}>
            <div className="cardHead">
              <h3>{item.issue}</h3>
              <span>{item.category}</span>
            </div>
            {item.project && <p><strong>Project:</strong> {item.project}</p>}
            {item.solution && <p>{item.solution}</p>}
            {item.keywords && <p><strong>Keywords:</strong> {item.keywords}</p>}
            <DeleteButton onClick={() => setData({ ...data, revitLogs: data.revitLogs.filter((x) => x.id !== item.id) })} />
          </article>
        )}
      />
    </Workspace>
  );
}

function PromptLibrary({ data, setData, searchQuery }) {
  const [form, setForm] = useState({
    title: "",
    tool: "",
    prompt: "",
    notes: ""
  });

  const filteredPrompts = data.prompts.filter((item) => searchRecord(item, searchQuery));

  function addPrompt(e) {
    e.preventDefault();
    if (!form.title.trim() && !form.prompt.trim()) return;
    setData({
      ...data,
      prompts: [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...form }, ...data.prompts]
    });
    setForm({ title: "", tool: "", prompt: "", notes: "" });
  }

  return (
    <Workspace title="AI Prompt Library" subtitle="Save rendering, video, code, and workflow prompts that worked well.">
      <form className="formGrid" onSubmit={addPrompt}>
        <label>
          Title
          <input placeholder="Photo-realistic rainy day render..." value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label>
          Tool / Model
          <input placeholder="ChatGPT, Seedance, Vercel, Gemini..." value={form.tool} onChange={(e) => setForm({ ...form, tool: e.target.value })} />
        </label>
        <label className="wide">
          Prompt
          <textarea placeholder="Paste your prompt here." value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} />
        </label>
        <label className="wide">
          Notes
          <textarea placeholder="What worked? What failed?" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
        <button className="primary wide" type="submit">Save Prompt</button>
      </form>

      <CardList
        items={filteredPrompts}
        empty={searchQuery ? "No prompts match your search." : "No prompts yet."}
        render={(item) => (
          <article className="card" key={item.id}>
            <div className="cardHead">
              <h3>{item.title || "Untitled Prompt"}</h3>
              <span>{item.tool}</span>
            </div>
            <pre>{item.prompt}</pre>
            {item.notes && <p><strong>Notes:</strong> {item.notes}</p>}
            <DeleteButton onClick={() => setData({ ...data, prompts: data.prompts.filter((x) => x.id !== item.id) })} />
          </article>
        )}
      />
    </Workspace>
  );
}

function Workspace({ title, subtitle, children }) {
  return (
    <section className="workspace">
      <div className="workspaceHead">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function CardList({ items, empty, render }) {
  return (
    <div className="cardList">
      {items.length === 0 ? <div className="empty">{empty}</div> : items.map(render)}
    </div>
  );
}

function DeleteButton({ onClick }) {
  return (
    <button className="delete" onClick={onClick} type="button">
      Delete
    </button>
  );
}

createRoot(document.getElementById("root")).render(<App />);
