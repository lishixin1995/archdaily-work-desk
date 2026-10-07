import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

// Open modals, newest last. Only the top one answers Esc.
const stack = [];

// Centered sheet with a dimmed backdrop. Esc and a backdrop click close it.
export function Modal({ title, eyebrow, onClose, children, footer, wide = false, labelId }) {
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const autoId = useId();
  const headingId = labelId || autoId;

  useEffect(() => {
    const previous = document.activeElement;
    const first = panel.current?.querySelector('input:not([type="hidden"]), textarea, select, button:not(.btn-close)');
    (first || panel.current)?.focus({ preventScroll: true });
    stack.push(headingId);
    const onKey = (event) => {
      if (event.key === 'Escape' && stack[stack.length - 1] === headingId) {
        event.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener('keydown', onKey, true);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', onKey, true);
      stack.splice(stack.indexOf(headingId), 1);
      if (!stack.length) document.body.classList.remove('modal-open');
      if (previous && previous.focus) previous.focus({ preventScroll: true });
    };
    // Focus handling runs once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={headingId} ref={panel} tabIndex={-1}>
        <div className="modal-head">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 id={headingId}>{title}</h2>
          </div>
          <button type="button" className="btn-close" aria-label="Close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
