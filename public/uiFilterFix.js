(() => {
  const state = { from: '', to: '' };
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const toISO = (date) => Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  const activeTab = () => document.querySelector('.mainNav button.active')?.textContent?.trim() || '';
  const parseDate = (text = '') => {
    const hit = String(text).match(/(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
    if (hit) return `${hit[1]}-${String(hit[2]).padStart(2, '0')}-${String(hit[3]).padStart(2, '0')}`;
    return toISO(new Date(String(text).replace(/年|月/g, '/').replace(/日/g, '')));
  };
  const weekRange = () => {
    const d = new Date();
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return [toISO(start), toISO(end)];
  };
  const monthRange = () => {
    const d = new Date();
    return [toISO(new Date(d.getFullYear(), d.getMonth(), 1)), toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0))];
  };
  const passesDate = (card) => {
    const date = parseDate(card.querySelector('.eyebrow')?.textContent || '');
    if (!date) return true;
    if (state.from && date < state.from) return false;
    if (state.to && date > state.to) return false;
    return true;
  };
  function buildPanel() {
    document.querySelectorAll('.workspacePane > .dateFilterRibbon').forEach((item) => item.remove());
    if (activeTab() !== 'Daily Task Log') return;
    const search = document.querySelector('.topSearch');
    if (!search) return;
    let panel = document.querySelector('.searchFilterCard');
    if (!panel) {
      panel = document.createElement('section');
      panel.className = 'searchFilterCard';
      search.before(panel);
    }
    if (!panel.contains(search)) panel.prepend(search);
    if (!panel.querySelector('.dailyInlineFilters')) {
      const filters = document.createElement('div');
      filters.className = 'dailyInlineFilters';
      filters.innerHTML = '<label>From<input type="date" data-f="from"></label><label>To<input type="date" data-f="to"></label><button data-a="today">Today</button><button data-a="week">This Week</button><button data-a="month">This Month</button><button data-a="clear">Clear</button>';
      panel.appendChild(filters);
      filters.addEventListener('input', (event) => {
        const field = event.target.dataset.f;
        if (!field) return;
        state[field] = event.target.value;
        applyDailyCards();
      });
      filters.addEventListener('click', (event) => {
        const action = event.target.dataset.a;
        if (!action) return;
        if (action === 'today') state.from = state.to = todayISO();
        if (action === 'week') [state.from, state.to] = weekRange();
        if (action === 'month') [state.from, state.to] = monthRange();
        if (action === 'clear') state.from = state.to = '';
        filters.querySelector('[data-f="from"]').value = state.from;
        filters.querySelector('[data-f="to"]').value = state.to;
        applyDailyCards();
      });
    }
    applyDailyCards();
  }
  function applyDailyCards() {
    const grid = document.querySelector('.libraryGrid.oneThird');
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll('.libraryCard'));
    const visible = cards.filter(passesDate);
    cards.forEach((card) => {
      if (card.dataset.forceSlideHidden === 'true') return;
      card.style.display = visible.includes(card) ? '' : 'none';
    });
  }
  const style = document.createElement('style');
  style.textContent = '.searchFilterCard{display:grid;gap:12px;margin:0 0 18px;padding:16px 18px;border:1px solid var(--line);border-radius:22px;background:rgba(255,250,243,.72);box-shadow:0 12px 28px rgba(64,43,26,.07)}.searchFilterCard .topSearch{margin:0!important}.dailyInlineFilters{display:grid;grid-template-columns:repeat(2,minmax(160px,1fr)) repeat(4,auto);gap:10px;align-items:end}.dailyInlineFilters label{display:grid;gap:6px;color:#5a2e17;font-size:12px;font-weight:850}.dailyInlineFilters input,.dailyInlineFilters button{border:1px solid var(--line);background:rgba(255,255,255,.72);color:var(--ink);border-radius:14px;padding:10px 12px;font-weight:750}.dailyInlineFilters button{min-width:110px}@media(max-width:900px){.dailyInlineFilters{grid-template-columns:1fr 1fr}}';
  document.head.appendChild(style);
  setInterval(buildPanel, 500);
  window.addEventListener('load', buildPanel);
})();
