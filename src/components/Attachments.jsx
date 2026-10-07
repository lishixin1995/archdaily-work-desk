import { useEffect, useState } from 'react';
import { attachmentKind, dataUrlToBlobUrl, fileExtension, filesToAttachments, formatFileSize } from '../lib/files.js';
import { Modal } from './Modal.jsx';

// Drop zone plus the files already added. `rules` says which files it takes.
export function AttachmentField({ attachments, onChange, id, rules }) {
  const [dragging, setDragging] = useState(false);

  async function add(files) {
    const added = await filesToAttachments(files, rules);
    if (added.length) onChange([...(attachments || []), ...added]);
  }

  return (
    <div className="attach-field">
      <label
        className={`dropzone${dragging ? ' is-dragging' : ''}`}
        htmlFor={id}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); add(event.dataTransfer.files); }}
      >
        <input id={id} type="file" multiple accept={rules.accept} onChange={(event) => { add(event.target.files); event.target.value = ''; }} />
        <strong>{rules.title}</strong>
        <span>{rules.hint}</span>
      </label>
      {attachments?.length ? (
        <ul className="attach-chips">
          {attachments.map((file) => (
            <li key={file.id || file.name}>
              <span>{file.name}</span>
              <em>{formatFileSize(file.size)}</em>
              <button type="button" className="chip-remove" aria-label={`Remove ${file.name}`} onClick={() => onChange(attachments.filter((item) => item !== file))}>&times;</button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function AttachmentGallery({ attachments }) {
  const [preview, setPreview] = useState(null);
  if (!attachments?.length) return null;
  return (
    <>
      <ul className="gallery">
        {attachments.map((file) => {
          const kind = attachmentKind(file);
          return (
            <li key={file.id || file.name}>
              <button type="button" className="gallery-tile" onClick={() => setPreview(file)}>
                {kind === 'image' ? <img src={file.dataUrl} alt="" /> : <span className="file-badge">{fileExtension(file.name)}</span>}
                <strong>{file.name || 'Attachment'}</strong>
                <em>{formatFileSize(file.size)}</em>
              </button>
            </li>
          );
        })}
      </ul>
      {preview ? <AttachmentPreview file={preview} onClose={() => setPreview(null)} /> : null}
    </>
  );
}

export function AttachmentPreview({ file, onClose }) {
  const [url, setUrl] = useState('');
  const kind = attachmentKind(file);

  useEffect(() => {
    let revoked = '';
    let cancelled = false;
    dataUrlToBlobUrl(file.dataUrl)
      .then((blobUrl) => {
        if (cancelled) { URL.revokeObjectURL(blobUrl); return; }
        revoked = blobUrl;
        setUrl(blobUrl);
      })
      .catch(() => setUrl(file.dataUrl));
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [file]);

  return (
    <Modal
      eyebrow="Attachment"
      title={file.name || 'Attachment'}
      onClose={onClose}
      wide
      footer={url ? <a className="btn btn-primary" href={url} download={file.name || 'attachment'}>Download</a> : null}
    >
      <div className="preview-body">
        {kind === 'image' ? <img src={url || file.dataUrl} alt={file.name || ''} /> : null}
        {kind === 'pdf' && url ? <iframe title={file.name} src={url} /> : null}
        {kind === 'file' ? <p className="empty">This file type cannot be previewed here. Download it to open it.</p> : null}
      </div>
    </Modal>
  );
}
