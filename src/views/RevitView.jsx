import { useEffect, useMemo, useState } from 'react';
import { AttachmentField, AttachmentGallery } from '../components/Attachments.jsx';
import { ConfirmButton } from '../components/ConfirmButton.jsx';
import { FitText } from '../components/FitText.jsx';
import { Modal } from '../components/Modal.jsx';
import { Pager, usePages, useScreenPage } from '../components/Pager.jsx';
import { useToast } from '../components/Toast.jsx';
import { useDesk, useUi } from '../desk.jsx';
import { formatISO, todayISO } from '../lib/dates.js';
import { attachmentKind, attachmentsOf, REVIT_FILES } from '../lib/files.js';
import { REVIT_CATEGORIES, revitCategory } from '../lib/library.js';
import { copyText, matchesText, nowTimestamp, uid } from '../lib/text.js';

const ROW = 288;

const fullText = (log) => [log.issue || '', '', log.problem || '', '', log.solution || ''].join('\n');

function RevitEditor({ log, onClose, onSaved }) {
  const { setRevitLogs } = useDesk();
  const toast = useToast();
  const [draft, setDraft] = useState(() => ({
    issue: log?.issue || '',
    category: log ? revitCategory(log) : 'Modeling',
    date: log?.date || todayISO(),
    problem: log?.problem || '',
    solution: log?.solution || '',
    attachments: attachmentsOf(log)
  }));
  const [error, setError] = useState('');
  const set = (field) => (value) => { setDraft((current) => ({ ...current, [field]: value })); setError(''); };
  const input = (field) => ({ value: draft[field], onChange: (event) => set(field)(event.target.value) });

  function save(event) {
    event?.preventDefault();
    if (!draft.issue.trim() && !draft.problem.trim() && !draft.solution.trim() && !draft.attachments.length) {
      setError('Add the issue, a description or a file first.');
      return;
    }
    const now = nowTimestamp();
    const fields = { ...draft, issue: draft.issue.trim(), updatedAt: now };
    let id = log?.id;
    if (log) {
      setRevitLogs((list) => list.map((item) => {
        if (item.id !== log.id) return item;
        const { screenshot, ...rest } = item;
        return { ...rest, ...fields };
      }));
    } else {
      id = uid();
      setRevitLogs((list) => [{ ...fields, id, createdAt: now }, ...list]);
    }
    toast(`Saved "${fields.issue || 'Revit note'}".`);
    onSaved(id);
  }

  return (
    <Modal
      eyebrow="Revit Trouble Shoot"
      title={log ? 'Edit trouble shoot' : 'New trouble shoot'}
      onClose={onClose}
      wide
      footer={<><span className="foot-spacer" /><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={save}>Save</button></>}
    >
      <form className="sheet-form" onSubmit={save} noValidate>
        <label className="field field-wide"><span>Issue title</span><input type="text" placeholder="What went wrong?" {...input('issue')} /></label>
        <label className="field">
          <span>Category</span>
          <select {...input('category')}>{REVIT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>
        </label>
        <label className="field"><span>Date</span><input type="date" {...input('date')} /></label>
        <label className="field field-wide"><span>Problem description</span><textarea rows={5} placeholder="Describe the Revit problem." {...input('problem')} /></label>
        <label className="field field-wide"><span>Solution / notes</span><textarea rows={5} placeholder="How did you fix it?" {...input('solution')} /></label>
        <div className="field field-wide">
          <span>Reference files</span>
          <AttachmentField id="revit-files" rules={REVIT_FILES} attachments={draft.attachments} onChange={set('attachments')} />
        </div>
        {error ? <p className="form-error field-wide" role="alert">{error}</p> : null}
        <button type="submit" hidden>Save</button>
      </form>
    </Modal>
  );
}

function RevitViewer({ log, onClose, onEdit }) {
  const { setRevitLogs } = useDesk();
  const toast = useToast();
  const files = attachmentsOf(log);
  return (
    <Modal
      eyebrow={`Revit trouble shoot · ${revitCategory(log)}`}
      title={log.issue || 'Untitled issue'}
      onClose={onClose}
      wide
      footer={(
        <>
          <ConfirmButton onConfirm={() => { setRevitLogs((list) => list.filter((item) => item.id !== log.id)); toast(`Deleted "${log.issue || 'Revit note'}".`); onClose(); }} />
          <span className="foot-spacer" />
          <button type="button" className="btn" onClick={async () => toast((await copyText(fullText(log))) ? 'Copied the full note.' : 'Copy did not work here. Select the text and copy it instead.')}>Copy full text</button>
          <button type="button" className="btn btn-primary" onClick={onEdit}>Edit</button>
        </>
      )}
    >
      <dl className="facts">
        <div><dt>Date</dt><dd>{formatISO(log.date)}</dd></div>
        <div><dt>Category</dt><dd>{revitCategory(log)}</dd></div>
        <div><dt>Files</dt><dd>{files.length ? `${files.length} saved` : 'None'}</dd></div>
      </dl>
      <div className="field"><span>Problem description</span><p className="note-text">{log.problem || 'No description yet.'}</p></div>
      <div className="field"><span>Solution / notes</span><p className="note-text">{log.solution || 'No solution yet.'}</p></div>
      <AttachmentGallery attachments={files} />
    </Modal>
  );
}

export function RevitView() {
  const { revitLogs } = useDesk();
  const { pageFocus, clearPageFocus, flashId, flash } = useUi();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (pageFocus?.view !== 'revit') return;
    if (revitLogs.some((log) => log.id === pageFocus.id)) setViewing(pageFocus.id);
    clearPageFocus();
  }, [pageFocus, revitLogs, clearPageFocus]);

  const categories = useMemo(() => {
    const present = new Set(revitLogs.map(revitCategory));
    return ['All', ...REVIT_CATEGORIES.filter((name) => present.has(name))];
  }, [revitLogs]);
  const filtered = useMemo(() => revitLogs
    .filter((log) => category === 'All' || revitCategory(log) === category)
    .filter((log) => matchesText([log.issue, log.category, log.problem, log.solution, ...attachmentsOf(log).map((file) => file.name)], query))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''))), [revitLogs, category, query]);
  const [gridRef, pageSize] = useScreenPage({ minWidth: 280, rowHeight: ROW });
  const { page, pages, setPage, visible } = usePages(filtered, pageSize, `${query}|${category}|${revitLogs.length}`);

  const viewed = revitLogs.find((log) => log.id === viewing);
  const edited = editing === 'new' ? null : revitLogs.find((log) => log.id === editing);

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <p className="eyebrow">Spaces</p>
          <h1>Revit Trouble Shoot</h1>
          <p className="lede">Revit problems and how you fixed them, with reference files. Open a card for the full problem and solution.</p>
        </div>
        <div className="page-tools"><button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>+ New trouble shoot</button></div>
      </div>
      <div className="toolbar">
        <label className="sr-only" htmlFor="revit-search">Search Revit notes</label>
        <input id="revit-search" className="search-input" type="search" placeholder="Search issues, fixes and file names" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="filter-chips" role="group" aria-label="Category">
          {categories.map((name) => <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>)}
        </div>
        <span className="toolbar-count">{filtered.length} of {revitLogs.length}</span>
      </div>
      <div className="grid-frame" ref={gridRef}>
        {filtered.length ? (
          <ul className="card-grid fit" style={{ '--row-h': `${ROW}px` }}>
            {visible.map((log) => {
              const files = attachmentsOf(log);
              const image = files.find((file) => attachmentKind(file) === 'image');
              return (
                <li key={log.id}>
                  <button type="button" className={`note-card${flashId === log.id ? ' is-new' : ''}`} style={{ '--c': 'var(--revit)' }} onClick={() => setViewing(log.id)}>
                    {image ? <img className="note-thumb" src={image.dataUrl} alt="" /> : null}
                    <span className="card-top">
                      <span className="chip"><i />{revitCategory(log)}</span>
                      <span className="card-date">{formatISO(log.date)}</span>
                    </span>
                    <strong className="card-title">{log.issue || 'Untitled issue'}</strong>
                    {log.problem || log.solution ? <FitText className="card-text">{log.problem || log.solution}</FitText> : <FitText className="card-text is-empty">No description yet.</FitText>}
                    <span className="card-foot">
                      {log.solution ? <span>Has a fix</span> : null}
                      {files.length ? <span className="on-cal">{files.length} file{files.length === 1 ? '' : 's'}</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty-panel">
            <p>{revitLogs.length ? 'No Revit notes match this search.' : 'No Revit troubleshooting notes yet. Save the next fix you find.'}</p>
            {!revitLogs.length ? <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>+ New trouble shoot</button> : null}
          </div>
        )}
      </div>
      <Pager page={page} pages={pages} onPage={setPage} label="Revit note pages" />
      {viewed ? <RevitViewer log={viewed} onClose={() => setViewing(null)} onEdit={() => { setViewing(null); setEditing(viewed.id); }} /> : null}
      {editing ? <RevitEditor log={edited} onClose={() => setEditing(null)} onSaved={(id) => { setEditing(null); flash(id); }} /> : null}
    </div>
  );
}
