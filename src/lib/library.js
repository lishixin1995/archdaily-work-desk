// Categories and helpers for DOB notes, links, AI prompts and Revit notes.

export const DOB_CATEGORIES = ['General', 'Zoning', 'Code', 'Plumbing Code', 'Energy Code', 'Building Code', 'ADA'];
export const LINK_CATEGORIES = ['Code', 'Zoning', 'General', 'Info'];
export const PROMPT_CATEGORIES = ['Rendering', 'Video', 'Writing', 'Code', 'DOB', 'Revit', 'Other'];
export const REVIT_CATEGORIES = ['Modeling', 'Family', 'View', 'Schedule', 'Link', 'Worksharing', 'Error', 'Other'];

export function normalizeDobCategory(value) {
  const category = String(value || '').trim();
  if (DOB_CATEGORIES.includes(category)) return category;
  const lower = category.toLowerCase();
  if (lower.includes('access') || lower.includes('ada')) return 'ADA';
  if (lower.includes('energy')) return 'Energy Code';
  if (lower.includes('plumb')) return 'Plumbing Code';
  if (lower.includes('build')) return 'Building Code';
  if (lower.includes('zoning')) return 'Zoning';
  if (lower.includes('code') || lower === 'dob') return 'Code';
  return 'General';
}

export function normalizeLinkCategory(value) {
  const category = String(value || '').toLowerCase();
  if (category.includes('zoning')) return 'Zoning';
  if (category.includes('general')) return 'General';
  if (category.includes('info') || category.includes('accessibility') || category.includes('energy') || category.includes('bpp')) return 'Info';
  if (category.includes('code') || category.includes('dob')) return 'Code';
  return 'General';
}

export function revitCategory(log) {
  return REVIT_CATEGORIES.includes(log.category) ? log.category : 'Other';
}

export function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function getLinkHost(url) {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

// Served through /api/favicon, which reports "no icon" as a plain 404 so the
// tile can draw a planet instead.
export function getFaviconUrl(url) {
  const host = getLinkHost(url);
  return host ? `/api/favicon?domain=${encodeURIComponent(host.toLowerCase())}` : '';
}
