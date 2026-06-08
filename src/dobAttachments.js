const DOB_NOTES_KEY = 'archDailyWorkDesk.dobNotes.v2';
const pendingAttachmentsByForm = new WeakMap();
const pendingPreviewSignatures = new WeakMap();
const supportedAttachmentTypes = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*';
let dobAttachmentEnhanceFrame = 0;

function attachmentUid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readStoredDobNotes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DOB_NOTES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredDobNotes(notes) {
  localStorage.setItem(DOB_NOTES_KEY, JSON.stringify(notes));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function formatAttachmentSize(bytes = 0) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isSupportedDocument(file) {
  return file.type === 'application/pdf'
    || file.type === 'application/msword'
    || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || /\.(pdf|doc|docx)$/i.test(file.name || '');
}

function isImageAttachment(attachment) {
  return attachment?.kind === 'image'
    || attachment?.type?.startsWith('image/')
    || attachment?.dataUrl?.startsWith('data:image/');
}

async function makeDobAttachment(file) {
  if (!file) return null;
  const isImage = file.type?.startsWith('image/');
  if (!isImage && !isSupportedDocument(file)) return null;

  if (!isImage) {
    return {
      id: attachmentUid(),
      name: file.name || 'Document',
      type: file.type || 'application/octet-stream',
      size: file.size || 0,
      kind: 'document',
      dataUrl: await fileToDataUrl(file),
    };
  }

  const originalDataUrl = await fileToDataUrl(file);
  try {
    const image = await loadImage(originalDataUrl);
    const maxWidth = 1600;
    const scale = Math.min(1, maxWidth / image.width);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);
    return {
      id: attachmentUid(),
      name: file.name || 'Screenshot',
      type: 'image/jpeg',
      size: file.size || 0,
      kind: 'image',
      width,
      height,
      dataUrl: canvas.toDataURL('image/jpeg', 0.82),
    };
  } catch {
    return {
      id: attachmentUid(),
      name: file.name || 'Screenshot',
      type: file.type || 'image/*',
      size: file.size || 0,
      kind: 'image',
      dataUrl: originalDataUrl,
    };
  }
}

function currentTabName() {
  return document.querySelector('.mainNav button.active')?.textContent?.trim() || '';
}

function getDobForm() {
  if (currentTabName() !== 'DOB Notes') return null;
  return Array.from(document.querySelectorAll('form.cardForm')).find((form) => form.querySelector('.screenshotDrop')) || null;
}

function getDobFormValues(form) {
  return {
    date: form.querySelector('input[type="date"]')?.value || '',
    category: form.querySelector('select')?.value || '',
    title: form.querySelector('label.wide input:not([type="file"])')?.value?.trim() || '',
    notes: form.querySelector('textarea')?.value || '',
  };
}

function setDropLabelText(label) {
  if (label.dataset.dobAttachmentTextReady) return;
  const textNode = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.includes('Screenshot upload'));
  if (textNode) textNode.textContent = 'Attachment upload';
  const help = label.querySelector(':scope > span');
  if (help) help.textContent = 'Drag screenshots, PDF, or Word documents here, or click to browse/upload.';
  label.dataset.dobAttachmentTextReady = 'true';
}

function getPendingAttachments(form) {
  return pendingAttachmentsByForm.get(form) || [];
}

function getAttachmentSignature(attachments) {
  return attachments.map((attachment) => `${attachment.id}:${attachment.name}:${attachment.size}`).join('|');
}

function setPendingAttachments(form, attachments) {
  pendingAttachmentsByForm.set(form, attachments);
  renderPendingAttachments(form, true);
}

function renderPendingAttachments(form, force = false) {
  const label = form.querySelector('.screenshotDrop');
  if (!label) return;
  const attachments = getPendingAttachments(form);
  const signature = getAttachmentSignature(attachments);
  const existing = label.querySelector('.dobAttachmentPreviewGrid');

  if (!attachments.length) {
    existing?.remove();
    pendingPreviewSignatures.delete(form);
    return;
  }

  if (!force && existing && pendingPreviewSignatures.get(form) === signature) return;
  existing?.remove();
  pendingPreviewSignatures.set(form, signature);

  const grid = document.createElement('div');
  grid.className = 'dobAttachmentPreviewGrid';
  attachments.forEach((attachment) => {
    const item = document.createElement('div');
    item.className = 'dobAttachmentPreview';
    const thumb = isImageAttachment(attachment)
      ? `<img src="${attachment.dataUrl}" alt="${attachment.name || 'Attachment preview'}">`
      : `<div class="dobDocumentThumb">${attachment.type?.includes('pdf') ? 'PDF' : 'DOC'}</div>`;
    item.innerHTML = `${thumb}<div><strong></strong><small>${formatAttachmentSize(attachment.size)}</small><button type="button">Remove</button></div>`;
    item.querySelector('strong').textContent = attachment.name || 'Attachment saved';
    item.querySelector('button').addEventListener('click', (event) => {
      event.preventDefault();
      setPendingAttachments(form, getPendingAttachments(form).filter((itemAttachment) => itemAttachment.id !== attachment.id));
    });
    grid.appendChild(item);
  });
  label.appendChild(grid);
}

