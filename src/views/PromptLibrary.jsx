import { useState } from 'react';
import { EditDialog } from '../components/EditDialog.jsx';
import { FullNoteModal } from '../components/FullNoteModal.jsx';
import { PageHeading } from '../components/PageHeading.jsx';
import { PROMPT_CATEGORIES } from '../lib/library.js';
import { copyText, matchesQuery, nowTimestamp, uid } from '../lib/text.js';

export function PromptLibrary({ prompts, setPrompts }) {
  const [form, setForm] = useState({ category: 'Rendering', title: '', prompt: '', favorite: false });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [openPrompt, setOpenPrompt] = useState(null);
  const [editing, setEditing] = useState(null);
  const filtered = prompts.filter((prompt) => matchesQuery(prompt, search) && (category === 'All' || prompt.category === category) && (!favoritesOnly || prompt.favorite));

  function addPrompt(event) {
    event.preventDefault();
    if (!form.title.trim() && !form.prompt.trim()) return;
    const now = nowTimestamp();
    setPrompts((list) => [{ ...form, id: uid(), createdAt: now, updatedAt: now }, ...list]);
    setForm({ category: form.category, title: '', prompt: '', favorite: false });
  }

  function updatePrompt(id, patch) {
    setPrompts((list) => list.map((prompt) => (prompt.id === id ? { ...prompt, ...patch, updatedAt: nowTimestamp() } : prompt)));
  }

  return (
    <>
      <PageHeading eyebrow="AI Prompt Memory" title="AI Prompt Library">Save long prompts as compact cards. Open any card to read or copy the full prompt.</PageHeading>
      <div className="libraryFilters"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search prompts..." /><select value={category} onChange={(e) => setCategory(e.target.value)}><option>All</option>{PROMPT_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select><label className="checkLine"><input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} /> Favorites only</label></div>
      <form className="cardForm" onSubmit={addPrompt}>
        <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{PROMPT_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select></label>
        <label className="checkLine lowerCheck"><input type="checkbox" checked={form.favorite} onChange={(e) => setForm({ ...form, favorite: e.target.checked })} /> Favorite</label>
        <label className="wide">Prompt title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Prompt title" /></label>
        <label className="wide">Full prompt<textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} placeholder="Paste full AI prompt here..." /></label>
        <button type="submit" className="primary wide">Add Prompt</button>
      </form>
      <section className="libraryGrid">
        {filtered.length === 0 ? <div className="empty wideEmpty">No prompts yet.</div> : filtered.map((prompt) => (
          <article key={prompt.id} className="libraryCard" onClick={() => setOpenPrompt(prompt)}>
            <p className="eyebrow">{prompt.favorite ? '★ ' : ''}{prompt.category || 'Prompt'}</p>
            <h3>{prompt.title || 'Untitled Prompt'}</h3>
            <p className="clampedText">{prompt.prompt}</p>
            <div className="cardActions" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="editButton" onClick={() => setEditing({ ...prompt })}>Edit</button>
              <button type="button" onClick={() => setOpenPrompt(prompt)}>View full prompt</button>
              <button type="button" onClick={() => copyText(prompt.prompt || '')}>Copy</button>
              <button type="button" onClick={() => updatePrompt(prompt.id, { favorite: !prompt.favorite })}>{prompt.favorite ? 'Unstar' : 'Star'}</button>
              <button type="button" className="danger" onClick={() => setPrompts((list) => list.filter((item) => item.id !== prompt.id))}>Delete</button>
            </div>
          </article>
        ))}
      </section>
      {openPrompt && <FullNoteModal eyebrow="AI Prompt Library" title={openPrompt.title || 'Untitled Prompt'} meta={[['Category', openPrompt.category], ['Favorite', openPrompt.favorite ? 'Yes' : 'No']]} sections={[['Full prompt', openPrompt.prompt]]} copyText={openPrompt.prompt || ''} onClose={() => setOpenPrompt(null)} />}
      {editing && (
        <EditDialog
          title="Edit AI Prompt"
          onClose={() => setEditing(null)}
          onSave={() => {
            updatePrompt(editing.id, { category: editing.category, title: (editing.title || '').trim(), prompt: editing.prompt || '', favorite: Boolean(editing.favorite) });
            setEditing(null);
          }}
        >
          <label>Category<select value={editing.category || 'Rendering'} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>{[...new Set([...PROMPT_CATEGORIES, editing.category || 'Rendering'])].map((cat) => <option key={cat}>{cat}</option>)}</select></label>
          <label className="editCheck"><input type="checkbox" checked={Boolean(editing.favorite)} onChange={(e) => setEditing({ ...editing, favorite: e.target.checked })} /> Favorite</label>
          <label className="wide">Prompt title<input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
          <label className="wide">Full prompt<textarea value={editing.prompt || ''} onChange={(e) => setEditing({ ...editing, prompt: e.target.value })} /></label>
        </EditDialog>
      )}
    </>
  );
}
