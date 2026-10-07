import { useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDesk, useUi } from '../desk.jsx';
import { groupItems, itemsForDay } from '../lib/agenda.js';
import { formatLong, relativeDay, today } from '../lib/dates.js';
import { AddForm } from './AddForm.jsx';
import { Groups } from './ItemList.jsx';
import { MoonLine } from './Moon.jsx';

// Popover for one day: what is on it, and a form to add to it.
export function DayCard() {
  const { datedItems } = useDesk();
  const { dayCard, closeDay } = useUi();
  const panel = useRef(null);
  const date = dayCard?.date;

  const groups = useMemo(() => (date ? groupItems(itemsForDay(datedItems, date, today())) : []), [date, datedItems]);

  // Place the card beside the picked day, and keep it on screen as it grows.
  useLayoutEffect(() => {
    if (!dayCard || !panel.current) return undefined;
    const card = panel.current;
    function place() {
      if (window.matchMedia('(max-width: 640px)').matches) {
        card.style.left = '';
        card.style.top = '';
        return;
      }
      const rect = dayCard.rect;
      const w = card.offsetWidth;
      const h = card.offsetHeight;
      let left = rect ? rect.right + 12 : (window.innerWidth - w) / 2;
      if (rect && left + w > window.innerWidth - 16) left = rect.left - w - 12;
      if (left < 16) left = Math.max(16, Math.min(window.innerWidth - w - 16, (rect ? rect.left + rect.width / 2 : window.innerWidth / 2) - w / 2));
      const top = Math.max(16, Math.min(window.innerHeight - h - 16, rect ? rect.top - 8 : 90));
      card.style.left = `${Math.round(left)}px`;
      card.style.top = `${Math.round(top)}px`;
    }
    place();
    if (!dayCard.touch) card.querySelector('input[type="text"]')?.focus({ preventScroll: true });
    const observer = new ResizeObserver(place);
    observer.observe(card);
    return () => observer.disconnect();
  }, [dayCard]);

  useLayoutEffect(() => {
    if (!dayCard) return undefined;
    const onDown = (event) => {
      if (panel.current?.contains(event.target)) return;
      if (event.target.closest?.('.cell, .trail, .orbit-canvas canvas, .modal-backdrop, .yday')) return;
      closeDay();
    };
    const onKey = (event) => {
      if (event.key === 'Escape' && !document.body.classList.contains('modal-open')) closeDay();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [dayCard, closeDay]);

  if (!dayCard) return null;

  return createPortal(
    <div className="daycard" role="dialog" aria-labelledby="daycard-title" ref={panel} data-keeps-drawer>
      <div className="daycard-head">
        <div className="head-row">
          <p className="eyebrow">Tasks · {relativeDay(date)}</p>
          <button type="button" className="btn-close" aria-label="Close" onClick={closeDay}>&times;</button>
        </div>
        <h2 id="daycard-title">{formatLong(date)}</h2>
        <MoonLine date={date} />
      </div>
      <Groups groups={groups} day={date} empty="Nothing on this day yet." />
      <AddForm key={date.getTime()} date={date} idPrefix="card" />
    </div>,
    document.body
  );
}
