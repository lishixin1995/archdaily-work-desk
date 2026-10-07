import { useEffect } from 'react';
import { copyText as copyToClipboard } from '../lib/text.js';
import { fileBadge, formatFileSize, isImageAttachment } from '../lib/files.js';

// Read-only view of a saved item: facts, long text sections and attachments.
export function FullNoteModal({ title, eyebrow = 'Full notes', meta = [], sections = [], attachments = [], copyText = '', onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const images = attachments.filter(isImageAttachment);
  const files = attachments.filter((attachment) => !isImageAttachment(attachment));

  return (
    <div className="modalOverlay" onMouseDown={onClose}>
      <article className="detailModal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modalTop">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title || 'Full notes'}</h2>
          </div>
          <button type="button" className="modalClose" onClick={onClose}>×</button>
        </div>
        <div className="modalBody">
          {meta.length > 0 && (
            <div className="detailGrid">
              {meta.map(([label, value]) => (value ? <div key={label} className="detailStat"><span>{label}</span><strong>{value}</strong></div> : null))}
            </div>
          )}
          {sections.map(([label, text], index) => (
            <section key={`${label}-${index}`} className="modalSection">
              <h3>{label}</h3>
              <p>{text || 'No notes yet.'}</p>
            </section>
          ))}
          {images.length > 0 && (
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
          {files.length > 0 && (
            <section className="modalSection attachmentSection">
              <h3>Saved files</h3>
              <div className="modalAttachmentGrid">
                {files.map((file, index) => (
                  <a key={file.id || file.name || index} className="modalAttachmentLink" href={file.dataUrl} download={file.name || 'attachment'} target="_blank" rel="noreferrer">
                    <strong>{fileBadge(file)} · {file.name || 'Attachment'}</strong>
                    <span>{formatFileSize(file.size)}</span>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
        <div className="modalActions">
          <button type="button" onClick={() => copyToClipboard(copyText || sections.map(([label, text]) => `${label}\n${text}`).join('\n\n'))}>Copy full text</button>
          <button type="button" className="primary" onClick={onClose}>Done</button>
        </div>
      </article>
    </div>
  );
}
