const finalFixStyle = document.createElement('style');
finalFixStyle.textContent = `
  /* Keep the main menu above filter panels, sliders, and calendar content while scrolling. */
  .topbar {
    position: sticky !important;
    top: 8px !important;
    z-index: 1000 !important;
    isolation: isolate !important;
  }

  .calendarTaskBar.done {
    background: #c9c3ba !important;
    color: #5f6368 !important;
  }

  .finalEditButton {
    color: var(--warmDark) !important;
  }

  .finalEditOverlay {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(34, 27, 22, .42);
  }

  .finalEditModal {
    width: min(720px, 94vw);
    max-height: min(86vh, 820px);
    overflow: auto;
    border: 1px solid var(--line);
    border-radius: 24px;
    background: var(--paper);
    box-shadow: 0 24px 70px rgba(64, 43, 26, .22);
    padding: 24px;
  }

  .finalEditModal h2 {
    margin: 0 0 16px;
    font-size: 28px;
  }

  .finalEditGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .finalEditGrid label {
    display: grid;
    gap: 7px;
    color: #5a2e17;
    font-size: 13px;
    font-weight: 850;
  }

  .finalEditGrid label.wide {
    grid-column: 1 / -1;
  }

  .finalEditGrid input,
  .finalEditGrid select,
  .finalEditGrid textarea {
    width: 100%;
    border: 1px solid var(--line);
    border-radius: 15px;
    background: rgba(255, 255, 255, .76);
    color: var(--ink);
    padding: 12px 14px;
    outline: none;
    font-weight: 650;
  }

  .finalEditGrid textarea {
    min-height: 140px;
  }

  .finalEditActions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
  }

  .finalEditActions button {
    border: 1px solid var(--line);
    border-radius: 999px;
    background: white;
    color: var(--ink);
    padding: 10px 16px;
    font-weight: 850;
  }

  .finalEditActions .primary {
    border: 0 !important;
  }

  /* Final daily-log saved note fix: the NOTE CARD is full width. No extra bottom frame. */
  .libraryGrid.oneThird {
    width: 100% !important;
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 16px !important;
    margin-top: 22px !important;
    padding: 0 !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .libraryGrid.oneThird .libraryCard {
    width: 100% !important;
    max-width: none !important;
    min-height: 190px !important;
    box-sizing: border-box !important;
  }

  .safeSlideOverlay {
    width: auto !important;
    min-width: 150px !important;
    justify-content: flex-end !important;
    transform: translateY(12px) !important;
  }

  /* Dashboard saved-task columns: always use the clean full-width Daily-Log-style layout. */
  .kanbanGrid {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
  }

  .kanbanColumn {
    position: relative !important;
    width: 100% !important;
    min-height: 190px !important;
    box-sizing: border-box !important;
  }

  .kanbanColumn > h3 {
    padding-right: 150px !important;
  }

  .kanbanColumn .safeColumnSlide {
    position: absolute !important;
    top: 18px !important;
    right: 16px !important;
    left: auto !important;
    width: auto !important;
    min-width: 142px !important;
    justify-content: flex-end !important;
    transform: none !important;
    z-index: 80 !important;
  }

  .kanbanColumn .taskCard {
    width: 100% !important;
    max-width: none !important;
    min-height: 180px !important;
    box-sizing: border-box !important;
  }

  @media (max-width: 720px) {
    .finalEditGrid {
      grid-template-columns: 1fr;
    }
  }
`;
document.head.appendChild(finalFixStyle);

const FINAL_TASKS_KEY = 'archDailyWorkDesk.tasks.v2';
const FINAL_DAILY_KEY = 'archDailyWorkDesk.dailyTaskLog.v2';
const FINAL_STATUSES = ['Not Started', 'In Progress', 'Waiting', 'Done'];
const FINAL_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

function readStoredArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredArray(key, value) {
  const rawValue = JSON.stringify(value);
  localStorage.setItem(key, rawValue);
  if (typeof window.__archDailySaveCloudNow === 'function') {
    return window.__archDailySaveCloudNow(key, rawValue);
  }
  return Promise.resolve(false);
}

