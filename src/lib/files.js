import { storeFile } from './fileStore.js';
import { STORAGE_KEYS } from './storage.js';
import { uid } from './text.js';

// DOB notes take screenshots, PDFs and Word files; Revit notes take PDF, DOCX,
// JPG and PNG.
export const DOB_FILES = {
  accept: '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*',
  types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  pattern: /\.(pdf|docx?)$/i,
  images: true,
  title: 'Drop screenshots, images, PDFs or Word files',
  hint: 'or select files · images, PDF, DOC, DOCX'
};

export const REVIT_FILES = {
  accept: '.pdf,.docx,.jpeg,.jpg,.png,image/jpeg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  types: ['image/jpeg', 'image/png', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  pattern: /\.(pdf|docx|jpe?g|png)$/i,
  images: false,
  title: 'Drop reference files',
  hint: 'or select files · PDF, JPG, PNG, DOCX'
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

export function attachmentKind(file = {}) {
  const type = String(file.type || '');
  const name = String(file.name || '').toLowerCase();
  if (file.kind === 'image' || type.startsWith('image/') || String(file.dataUrl || '').startsWith('data:image/')) return 'image';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  return 'file';
}

export function fileExtension(name = '') {
  return String(name).split('.').pop()?.toUpperCase() || 'FILE';
}

// Browsers refuse to frame or open long data: URLs, so previews use blob URLs.
export async function dataUrlToBlobUrl(dataUrl) {
  const response = await fetch(dataUrl);
  return URL.createObjectURL(await response.blob());
}

// Older notes kept one screenshot in `screenshot`; newer ones keep a list in
// `attachments`. Both are shown together.
export function attachmentsOf(item) {
  if (!item) return [];
  const list = Array.isArray(item.attachments) ? item.attachments : [];
  return item.screenshot && !list.some((file) => file.id && file.id === item.screenshot.id) ? [item.screenshot, ...list] : list;
}

// Saves the contents of newly added files and returns the list without them,
// so a note stays small. A file that could not be kept anywhere stays inline.
export async function storeAttachments(list) {
  return Promise.all(list.map(async (file) => {
    if (!file.dataUrl) return file;
    const id = file.id || uid();
    const parts = await storeFile(id, file.dataUrl);
    if (!parts) return { ...file, id };
    const { dataUrl, ...rest } = file;
    return { ...rest, id, parts };
  }));
}

// Older versions kept every file inside its note, which fills localStorage and
// then blocks every save. Moves those files out once, on start.
export async function moveInlineFiles() {
  for (const key of [STORAGE_KEYS.dob, STORAGE_KEYS.revit]) {
    const raw = localStorage.getItem(key);
    if (!raw || !raw.includes('"dataUrl"')) continue;
    let list;
    try {
      list = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!Array.isArray(list)) continue;
    const moved = await Promise.all(list.map(async (item) => {
      if (!attachmentsOf(item).some((file) => file.dataUrl)) return item;
      const { screenshot, ...rest } = item;
      return { ...rest, attachments: await storeAttachments(attachmentsOf(item)) };
    }));
    localStorage.setItem(key, JSON.stringify(moved));
  }
}
