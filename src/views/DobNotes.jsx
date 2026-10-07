import { useState } from 'react';
import { AttachmentDrop } from '../components/AttachmentDrop.jsx';
import { FullNoteModal } from '../components/FullNoteModal.jsx';
import { PageHeading } from '../components/PageHeading.jsx';
import { CategoryPager, useCategoryPages } from '../components/Pager.jsx';
import { niceDate, todayISO } from '../lib/dates.js';
import { attachmentsOf, DOB_FILES } from '../lib/files.js';
import { DOB_CATEGORIES, normalizeDobCategory } from '../lib/library.js';
import { matchesQuery, nowTimestamp, uid } from '../lib/text.js';

const PAGE_SIZE = 2;
const emptyNote = (category = 'General') => ({ date: todayISO(), category: normalizeDobCategory(category), year: '', code: '', chapter: '', title: '', notes: '', attachments: [] });

export function DobNotes({ dobNotes, setDobNotes }) {
  const [form, setForm] = useState(() => emptyNote());
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [openNote, setOpenNote] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [pages, setPage] = useCategoryPages(`${search}|${category}|${dobNotes.length}`);
  const filtered = dobNotes.filter((note) => matchesQuery(note, search) && (category === 'All' || normalizeDobCategory(note.category) === category));
  const groups = DOB_CATEGORIES
    .map((name) => ({ category: name, items: filtered.filter((item) => normalizeDobCategory(item.category) === name) }))
    .filter((group) => group.items.length > 0);

  function resetForm(nextCategory = form.category) {
    setEditingNoteId(null);
    setForm(emptyNote(nextCategory));
  }

  function startEdit(note) {
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
      attachments: attachmentsOf(note),
    });
    window.setTimeout(() => {
      document.querySelector('[data-dob-note-form]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  function saveNote(event) {
    event.preventDefault();
    if (!form.title.trim() && !form.notes.trim() && !form.attachments.length) return;
    const now = nowTimestamp();
    // The single legacy screenshot now lives in the attachments list.
    const next = { ...form, year: form.year.trim(), code: form.code.trim(), chapter: form.chapter.trim(), title: form.title.trim(), screenshot: null, updatedAt: now };
    if (editingNoteId) setDobNotes((notes) => notes.map((note) => (note.id === editingNoteId ? { ...note, ...next } : note)));
    else setDobNotes((notes) => [{ ...next, id: uid(), createdAt: now }, ...notes]);
    resetForm(form.category);
  }

  function deleteNote(id) {
    setDobNotes((notes) => notes.filter((note) => note.id !== id));
    if (editingNoteId === id) resetForm();
  }

  return (
    <>
      <PageHeading eyebrow="Code / DOB Memory" title="DOB Notes">Compact cards with full-note modal for long code notes.</PageHeading>
      <div className="libraryFilters"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search DOB notes..." /><select value={category} onChange={(e) => setCategory(e.target.value)}><option>All</option>{DOB_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select></div>

      <section className="categoryGroups">
        {!filtered.length ? <div className="empty wideEmpty">No saved items yet.</div> : groups.map((group) => {
          const totalPages = Math.max(1, Math.ceil(group.items.length / PAGE_SIZE));
          const page = Math.min(pages[group.category] || 0, totalPages - 1);
          return (
            <section key={group.category} className="categorySection">
              <div className="categoryHead">
                <div>
                  <p className="eyebrow">Saved DOB Notes</p>
                  <h3>{group.category}</h3>
                </div>
                <CategoryPager label={`${group.category} notes`} page={page} pages={totalPages} onPage={(next) => setPage(group.category, next)} />
              </div>
              <section className="libraryGrid categoryCards">
                {group.items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((item) => (
                  <article key={item.id} className="libraryCard" onClick={() => setOpenNote(item)}>
                    <p className="eyebrow">{group.category}</p>
                    <h3>{item.title || item.category || 'DOB Note'}</h3>
                    <p className="clampedText">{item.notes}</p>
                    <div className="cardActions" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => setOpenNote(item)}>View full notes</button>
                      <button type="button" className="editButton" onClick={() => startEdit(item)}>Edit</button>
                      <button type="button" className="danger" onClick={() => deleteNote(item.id)}>Delete</button>
                    </div>
                  </article>
                ))}
              </section>
            </section>
          );
        })}
      </section>

      <form className="cardForm" onSubmit={saveNote} data-dob-note-form>
        {editingNoteId && (
          <div className="wide editFormNotice">
            <strong>Editing saved DOB note</strong>
            <button type="button" onClick={() => resetForm()}>Cancel edit</button>
          </div>
        )}
        <label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{DOB_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select></label>
        <label>Year<input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="e.g. 2022" /></label>
        <label>Code<input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. NYC Building Code" /></label>
        <label>Chapter<input value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} placeholder="e.g. Chapter 3 / 310.3" /></label>
        <label className="wide">Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Code / DOB quick note title" /></label>
        <label className="wide">Full note<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Write the complete DOB/code note here..." /></label>
        <AttachmentDrop label="Attachment upload" rules={DOB_FILES} attachments={form.attachments} onChange={(attachments) => setForm((current) => ({ ...current, attachments }))} />
        <button type="submit" className="primary wide">{editingNoteId ? 'Save DOB Note Changes' : 'Add DOB Note'}</button>
      </form>

      {openNote && (
        <FullNoteModal
          eyebrow="DOB Notes"
          title={openNote.title || 'DOB Note'}
          meta={[['Date', niceDate(openNote.date)], ['Category', openNote.category], ['Year', openNote.year || '—'], ['Code', openNote.code || '—'], ['Chapter', openNote.chapter || '—'], ['Attachments', attachmentsOf(openNote).length ? `${attachmentsOf(openNote).length} saved` : '—']]}
          sections={[['Full DOB note', openNote.notes]]}
          attachments={attachmentsOf(openNote)}
          copyText={openNote.notes || ''}
          onClose={() => setOpenNote(null)}
        />
      )}
    </>
  );
}
