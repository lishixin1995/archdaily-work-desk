import { useEffect, useMemo, useState } from 'react';
import { ItemRow } from '../components/ItemList.jsx';
import { useDesk, useUi } from '../desk.jsx';
import { boardMeta } from '../lib/agenda.js';
import { setHighlight } from '../lib/highlight.js';
import { byRank, PRIORITIES, priorityOf, STATUS_TOKEN, STATUSES } from '../lib/tasks.js';
import { matchesText } from '../lib/text.js';

const PAGE_SIZE = 6;

function ColumnPager({ page, pages, onPage, label }) {
  if (pages <= 1) return null;
  return (
    <div className="col-pager">
      <button type="button" className="btn btn-icon btn-small-icon" aria-label={`Previous ${label} page`} disabled={page === 0} onClick={() => onPage(page - 1)}>&lsaquo;</button>
      <span>{page + 1} / {pages}</span>
      <button type="button" className="btn btn-icon btn-small-icon" aria-label={`Next ${label} page`} disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>&rsaquo;</button>
    </div>
  );
}

// Every task in four status columns, with the dashboard's filters.
export function TaskBoard() {
  const { items, tasks } = useDesk();
  const { newItem } = useUi();
  const [query, setQuery] = useState('');
  const [project, setProject] = useState('All');
  const [priority, setPriority] = useState('All');
  const [hideDone, setHideDone] = useState(false);
  const [startFrom, setStartFrom] = useState('');
  const [dueBy, setDueBy] = useState('');
  const [pages, setPages] = useState({});
  const filterKey = `${query}|${project}|${priority}|${hideDone}|${startFrom}|${dueBy}`;
  useEffect(() => setPages({}), [filterKey]);

  const projects = useMemo(() => [...new Set(tasks.map((task) => task.project).filter(Boolean))].sort(), [tasks]);

  const filtered = useMemo(() => items.filter((item) => {
    const { task } = item;
    if (project !== 'All' && task.project !== project) return false;
    if (priority !== 'All' && priorityOf(task) !== priority) return false;
    if (hideDone && item.done) return false;
    const start = task.startDate || task.dueDate || '';
    const end = task.dueDate || task.startDate || '';
    if (startFrom && end && end < startFrom) return false;
    if (dueBy && start && start > dueBy) return false;
    return matchesText([task.title, task.project, task.notes, task.priority, task.status], query);
  }), [items, project, priority, hideDone, startFrom, dueBy, query]);

  const columns = STATUSES
    .filter((status) => !(hideDone && status === 'Done'))
    .map((status) => {
      const list = filtered.filter((item) => item.status === status);
      list.sort(status === 'Done' ? (a, b) => (b.due || 0) - (a.due || 0) : byRank);
      const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
      const page = Math.min(pages[status] || 0, pageCount - 1);
      return { status, list, page, pageCount, visible: list.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE) };
    });

  return (
    <section className="panel board-panel" aria-labelledby="board-title">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Task dashboard</p>
          <h2 id="board-title">All tasks</h2>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => newItem()}>+ New task</button>
      </div>
      <div className="board-filters">
        <div className="toolbar">
          <label className="sr-only" htmlFor="board-search">Search tasks</label>
          <input id="board-search" className="search-input" type="search" placeholder="Search tasks, projects and notes" value={query} onChange={(event) => setQuery(event.target.value)} />
          <label className="sr-only" htmlFor="board-project">Project</label>
          <select id="board-project" className="pill-select" value={project} onChange={(event) => setProject(event.target.value)}>
            <option value="All">All projects</option>
            {projects.map((name) => <option key={name}>{name}</option>)}
          </select>
          <div className="filter-chips" role="group" aria-label="Priority">
            {['All', ...PRIORITIES].map((name) => <button key={name} type="button" aria-pressed={priority === name} onClick={() => setPriority(name)}>{name}</button>)}
            <button type="button" aria-pressed={hideDone} onClick={() => setHideDone((value) => !value)}>Hide done</button>
          </div>
        </div>
        <div className="toolbar date-range">
          <label className="range-field"><span>Start from</span><input type="date" value={startFrom} onChange={(event) => setStartFrom(event.target.value)} /></label>
          <label className="range-field"><span>Due by</span><input type="date" value={dueBy} onChange={(event) => setDueBy(event.target.value)} /></label>
          {startFrom || dueBy ? <button type="button" className="btn btn-small" onClick={() => { setStartFrom(''); setDueBy(''); }}>Clear dates</button> : null}
          <span className="toolbar-count">{filtered.length} of {items.length}</span>
        </div>
      </div>
      <div className="board" style={{ '--cols': columns.length }} onPointerLeave={() => setHighlight([])}>
        {columns.map(({ status, list, page, pageCount, visible }) => (
          <section key={status} className="board-col" aria-label={status}>
            <h3 className="group-title" style={{ '--c': `var(${STATUS_TOKEN[status]})` }}>
              <span className="gt-name"><i />{status}</span>
              <span>{list.length}</span>
            </h3>
            {list.length ? (
              <ul className="items">
                {visible.map((item) => <ItemRow key={item.id} item={item} meta={boardMeta} note compact />)}
              </ul>
            ) : <p className="empty">No tasks here.</p>}
            <ColumnPager label={status} page={page} pages={pageCount} onPage={(next) => setPages((current) => ({ ...current, [status]: next }))} />
          </section>
        ))}
      </div>
    </section>
  );
}
