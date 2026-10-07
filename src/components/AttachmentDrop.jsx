import { filesToAttachments, fileBadge, formatFileSize, isImageAttachment } from '../lib/files.js';

// Drop zone and file list for a note form. `attachments` is the full list,
// including an older note's single screenshot.
export function AttachmentDrop({ label, rules, attachments, onChange }) {
  async function add(files) {
    const added = await filesToAttachments(files, rules);
    if (added.length) onChange([...attachments, ...added]);
  }

  return (
    <label
      className="wide screenshotDrop"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        add(event.dataTransfer.files);
      }}
    >
      {label}
      <input type="file" multiple accept={rules.accept} onChange={async (event) => { await add(event.target.files); event.target.value = ''; }} />
      <span>Drag {rules.hint} here, or click to browse/upload.</span>
      {attachments.length > 0 && (
        <div className="attachmentPreviewGrid">
          {attachments.map((attachment) => (
            <div key={attachment.id || attachment.name} className="attachmentPreview">
              {isImageAttachment(attachment)
                ? <img src={attachment.dataUrl} alt={attachment.name || 'Attachment preview'} />
                : <div className="documentThumb">{fileBadge(attachment)}</div>}
              <div>
                <strong>{attachment.name || 'Attachment'}</strong>
                <small>{formatFileSize(attachment.size)}</small>
                <button type="button" onClick={(event) => { event.preventDefault(); onChange(attachments.filter((item) => item !== attachment)); }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </label>
  );
}
