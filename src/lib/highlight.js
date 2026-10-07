// Hover highlighting shared by the orbit, calendars and lists. Lit items are
// styled through a generated stylesheet, so React re-renders never wipe it.
let current = new Set();
const listeners = new Set();
let styleElement = null;

function ensureStyle() {
  if (styleElement || typeof document === 'undefined') return styleElement;
  styleElement = document.createElement('style');
  styleElement.dataset.role = 'highlight';
  document.head.appendChild(styleElement);
  return styleElement;
}

function selectorList(ids, prefix) {
  return [...ids].map((id) => `${prefix}[data-hl="${CSS.escape(id)}"]`).join(',');
}

export function setHighlight(ids) {
  const next = new Set(ids || []);
  if (next.size === current.size && [...next].every((id) => current.has(id))) return;
  current = next;
  const style = ensureStyle();
  if (style) {
    document.body.classList.toggle('has-highlight', next.size > 0);
    style.textContent = next.size
      ? `body.has-highlight ${selectorList(next, '.trail')}{opacity:1}`
        + `${selectorList(next, '.trail')}{--trail-label:var(--text)}`
        + `${selectorList(next, '.item')}{background:var(--hover)}`
        + `${selectorList(next, '.item')} .level-select{opacity:1}`
      : '';
  }
  listeners.forEach((listener) => listener(current));
}

export function getHighlight() {
  return current;
}

export function onHighlight(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
