import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgendaDrawer } from './components/AgendaDrawer.jsx';
import { DayCard } from './components/DayCard.jsx';
import { SearchOverlay } from './components/SearchOverlay.jsx';
import { TaskSheet } from './components/TaskSheet.jsx';
import { TopMenu } from './components/TopMenu.jsx';
import { DeskProvider, UiContext, useDesk } from './desk.jsx';
import { today } from './lib/dates.js';
import { activeOn, isOverdue } from './lib/tasks.js';
import { CalendarView } from './views/CalendarView.jsx';
import { DashboardView } from './views/DashboardView.jsx';
import { DobNotesView } from './views/DobNotesView.jsx';
import { LinksView } from './views/LinksView.jsx';
import { PromptsView } from './views/PromptsView.jsx';
import { RevitView } from './views/RevitView.jsx';

const VIEWS = ['dashboard', 'dob', 'calendar', 'prompts', 'links', 'revit'];

function viewFromHash() {
  const hash = window.location.hash.replace('#', '');
  return VIEWS.includes(hash) ? hash : 'dashboard';
}

function Shell() {
  const desk = useDesk();
  const [view, setView] = useState(viewFromHash);
  const [pageFocus, setPageFocus] = useState(null);
  const [calendar, setCalendar] = useState(() => ({ view: 'month', date: today() }));
  const [sheet, setSheet] = useState(null);
  const [dayCard, setDayCard] = useState(null);
  const [drawer, setDrawerState] = useState({ open: false, pinned: false, focusId: null });
  const [searchOpen, setSearchOpen] = useState(false);
  const [flashId, setFlashId] = useState(null);
  const flashTimer = useRef(0);

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const flash = useCallback((id) => {
    setFlashId(id);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashId(null), 1900);
  }, []);

  const navigate = useCallback((next, focusId = null, calendarState = null) => {
    setDayCard(null);
    setPageFocus(focusId ? { view: next, id: focusId } : null);
    if (calendarState) setCalendar(calendarState);
    setView(next);
    try {
      window.history.replaceState(null, '', `#${next}`);
    } catch {
      // Some embedded frames refuse history changes; the view still switches.
    }
    window.scrollTo(0, 0);
  }, []);

  const setDrawer = useCallback((next) => setDrawerState((current) => ({ focusId: null, ...current, ...next })), []);
  const openDay = useCallback((date, rect, options = {}) => {
    setDayCard({ date, rect, touch: Boolean(options.touch), itemId: options.itemId || null });
    if (options.itemId) flash(options.itemId);
  }, [flash]);
  const closeDay = useCallback(() => setDayCard(null), []);
  const openItem = useCallback((item) => setSheet({ kind: 'task', id: item.id }), []);
  const newItem = useCallback((task = {}) => setSheet({ kind: 'new', task }), []);
  const closeItem = useCallback(() => setSheet(null), []);

  // A star or trail for something on today's list opens the drawer; anything
  // else opens its due day.
  const focusItem = useCallback((item, rect, touch) => {
    const now = today();
    flash(item.id);
    if (activeOn(item, now) || isOverdue(item, now)) {
      setDayCard(null);
      setDrawerState({ open: true, pinned: true, focusId: item.id });
    } else {
      setDayCard({ date: item.due, rect, touch: Boolean(touch), itemId: item.id });
    }
  }, [flash]);

  const ui = useMemo(() => ({
    view,
    navigate,
    pageFocus,
    clearPageFocus: () => setPageFocus(null),
    calendar,
    setCalendar,
    sheet,
    openItem,
    newItem,
    closeItem,
    dayCard,
    openDay,
    closeDay,
    drawer,
    setDrawer,
    focusItem,
    searchOpen,
    openSearch: () => setSearchOpen(true),
    closeSearch: () => setSearchOpen(false),
    flashId,
    flash
  }), [view, navigate, pageFocus, calendar, sheet, openItem, newItem, closeItem, dayCard, openDay, closeDay, drawer, setDrawer, focusItem, searchOpen, flashId, flash]);

  const counts = {
    prompts: `${desk.prompts.length} saved`,
    links: `${desk.links.length} saved`,
    revit: `${desk.revitLogs.length} saved`
  };

  return (
    <UiContext.Provider value={ui}>
      <TopMenu view={view} counts={counts} onNavigate={(next) => navigate(next)} onSearch={() => setSearchOpen(true)} />
      <main className={`page page-${view}`}>
        {view === 'dashboard' ? <DashboardView /> : null}
        {view === 'dob' ? <DobNotesView /> : null}
        {view === 'calendar' ? <CalendarView /> : null}
        {view === 'prompts' ? <PromptsView /> : null}
        {view === 'links' ? <LinksView /> : null}
        {view === 'revit' ? <RevitView /> : null}
      </main>
      <AgendaDrawer />
      <DayCard />
      <TaskSheet />
      <SearchOverlay />
    </UiContext.Provider>
  );
}

export default function App() {
  return (
    <DeskProvider>
      <Shell />
    </DeskProvider>
  );
}
