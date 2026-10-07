import { useEffect, useState } from 'react';

// Deletes need a second click within a few seconds.
export function ConfirmButton({ onConfirm, children = 'Delete', confirmLabel = 'Click again to delete', className = 'btn btn-danger' }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return undefined;
    const timer = window.setTimeout(() => setArmed(false), 3500);
    return () => window.clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      className={`${className}${armed ? ' is-armed' : ''}`}
      onClick={(event) => {
        event.stopPropagation();
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