function formatLocalDate(date) {
  if (!date || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseNiceDate(text) {
  const parsed = new Date(text);
  return formatLocalDate(parsed);
}

function textOf(element, selector) {
  return element.querySelector(selector)?.textContent?.trim() || '';
}

function findTaskForCard(card) {
  const tasks = readStoredArray(FINAL_TASKS_KEY);
  const title = textOf(card, 'h4');
  const project = textOf(card, '.mutedText');
  const priority = textOf(card, '.priorityPill');
  const status = card.querySelector('select')?.value || card.closest('.kanbanColumn')?.querySelector('h3')?.textContent?.trim() || '';
  const dates = textOf(card, '.datePill').match(/20\d{2}-\d{2}-\d{2}/g) || [];
  const startDate = dates[0] || '';
  const dueDate = dates[1] || dates[0] || '';

  return tasks.find((task) => task.title === title && (task.project || '') === project && (task.startDate || task.dueDate || '') === startDate && (task.dueDate || task.startDate || '') === dueDate)
    || tasks.find((task) => task.title === title && (task.project || '') === project && (task.priority || 'Medium') === priority && (task.status || 'Not Started') === status)
    || tasks.find((task) => task.title === title && (task.project || '') === project)
    || null;
}

function findDailyLogForCard(card) {
  const logs = readStoredArray(FINAL_DAILY_KEY);
  const date = parseNiceDate(textOf(card, '.eyebrow'));
  const project = textOf(card, 'h3');
  const texts = Array.from(card.querySelectorAll('.clampedText')).map((node) => node.textContent?.trim() || '');
  const summary = texts[0] || '';
  const notes = texts[1] || '';

  return logs.find((log) => (log.date || '') === date && (log.project || 'Daily Log') === project && (log.summary || '') === summary)
    || logs.find((log) => (log.date || '') === date && (log.project || 'Daily Log') === project && (log.notes || '') === notes)
    || logs.find((log) => (log.date || '') === date && (log.project || 'Daily Log') === project)
    || null;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function optionList(values, selected) {
  return values.map((value) => `<option${value === selected ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('');
}

function openFinalEditModal(kind, item) {
  const overlay = document.createElement('div');
  overlay.className = 'finalEditOverlay';
  const isTask = kind === 'task';
  overlay.innerHTML = `
    <form class="finalEditModal">
      <h2>Edit ${isTask ? 'Dashboard Task' : 'Daily Log'}</h2>
      <div class="finalEditGrid">
        ${isTask ? `
          <label class="wide">Task title<input name="title" value="${escapeHtml(item.title)}" required></label>
          <label>Project<input name="project" value="${escapeHtml(item.project)}"></label>
          <label>Priority<select name="priority">${optionList(FINAL_PRIORITIES, item.priority || 'Medium')}</select></label>
          <label>Status<select name="status">${optionList(FINAL_STATUSES, item.status || 'Not Started')}</select></label>
          <label>Start date<input type="date" name="startDate" value="${escapeHtml(item.startDate || item.dueDate || '')}"></label>
          <label>Due date<input type="date" name="dueDate" value="${escapeHtml(item.dueDate || item.startDate || '')}"></label>
          <label class="wide">Task notes / details<textarea name="notes">${escapeHtml(item.notes)}</textarea></label>
        ` : `
          <label>Date<input type="date" name="date" value="${escapeHtml(item.date || '')}"></label>
          <label>Project<input name="project" value="${escapeHtml(item.project)}"></label>
          <label class="wide">Quick summary<input name="summary" value="${escapeHtml(item.summary)}"></label>
          <label class="wide">Full notes<textarea name="notes">${escapeHtml(item.notes)}</textarea></label>
        `}
      </div>
      <div class="finalEditActions">
        <button type="button" data-action="cancel">Cancel</button>
        <button type="submit" class="primary">Save changes</button>
      </div>
    </form>
  `;

  function close() {
    overlay.remove();
  }

  overlay.addEventListener('mousedown', (event) => {
    if (event.target === overlay) close();
  });
  overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
  overlay.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    let changedKey = '';
    if (isTask) {
      const tasks = readStoredArray(FINAL_TASKS_KEY);
      const next = tasks.map((task) => task.id === item.id ? {
        ...task,
        title: String(data.get('title') || '').trim(),
        project: String(data.get('project') || '').trim(),
        priority: String(data.get('priority') || 'Medium'),
        status: String(data.get('status') || 'Not Started'),
        startDate: String(data.get('startDate') || ''),
        dueDate: String(data.get('dueDate') || ''),
        notes: String(data.get('notes') || ''),
        updatedAt: new Date().toISOString(),
      } : task);
      await writeStoredArray(FINAL_TASKS_KEY, next);
      changedKey = FINAL_TASKS_KEY;
    } else {
      const logs = readStoredArray(FINAL_DAILY_KEY);
      const next = logs.map((log) => log.id === item.id ? {
        ...log,
        date: String(data.get('date') || ''),
        project: String(data.get('project') || '').trim(),
        summary: String(data.get('summary') || ''),
        notes: String(data.get('notes') || ''),
        updatedAt: new Date().toISOString(),
      } : log);
      await writeStoredArray(FINAL_DAILY_KEY, next);
      changedKey = FINAL_DAILY_KEY;
    }
    close();
    window.dispatchEvent(new CustomEvent('archDailyWorkDesk:localDataChanged', { detail: { key: changedKey } }));
    window.setTimeout(runFinalFixes, 80);
  });

  document.body.appendChild(overlay);
  overlay.querySelector('input, textarea, select')?.focus();
}

function addFinalEditButton(actions, label, handler) {
  if (!actions || actions.querySelector('.finalEditButton')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'finalEditButton';
  button.textContent = 'Edit';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    handler();
  });
  actions.insertBefore(button, actions.firstElementChild);
}

function enhanceEditableCards() {
  const activeTab = document.querySelector('.mainNav button.active')?.textContent?.trim() || '';

  if (activeTab === 'Dashboard') {
    document.querySelectorAll('.taskCard').forEach((card) => {
      addFinalEditButton(card.querySelector('.cardActions'), 'Edit', () => {
        const task = findTaskForCard(card);
        if (task) openFinalEditModal('task', task);
      });
    });
  }

  if (activeTab === 'Daily Task Log') {
    document.querySelectorAll('.libraryGrid.oneThird .libraryCard').forEach((card) => {
      addFinalEditButton(card.querySelector('.cardActions'), 'Edit', () => {
        const log = findDailyLogForCard(card);
        if (log) openFinalEditModal('daily', log);
      });
    });
  }
}

function dockKanbanSlideControls() {
  document.querySelectorAll('.kanbanColumn').forEach((column) => {
    const heading = column.querySelector('h3');
    if (!heading) return;
    const title = heading.textContent.trim();
    const controlId = `safeColumnSlide-${title.replace(/\s+/g, '-')}`;
    const controls = document.getElementById(controlId);
    if (!controls) return;
    if (controls.parentElement !== column) {
      heading.insertAdjacentElement('afterend', controls);
    }
  });
}

function runFinalFixes() {
  dockKanbanSlideControls();
  enhanceEditableCards();
}

window.setInterval(runFinalFixes, 350);
window.addEventListener('resize', runFinalFixes);
window.addEventListener('load', runFinalFixes);
runFinalFixes();