async function addFilesToForm(form, files) {
  const attachments = (await Promise.all(Array.from(files || []).map(makeDobAttachment))).filter(Boolean);
  if (!attachments.length) return;
  setPendingAttachments(form, [...getPendingAttachments(form), ...attachments]);
}

function attachPendingFilesToLatestNote(form, snapshot) {
  const attachments = getPendingAttachments(form);
  if (!attachments.length) return;

  const notes = readStoredDobNotes();
  if (!notes.length) return;

  const target = notes.find((note) => (
    (!snapshot.title || note.title === snapshot.title)
    && (!snapshot.date || note.date === snapshot.date)
    && (!snapshot.category || note.category === snapshot.category)
    && (!snapshot.notes || note.notes === snapshot.notes)
  )) || notes[0];

  target.attachments = attachments;
  target.updatedAt = new Date().toISOString();
  writeStoredDobNotes(notes);
  pendingAttachmentsByForm.delete(form);
  renderPendingAttachments(form, true);
}

function createAttachmentSection(attachments) {
  const section = document.createElement('section');
  section.className = 'modalSection dobSavedAttachments';
  section.innerHTML = '<h3>Saved attachments</h3><div class="dobModalAttachmentGrid"></div>';
  const grid = section.querySelector('.dobModalAttachmentGrid');

  attachments.forEach((attachment) => {
    const card = document.createElement('figure');
    card.className = 'dobModalAttachmentCard';
    if (isImageAttachment(attachment)) {
      const image = document.createElement('img');
      image.src = attachment.dataUrl;
      image.alt = attachment.name || 'Saved attachment';
      card.appendChild(image);
    } else {
      const link = document.createElement('a');
      link.className = 'dobDocumentAttachment';
      link.href = attachment.dataUrl;
      link.download = attachment.name || 'document';
      link.innerHTML = `<span>${attachment.type?.includes('pdf') ? 'PDF' : 'DOC'}</span><strong></strong><small>${formatAttachmentSize(attachment.size)}</small>`;
      link.querySelector('strong').textContent = attachment.name || 'Saved document';
      card.appendChild(link);
    }
    if (attachment.name) {
      const caption = document.createElement('figcaption');
      caption.textContent = attachment.name;
      card.appendChild(caption);
    }
    grid.appendChild(card);
  });

  return section;
}

function findOpenDobNote() {
  const modal = document.querySelector('.detailModal');
  if (!modal || modal.querySelector('.eyebrow')?.textContent?.trim() !== 'DOB Notes') return null;

  const title = modal.querySelector('.modalTop h2')?.textContent?.trim() || '';
  const stats = Array.from(modal.querySelectorAll('.detailStat')).reduce((acc, stat) => {
    const label = stat.querySelector('span')?.textContent?.trim();
    const value = stat.querySelector('strong')?.textContent?.trim();
    if (label && value) acc[label] = value;
    return acc;
  }, {});
  const noteText = modal.querySelector('.modalSection p')?.textContent || '';

  return readStoredDobNotes().find((note) => {
    const titleMatches = (note.title || 'DOB Note') === title;
    const categoryMatches = !stats.Category || note.category === stats.Category;
    const textMatches = !note.notes || note.notes === noteText;
    return titleMatches && categoryMatches && textMatches;
  });
}

function injectModalAttachments() {
  const modal = document.querySelector('.detailModal');
  if (!modal || modal.querySelector('.dobSavedAttachments')) return;
  const note = findOpenDobNote();
  const attachments = Array.isArray(note?.attachments) ? note.attachments : [];
  if (!attachments.length) return;
  const modalBody = modal.querySelector('.modalBody');
  if (modalBody) modalBody.appendChild(createAttachmentSection(attachments));
}

