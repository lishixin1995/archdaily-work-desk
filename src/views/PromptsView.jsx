import { useEffect, useMemo, useState } from 'react';
import { ConfirmButton } from '../components/ConfirmButton.jsx';
import { Modal } from '../components/Modal.jsx';
import { Pager, usePages, useScreenPage } from '../components/Pager.jsx';
import { useToast } from '../components/Toast.jsx';
import { useDesk, useUi } from '../desk.jsx';
import { PROMPT_CATEGORIES } from '../lib/library.js';
import { copyText, matchesText, nowTimestamp, uid } from '../lib/text.js';

function StarButton({ prompt }) {
  const { setPrompts } = useDesk();
  return (
    <button
      type="button"
      className={`star-btn${prompt.favorite ? ' is-on' : ''}`}
      aria-pressed={Boolean(prompt.favorite)}
      aria-label={prompt.favorite ? `Unstar ${prompt.title || 'prompt'}` : `Star ${prompt.title || 'prompt'}`}
      onClick={(event) => {
        event.stopPropagation();
        setPrompts((list) => list.map((item) => (item.id === prompt.id ? { ...item, favorite: !item.favorite, updatedAt: nowTimestamp() } : item)));
      }}
    >
      {prompt.favorite ? '★' : '☆'}
    </button>
  );
}

