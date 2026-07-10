const DOB_SAVED_SLIDER_STYLE_ID = 'dobSavedNotesSliderStyles';
const DOB_SAVED_NOTES_PAGE_SIZE = 3;
let dobSavedNotesSliderFrame = 0;

function isDobNotesActive() {
  const activeTab = document.querySelector('.mainNav button.active')?.textContent?.trim();
  const heading = document.querySelector('.pageHeading h2')?.textContent?.trim();
  return activeTab === 'DOB Notes' || heading === 'DOB Notes';
}

function getDobSavedNotesGrid() {
  if (!isDobNotesActive()) return null;
  const dobNotesGrid = document.querySelector('.dobNotesSavedGrid');
  if (dobNotesGrid?.classList?.contains('libraryGrid')) return dobNotesGrid;
  const markedGrid = document.querySelector('.dobSavedNotesGrid');
  if (markedGrid?.classList?.contains('libraryGrid')) return markedGrid;
  const linkPanel = document.querySelector('.dobLinkPanel');
  const nextGrid = linkPanel?.nextElementSibling;
  if (nextGrid?.classList?.contains('libraryGrid')) return nextGrid;
  return document.querySelector('.dobLinkPanel ~ .libraryGrid');
}

function moveDobSavedNotesGrid(grid) {
  if (!grid) return;
  grid.classList.add('dobSavedNotesGrid');
  const filters = document.querySelector('.libraryFilters');
  if (!filters || filters.nextElementSibling === grid) return;
  filters.after(grid);
}

function getDobSavedNoteCards(grid) {
  return Array.from(grid.children).filter((child) => child.classList.contains('libraryCard'));
}

function getDobSavedNotesSignature(cards) {
  return cards.map((card) => card.textContent?.trim().slice(0, 140) || '').join('|');
}

function getDobSavedNotesPageCount(cards) {
  return Math.max(1, Math.ceil(cards.length / DOB_SAVED_NOTES_PAGE_SIZE));
}

function ensureDobSavedNotesControls(grid) {
  let controls = Array.from(grid.children).find((child) => child.classList.contains('dobSavedNotesControls'));
  if (controls) return controls;

  controls = document.createElement('div');
  controls.className = 'dobSavedNotesControls';
  controls.innerHTML = '<button type="button" class="dobSavedPrev" aria-label="Previous saved DOB notes page">&lt;</button><span class="dobSavedNotesPosition"></span><button type="button" class="dobSavedNext" aria-label="Next saved DOB notes page">&gt;</button>';
  controls.addEventListener('click', (event) => {
    event.stopPropagation();
    const button = event.target.closest('button');
    if (!button) return;
    const cards = getDobSavedNoteCards(grid);
    if (!cards.length) return;
    const current = Number(grid.dataset.dobSavedPage || 0);
    const next = button.classList.contains('dobSavedPrev') ? current - 1 : current + 1;
    setDobSavedNotesPage(grid, next, true);
  });
  grid.prepend(controls);
  return controls;
}

function setDobSavedNotesPage(grid, requestedPage, force = false) {
  const cards = getDobSavedNoteCards(grid);
  const controls = ensureDobSavedNotesControls(grid);
  const hasCards = cards.length > 0;
  const pageCount = getDobSavedNotesPageCount(cards);
  const maxPage = Math.max(0, pageCount - 1);
  const page = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 0, 0), maxPage);
  const signature = getDobSavedNotesSignature(cards);

  if (!force && grid.dataset.dobSavedPage === String(page) && grid.dataset.dobSavedSignature === signature) return;

  grid.dataset.dobSavedPage = String(page);
  grid.dataset.dobSavedSignature = signature;
  const firstVisible = page * DOB_SAVED_NOTES_PAGE_SIZE;
  const lastVisible = firstVisible + DOB_SAVED_NOTES_PAGE_SIZE;
  cards.forEach((card, cardIndex) => {
    const shouldShow = cardIndex >= firstVisible && cardIndex < lastVisible;
    if (card.classList.contains('dobSavedNoteActive') !== shouldShow) {
      card.classList.toggle('dobSavedNoteActive', shouldShow);
    }
  });

  const position = controls.querySelector('.dobSavedNotesPosition');
  const prev = controls.querySelector('.dobSavedPrev');
  const next = controls.querySelector('.dobSavedNext');
  if (position) position.textContent = hasCards ? `${page + 1} / ${pageCount}` : '';
  if (prev) prev.disabled = !hasCards || pageCount < 2;
  if (next) next.disabled = !hasCards || pageCount < 2;
  controls.hidden = !hasCards;
}

