import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const revitTroubleShootReplacement = `function RevitTroubleShoot({ revitLogs, setRevitLogs }) {
  const emptyForm = { date: todayISO(), category: 'Modeling', issue: '', problem: '', solution: '', attachments: [] };
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(0);
  const [openLog, setOpenLog] = useState(null);
  const filtered = revitLogs.filter((log) => matchesQuery(log, search) && (category === 'All' || log.category === category));
  const pageSize = 3;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pagedLogs = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  useEffect(() => {
    setPage(0);
  }, [search, category, revitLogs.length]);

  async function addAttachments(files) {
    const fileList = Array.from(files || []);
    if (!fileList.length) return;
    const attachments = (await Promise.all(fileList.map((file) => makeRevitAttachment(file).catch(() => null)))).filter(Boolean);
    if (!attachments.length) return;
    setForm((current) => ({ ...current, attachments: [...(current.attachments || []), ...attachments] }));
  }

  function removeAttachment(id) {
    setForm((current) => ({ ...current, attachments: (current.attachments || []).filter((attachment) => attachment.id !== id) }));
  }

  function addLog(event) {
    event.preventDefault();
    if (!form.issue.trim() && !form.problem.trim() && !form.solution.trim() && !(form.attachments || []).length) return;
    setRevitLogs([{ ...form, attachments: form.attachments || [], id: uid(), createdAt: new Date().toISOString() }, ...revitLogs]);
    setForm({ ...emptyForm, category: form.category, date: todayISO() });
  }

  return (
    <>
      <PageHeading eyebrow="Revit Memory" title="Revit Trouble Shoot">Keep troubleshooting cards compact, then open the full problem and solution.</PageHeading>
      <div className="libraryFilters"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Revit troubleshooting..." /><select value={category} onChange={(e) => setCategory(e.target.value)}><option>All</option>{REVIT_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select></div>
      <form className="cardForm" onSubmit={addLog}>
        <label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{REVIT_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select></label>
        <label className="wide">Issue title<input value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} placeholder="What went wrong?" /></label>
        <label className="wide">Problem description<textarea value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} placeholder="Describe the Revit problem..." /></label>
        <label className="wide">Solution / notes<textarea value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} placeholder="How did you fix it?" /></label>
        <label className="wide revitAttachmentDrop">Reference files<input type="file" multiple accept={REVIT_ATTACHMENT_ACCEPT} onChange={async (event) => { await addAttachments(event.target.files); event.target.value = ''; }} /><span>Upload multiple PDF, JPEG/JPG, PNG, or DOCX files before saving.</span></label>
        {(form.attachments || []).length > 0 && (
          <div className="wide revitAttachmentList">
            {form.attachments.map((attachment) => (
              <div key={attachment.id} className="revitAttachmentChip">
                <span>{attachment.name || 'Attachment'}</span>
                <small>{formatFileSize(attachment.size)}</small>
                <button type="button" onClick={() => removeAttachment(attachment.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
        <button type="submit" className="primary wide">Add Trouble Shoot</button>
      </form>
      <div className="revitSavedHead">
        <div>
          <p className="eyebrow">Saved Revit Memory</p>
          <h3>Trouble Shoot Cards</h3>
        </div>
        <div className="revitSlideControls">
          <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={safePage <= 0}>‹</button>
          <span>{filtered.length ? safePage + 1 : 0} / {filtered.length ? totalPages : 0}</span>
          <button type="button" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={!filtered.length || safePage + 1 >= totalPages}>›</button>
        </div>
      </div>
      <section className="libraryGrid revitTroubleList">
        {pagedLogs.length === 0 ? <div className="empty wideEmpty">No Revit troubleshooting notes yet.</div> : pagedLogs.map((log) => {
          const attachmentCount = getRevitAttachments(log).length;
          return (
            <article key={log.id} className="libraryCard" onClick={() => setOpenLog(log)}>
              <p className="eyebrow">{log.category || 'Revit'}{attachmentCount ? ' · ' + attachmentCount + ' file' + (attachmentCount === 1 ? '' : 's') : ''}</p>
              <h3>{log.issue || 'Untitled Issue'}</h3>
              <p className="clampedText">{log.problem || log.solution || (attachmentCount ? 'Saved attachments.' : '')}</p>
              <div className="cardActions" onClick={(event) => event.stopPropagation()}>
                <button type="button" onClick={() => setOpenLog(log)}>View full notes</button>
                <button type="button" className="danger" onClick={() => setRevitLogs(revitLogs.filter((item) => item.id !== log.id))}>Delete</button>
              </div>
            </article>
          );
        })}
      </section>
      {openLog && <FullNoteModal open eyebrow="Revit Trouble Shoot" title={openLog.issue || 'Untitled Issue'} meta={[["Date", niceDate(openLog.date)], ["Category", openLog.category], ["Attachments", getRevitAttachments(openLog).length ? getRevitAttachments(openLog).length + ' saved' : '-']]} sections={[["Problem description", openLog.problem], ["Solution / notes", openLog.solution]]} images={getRevitImageAttachments(openLog)} attachments={getRevitFileAttachments(openLog)} copyText={[openLog.issue || '', '', openLog.problem || '', '', openLog.solution || ''].join(String.fromCharCode(10))} onClose={() => setOpenLog(null)} />}
    </>
  );
}`;