function PromptEditor({ prompt, onClose }) {
  const { setPrompts } = useDesk();
  const toast = useToast();
  const [draft, setDraft] = useState(() => ({ title: prompt?.title || '', category: prompt?.category || 'Rendering', prompt: prompt?.prompt || '', favorite: Boolean(prompt?.favorite) }));
  const [error, setError] = useState('');
  const set = (field) => (event) => { setDraft((current) => ({ ...current, [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value })); setError(''); };

  function save(event) {
    event?.preventDefault();
    if (!draft.title.trim() && !draft.prompt.trim()) {
      setError('Add a title or the prompt text first.');
      return;
    }
    const now = nowTimestamp();
    const next = { ...draft, title: draft.title.trim() };
    if (prompt) setPrompts((list) => list.map((item) => (item.id === prompt.id ? { ...item, ...next, updatedAt: now } : item)));
    else setPrompts((list) => [{ ...next, id: uid(), createdAt: now, updatedAt: now }, ...list]);
    toast(`Saved "${next.title || 'Untitled prompt'}".`);
    onClose();
  }

  return (
    <Modal
      eyebrow="AI Prompt Library"
      title={prompt ? 'Edit prompt' : 'New prompt'}
      onClose={onClose}
      wide
      footer={<><span className="foot-spacer" /><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={save}>Save prompt</button></>}
    >
      <form className="sheet-form" onSubmit={save} noValidate>
        <label className="field field-wide"><span>Prompt title</span><input type="text" value={draft.title} placeholder="Dusk exterior render" onChange={set('title')} /></label>
        <label className="field">
          <span>Category</span>
          <select value={draft.category} onChange={set('category')}>
            {[...new Set([...PROMPT_CATEGORIES, draft.category])].map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
        <label className="field toggle-field favorite-field">
          <input type="checkbox" checked={draft.favorite} onChange={set('favorite')} />
          <span>Favorite</span>
        </label>
        <label className="field field-wide"><span>Full prompt</span><textarea rows={12} className="mono-text" value={draft.prompt} placeholder="Paste the full AI prompt here." onChange={set('prompt')} /></label>
        {error ? <p className="form-error field-wide" role="alert">{error}</p> : null}
        <button type="submit" hidden>Save</button>
      </form>
    </Modal>
  );
}

function PromptViewer({ prompt, onClose, onEdit }) {
  const toast = useToast();
  return (
    <Modal
      eyebrow={`AI prompt · ${prompt.category || 'Prompt'}${prompt.favorite ? ' · ★ Favorite' : ''}`}
      title={prompt.title || 'Untitled prompt'}
      onClose={onClose}
      wide
      footer={(
        <>
          <button type="button" className="btn" onClick={onEdit}>Edit</button>
          <StarButton prompt={prompt} />
          <span className="foot-spacer" />
          <button type="button" className="btn btn-primary" onClick={async () => toast((await copyText(prompt.prompt || '')) ? 'Prompt copied.' : 'Copy did not work here. Select the text and copy it instead.')}>Copy prompt</button>
        </>
      )}
    >
      <pre className="prompt-text">{prompt.prompt || 'No prompt text yet.'}</pre>
    </Modal>
  );
}

export function PromptsView() {
  const { prompts, setPrompts } = useDesk();
  const { pageFocus, clearPageFocus } = useUi();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (pageFocus?.view !== 'prompts') return;
    if (prompts.some((item) => item.id === pageFocus.id)) setViewing(pageFocus.id);
    clearPageFocus();
  }, [pageFocus, prompts, clearPageFocus]);

  const categories = useMemo(() => {
    const present = new Set(prompts.map((item) => item.category || 'Other'));
    return ['All', ...PROMPT_CATEGORIES.filter((name) => present.has(name)), ...[...present].filter((name) => !PROMPT_CATEGORIES.includes(name))];
  }, [prompts]);
  const filtered = useMemo(() => prompts
    .filter((item) => category === 'All' || (item.category || 'Other') === category)
    .filter((item) => !favoritesOnly || item.favorite)
    .filter((item) => matchesText([item.title, item.category, item.prompt], query)), [prompts, category, favoritesOnly, query]);
  const [gridRef, pageSize] = useScreenPage({ minWidth: 280, rowHeight: 236 });
  const { page, pages, setPage, visible } = usePages(filtered, pageSize, `${query}|${category}|${favoritesOnly}|${prompts.length}`);

  const viewed = prompts.find((item) => item.id === viewing);
  const edited = editing === 'new' ? null : prompts.find((item) => item.id === editing);

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <p className="eyebrow">Spaces</p>
          <h1>AI Prompt Library</h1>
          <p className="lede">Long prompts saved as compact cards. Star the ones you reuse, and copy any prompt in a click.</p>
        </div>
        <div className="page-tools"><button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>+ New prompt</button></div>
      </div>
      <div className="toolbar">
        <label className="sr-only" htmlFor="prompt-search">Search prompts</label>
        <input id="prompt-search" className="search-input" type="search" placeholder="Search prompts" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="filter-chips" role="group" aria-label="Category">
          {categories.map((name) => <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>)}
          <button type="button" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly((value) => !value)}>★ Favorites</button>
        </div>
        <span className="toolbar-count">{filtered.length} of {prompts.length}</span>
      </div>
      <div className="grid-frame" ref={gridRef}>
        {filtered.length ? (
          <ul className="card-grid fit" style={{ '--row-h': '236px' }}>
            {visible.map((item) => (
              <li key={item.id}>
                <article className="prompt-card">
                  <span className="card-top">
                    <span className="chip" style={{ '--c': 'var(--accent)' }}><i />{item.category || 'Other'}</span>
                    <StarButton prompt={item} />
                  </span>
                  <button type="button" className="card-title card-link" onClick={() => setViewing(item.id)}>{item.title || 'Untitled prompt'}</button>
                  <span className="card-text mono-text">{item.prompt || 'No prompt text yet.'}</span>
                  <span className="card-actions">
                    <button type="button" className="btn btn-small btn-primary" onClick={async () => toast((await copyText(item.prompt || '')) ? 'Prompt copied.' : 'Copy did not work here. Open the prompt and copy it instead.')}>Copy</button>
                    <button type="button" className="btn btn-small" onClick={() => setViewing(item.id)}>Open</button>
                    <button type="button" className="btn btn-small" onClick={() => setEditing(item.id)}>Edit</button>
                    <ConfirmButton className="btn btn-small btn-danger" confirmLabel="Confirm" onConfirm={() => { setPrompts((list) => list.filter((entry) => entry.id !== item.id)); toast(`Deleted "${item.title || 'Untitled prompt'}".`); }} />
                  </span>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-panel">
            <p>{prompts.length ? 'No prompts match this search.' : 'No prompts yet. Save the ones you reuse.'}</p>
            {!prompts.length ? <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>+ New prompt</button> : null}
          </div>
        )}
      </div>
      <Pager page={page} pages={pages} onPage={setPage} label="Prompt pages" />
      {viewed ? <PromptViewer prompt={viewed} onClose={() => setViewing(null)} onEdit={() => { setViewing(null); setEditing(viewed.id); }} /> : null}
      {editing ? <PromptEditor prompt={edited} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
