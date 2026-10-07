import { useState } from 'react';
import { PageHeading } from '../components/PageHeading.jsx';
import { useCategoryPages } from '../components/Pager.jsx';
import { getFaviconUrl, getLinkInitial, LINK_CATEGORIES, normalizeLinkCategory, normalizeUrl } from '../lib/library.js';
import { nowTimestamp, uid } from '../lib/text.js';

const PAGE_SIZE = 4;

export function LinkLibrary({ links, setLinks }) {
  const [linkForm, setLinkForm] = useState({ title: '', url: '', category: 'Code' });
  const [editingLinkId, setEditingLinkId] = useState(null);
  const [pages, setPage] = useCategoryPages('');

  function resetForm(nextCategory = linkForm.category) {
    setEditingLinkId(null);
    setLinkForm({ title: '', url: '', category: nextCategory || 'Code' });
  }

  function saveLink(event) {
    event.preventDefault();
    const url = normalizeUrl(linkForm.url);
    const title = linkForm.title.trim();
    if (!title || !url) return;
    const category = normalizeLinkCategory(linkForm.category);
    const now = nowTimestamp();
    if (editingLinkId) setLinks((list) => list.map((link) => (link.id === editingLinkId ? { ...link, title, url, category, updatedAt: now } : link)));
    else setLinks((list) => [{ title, url, category, id: uid(), createdAt: now, updatedAt: now }, ...list]);
    setPage(category, 0);
    resetForm(category);
  }

  function startEdit(link) {
    setEditingLinkId(link.id);
    setLinkForm({ title: link.title || '', url: link.url || '', category: normalizeLinkCategory(link.category) });
    window.setTimeout(() => {
      document.querySelector('[data-link-form]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  function deleteLink(id) {
    setLinks((list) => list.filter((link) => link.id !== id));
    if (editingLinkId === id) resetForm();
  }

  return (
    <>
      <PageHeading eyebrow="Quick Access" title="Links">DOB, code, zoning, general, and info links.</PageHeading>

      <form className="cardForm linkLibraryForm" onSubmit={saveLink} data-link-form>
        {editingLinkId && (
          <div className="wide editFormNotice">
            <strong>Editing saved link</strong>
            <button type="button" onClick={() => resetForm()}>Cancel edit</button>
          </div>
        )}
        <label>Button name<input value={linkForm.title} onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })} placeholder="DOB BIS / Zoning Text" /></label>
        <label className="linkUrlField">URL<input value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} placeholder="Paste link" /></label>
        <label>Category<select value={linkForm.category} onChange={(e) => setLinkForm({ ...linkForm, category: e.target.value })}>{LINK_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select></label>
        <button type="submit" className="primary">{editingLinkId ? 'Save Link Changes' : 'Add Link'}</button>
      </form>

      <section className="linkCategoryGrid">
        {LINK_CATEGORIES.map((category) => {
          const categoryLinks = links.filter((link) => normalizeLinkCategory(link.category) === category);
          const pageCount = Math.max(1, Math.ceil(categoryLinks.length / PAGE_SIZE));
          const page = Math.min(pages[category] || 0, pageCount - 1);
          const visibleLinks = categoryLinks.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
          return (
            <article key={category} className="linkCategoryCard">
              <div className="linkCategoryHead">
                <div>
                  <p className="eyebrow">{category.toUpperCase()}</p>
                  <h3>{category}</h3>
                </div>
                <div className="linkPageControls">
                  <button type="button" onClick={() => setPage(category, page - 1)} disabled={page <= 0}>Prev</button>
                  <span>{categoryLinks.length ? page + 1 : 0} / {categoryLinks.length ? pageCount : 0}</span>
                  <button type="button" onClick={() => setPage(category, page + 1)} disabled={!categoryLinks.length || page + 1 >= pageCount}>Next</button>
                </div>
              </div>
              <div className="dobLinkButtons linkCategoryButtons">
                {visibleLinks.length === 0 ? <div className="empty compact">No links yet.</div> : visibleLinks.map((link) => {
                  const faviconUrl = getFaviconUrl(link.url);
                  return (
                    <div key={link.id} className="dobLinkChip linkLibraryChip">
                      <a href={normalizeUrl(link.url)} target="_blank" rel="noreferrer" aria-label={`Open ${link.title}`}>
                        <span className="dobLinkLogo">
                          {faviconUrl ? <img src={faviconUrl} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : null}
                          <span>{getLinkInitial(link)}</span>
                        </span>
                        <strong>{link.title}</strong>
                      </a>
                      <div className="dobLinkMeta">
                        <span>{category}</span>
                        <button type="button" onClick={() => startEdit(link)}>Edit</button>
                        <button type="button" className="linkDeleteButton" aria-label={`Delete ${link.title}`} onClick={() => deleteLink(link.id)}>X</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