function enhanceDobUpload() {
  const form = getDobForm();
  if (!form) {
    injectModalAttachments();
    return;
  }

  const label = form.querySelector('.screenshotDrop');
  const input = label?.querySelector('input[type="file"]');
  if (!label || !input) return;

  setDropLabelText(label);
  if (!input.multiple) input.multiple = true;
  if (input.accept !== supportedAttachmentTypes) input.accept = supportedAttachmentTypes;

  if (!input.dataset.dobAttachmentsBound) {
    input.dataset.dobAttachmentsBound = 'true';
    input.addEventListener('change', (event) => {
      event.stopPropagation();
      addFilesToForm(form, event.target.files).finally(() => { event.target.value = ''; });
    }, true);
  }

  if (!label.dataset.dobAttachmentsBound) {
    label.dataset.dobAttachmentsBound = 'true';
    label.addEventListener('drop', (event) => {
      event.preventDefault();
      event.stopPropagation();
      addFilesToForm(form, event.dataTransfer?.files);
    }, true);
    form.addEventListener('submit', () => {
      const snapshot = getDobFormValues(form);
      window.setTimeout(() => {
        attachPendingFilesToLatestNote(form, snapshot);
        scheduleDobAttachmentEnhancement();
      }, 700);
    }, true);
  }

  renderPendingAttachments(form);
  injectModalAttachments();
}

function installDobAttachmentStyles() {
  if (document.getElementById('dobAttachmentStyles')) return;
  const style = document.createElement('style');
  style.id = 'dobAttachmentStyles';
  style.textContent = `
    .dobAttachmentPreviewGrid { display: grid; gap: 10px; margin-top: 12px; }
    .dobAttachmentPreview { display: flex; gap: 12px; align-items: center; padding: 10px; border: 1px solid var(--line); border-radius: 14px; background: rgba(255,255,255,.7); }
    .dobAttachmentPreview img, .dobDocumentThumb { width: 92px; height: 64px; border-radius: 10px; border: 1px solid var(--line); }
    .dobAttachmentPreview img { object-fit: cover; }
    .dobDocumentThumb { display: grid; place-items: center; background: rgba(238,228,214,.82); color: var(--warmDark); font-size: 14px; font-weight: 950; letter-spacing: .08em; }
    .dobAttachmentPreview strong { display: block; margin-bottom: 4px; font-size: 13px; }
    .dobAttachmentPreview small { display: block; margin-bottom: 6px; color: var(--muted); font-size: 11px; font-weight: 800; }
    .dobAttachmentPreview button { width: auto; padding: 6px 10px; border: 1px solid var(--line); color: var(--warmDark); background: white; }
    .dobModalAttachmentGrid { display: grid; gap: 12px; }
    .dobModalAttachmentCard { margin: 0; border: 1px solid var(--line); border-radius: 18px; padding: 12px; background: rgba(255,255,255,.62); }
    .dobModalAttachmentCard img { display: block; width: 100%; max-height: 520px; object-fit: contain; border-radius: 14px; background: white; border: 1px solid var(--line); }
    .dobModalAttachmentCard figcaption { margin-top: 8px; color: var(--muted); font-size: 12px; font-weight: 800; }
    .dobDocumentAttachment { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px 12px; align-items: center; padding: 16px; border: 1px solid var(--line); border-radius: 14px; background: rgba(255,255,255,.74); color: var(--ink); text-decoration: none; }
    .dobDocumentAttachment:hover { border-color: rgba(163,102,58,.42); background: white; }
    .dobDocumentAttachment span { grid-row: span 2; width: 54px; height: 54px; display: grid; place-items: center; border-radius: 14px; background: rgba(163,102,58,.14); color: var(--warmDark); font-size: 13px; font-weight: 950; letter-spacing: .08em; }
    .dobDocumentAttachment strong { min-width: 0; overflow-wrap: anywhere; }
    .dobDocumentAttachment small { color: var(--muted); font-size: 12px; font-weight: 800; }
  `;
  document.head.appendChild(style);
}

function mutationTouchesDobUi(mutation) {
  const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
  return nodes.some((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    return node.matches?.('.screenshotDrop, .detailModal, .modalOverlay, .pageHeading, .mainNav, form.cardForm')
      || node.querySelector?.('.screenshotDrop, .detailModal, .modalOverlay, .pageHeading, .mainNav, form.cardForm');
  });
}

function scheduleDobAttachmentEnhancement() {
  if (dobAttachmentEnhanceFrame) return;
  dobAttachmentEnhanceFrame = requestAnimationFrame(() => {
    dobAttachmentEnhanceFrame = 0;
    enhanceDobUpload();
  });
}

installDobAttachmentStyles();
const dobAttachmentObserver = new MutationObserver((mutations) => {
  if (mutations.some(mutationTouchesDobUi)) scheduleDobAttachmentEnhancement();
});
dobAttachmentObserver.observe(document.body, { childList: true, subtree: true });
document.addEventListener('click', (event) => {
  if (event.target.closest('.mainNav button, .cardActions button, .modalClose')) scheduleDobAttachmentEnhancement();
}, true);
window.addEventListener('load', scheduleDobAttachmentEnhancement);
window.addEventListener('storage', scheduleDobAttachmentEnhancement);
scheduleDobAttachmentEnhancement();
