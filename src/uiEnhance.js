const uiState = {
  kanban: {},
  dailyPage: 0,
  libraryPage: 0,
  dailyFrom: '',
  dailyTo: '',
  taskStartFrom: '',
  taskDueTo: ''
};

function todayISO() {
  return toISO(new Date());
}

function toISO(date) {
  if (!date || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateText(text = '') {
  const value = String(text || '').trim();
  const iso = value.match(/(20\d{2})[-/年\.](\d{1,2})[-/月\.](\d{1,2})/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;

  const parsed = new Date(value.replace(/年|月/g, '/').replace(/日/g, ''));
  return toISO(parsed);
}

function rangeThisWeek() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return [toISO(start), toISO(end)];
}

function rangeThisMonth() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return [toISO(start), toISO(end)];
}

function getActiveTab() {
  return document.querySelector('.mainNav button.active')?.textContent?.trim() || '';
}

function ensureFilterControls(anchor, type) {
  if (!anchor || anchor.parentElement?.querySelector(`.dateFilterRibbon[data-type="${type}"]`)) return;

  const ribbon = document.createElement('div');
  ribbon.className = 'dateFilterRibbon';
  ribbon.dataset.type = type;

  if (type === 'task') {
    ribbon.innerHTML = `
      <label>Start from<input type="date" data-field="taskStartFrom" /></label>
      <label>Due by<input type="date" data-field="taskDueTo" /></label>
      <button type="button" data-action="clearTaskDates">Clear dates</button>
    `;
  } else {
    ribbon.innerHTML = `
      <label>From<input type="date" data-field="dailyFrom" /></label>
      <label>To<input type="date" data-field="dailyTo" /></label>
      <button type="button" data-action="today">Today</button>
      <button type="button" data-action="week">This Week</button>
      <button type="button" data-action="month">This Month</button>
      <button type="button" data-action="clearDailyDates">Clear</button>
    `;
  }

  anchor.insertAdjacentElement(type === 'task' ? 'beforeend' : 'afterend', ribbon);

  ribbon.addEventListener('input', (event) => {
    const field = event.target.dataset.field;
    if (!field) return;
    uiState[field] = event.target.value;
    uiState.dailyPage = 0;
    refreshUiEnhancements();
  });

  ribbon.addEventListener('click', (event) => {
    const action = event.target.dataset.action;
    if (!action) return;

    if (action === 'clearTaskDates') {
      uiState.taskStartFrom = '';
      uiState.taskDueTo = '';
      ribbon.querySelectorAll('input').forEach((input) => { input.value = ''; });
    }

    if (action === 'today') {
      uiState.dailyFrom = todayISO();
      uiState.dailyTo = todayISO();
    }

    if (action === 'week') {
      [uiState.dailyFrom, uiState.dailyTo] = rangeThisWeek();
    }

    if (action === 'month') {
      [uiState.dailyFrom, uiState.dailyTo] = rangeThisMonth();
    }

    if (action === 'clearDailyDates') {
      uiState.dailyFrom = '';
      uiState.dailyTo = '';
    }

    const fromInput = ribbon.querySelector('[data-field="dailyFrom"]');
    const toInput = ribbon.querySelector('[data-field="dailyTo"]');
    if (fromInput) fromInput.value = uiState.dailyFrom;
    if (toInput) toInput.value = uiState.dailyTo;

    uiState.dailyPage = 0;
    refreshUiEnhancements();
  });
}

function taskCardPassesDateFilter(card) {
  const pill = card.querySelector('.datePill')?.textContent || '';
  const dates = pill.match(/20\d{2}-\d{2}-\d{2}/g) || [];
  const start = dates[0] || '';
  const due = dates[1] || dates[0] || '';

  if (uiState.taskStartFrom && due && due < uiState.taskStartFrom) return false;
  if (uiState.taskDueTo && start && start > uiState.taskDueTo) return false;
  return true;
}

function enhanceTaskDashboard() {
  const filterCard = document.querySelector('.filterCard');
  ensureFilterControls(filterCard, 'task');

  document.querySelectorAll('.kanbanColumn').forEach((column) => {
    const title = column.querySelector('h3');
    if (!title) return;

    const status = title.textContent.trim();
    const allCards = Array.from(column.querySelectorAll('.taskCard'));
    const cards = allCards.filter(taskCardPassesDateFilter);

    allCards.forEach((card) => { card.classList.add('carousel-hidden'); });

    if (!column.querySelector('.columnCarouselControls')) {
      const controls = document.createElement('div');
      controls.className = 'columnCarouselControls';
      controls.innerHTML = `
        <button type="button" data-dir="prev">‹</button>
        <span>0 / 0</span>
        <button type="button" data-dir="next">›</button>
      `;
      title.after(controls);

      controls.addEventListener('click', (event) => {
        const dir = event.target.dataset.dir;
        if (!dir) return;

        const currentCards = Array.from(column.querySelectorAll('.taskCard')).filter(taskCardPassesDateFilter);
        const count = currentCards.length;
        if (!count) return;

        const current = uiState.kanban[status] || 0;
        uiState.kanban[status] = dir === 'next'
          ? (current + 1) % count
          : (current - 1 + count) % count;

        refreshUiEnhancements();
      });
    }

    const controls = column.querySelector('.columnCarouselControls');
    const counter = controls?.querySelector('span');

    if (!cards.length) {
      if (counter) counter.textContent = '0 / 0';
      return;
    }

    const index = Math.min(uiState.kanban[status] || 0, cards.length - 1);
    uiState.kanban[status] = index;
    cards[index]?.classList.remove('carousel-hidden');

    if (counter) counter.textContent = `${index + 1} / ${cards.length}`;
  });
}

function dailyCardPassesDateFilter(card) {
  const dateText = card.querySelector('.eyebrow')?.textContent || '';
  const date = parseDateText(dateText);
  if (!date) return true;
  if (uiState.dailyFrom && date < uiState.dailyFrom) return false;
  if (uiState.dailyTo && date > uiState.dailyTo) return false;
  return true;
}

function enhanceDailyLog() {
  const topSearch = document.querySelector('.topSearch');
  ensureFilterControls(topSearch, 'daily');

  const grid = document.querySelector('.libraryGrid.oneThird');
  if (!grid) return;

  if (!document.querySelector('.dailyCarouselControls')) {
    const controls = document.createElement('div');
    controls.className = 'dailyCarouselControls';
    controls.innerHTML = `
      <button type="button" data-dir="prev">‹</button>
      <span>0 / 0</span>
      <button type="button" data-dir="next">›</button>
    `;
    grid.before(controls);

    controls.addEventListener('click', (event) => {
      const dir = event.target.dataset.dir;
      if (!dir) return;

      const cards = Array.from(grid.querySelectorAll('.libraryCard')).filter(dailyCardPassesDateFilter);
      const pageSize = window.innerWidth > 1500 ? 3 : 2;
      const totalPages = Math.max(1, Math.ceil(cards.length / pageSize));

      uiState.dailyPage = dir === 'next'
        ? (uiState.dailyPage + 1) % totalPages
        : (uiState.dailyPage - 1 + totalPages) % totalPages;

      refreshUiEnhancements();
    });
  }

  const allCards = Array.from(grid.querySelectorAll('.libraryCard'));
  const filteredCards = allCards.filter(dailyCardPassesDateFilter);
  const pageSize = window.innerWidth > 1500 ? 3 : 2;
  const totalPages = Math.max(1, Math.ceil(filteredCards.length / pageSize));
  uiState.dailyPage = Math.min(uiState.dailyPage, totalPages - 1);

  const start = uiState.dailyPage * pageSize;
  const visible = new Set(filteredCards.slice(start, start + pageSize));

  allCards.forEach((card) => {
    card.classList.toggle('carousel-hidden', !visible.has(card));
  });

  const counter = document.querySelector('.dailyCarouselControls span');
  if (counter) counter.textContent = filteredCards.length ? `${uiState.dailyPage + 1} / ${totalPages}` : '0 / 0';
}

function enhanceGenericLibrary() {
  const tab = getActiveTab();
  if (tab === 'Daily Task Log' || tab === 'Dashboard') return;

  const grid = document.querySelector('.libraryGrid:not(.oneThird)');
  if (!grid) return;

  if (!document.querySelector('.genericCarouselControls')) {
    const controls = document.createElement('div');
    controls.className = 'genericCarouselControls';
    controls.innerHTML = `
      <button type="button" data-dir="prev">‹</button>
      <span>0 / 0</span>
      <button type="button" data-dir="next">›</button>
    `;
    grid.before(controls);

    controls.addEventListener('click', (event) => {
      const dir = event.target.dataset.dir;
      if (!dir) return;

      const cards = Array.from(grid.querySelectorAll('.libraryCard'));
      const pageSize = window.innerWidth > 1500 ? 3 : 2;
      const totalPages = Math.max(1, Math.ceil(cards.length / pageSize));

      uiState.libraryPage = dir === 'next'
        ? (uiState.libraryPage + 1) % totalPages
        : (uiState.libraryPage - 1 + totalPages) % totalPages;

      refreshUiEnhancements();
    });
  }

  const cards = Array.from(grid.querySelectorAll('.libraryCard'));
  const pageSize = window.innerWidth > 1500 ? 3 : 2;
  const totalPages = Math.max(1, Math.ceil(cards.length / pageSize));
  uiState.libraryPage = Math.min(uiState.libraryPage, totalPages - 1);

  const start = uiState.libraryPage * pageSize;
  const visible = new Set(cards.slice(start, start + pageSize));

  cards.forEach((card) => card.classList.toggle('carousel-hidden', !visible.has(card)));

  const counter = document.querySelector('.genericCarouselControls span');
  if (counter) counter.textContent = cards.length ? `${uiState.libraryPage + 1} / ${totalPages}` : '0 / 0';
}

function refreshUiEnhancements() {
  window.clearTimeout(window.__archUiEnhanceTimer);
  window.__archUiEnhanceTimer = window.setTimeout(() => {
    const tab = getActiveTab();

    if (tab === 'Dashboard') enhanceTaskDashboard();
    if (tab === 'Daily Task Log') enhanceDailyLog();
    enhanceGenericLibrary();
  }, 80);
}

const style = document.createElement('style');
style.textContent = `
  .dateFilterRibbon {
    display: grid;
    grid-template-columns: repeat(4, minmax(140px, auto));
    gap: 10px;
    align-items: end;
    margin-top: 12px;
    width: 100%;
  }

  .dateFilterRibbon label {
    display: grid;
    gap: 6px;
    color: #5a2e17;
    font-size: 12px;
    font-weight: 850;
  }

  .dateFilterRibbon input,
  .dateFilterRibbon button {
    border: 1px solid var(--line);
    background: rgba(255,255,255,.72);
    color: var(--ink);
    border-radius: 14px;
    padding: 10px 12px;
    font-weight: 750;
  }

  .dateFilterRibbon button {
    white-space: nowrap;
  }

  .columnCarouselControls,
  .dailyCarouselControls,
  .genericCarouselControls {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin: -6px 0 12px;
  }

  .columnCarouselControls button,
  .dailyCarouselControls button,
  .genericCarouselControls button {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: rgba(255,255,255,.75);
    color: var(--ink);
    font-size: 20px;
    font-weight: 900;
  }

  .columnCarouselControls span,
  .dailyCarouselControls span,
  .genericCarouselControls span {
    min-width: 54px;
    text-align: center;
    color: var(--muted);
    font-size: 12px;
    font-weight: 900;
  }

  .carousel-hidden {
    display: none !important;
  }

  .kanbanColumn {
    min-height: 250px;
  }

  .libraryGrid.oneThird,
  .libraryGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 1500px) {
    .libraryGrid.oneThird,
    .libraryGrid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .dateFilterRibbon {
      grid-template-columns: 1fr 1fr;
    }

    .libraryGrid.oneThird,
    .libraryGrid {
      grid-template-columns: 1fr;
    }
  }
`;
document.head.appendChild(style);

const observer = new MutationObserver(refreshUiEnhancements);
observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener('resize', refreshUiEnhancements);
window.addEventListener('load', refreshUiEnhancements);
refreshUiEnhancements();
