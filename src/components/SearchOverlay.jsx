import { useMemo, useState } from 'react';
import { useDesk, useUi } from '../desk.jsx';
import { formatISO } from '../lib/dates.js';
import { attachmentsOf } from '../lib/files.js';
import { normalizeDobCategory, normalizeUrl } from '../lib/library.js';
import { matchesText, preview } from '../lib/text.js';
import { Modal } from './Modal.jsx';

export function SearchOverlay() {
  const { tasks, dobNotes, revitLogs, prompts, links } = useDesk();
  const { searchOpen, closeSearch, openItem, navigate } = useUi();
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!needle) return [];
    const names = (item) => attachmentsOf(item).map((file) => file.name);
    const groups = [
      {
        key: 'tasks', title: 'Tasks', token: '--lv-normal',
        rows: tasks.filter((task) => matchesText([task.title, task.project, task.notes, task.priority, task.status], needle)).map((task) => ({
          id: task.id, title: task.title || 'Untitled task', meta: [task.project, task.status || 'Not Started', formatISO(task.dueDate || task.startDate)].filter(Boolean).join(' · '),
          text: preview(task.notes, needle), open: () => openItem({ id: task.id })
        }))
      },
      {
        key: 'dob', title: 'DOB notes', token: '--dob',
        rows: dobNotes.filter((note) => matchesText([note.title, note.category, note.code, note.chapter, note.year, note.notes, ...names(note)], needle)).map((note) => ({
          id: note.id, title: note.title || 'DOB note', meta: [normalizeDobCategory(note.category), note.code, note.chapter].filter(Boolean).join(' · '),
          text: preview(note.notes, needle), open: () => navigate('dob', note.id)
        }))
      },
      {
        key: 'revit', title: 'Revit trouble shoot', token: '--revit',
        rows: revitLogs.filter((log) => matchesText([log.issue, log.category, log.problem, log.solution, ...names(log)], needle)).map((log) => ({
          id: log.id, title: log.issue || 'Untitled issue', meta: [log.category, formatISO(log.date)].filter(Boolean).join(' · '),
          text: preview(log.problem || log.solution, needle), open: () => navigate('revit', log.id)
        }))
      },
      {
        key: 'prompts', title: 'AI prompts', token: '--accent',
        rows: prompts.filter((item) => matchesText([item.title, item.category, item.prompt], needle)).map((item) => ({
          id: item.id, title: item.title || 'Untitled prompt', meta: `${item.favorite ? '★ ' : ''}${item.category || 'Prompt'}`,
          text: preview(item.prompt, needle), open: () => navigate('prompts', item.id)
        }))
      },
      {
        key: 'links', title: 'Links', token: '--link',
        rows: links.filter((item) => matchesText([item.title, item.url, item.category], needle)).map((item) => ({
          id: item.id, title: item.title || 'Link', meta: item.category || 'Link', text: preview(item.url, needle), href: normalizeUrl(item.url)
        }))
      }
    ];
    return groups.filter((group) => group.rows.length);
  }, [needle, tasks, dobNotes, revitLogs, prompts, links, openItem, navigate]);

  if (!searchOpen) return null;
  const total = results.reduce((sum, group) => sum + group.rows.length, 0);
  const close = () => { setQuery(''); closeSearch(); };

  return (
    <Modal eyebrow="Search" title="Find anything" onClose={close} wide>
      <div className="search-box">
        <label className="sr-only" htmlFor="global-search">Search tasks, DOB notes, Revit notes, prompts and links</label>
        <input id="global-search" type="search" autoComplete="off" value={query} placeholder="Search tasks, DOB notes, Revit notes, prompts and links" onChange={(event) => setQuery(event.target.value)} />
        <p className="search-count" aria-live="polite">{needle ? `${total} result${total === 1 ? '' : 's'}` : 'Titles, projects, notes, code sections and file names.'}</p>
      </div>
      <div className="search-results">
        {needle && !total ? <p className="empty">Nothing matched "{query.trim()}".</p> : null}
        {results.map((group) => (
          <section key={group.key} className="search-group">
            <h3 className="group-title" style={{ '--c': `var(${group.token})` }}><span className="gt-name"><i />{group.title}</span><span>{group.rows.length}</span></h3>
            <ul>
              {group.rows.map((row) => (
                <li key={row.id}>
                  {row.href ? (
                    <a className="search-row" href={row.href} target="_blank" rel="noreferrer">
                      <strong>{row.title}</strong><span>{row.meta}</span>{row.text ? <em>{row.text}</em> : null}
                    </a>
                  ) : (
                    <button type="button" className="search-row" onClick={() => { close(); row.open(); }}>
                      <strong>{row.title}</strong><span>{row.meta}</span>{row.text ? <em>{row.text}</em> : null}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