const revitAttachmentCss = `

.revitAttachmentDrop {
  border: 1px dashed rgba(163, 102, 58, .42);
  border-radius: 18px;
  padding: 14px;
  background: rgba(255,255,255,.42);
}
.revitAttachmentDrop input[type="file"] { margin-top: 6px; }
.revitAttachmentDrop span {
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}
.revitAttachmentList {
  display: grid;
  gap: 8px;
}
.revitAttachmentChip,
.modalAttachmentLink {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(255,255,255,.66);
  padding: 10px 12px;
}
.revitAttachmentChip span,
.modalAttachmentLink strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.revitAttachmentChip small,
.modalAttachmentLink span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}
.revitAttachmentChip button {
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  color: var(--warmDark);
  padding: 6px 10px;
  font-weight: 850;
}
.revitSavedHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: 8px 0 12px;
}
.revitSavedHead h3 {
  margin: 0;
  font-size: 22px;
}
.revitSlideControls {
  display: flex;
  align-items: center;
  gap: 10px;
}
.revitSlideControls button {
  width: 36px;
  height: 36px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255,255,255,.78);
  color: var(--warmDark);
  font-size: 24px;
  font-weight: 900;
  line-height: 1;
}
.revitSlideControls button:disabled {
  opacity: .42;
  cursor: default;
}
.revitSlideControls span {
  color: var(--muted);
  font-size: 13px;
  font-weight: 900;
  white-space: nowrap;
}
.revitTroubleList {
  grid-template-columns: 1fr !important;
}
.revitTroubleList .libraryCard {
  width: 100%;
  min-height: 0;
}
.modalAttachmentGrid {
  display: grid;
  gap: 8px;
}
.modalAttachmentLink {
  color: var(--ink);
  text-decoration: none;
}
.modalAttachmentLink:hover {
  border-color: rgba(163,102,58,.48);
  background: rgba(255,255,255,.82);
}
`;

