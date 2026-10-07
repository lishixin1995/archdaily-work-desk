import { useEffect, useMemo, useRef } from 'react';
import { useDesk, useUi } from '../desk.jsx';
import { groupItems, itemsForDay } from '../lib/agenda.js';
import { formatLong, today } from '../lib/dates.js';
import { isOverdue } from '../lib/tasks.js';
import { AddForm } from './AddForm.jsx';
import { Groups } from './ItemList.jsx';
import { MoonLine } from './Moon.jsx';

const OPEN_DELAY = 110;
const CLOSE_DELAY = 380;
// After a tap, browsers send a compatibility "mouse" hover at the tap point.
// Hover peeking ignores that window and devices that cannot hover at all.
const TOUCH_QUIET = 900;
let lastTouch = 0;
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (event) => { if (event.pointerType !== 'mouse') lastTouch = Date.now(); }, true);
}
const canHover = () => window.matchMedia?.('(hover: hover)').matches !== false && Date.now() - lastTouch > TOUCH_QUIET;

export function useTodayAgenda() {
  const { datedItems } = useDesk();
  return useMemo(() => {
    const now = today();
    const dayItems = itemsForDay(datedItems, now, now);
    return {
      now,
      groups: groupItems(dayItems),
      open: dayItems.filter((item) => !item.done).length,
      done: dayItems.filter((item) => item.done).length,
      overdue: dayItems.filter((item) => isOverdue(item, now)).length
    };
  }, [datedItems]);
}

// Lives on the right edge of every page. Hover the edge or the tab to peek;
// click the tab (or work inside it) to pin it open.
export function AgendaDrawer() {
  const { drawer, setDrawer } = useUi();
  const agenda = useTodayAgenda();
  const root = useRef(null);
  const handle = useRef(null);
  const timers = useRef({ open: 0, close: 0 });
  const { open, pinned } = drawer;

  const clearTimers = () => {
    window.clearTimeout(timers.current.open);
    window.clearTimeout(timers.current.close);
  };

  const hoverOpen = () => {
    window.clearTimeout(timers.current.close);
    if (open) return;
    window.clearTimeout(timers.current.open);
    timers.current.open = window.setTimeout(() => setDrawer({ open: true, pinned: false }), OPEN_DELAY);
  };

  const hoverClose = () => {
    window.clearTimeout(timers.current.open);
    if (pinned) return;
    window.clearTimeout(timers.current.close);
    timers.current.close = window.setTimeout(() => {
      if (!root.current?.contains(document.activeElement)) setDrawer({ open: false, pinned: false });
    }, CLOSE_DELAY);
  };

  useEffect(() => clearTimers, []);

  useEffect(() => {
    if (!open || !pinned) return undefined;
    const onDown = (event) => {
      if (root.current?.contains(event.target)) return;
      if (event.target.closest?.('.modal-backdrop, .daycard, [data-keeps-drawer]')) return;
      setDrawer({ open: false, pinned: false });
    };
    const onKey = (event) => {
      if (event.key === 'Escape' && !document.body.classList.contains('modal-open')) {
        setDrawer({ open: false, pinned: false });
        handle.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, pinned, setDrawer]);

  // Scroll a freshly flashed item into view.
  useEffect(() => {
    if (!open || !drawer.focusId) return;
    const row = root.current?.querySelector(`.item[data-hl="${CSS.escape(drawer.focusId)}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, [open, drawer.focusId]);

  const mouse = (fn) => (event) => { if (event.pointerType === 'mouse' && canHover()) fn(); };
  // Leaving to the right means the pointer went onto the page scrollbar,
  // which still counts as being at the edge.
  const leave = (event) => {
    if (event.pointerType !== 'mouse' || !canHover() || event.clientX >= document.documentElement.clientWidth - 1) return;
    hoverClose();
  };

  return (
    <>
      <div className="edge-zone" aria-hidden="true" onPointerEnter={mouse(hoverOpen)} onPointerLeave={leave} />
      {open && pinned ? <div className="drawer-scrim" onClick={() => setDrawer({ open: false, pinned: false })} /> : null}
      <aside
        ref={root}
        className={`drawer${open ? ' is-open' : ''}`}
        aria-labelledby="drawer-title"
        onPointerEnter={mouse(hoverOpen)}
        onPointerLeave={leave}
        onFocus={(event) => {
          if (event.target === handle.current || !open) return;
          clearTimers();
          if (!pinned) setDrawer({ open: true, pinned: true });
        }}
      >
        <button
          ref={handle}
          type="button"
          className="drawer-handle"
          aria-expanded={open}
          aria-controls="drawer-panel"
          aria-label={`Today's agenda, ${agenda.open} open${agenda.overdue ? `, ${agenda.overdue} overdue` : ''}`}
          onClick={() => setDrawer(open && pinned ? { open: false, pinned: false } : { open: true, pinned: true })}
        >
          <span className="handle-label">Agenda</span>
          <span className="handle-count">{agenda.open}</span>
          {agenda.overdue ? <span className="handle-dot" /> : null}
        </button>
        <div className="drawer-panel" id="drawer-panel">
          <div className="drawer-head">
            <div className="head-row">
              <p className="eyebrow">Agenda · Today</p>
              <div className="head-actions">
                {pinned ? <span className="pin-note">Pinned</span> : null}
                <button type="button" className="btn-close" aria-label="Close agenda" onClick={() => { setDrawer({ open: false, pinned: false }); handle.current?.focus(); }}>&times;</button>
              </div>
            </div>
            <h2 id="drawer-title">{formatLong(agenda.now)}</h2>
            <MoonLine date={agenda.now} />
            <div className="stats">
              {agenda.overdue ? <span className="stat stat-danger"><b>{agenda.overdue}</b> overdue</span> : null}
              <span className="stat"><b>{agenda.open}</b> open</span>
              <span className="stat"><b>{agenda.done}</b> done</span>
            </div>
          </div>
          <div className="drawer-scroll">
            <Groups groups={agenda.groups} day={agenda.now} empty="Nothing on today's agenda. Add something below." />
          </div>
          <AddForm key={agenda.now.getTime()} date={agenda.now} idPrefix="quick" withEnds={false} placeholder="Send DOB comments" />
        </div>
      </aside>
    </>
  );
}
