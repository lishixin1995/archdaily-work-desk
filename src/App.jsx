import { useEffect, useState } from 'react';
import { FullNoteModal } from './components/FullNoteModal.jsx';
import { useStoredList } from './lib/storage.js';
import { migrateDailyLogs, taskCopyText } from './lib/tasks.js';
import { CalendarPanel } from './views/CalendarPanel.jsx';
import { DobNotes } from './views/DobNotes.jsx';
import { LinkLibrary } from './views/LinkLibrary.jsx';
import { PromptLibrary } from './views/PromptLibrary.jsx';
import { RevitTroubleShoot } from './views/RevitTroubleShoot.jsx';
import { TaskDashboard } from './views/TaskDashboard.jsx';

const TABS = ['Dashboard', 'DOB Notes', 'Links', 'AI Prompt Library', 'Revit Trouble Shoot'];

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [tasks, setTasks] = useStoredList('tasks');
  const [dailyLogs, setDailyLogs] = useStoredList('daily');
  const [dobNotes, setDobNotes] = useStoredList('dob');
  const [links, setLinks] = useStoredList('links');
  const [prompts, setPrompts] = useStoredList('prompts');
  const [revitLogs, setRevitLogs] = useStoredList('revit');
  const [openTaskId, setOpenTaskId] = useState(null);
  const openTask = tasks.find((task) => task.id === openTaskId);

  // Daily Task Log entries live on the dashboard as Done tasks.
  useEffect(() => {
    const migration = migrateDailyLogs(dailyLogs, tasks);
    if (!migration) return;
    if (migration.newTasks.length) setTasks((current) => [...migration.newTasks, ...current]);
    setDailyLogs(migration.markedLogs);
  }, [dailyLogs, tasks, setTasks, setDailyLogs]);

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
          {activeTab === 'Dashboard' && <TaskDashboard tasks={tasks} setTasks={setTasks} onOpenTask={(task) => setOpenTaskId(task.id)} />}
          {activeTab === 'DOB Notes' && <DobNotes dobNotes={dobNotes} setDobNotes={setDobNotes} />}
          {activeTab === 'Links' && <LinkLibrary links={links} setLinks={setLinks} />}
          {activeTab === 'AI Prompt Library' && <PromptLibrary prompts={prompts} setPrompts={setPrompts} />}
          {activeTab === 'Revit Trouble Shoot' && <RevitTroubleShoot revitLogs={revitLogs} setRevitLogs={setRevitLogs} />}
        </section>
        <aside className="calendarDock">
          <CalendarPanel tasks={tasks} onOpenTask={(task) => setOpenTaskId(task.id)} />
        </aside>
      </main>

      {openTask && (
        <FullNoteModal
          eyebrow="Task Detail"
          title={openTask.title || 'Untitled Task'}
          meta={[['Project', openTask.project || 'No project'], ['Priority', openTask.priority || 'Medium'], ['Status', openTask.status || 'Not Started'], ['Start date', openTask.startDate || '—'], ['Due date', openTask.dueDate || '—']]}
          sections={[['Task notes / details', openTask.notes || 'No notes yet.']]}
          copyText={taskCopyText(openTask)}
          onClose={() => setOpenTaskId(null)}
        />
      )}
    </>
  );
}
