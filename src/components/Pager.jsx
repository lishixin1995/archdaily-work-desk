import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

// True while a CSS media query matches, e.g. useMedia('(max-width: 640px)').
export function useMedia(query) {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

// How many cards fill the visible screen: columns that fit the grid's width
// times rows that fit between the grid's top and the bottom of the window.
export function useScreenPage({ minWidth, rowHeight, gap = 14, reserve = 84 }) {
  const ref = useRef(null);
  const [size, setSize] = useState(12);

  useLayoutEffect(() => {
    const grid = ref.current;
    if (!grid) return undefined;
    const compute = () => {
      const width = grid.clientWidth;
      if (!width) return;
      const columns = Math.max(1, Math.floor((width + gap) / (minWidth + gap)));
      const top = grid.getBoundingClientRect().top + window.scrollY;
      const space = window.innerHeight - top - reserve;
      // Short screens would get a single row, so a page always holds at least
      // two rows (four on phones, which scroll naturally).
      const minRows = window.innerWidth < 640 ? 4 : 2;
      const rows = Math.max(minRows, Math.floor((space + gap) / (rowHeight + gap)));
      setSize(columns * rows);
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(grid);
    window.addEventListener('resize', compute);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [minWidth, rowHeight, gap, reserve]);

  return [ref, size];
}

// Page state that jumps back to the first page when the list changes shape.
export function usePages(items, size, resetKey) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / Math.max(1, size)));
  const current = Math.min(page, pages - 1);
  useEffect(() => setPage(0), [resetKey]);
  return {
    page: current,
    pages,
    setPage,
    visible: items.slice(current * size, current * size + size)
  };
}

function pageList(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index);
  const list = new Set([0, pages - 1, page - 1, page, page + 1]);
  if (page <= 2) [1, 2, 3].forEach((index) => list.add(index));
  if (page >= pages - 3) [pages - 4, pages - 3, pages - 2].forEach((index) => list.add(index));
  return [...list].filter((index) => index >= 0 && index < pages).sort((a, b) => a - b);
}

export function Pager({ page, pages, onPage, label = 'Pages' }) {
  if (pages <= 1) return null;
  const numbers = pageList(page, pages);
  return (
    <nav
      className="pager-bar"
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' && page > 0) onPage(page - 1);
        if (event.key === 'ArrowRight' && page < pages - 1) onPage(page + 1);
      }}
    >
      <button type="button" className="btn btn-icon" aria-label="Previous page" disabled={page === 0} onClick={() => onPage(page - 1)}>&lsaquo;</button>
      <span className="pager-numbers">
        {numbers.map((index, position) => (
          <span key={index} className="pager-slot">
            {position > 0 && index - numbers[position - 1] > 1 ? <span className="pager-gap" aria-hidden="true">…</span> : null}
            <button type="button" className="pager-num" aria-current={index === page ? 'page' : undefined} onClick={() => onPage(index)}>{index + 1}</button>
          </span>
        ))}
      </span>
      <span className="pager-count">Page {page + 1} of {pages}</span>
      <button type="button" className="btn btn-icon" aria-label="Next page" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>&rsaquo;</button>
    </nav>
  );
}
