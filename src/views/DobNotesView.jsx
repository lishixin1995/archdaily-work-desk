import { useEffect, useMemo, useState } from 'react';
import { AttachmentField, AttachmentGallery } from '../components/Attachments.jsx';
import { ConfirmButton } from '../components/ConfirmButton.jsx';
import { FitText } from '../components/FitText.jsx';
import { Modal } from '../components/Modal.jsx';
import { Pager, usePages, useScreenPage } from '../components/Pager.jsx';
import { useToast } from '../components/Toast.jsx';
import { useDesk, useUi } from '../desk.jsx';
import { formatISO, todayISO } from '../lib/dates.js';
import { attachmentKind, attachmentsOf, DOB_FILES } from '../lib/files.js';
import { DOB_CATEGORIES, normalizeDobCategory } from '../lib/library.js';
import { copyText, matchesText, nowTimestamp, uid } from '../lib/text.js';

const ROW = 288;

function DobEditor({ note, onClose, onSaved }) {
  const { setDobNotes } = useDesk();
  const toast = useToast();
  const [draft, setDraft] = useState(() => ({
    title: note?.title || '',
    category: normalizeDobCategory(note?.category),
    date: note?.date || todayISO(),
    year: note?.year || '',
    code: note?.code || '',
    chapter: note?.chapter || '',
    notes: note?.notes || '',
    attachments: attachmentsOf(note)
  }));
  const [error, setError] = useState('');
  const set = (field) => (value) => { setDraft((current) => ({ ...current, [field]: value })); setError(''); };
  const input = (field) => ({ value: draft[field], onChange: (event) => set(field)(event.target.value) });

  function save(event) {
    event?.preventDefault();
    if (!draft.title.trim() && !draft.notes.trim() && !draft.attachments.length) {
      setError('Add a title, the note or a file first.');
      return;
    }
    const now = nowTimestamp();
    const fields = { ...draft, title: draft.title.trim(), year: draft.year.trim(), code: draft.code.trim(), chapter: draft.chapter.trim(), updatedAt: now };
    let id = note?.id;
    if (note) {
      // The old single screenshot is part of the attachments list now.
      setDobNotes((list) => list.map((item) => {
        if (item.id !== note.id) return item;
        const { screenshot, ...rest } = item;
        return { ...rest, ...fields };
      }));
    } else {
      id = uid();
      setDobNotes((list) => [{ ...fields, id, createdAt: now }, ...list]);
    }
    toast(`Saved "${fields.title || 'DOB note'}".`);
    onSaved(id);
  }

  return (
    <Modal
      eyebrow="DOB Notes"
      title={note ? 'Edit DOB note' : 'New DOB note'}
      onClose={onClose}
      wide
      footer={<><span className="foot-spacer" /><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={save}>Save note</button></>}
    >
      <form className="sheet-form" onSubmit={save} noValidate>
        <label className="field field-wide"><span>Title</span><input type="text" placeholder="Code / DOB quick note title" {...input('title')} /></label>
        <label className="field">
          <span>Category</span>
          <select {...input('category')}>{DOB_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>
        </label>
        <label className="field"><span>Date</span><input type="date" {...input('date')} /></label>
        <label className="field"><span>Year</span><input type="text" placeholder="e.g. 2022" {...input('year')} /></label>
        <label className="field field-span2"><span>Code</span><input type="text" placeholder="e.g. NYC Building Code" {...input('code')} /></label>
        <label className="field"><span>Chapter</span><input type="text" placeholder="e.g. Chapter 3 / 310.3" {...input('chapter')} /></label>
        <label className="field field-wide"><span>Full note</span><textarea rows={9} placeholder="Write the complete DOB / code note here." {...input('notes')} /></label>
        <div className="field field-wide">
          <span>Attachments</span>
          <AttachmentField id="dob-files" rules={DOB_FILES} attachments={draft.attachments} onChange={set('attachments')} />
        </div>
        {error ? <p className="form-error field-wide" role="alert">{error}</p> : null}
        <button type="submit" hidden>Save</button>
      </form>
    </Modal>
  );
}

function DobViewer({ note, onClose, onEdit }) {
  const { setDobNotes } = useDesk();
  const toast = useToast();
  const facts = [['Date', formatISO(note.date)], ['Category', normalizeDobCategory(note.category)], ['Code', note.code], ['Chapter', note.chapter], ['Year', note.year]].filter(([, value]) => value);
  return (
    <Modal
      eyebrow={`DOB note · ${normalizeDobCategory(note.category)}`}
      title={note.title || 'DOB note'}
      onClose={onClose}
      wide
      footer={(
        <>
          <ConfirmButton onConfirm={() => { setDobNotes((list) => list.filter((item) => item.id !== note.id)); toast(`Deleted "${note.title || 'DOB note'}".`); onClose(); }} />
          <span className="foot-spacer" />
          <button type="button" className="btn" onClick={async () => toast((await copyText(note.notes || '')) ? 'Note copied.' : 'Copy did not work here. Select the text and copy it instead.')}>Copy note</button>
          <button type="button" className="btn btn-primary" onClick={onEdit}>Edit</button>
        </>
      )}
    >
      <dl className="facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {note.notes ? <p className="note-text">{note.notes}</p> : <p className="empty">No note text yet.</p>}
      <AttachmentGallery attachments={attachmentsOf(note)} />
    </Modal>
  );
}

export function DobNotesView() {
  const { dobNotes } = useDesk();
  const { pageFocus, clearPageFocus, flashId, flash } = useUi();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (pageFocus?.view !== 'dob') return;
    if (dobNotes.some((note) => note.id === pageFocus.id)) setViewing(pageFocus.id);
    clearPageFocus();
  }, [pageFocus, dobNotes, clearPageFocus]);

  const categories = useMemo(() => {
    const present = new Set(dobNotes.map((note) => normalizeDobCategory(note.category)));
    return ['All', ...DOB_CATEGORIES.filter((name) => present.has(name))];
  }, [dobNotes]);
  const filtered = useMemo(() => dobNotes
    .filter((note) => category === 'All' || normalizeDobCategory(note.category) === category)
    .filter((note) => matchesText([note.title, note.category, note.code, note.chapter, note.year, note.notes, ...attachmentsOf(note).map((file) => file.name)], query))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''))), [dobNotes, category, query]);
  const [gridRef, pageSize] = useScreenPage({ minWidth: 280, rowHeight: ROW });
  const { page, pages, setPage, visible } = usePages(filtered, pageSize, `${query}|${category}|${dobNotes.length}`);

  const viewed = dobNotes.find((note) => note.id === viewing);
  const edited = editing === 'new' ? null : dobNotes.find((note) => note.id === editing);

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <p className="eyebrow" style={{ color: 'var(--dob)' }}>Code / DOB memory</p>
          <h1>DOB Notes</h1>
          <p className="lede">Code, zoning and DOB notes with their screenshots, PDFs and Word files. Open a card for the full note.</p>
        </div>
        <div className="page-tools"><button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>+ New note</button></div>
      </div>
      <div className="toolbar">
        <label className="sr-only" htmlFor="dob-search">Search DOB notes</label>
        <input id="dob-search" className="search-input" type="search" placeholder="Search notes, codes, chapters and file names" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="filter-chips" role="group" aria-label="Category">
          {categories.map((name) => <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>)}
        </div>
        <span className="toolbar-count">{filtered.length} of {dobNotes.length}</span>
      </div>
      <div className="grid-frame" ref={gridRef}>
        {filtered.length ? (
          <ul className="card-grid fit" style={{ '--row-h': `${ROW}px` }}>
            {visible.map((note) => {
              const files = attachmentsOf(note);
              const image = files.find((file) => attachmentKind(file) === 'image');
              const reference = [note.code, note.chapter, note.year].filter(Boolean).join(' · ');
              return (
                <li key={note.id}>
                  <button type="button" className={`note-card${flashId === note.id ? ' is-new' : ''}`} style={{ '--c': 'var(--dob)' }} onClick={() => setViewing(note.id)}>
                    {image ? <img className="note-thumb" src={image.dataUrl} alt="" /> : null}
                    <span className="card-top">
                      <span className="chip"><i />{normalizeDobCategory(note.category)}</span>
                      <span className="card-date">{formatISO(note.date)}</span>
                    </span>
                    <strong className="card-title">{note.title || 'DOB note'}</strong>
                    {note.notes ? <FitText className="card-text">{note.notes}</FitText> : <FitText className="card-text is-empty">No note text yet.</FitText>}
                    <span className="card-foot">
                      {reference ? <span className="foot-ref">{reference}</span> : null}
                      {files.length ? <span className="on-cal">{files.length} file{files.length === 1 ? '' : 's'}</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty-panel">
            <p>{dobNotes.length ? 'No DOB notes match this search.' : 'No DOB notes yet. Save your first code note, screenshot or PDF.'}</p>
            {!dobNotes.length ? <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>+ New note</button> : null}
          </div>
        )}
      </div>
      <Pager page={page} pages={pages} onPage={setPage} label="DOB note pages" />
      {viewed ? <DobViewer note={viewed} onClose={() => setViewing(null)} onEdit={() => { setViewing(null); setEditing(viewed.id); }} /> : null}
      {editing ? <DobEditor note={edited} onClose={() => setEditing(null)} onSaved={(id) => { setEditing(null); flash(id); }} /> : null}
    </div>
  );
}
