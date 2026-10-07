import { useEffect, useState } from 'react';

// Per-category paging: "< 1 / 3 >".
export function CategoryPager({ page, pages, onPage, label, className = 'categoryPager' }) {
  return (
    <div className={className}>
      <button type="button" aria-label={`Previous ${label} page`} onClick={() => onPage(Math.max(0, page - 1))} disabled={page <= 0}>&lt;</button>
      <span>{page + 1} / {pages}</span>
      <button type="button" aria-label={`Next ${label} page`} onClick={() => onPage(Math.min(pages - 1, page + 1))} disabled={page + 1 >= pages}>&gt;</button>
    </div>
  );
}

// The current page of each category; every category returns to its first
// page when resetKey changes.
export function useCategoryPages(resetKey) {
  const [pages, setPages] = useState({});
  useEffect(() => setPages({}), [resetKey]);
  return [pages, (category, page) => setPages((current) => ({ ...current, [category]: page }))];
}
