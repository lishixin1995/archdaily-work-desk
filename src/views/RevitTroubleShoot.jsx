import { useState } from 'react';
import { AttachmentDrop } from '../components/AttachmentDrop.jsx';
import { EditDialog } from '../components/EditDialog.jsx';
import { FullNoteModal } from '../components/FullNoteModal.jsx';
import { PageHeading } from '../components/PageHeading.jsx';
import { CategoryPager, useCategoryPages } from '../components/Pager.jsx';
import { niceDate, todayISO } from '../lib/dates.js';
import { attachmentsOf, REVIT_FILES } from '../lib/files.js';
import { REVIT_CATEGORIES, revitCategory } from '../lib/library.js';
import { matchesQuery, nowTimestamp, uid } from '../lib/text.js';

const PAGE_SIZE = 2;
const emptyLog = (category = 'Modeling') => ({ date: todayISO(), category, issue: '', problem: '', solution: '', attachments: [] });

export function RevitTroubleShoot({ revitLogs, setRevitLogs }) {
  const [form, setForm] = useState(() => emptyLog());
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [openLog, setOpenLog] = useState(null);
  const [editing, setEditing] = useState(null);
  const [pages, setPage] = useCategoryPages(`${search}|${category}|${revitLogs.length}`);
  const filtered = revitLogs.filter((log) => matchesQuery(log, search) && (category === 'All' || revitCategory(log) === category));
  const groups = REVIT_CATEGORIES
    .map((name) => ({ category: name, logs: filtered.filter((log) => revitCategory(log) === name) }))
    .filter((group) => group.logs.length > 0);

  function addLog(event) {
    event.preventDefault();
    if (!form.issue.trim() && !form.problem.trim() && !form.solution.trim() && !form.attachments.length) return;
    const now = nowTimestamp();
    setRevitLogs((logs) => [{ ...form, id: uid(), createdAt: now, updatedAt: now }, ...logs]);
    setForm(emptyLog(form.category));
  }

  function saveEdit() {
    setRevitLogs((logs) => logs.map((log) => (log.id === editing.id ? {
      ...log,
      date: editing.date || '',
      category: editing.category || 'Modeling',
      issue: (editing.issue || '').trim(),
      problem: editing.problem || '',
      solution: editing.solution || '',
      attachments: editing.attachments,
      screenshot: null,
      updatedAt: nowTimestamp(),
    } : log)));
    setEditing(null);
  }

  const field = (name) => ({ value: editing?.[name] || '', onChange: (e) => setEditing({ ...editing, [name]: e.target.value }) });

  return (
    <>
      <PageHeading eyebrow="Revit Memory" title="Revit Trouble Shoot">Keep troubleshooting cards compact, then open the full problem and solution.</PageHeading>
      <div className="libraryFilters"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Revit troubleshooting..." /><select value={category} onChange={(e) => setCategory(e.target.value)}><option>All</option>{REVIT_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select></div>
      <section className="categoryGroups">
        {filtered.length === 0 ? <div className="empty wideEmpty">No Revit troubleshooting notes yet.</div> : groups.map((group) => {
          const totalPages = Math.max(1, Math.ceil(group.logs.length / PAGE_SIZE));
          const page = Math.min(pages[group.category] || 0, totalPages - 1);
          return (
            <section key={group.category} className="categorySection">
              <div className="categoryHead">
                <div>
                  <p className="eyebrow">Saved Revit Memory</p>
                  <h3>{group.category}</h3>
                </div>
                <CategoryPager label={`${group.category} Revit notes`} page={page} pages={totalPages} onPage={(next) => setPage(group.category, next)} />
              </div>
              <section className="libraryGrid singleColumn">
                {group.logs.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((log) => {
                  const count = attachmentsOf(log).length;
                  return (
                    <article key={log.id} className="libraryCard" onClick={() => setOpenLog(log)}>
                      <p className="eyebrow">{group.category}{count ? ` - ${count} file${count === 1 ? '' : 's'}` : ''}</p>
                      <h3>{log.issue || 'Untitled Issue'}</h3>
                      <p className="clampedText">{log.problem || log.solution || (count ? 'Saved attachments.' : '')}</p>
                      <div className="cardActions" onClick={(event) => event.stopPropagation()}>
                        <button type="button" className="editButton" onClick={() => setEditing({ ...log, attachments: attachmentsOf(log) })}>Edit</button>
                        <button type="button" onClick={() => setOpenLog(log)}>View full notes</button>
                        <button type="button" className="danger" onClick={() => setRevitLogs((logs) => logs.filter((item) => item.id !== log.id))}>Delete</button>
                      </div>
                    </article>
                  );
                })}
              </section>
            </section>
          );
        })}
      </section>
      <form className="cardForm" onSubmit={addLog}>
        <label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{REVIT_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select></label>
        <label className="wide">Issue title<input value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} placeholder="What went wrong?" /></label>
        <label className="wide">Problem description<textarea value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} placeholder="Describe the Revit problem..." /></label>
        <label className="wide">Solution / notes<textarea value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} placeholder="How did you fix it?" /></label>
        <AttachmentDrop label="Reference files" rules={REVIT_FILES} attachments={form.attachments} onChange={(attachments) => setForm((current) => ({ ...current, attachments }))} />
        <button type="submit" className="primary wide">Add Trouble Shoot</button>
      </form>
      {openLog && (
        <FullNoteModal
          eyebrow="Revit Trouble Shoot"
          title={openLog.issue || 'Untitled Issue'}
          meta={[['Date', niceDate(openLog.date)], ['Category', openLog.category], ['Attachments', attachmentsOf(openLog).length ? `${attachmentsOf(openLog).length} saved` : '-']]}
          sections={[['Problem description', openLog.problem], ['Solution / notes', openLog.solution]]}
          attachments={attachmentsOf(openLog)}
          copyText={[openLog.issue || '', '', openLog.problem || '', '', openLog.solution || ''].join('\n')}
          onClose={() => setOpenLog(null)}
        />
      )}
      {editing && (
        <EditDialog title="Edit Revit Trouble Shoot" onSave={saveEdit} onClose={() => setEditing(null)}>
          <label>Date<input type="date" {...field('date')} /></label>
          <label>Category<select {...field('category')}>{REVIT_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select></label>
          <label className="wide">Issue title<input {...field('issue')} /></label>
          <label className="wide">Problem description<textarea {...field('problem')} /></label>
          <label className="wide">Solution / notes<textarea {...field('solution')} /></label>
          <AttachmentDrop label="Reference files" rules={REVIT_FILES} attachments={editing.attachments} onChange={(attachments) => setEditing((current) => ({ ...current, attachments }))} />
        </EditDialog>
      )}
    </>
  );
}
