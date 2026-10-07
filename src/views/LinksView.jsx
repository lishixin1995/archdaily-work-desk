import { useEffect, useMemo, useState } from 'react';
import { ConfirmButton } from '../components/ConfirmButton.jsx';
import { Modal } from '../components/Modal.jsx';
import { Pager, useMedia, usePages, useScreenPage } from '../components/Pager.jsx';
import { PlanetIcon } from '../components/PlanetIcon.jsx';
import { useToast } from '../components/Toast.jsx';
import { useDesk } from '../desk.jsx';
import { getFaviconUrl, getLinkHost, LINK_CATEGORIES, normalizeLinkCategory, normalizeUrl } from '../lib/library.js';
import { nowTimestamp, uid } from '../lib/text.js';

function LinkEditor({ link, onClose }) {
  const { setLinks } = useDesk();
  const toast = useToast();
  const [draft, setDraft] = useState(() => ({ title: link?.title || '', url: link?.url || '', category: link ? normalizeLinkCategory(link.category) : 'Code' }));
  const [error, setError] = useState('');
  const set = (field) => (event) => { setDraft((current) => ({ ...current, [field]: event.target.value })); setError(''); };

  function save(event) {
    event?.preventDefault();
    if (!draft.title.trim() || !draft.url.trim()) {
      setError('Add a name and a URL first.');
      return;
    }
    const now = nowTimestamp();
    const next = { title: draft.title.trim(), url: normalizeUrl(draft.url), category: draft.category };
    if (link) setLinks((list) => list.map((item) => (item.id === link.id ? { ...item, ...next, updatedAt: now } : item)));
    else setLinks((list) => [{ ...next, id: uid(), createdAt: now, updatedAt: now }, ...list]);
    toast(`Saved "${next.title}".`);
    onClose();
  }

  return (
    <Modal
      eyebrow="Links"
      title={link ? 'Edit link' : 'New link'}
      onClose={onClose}
      footer={<><span className="foot-spacer" /><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={save}>Save link</button></>}
    >
      <form className="sheet-form two-col" onSubmit={save} noValidate>
        <label className="field field-wide"><span>Button name</span><input type="text" value={draft.title} placeholder="DOB BIS / Zoning Text" onChange={set('title')} /></label>
        <label className="field field-wide"><span>URL</span><input type="url" inputMode="url" value={draft.url} placeholder="https://" onChange={set('url')} /></label>
        <label className="field">
          <span>Category</span>
          <select value={draft.category} onChange={set('category')}>{LINK_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>
        </label>
        {error ? <p className="form-error field-wide" role="alert">{error}</p> : null}
        <button type="submit" hidden>Save</button>
      </form>
    </Modal>
  );
}

// Remembers which icons loaded, so paging back does not flash the planet.
const iconState = new Map();

function LinkIcon({ link }) {
  const icon = getFaviconUrl(link.url);
  const [state, setState] = useState(() => (icon ? iconState.get(icon) || 'loading' : 'none'));
  useEffect(() => { setState(icon ? iconState.get(icon) || 'loading' : 'none'); }, [icon]);
  const settle = (next) => { iconState.set(icon, next); setState(next); };
  return (
    <span className={`link-icon${state === 'none' ? ' is-planet' : ''}`} aria-hidden="true">
      {state === 'none' ? (
        <PlanetIcon seed={getLinkHost(link.url) || link.title} />
      ) : (
        <img
          src={icon}
          alt=""
          className={state === 'loading' ? 'is-loading' : ''}
          onLoad={(event) => settle(event.currentTarget.naturalWidth > 16 ? 'ok' : 'none')}
          onError={() => settle('none')}
        />
      )}
    </span>
  );
}

export function LinksView() {
  const { links, setLinks } = useDesk();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [editing, setEditing] = useState(null);

  const categories = useMemo(() => {
    const present = new Set(links.map((item) => normalizeLinkCategory(item.category)));
    return ['All', ...LINK_CATEGORIES.filter((name) => present.has(name))];
  }, [links]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return links
      .filter((item) => category === 'All' || normalizeLinkCategory(item.category) === category)
      .filter((item) => !needle || [item.title, item.url, item.category].join(' ').toLowerCase().includes(needle));
  }, [links, category, query]);
  // Wide enough for Edit and Delete on one row; phones keep two tiles per row.
  const compact = useMedia('(max-width: 640px)');
  const tile = compact ? { minWidth: 150, rowHeight: 200 } : { minWidth: 200, rowHeight: 196 };
  const [gridRef, pageSize] = useScreenPage({ ...tile, gap: 12 });
  const { page, pages, setPage, visible } = usePages(filtered, pageSize, `${query}|${category}|${links.length}`);

  const edited = editing === 'new' ? null : links.find((item) => item.id === editing);

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <p className="eyebrow">Spaces</p>
          <h1>Links</h1>
          <p className="lede">DOB, code, zoning, general and info links, one click away.</p>
        </div>
        <div className="page-tools"><button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>+ Add link</button></div>
      </div>
      <div className="toolbar">
        <label className="sr-only" htmlFor="link-search">Search links</label>
        <input id="link-search" className="search-input" type="search" placeholder="Search links" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="filter-chips" role="group" aria-label="Category">
          {categories.map((name) => <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>)}
        </div>
        <span className="toolbar-count">{filtered.length} of {links.length}</span>
      </div>
      <div className="grid-frame" ref={gridRef}>
        {filtered.length ? (
          <ul className="link-grid fit" style={{ '--row-h': `${tile.rowHeight}px`, '--tile-min': `${tile.minWidth}px` }}>
            {visible.map((link) => (
              <li key={link.id} className="link-tile">
                <span className="link-cat">{normalizeLinkCategory(link.category)}</span>
                <a className="link-open" href={normalizeUrl(link.url)} target="_blank" rel="noreferrer">
                  <LinkIcon link={link} />
                  <strong>{link.title}</strong>
                  <span>{getLinkHost(link.url) || normalizeLinkCategory(link.category)}</span>
                </a>
                <span className="link-actions">
                  <button type="button" className="btn btn-small" onClick={() => setEditing(link.id)}>Edit</button>
                  <ConfirmButton className="btn btn-small btn-danger" confirmLabel="Confirm" onConfirm={() => { setLinks((list) => list.filter((item) => item.id !== link.id)); toast(`Deleted "${link.title}".`); }} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-panel">
            <p>{links.length ? 'No links match this search.' : 'No links yet. Save the sites you open often.'}</p>
            {!links.length ? <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>+ Add link</button> : null}
          </div>
        )}
      </div>
      <Pager page={page} pages={pages} onPage={setPage} label="Link pages" />
      {editing ? <LinkEditor link={edited} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
