export function uid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function nowTimestamp() {
  return new Date().toISOString();
}

export function normalize(value) {
  return String(value || '').toLowerCase().trim();
}

// Plain-text search across every field of a saved item.
export function matchesQuery(item, query) {
  const q = normalize(query);
  if (!q) return true;
  return normalize(Object.values(item).filter((value) => typeof value !== 'object').join(' ')).includes(q);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Some preview URLs block the clipboard.
    return false;
  }
}
