import { useEffect, useRef, useState } from 'react';

export const SPACES = [
  { view: 'prompts', label: 'AI Prompt Library', short: 'Prompts', token: '--accent' },
  { view: 'links', label: 'Links', short: 'Links', token: '--link' },
  { view: 'revit', label: 'Revit Trouble Shoot', short: 'Revit', token: '--revit' }
];

export function TopMenu({ view, onNavigate, onSearch, counts }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const trigger = useRef(null);
  const space = SPACES.find((item) => item.view === view);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (!wrap.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    wrap.current?.querySelector('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = (next) => {
    setOpen(false);
    onNavigate(next);
  };

  const navButton = (key, label, token) => (
    <button
      type="button"
      className={`nav-btn${view === key ? ' is-active' : ''}`}
      style={token ? { '--c': `var(${token})` } : undefined}
      aria-current={view === key ? 'page' : undefined}
      onClick={() => go(key)}
    >
      {token ? <span className="nav-dot" aria-hidden="true" /> : null}{label}
    </button>
  );

  return (
    <header className="top-menu">
      <button type="button" className="brand" onClick={() => go('dashboard')}>
        <span className="brand-mark" aria-hidden="true" />Arch Daily Work Desk
      </button>
      <nav className="top-nav" aria-label="Main">
        {navButton('dashboard', 'Dashboard')}
        {navButton('dob', 'DOB Notes', '--dob')}
        {navButton('calendar', 'Calendar')}
        <div className="spaces" ref={wrap}>
          <button
            type="button"
            ref={trigger}
            className={`nav-btn spaces-trigger${space ? ' is-active' : ''}`}
            style={space ? { '--c': `var(${space.token})` } : undefined}
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpen((value) => !value)}
          >
            {space ? (
              <>
                <span className="label-full">{space.label}</span>
                <span className="label-short">{space.short}</span>
              </>
            ) : 'Spaces'}
            <span className="chev" aria-hidden="true" />
          </button>
          {open ? (
            <div className="spaces-menu" role="menu">
              {SPACES.map((item) => (
                <button key={item.view} type="button" role="menuitem" className={item.view === view ? 'is-current' : ''} style={{ '--c': `var(${item.token})` }} onClick={() => go(item.view)}>
                  <span className="dot" />
                  <span>{item.label}</span>
                  <span className="sp-meta">{counts[item.view]}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </nav>
      <div className="top-actions">
        <button type="button" className="nav-btn" onClick={onSearch}>Search</button>
      </div>
    </header>
  );
}