function calendarOverflowPatch() {
  return {
    name: 'calendar-overflow-patch',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, '/');

      if (normalizedId.endsWith('/src/main.jsx')) {
        let next = code
          .replace(
            "const weekTasks = sortFocusTasks(tasks.filter((task) => getTaskSegmentsForWeek(task, week))).slice(0, 4);",
            "const weekTasks = sortFocusTasks(tasks.filter((task) => getTaskSegmentsForWeek(task, week)));"
          )
          .replace(
            'const cellPaddingTop = 34 + taskRows * 20;',
            'const cellPaddingTop = 38 + taskRows * 22;'
          );

        next = next.replace(
          `function useStoredArray(primaryKey, legacyKeys = []) {
  const [items, setItems] = useState(() => readArray(primaryKey, legacyKeys));
  useEffect(() => {
    localStorage.setItem(primaryKey, JSON.stringify(items));
  }, [primaryKey, items]);
  return [items, setItems];
}`,
          `function useStoredArray(primaryKey, legacyKeys = []) {
  const [items, setItems] = useState(() => readArray(primaryKey, legacyKeys));
  useEffect(() => {
    localStorage.setItem(primaryKey, JSON.stringify(items));
  }, [primaryKey, items]);

  useEffect(() => {
    function syncFromStorage(event) {
      const changedKey = event?.detail?.key || event?.key;
      if (changedKey && changedKey !== primaryKey && !legacyKeys.includes(changedKey)) return;
      setItems(readArray(primaryKey, legacyKeys));
    }

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener('archDailyWorkDesk:localDataChanged', syncFromStorage);
    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener('archDailyWorkDesk:localDataChanged', syncFromStorage);
    };
  }, [primaryKey, legacyKeys]);

  return [items, setItems];
}`
        );

        next = next.replace(
          "const REVIT_CATEGORIES = ['Modeling', 'Family', 'View', 'Schedule', 'Link', 'Worksharing', 'Error', 'Other'];",
          "const REVIT_CATEGORIES = ['Modeling', 'Family', 'View', 'Schedule', 'Link', 'Worksharing', 'Error', 'Other'];\nconst REVIT_ATTACHMENT_ACCEPT = '.pdf,.docx,.jpeg,.jpg,.png,image/jpeg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';\nconst REVIT_ATTACHMENT_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);\nconst REVIT_ATTACHMENT_EXTENSIONS = /\\.(pdf|docx|jpe?g|png)$/i;"
        );

        next = next.replace(
          "\nfunction todayISO() {",
          "\nfunction isRevitAttachmentFile(file) {\n  return Boolean(file && (REVIT_ATTACHMENT_TYPES.has(file.type) || REVIT_ATTACHMENT_EXTENSIONS.test(file.name || '')));\n}\n\nasync function makeRevitAttachment(file) {\n  if (!isRevitAttachmentFile(file)) return null;\n  if (file.type?.startsWith('image/') || /\\.(jpe?g|png)$/i.test(file.name || '')) return makeScreenshotAttachment(file);\n  return { id: uid(), name: file.name || 'Attachment', type: file.type || 'application/octet-stream', size: file.size || 0, dataUrl: await fileToDataUrl(file) };\n}\n\nfunction getRevitAttachments(log) {\n  if (!log) return [];\n  if (Array.isArray(log.attachments)) return log.attachments;\n  return log.screenshot ? [log.screenshot] : [];\n}\n\nfunction getRevitImageAttachments(log) {\n  return getRevitAttachments(log).filter((attachment) => String(attachment.type || '').startsWith('image/') || String(attachment.dataUrl || '').startsWith('data:image/'));\n}\n\nfunction getRevitFileAttachments(log) {\n  return getRevitAttachments(log).filter((attachment) => !String(attachment.type || '').startsWith('image/') && !String(attachment.dataUrl || '').startsWith('data:image/'));\n}\n\nfunction formatFileSize(size = 0) {\n  if (size < 1024) return size + ' B';\n  if (size < 1024 * 1024) return Math.round(size / 1024) + ' KB';\n  return (size / (1024 * 1024)).toFixed(1) + ' MB';\n}\n\nfunction todayISO() {"
        );

        next = next.replace(
          "function FullNoteModal({ open, title, eyebrow = 'Full notes', meta = [], sections = [], images = [], copyText = '', onClose })",
          "function FullNoteModal({ open, title, eyebrow = 'Full notes', meta = [], sections = [], images = [], attachments = [], copyText = '', onClose })"
        );

        next = next.replace(
          `          {images.length > 0 && (
            <section className="modalSection screenshotSection">
              <h3>Saved screenshot</h3>
              <div className="modalImageGrid">
                {images.map((image, index) => (
                  <figure key={image.id || image.name || index} className="modalImageCard">
                    <img src={image.dataUrl || image.src} alt={image.name || 'Saved screenshot'} />
                    {image.name && <figcaption>{image.name}</figcaption>}
                  </figure>
                ))}
              </div>
            </section>
          )}
        </div>`,
          `          {images.length > 0 && (
            <section className="modalSection screenshotSection">
              <h3>Saved screenshot</h3>
              <div className="modalImageGrid">
                {images.map((image, index) => (
                  <figure key={image.id || image.name || index} className="modalImageCard">
                    <img src={image.dataUrl || image.src} alt={image.name || 'Saved screenshot'} />
                    {image.name && <figcaption>{image.name}</figcaption>}
                  </figure>
                ))}
              </div>
            </section>
          )}
          {attachments.length > 0 && (
            <section className="modalSection attachmentSection">
              <h3>Saved files</h3>
              <div className="modalAttachmentGrid">
                {attachments.map((attachment, index) => (
                  <a key={attachment.id || attachment.name || index} className="modalAttachmentLink" href={attachment.dataUrl} download={attachment.name || 'attachment'} target="_blank" rel="noreferrer">
                    <strong>{attachment.name || 'Attachment'}</strong>
                    <span>{formatFileSize(attachment.size)} · {attachment.type || 'file'}</span>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>`
        );

        next = next.replace(/function RevitTroubleShoot\(\{ revitLogs, setRevitLogs \}\) \{[\s\S]*?\n\}\n\nfunction NoteCards/, `${revitTroubleShootReplacement}\n\nfunction NoteCards`);

        return next === code ? null : { code: next, map: null };
      }

      if (normalizedId.endsWith('/src/savedNotesEdit.js')) {
        const next = code.replace(
          `    close();
    window.location.reload();`,
          `    close();
    window.dispatchEvent(new CustomEvent('archDailyWorkDesk:localDataChanged', { detail: { key: SAVED_NOTES_KEYS[kind] } }));
    window.setTimeout(enhanceAllSavedNotesEdit, 80);`
        );

        return next === code ? null : { code: next, map: null };
      }

      if (normalizedId.endsWith('/src/styles.css')) {
        let next = code.replace(
          `.monthTaskOverlay {
  position: absolute;
  left: 0;
  right: 0;
  top: 30px;`,
          `.monthTaskOverlay {
  position: absolute;
  left: 0;
  right: 0;
  top: 38px;`
        );

        if (!next.includes('.revitAttachmentDrop')) next += revitAttachmentCss;

        return next === code ? null : { code: next, map: null };
      }

      return null;
    },
  };
}

export default defineConfig({
  plugins: [calendarOverflowPatch(), react()],
});