function enhanceDobSavedNotesSlider() {
  const grid = getDobSavedNotesGrid();
  if (!grid) return;
  moveDobSavedNotesGrid(grid);
  grid.classList.add('dobSavedNotesSlider');
  const current = Number(grid.dataset.dobSavedPage || grid.dataset.dobSavedIndex || 0);
  setDobSavedNotesPage(grid, current);
}

function scheduleDobSavedNotesSlider() {
  if (dobSavedNotesSliderFrame) return;
  dobSavedNotesSliderFrame = requestAnimationFrame(() => {
    dobSavedNotesSliderFrame = 0;
    enhanceDobSavedNotesSlider();
  });
}

function mutationTouchesSavedNotes(mutation) {
  const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
  return nodes.some((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    return node.matches?.('.dobNotesSavedGrid, .dobSavedNotesGrid, .dobLinkPanel, .cardForm, .libraryFilters, .libraryGrid, .libraryCard, .pageHeading, .mainNav')
      || node.querySelector?.('.dobNotesSavedGrid, .dobSavedNotesGrid, .dobLinkPanel, .cardForm, .libraryFilters, .libraryGrid, .libraryCard, .pageHeading, .mainNav');
  });
}

function installDobSavedNotesSliderStyles() {
  if (document.getElementById(DOB_SAVED_SLIDER_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = DOB_SAVED_SLIDER_STYLE_ID;
  style.textContent = `
    .dobSavedNotesSlider {
      position: relative;
      display: block;
      width: 100%;
    }

    .dobSavedNotesSlider .libraryCard {
      display: none;
      width: 100%;
      min-height: 190px;
      margin: 0 0 16px;
      padding-right: 116px;
    }

    .dobSavedNotesSlider .libraryCard.dobSavedNoteActive {
      display: block;
    }

    .dobSavedNotesSlider .wideEmpty {
      display: block;
      width: 100%;
    }

    .dobSavedNotesControls {
      position: absolute;
      top: 12px;
      right: 14px;
      z-index: 8;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px;
      border-radius: 999px;
      background: rgba(255, 250, 243, .78);
      backdrop-filter: blur(8px);
    }

    .dobSavedNotesControls[hidden] {
      display: none;
    }

    .dobSavedNotesControls button {
      width: 34px;
      height: 34px;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: var(--danger);
      font-size: 28px;
      line-height: 1;
      font-weight: 900;
      display: grid;
      place-items: center;
      padding: 0;
    }

    .dobSavedNotesControls button:hover:not(:disabled) {
      background: rgba(180, 66, 58, .10);
    }

    .dobSavedNotesControls button:disabled {
      opacity: .3;
      cursor: default;
    }

    .dobSavedNotesPosition {
      min-width: 42px;
      text-align: center;
      color: var(--muted);
      font-size: 12px;
      font-weight: 900;
    }

    @media (max-width: 720px) {
      .dobSavedNotesSlider .libraryCard {
        padding-right: 16px;
        padding-top: 56px;
      }
    }
  `;
  document.head.appendChild(style);
}

installDobSavedNotesSliderStyles();
const dobSavedNotesSliderObserver = new MutationObserver((mutations) => {
  if (mutations.some(mutationTouchesSavedNotes)) scheduleDobSavedNotesSlider();
});
dobSavedNotesSliderObserver.observe(document.body, { childList: true, subtree: true });
document.addEventListener('click', (event) => {
  if (event.target.closest('.mainNav button, .cardActions button, .dobSavedNotesControls button')) scheduleDobSavedNotesSlider();
}, true);
window.addEventListener('load', scheduleDobSavedNotesSlider);
window.addEventListener('storage', scheduleDobSavedNotesSlider);
scheduleDobSavedNotesSlider();
