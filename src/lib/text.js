export function uid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function nowTimestamp() {
  return new Date().toISOString();
}

// True when every word of the query appears somewhere in the given fields.
export function matchesText(fields, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return true;
  return fields.filter((value) => typeof value === 'string' || typeof value === 'number').join(' ').toLowerCase().includes(needle);
}

// Short excerpt of `text` around the first match of `needle`.
export function preview(text, needle) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  const index = needle ? value.toLowerCase().indexOf(needle) : -1;
  if (index < 0) return value.slice(0, 110);
  const start = Math.max(0, index - 40);
  return `${start ? '…' : ''}${value.slice(start, start + 120)}${start + 120 < value.length ? '…' : ''}`;
}

// Copy text to the clipboard, falling back to a hidden textarea where the
// Clipboard API is refused.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}
