const slideState = {
  columns: {},
  dailyPage: 0,
  dailyFrom: '',
  dailyTo: '',
  taskFrom: '',
  taskTo: ''
};

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function toIso(date) {
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function parseCardDate(text = '') {
  const match = String(text).match(/(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
  if (match) return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
  const parsed = new Date(String(text).replace(/年|月/g, '/').replace(/日/g, ''));
  return toIso(parsed);
}

function activeTab() {
  return document.querySelector('.mainNav button.active')?.textContent?.trim() || '';
}

function weekRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return [toIso(start), toIso(end)];
}

function monthRange() {
  const now = new Date();
  return [toIso(new Date(now.getFullYear(), now.getMonth(), 1)), toIso(new Date(now.getFullYear(), now.getMonth() + 1, 0))];
}

function ensureOverlay(id, className, html) {
  let element = document.getElementById(id);
  if (!element) {
    element = document.createElement('div');
    element.id = id;
    element.className = className;
    element.innerHTML = html;
    document.body.appendChild(element);
  }
  return element;
}

function placeOverlay(element, anchor, offsetY = 0) {
  if (!element || !anchor) return;
  const rect = anchor.getBoundingClientRect();
  element.style.left = `${rect.left + window.scrollX}px`;
  element.style.top = `${rect.bottom + window.scrollY + offsetY}px`;
  element.style.width = `${rect.width}px`;
}

function show(element) {
  if (element) element.style.display = '';
}

function hide(element) {
  if (element) element.style.display = 'none';
}

function dailyCardPasses(card) {
  const date = parseCardDate(card.querySelector('.eyebrow')?.textContent || '');
  if (!date) return true;
  if (slideState.dailyFrom && date < slideState.dailyFrom) return false;
  if (slideState.dailyTo && date > slideState.dailyTo) return false;
  return true;
}

function taskCardPasses(card) {
  const text = card.querySelector('.datePill')?.textContent || '';
  const dates = text.match(/20\d{2}-\d{2}-\d{2}/g) || [];
  const start = dates[0] || '';
  const end = dates[1] || dates[0] || '';
  if (slideState.taskFrom && end && end < slideState.taskFrom) return false;
  if (slideState.taskTo && start && start > slideState.taskTo) return false;
  return true;
}

function setupDailyFilters() {
  const search = document.querySelector('.topSearch');
  const form = document.querySelector('.cardForm');
  if (!search || !form) return;

  const panel = ensureOverlay('safeDailyFilter', 'safeFilterOverlay', '<label>From<input type="date" data-field="dailyFrom"></label><label>To<input type="date" data-field="dailyTo"></label><button data-action="today">Today</button><button data-action="week">This Week</button><button data-action="month">This Month</button><button data-action="clear">Clear</button>');
  show(panel);
  placeOverlay(panel, search, 10);
  form.style.marginTop = '96px';

  if (!panel.dataset.bound) {
    panel.dataset.bound = 'true';
    panel.addEventListener('input', (event) => {
      const field = event.target.dataset.field;
      if (!field) return;
      slideState[field] = event.target.value;
      slideState.dailyPage = 0;
      updateDailyCards();
    });
    panel.addEventListener('click', (event) => {
      const action = event.target.dataset.action;
      if (!action) return;
      if (action === 'today') slideState.dailyFrom = slideState.dailyTo = isoToday();
      if (action === 'week') [slideState.dailyFrom, slideState.dailyTo] = weekRange();
      if (action === 'month') [slideState.dailyFrom, slideState.dailyTo] = monthRange();
      if (action === 'clear') slideState.dailyFrom = slideState.dailyTo = '';
      panel.querySelector('[data-field="dailyFrom"]').value = slideState.dailyFrom;
      panel.querySelector('[data-field="dailyTo"]').value = slideState.dailyTo;
      slideState.dailyPage = 0;
      updateDailyCards();
    });
  }
}

function updateDailyCards() {
  const grid = document.querySelector('.libraryGrid.oneThird');
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll('.libraryCard'));
  const filtered = cards.filter(dailyCardPasses);
  const pageSize = window.innerWidth > 1500 ? 3 : 2;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  slideState.dailyPage = Math.min(slideState.dailyPage, pages - 1);
  const visible = new Set(filtered.slice(slideState.dailyPage * pageSize, slideState.dailyPage * pageSize + pageSize));
  cards.forEach((card) => card.classList.toggle('safeHidden', !visible.has(card)));

  const controls = ensureOverlay('safeDailySlide', 'safeSlideOverlay', '<button data-dir="prev">‹</button><span>0 / 0</span><button data-dir="next">›</button>');
  show(controls);
  const form = document.querySelector('.cardForm');
  placeOverlay(controls, form || grid, 18);
  controls.querySelector('span').textContent = filtered.length ? `${slideState.dailyPage + 1} / ${pages}` : '0 / 0';
  if (!controls.dataset.bound) {
    controls.dataset.bound = 'true';
    controls.addEventListener('click', (event) => {
      const dir = event.target.dataset.dir;
      if (!dir) return;
      const currentCards = Array.from(document.querySelectorAll('.libraryGrid.oneThird .libraryCard')).filter(dailyCardPasses);
      const currentPages = Math.max(1, Math.ceil(currentCards.length / pageSize));
      slideState.dailyPage = dir === 'next' ? (slideState.dailyPage + 1) % currentPages : (slideState.dailyPage - 1 + currentPages) % currentPages;
      updateDailyCards();
    });
  }
}

function setupTaskFilters() {
  const filter = document.querySelector('.filterCard');
  if (!filter) return;
  if (!filter.querySelector('.taskDateFilters')) {
    const box = document.createElement('div');
    box.className = 'taskDateFilters';
    box.innerHTML = '<label>Start from<input type="date" data-field="taskFrom"></label><label>Due by<input type="date" data-field="taskTo"></label><button data-action="clearTaskDates">Clear dates</button>';
    filter.appendChild(box);
    box.addEventListener('input', (event) => {
      const field = event.target.dataset.field;
      if (!field) return;
      slideState[field] = event.target.value;
      updateKanbanSlides();
    });
    box.addEventListener('click', (event) => {
      if (event.target.dataset.action !== 'clearTaskDates') return;
      slideState.taskFrom = '';
      slideState.taskTo = '';
      box.querySelectorAll('input').forEach((input) => { input.value = ''; });
      updateKanbanSlides();
    });
  }
}

function updateKanbanSlides() {
  document.querySelectorAll('.kanbanColumn').forEach((column) => {
    const title = column.querySelector('h3')?.textContent?.trim() || 'column';
    const cards = Array.from(column.querySelectorAll('.taskCard'));
    const filtered = cards.filter(taskCardPasses);
    cards.forEach((card) => card.classList.add('safeHidden'));
    const count = filtered.length;
    const index = Math.min(slideState.columns[title] || 0, Math.max(0, count - 1));
    slideState.columns[title] = index;
    if (count) filtered[index].classList.remove('safeHidden');

    let controls = document.getElementById(`safeColumnSlide-${title.replace(/\s+/g, '-')}`);
    if (!controls) {
      controls = document.createElement('div');
      controls.id = `safeColumnSlide-${title.replace(/\s+/g, '-')}`;
      controls.className = 'safeColumnSlide';
      controls.innerHTML = '<button data-dir="prev">‹</button><span>0 / 0</span><button data-dir="next">›</button>';
      document.body.appendChild(controls);
      controls.addEventListener('click', (event) => {
        const dir = event.target.dataset.dir;
        if (!dir) return;
        const current = Array.from(column.querySelectorAll('.taskCard')).filter(taskCardPasses);
        if (!current.length) return;
        slideState.columns[title] = dir === 'next' ? ((slideState.columns[title] || 0) + 1) % current.length : ((slideState.columns[title] || 0) - 1 + current.length) % current.length;
        updateKanbanSlides();
      });
    }
    show(controls);
    const head = column.querySelector('h3') || column;
    const rect = head.getBoundingClientRect();
    controls.style.left = `${rect.right + window.scrollX - 132}px`;
    controls.style.top = `${rect.top + window.scrollY - 2}px`;
    controls.querySelector('span').textContent = count ? `${index + 1} / ${count}` : '0 / 0';
  });
}

function cleanup() {
  document.querySelectorAll('.taskCard,.libraryCard').forEach((card) => card.classList.remove('safeHidden'));
  document.querySelectorAll('.cardForm').forEach((form) => { form.style.marginTop = ''; });
  hide(document.getElementById('safeDailyFilter'));
  hide(document.getElementById('safeDailySlide'));
  document.querySelectorAll('.safeColumnSlide').forEach(hide);
}

function runEnhancements() {
  const tab = activeTab();
  cleanup();
  if (tab === 'Daily Task Log') {
    setupDailyFilters();
    updateDailyCards();
  }
  if (tab === 'Dashboard') {
    setupTaskFilters();
    updateKanbanSlides();
  }
}

const style = document.createElement('style');
style.textContent = `.safeHidden{display:none!important}.safeFilterOverlay{position:absolute;z-index:50;display:grid;grid-template-columns:repeat(2,minmax(160px,1fr)) repeat(4,auto);gap:10px;align-items:end;padding:14px 16px;border:1px solid var(--line);border-radius:20px;background:rgba(255,250,243,.92);box-shadow:0 12px 28px rgba(64,43,26,.08)}.safeFilterOverlay label,.taskDateFilters label{display:grid;gap:6px;color:#5a2e17;font-size:12px;font-weight:850}.safeFilterOverlay input,.safeFilterOverlay button,.taskDateFilters input,.taskDateFilters button{border:1px solid var(--line);background:rgba(255,255,255,.75);color:var(--ink);border-radius:14px;padding:10px 12px;font-weight:750}.safeFilterOverlay button{min-width:110px}.safeSlideOverlay,.safeColumnSlide{position:absolute;z-index:60;display:flex;align-items:center;gap:8px}.safeSlideOverlay{justify-content:flex-end}.safeSlideOverlay button,.safeColumnSlide button{width:34px;height:34px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.9);color:var(--ink);font-size:20px;font-weight:900}.safeSlideOverlay span,.safeColumnSlide span{min-width:54px;text-align:center;color:var(--muted);font-size:12px;font-weight:900}.libraryGrid.oneThird{width:100%!important;grid-template-columns:repeat(2,minmax(0,1fr))!important}.taskDateFilters{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(150px,1fr));gap:10px;margin-top:10px}.filterCard{grid-template-columns:1.1fr 1.1fr auto minmax(240px,2fr)!important}@media(min-width:1500px){.libraryGrid.oneThird{grid-template-columns:repeat(3,minmax(0,1fr))!important}}@media(max-width:900px){.safeFilterOverlay,.taskDateFilters{grid-template-columns:1fr 1fr}.libraryGrid.oneThird{grid-template-columns:1fr!important}}`;
document.head.appendChild(style);

let timer;
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(runEnhancements, 150);
}

const observer = new MutationObserver(schedule);
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('resize', schedule);
window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('load', schedule);
schedule();
