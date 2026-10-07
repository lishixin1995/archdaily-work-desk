import { uid } from './text.js';

// DOB notes take screenshots, PDFs and Word files; Revit notes take PDF, DOCX,
// JPG and PNG.
export const DOB_FILES = {
  accept: '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*',
  types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  pattern: /\.(pdf|docx?)$/i,
  images: true,
  hint: 'screenshots, PDF or Word files',
};

export const REVIT_FILES = {
  accept: '.pdf,.docx,.jpeg,.jpg,.png,image/jpeg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  types: ['image/jpeg', 'image/png', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  pattern: /\.(pdf|docx|jpe?g|png)$/i,
  images: false,
  hint: 'PDF, JPEG/JPG, PNG or DOCX files',
};

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

function isImageFile(file) {
  return file.type?.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/i.test(file.name || '');
}

// Screenshots are scaled to at most 1600px wide and saved as JPEG, which keeps
// the cloud copy small.
async function imageAttachment(file) {
  const originalDataUrl = await fileToDataUrl(file);
  try {
    const image = await loadImage(originalDataUrl);
    const scale = Math.min(1, 1600 / image.width);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(image, 0, 0, width, height);
    return { id: uid(), name: file.name || 'Screenshot', type: 'image/jpeg', size: file.size || 0, kind: 'image', width, height, dataUrl: canvas.toDataURL('image/jpeg', 0.82) };
  } catch {
    return { id: uid(), name: file.name || 'Screenshot', type: file.type || 'image/*', size: file.size || 0, kind: 'image', dataUrl: originalDataUrl };
  }
}

export async function filesToAttachments(files, rules) {
  const accepted = Array.from(files || []).filter((file) => {
    if (rules.types.includes(file.type) || rules.pattern.test(file.name || '')) return true;
    return rules.images && file.type?.startsWith('image/');
  });
  const attachments = await Promise.all(accepted.map(async (file) => {
    try {
      if (isImageFile(file)) return await imageAttachment(file);
      return { id: uid(), name: file.name || 'Document', type: file.type || 'application/octet-stream', size: file.size || 0, kind: 'document', dataUrl: await fileToDataUrl(file) };
    } catch {
      return null;
    }
  }));
  return attachments.filter(Boolean);
}

export function formatFileSize(size = 0) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageAttachment(attachment) {
  return attachment?.kind === 'image'
    || String(attachment?.type || '').startsWith('image/')
    || String(attachment?.dataUrl || '').startsWith('data:image/');
}

// Older notes kept one screenshot in `screenshot`; newer ones keep a list in
// `attachments`. Both are shown together.
export function attachmentsOf(item) {
  if (!item) return [];
  const list = Array.isArray(item.attachments) ? item.attachments : [];
  return item.screenshot && !list.some((file) => file.id && file.id === item.screenshot.id) ? [item.screenshot, ...list] : list;
}

export function fileBadge(attachment) {
  const type = String(attachment?.type || '');
  const name = String(attachment?.name || '').toLowerCase();
  if (type.includes('pdf') || name.endsWith('.pdf')) return 'PDF';
  return 'DOC';
}
