import { useEffect, useRef } from 'react';

// Centered edit form for a saved card. Children are the form fields.
export function EditDialog({ title, onSave, onClose, children }) {
  const form = useRef(null);

  useEffect(() => {
    form.current?.querySelector('input, textarea, select')?.focus();
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="editOverlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form
        ref={form}
        className="editModal"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <h2>{title}</h2>
        <div className="editGrid">{children}</div>
        <div className="editActions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">Save changes</button>
        </div>
      </form>
    </div>
  );
}
