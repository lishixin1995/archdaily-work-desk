const SAVED_NOTES_EDIT_STYLE_ID = 'savedNotesEditStyles';
const SAVED_NOTES_KEYS = {
  dob: 'archDailyWorkDesk.dobNotes.v2',
  prompts: 'archDailyWorkDesk.aiPromptLibrary.v2',
  revit: 'archDailyWorkDesk.revitTroubleShoot.v2',
};
const DOB_EDIT_CATEGORIES = ['General', 'Zoning', 'Code', 'DOB', 'BPP', 'Accessibility', 'Energy'];
const PROMPT_EDIT_CATEGORIES = ['Rendering', 'Video', 'Writing', 'Code', 'DOB', 'Revit', 'Other'];
const REVIT_EDIT_CATEGORIES = ['Modeling', 'Family', 'View', 'Schedule', 'Link', 'Worksharing', 'Error', 'Other'];

function installSavedNotesEditStyles() {
  if (document.getElementById(SAVED_NOTES_EDIT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SAVED_NOTES_EDIT_STYLE_ID;
  style.textContent = `
    .savedNotesEditButton {
      color: var(--warmDark) !important;
    }

    .savedNotesEditOverlay {
      position: fixed;
      inset: 0;
      z-index: 1200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(34, 27, 22, .42);
    }

    .savedNotesEditModal {
      width: min(760px, 94vw);
      max-height: min(86vh, 820px);
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 24px;
      background: var(--paper);
      box-shadow: 0 24px 70px rgba(64, 43, 26, .22);
      padding: 24px;
    }

    .savedNotesEditModal h2 {
      margin: 0 0 16px;
      font-size: 28px;
    }

    .savedNotesEditGrid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .savedNotesEditGrid label {
      display: grid;
      gap: 7px;
      color: #5a2e17;
      font-size: 13px;
      font-weight: 850;
    }

    .savedNotesEditGrid label.wide {
      grid-column: 1 / -1;
    }

    .savedNotesEditGrid input,
    .savedNotesEditGrid select,
    .savedNotesEditGrid textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 15px;
      background: rgba(255, 255, 255, .76);
      color: var(--ink);
      padding: 12px 14px;
      outline: none;
      font-weight: 650;
    }

    .savedNotesEditGrid textarea {
      min-height: 150px;
    }

    .savedNotesEditCheck {
      display: flex !important;
      align-items: center;
      gap: 9px !important;
      align-self: end;
      padding-bottom: 12px;
    }

    .savedNotesEditCheck input {
      width: auto;
    }

    .savedNotesEditActions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 18px;
    }

    .savedNotesEditActions button {
      border: 1px solid var(--line);
      border-radius: 999px;
      background: white;
      color: var(--ink);
      padding: 10px 16px;
      font-weight: 850;
    }

    .savedNotesEditActions .primary {
      border: 0 !important;
    }

    @media (max-width: 720px) {
      .savedNotesEditGrid {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}

function readSavedNotesArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSavedNotesArray(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function savedNotesText(element, selector) {
  return element.querySelector(selector)?.textContent?.trim() || '';
}

function cleanSavedNotesCategory(value) {
  return String(value || '').replace(/^★\s*/, '').replace(/\s*·\s*Screenshot$/i, '').trim();
}

function escapeSavedNotesHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function savedNotesOptions(values, selected) {
  return values.map((value) => `<option${value === selected ? ' selected' : ''}>${escapeSavedNotesHtml(value)}</option>`).join('');
}

function savedNotesDateValue(value) {
  return String(value || '').slice(0, 10);
}

function findDobNoteForCard(card) {
  const notes = readSavedNotesArray(SAVED_NOTES_KEYS.dob);
  const category = cleanSavedNotesCategory(savedNotesText(card, '.eyebrow'));
  const title = savedNotesText(card, 'h3');
  const body = savedNotesText(card, '.clampedText');
  return notes.find((note) => (note.title || note.category || 'DOB Note') === title && (note.category || 'DOB Notes') === category && (note.notes || '') === body)
    || notes.find((note) => (note.title || note.category || 'DOB Note') === title && (note.category || 'DOB Notes') === category)
    || notes.find((note) => (note.title || note.category || 'DOB Note') === title)
    || null;
}

function findPromptForCard(card) {
  const prompts = readSavedNotesArray(SAVED_NOTES_KEYS.prompts);
  const category = cleanSavedNotesCategory(savedNotesText(card, '.eyebrow'));
  const title = savedNotesText(card, 'h3');
  const body = savedNotesText(card, '.clampedText');
  return prompts.find((prompt) => (prompt.title || 'Untitled Prompt') === title && (prompt.category || 'Prompt') === category && (prompt.prompt || '') === body)
    || prompts.find((prompt) => (prompt.title || 'Untitled Prompt') === title && (prompt.category || 'Prompt') === category)
    || prompts.find((prompt) => (prompt.title || 'Untitled Prompt') === title)
    || null;
}

function findRevitLogForCard(card) {
  const logs = readSavedNotesArray(SAVED_NOTES_KEYS.revit);
  const category = cleanSavedNotesCategory(savedNotesText(card, '.eyebrow'));
  const title = savedNotesText(card, 'h3');
  const body = savedNotesText(card, '.clampedText');
  return logs.find((log) => (log.issue || 'Untitled Issue') === title && (log.category || 'Revit') === category && ((log.problem || log.solution || '') === body))
    || logs.find((log) => (log.issue || 'Untitled Issue') === title && (log.category || 'Revit') === category)
    || logs.find((log) => (log.issue || 'Untitled Issue') === title)
    || null;
}

function buildSavedNotesEditFields(kind, item) {
  if (kind === 'dob') {
    return `
      <label>Date<input type="date" name="date" value="${escapeSavedNotesHtml(savedNotesDateValue(item.date))}"></label>
      <label>Category<select name="category">${savedNotesOptions(DOB_EDIT_CATEGORIES, item.category || 'General')}</select></label>
      <label class="wide">Title<input name="title" value="${escapeSavedNotesHtml(item.title)}"></label>
      <label class="wide">Full note<textarea name="notes">${escapeSavedNotesHtml(item.notes)}</textarea></label>
    `;
  }

  if (kind === 'prompt') {
    return `
      <label>Category<select name="category">${savedNotesOptions(PROMPT_EDIT_CATEGORIES, item.category || 'Rendering')}</select></label>
      <label class="savedNotesEditCheck"><input type="checkbox" name="favorite" ${item.favorite ? 'checked' : ''}> Favorite</label>
      <label class="wide">Prompt title<input name="title" value="${escapeSavedNotesHtml(item.title)}"></label>
      <label class="wide">Full prompt<textarea name="prompt">${escapeSavedNotesHtml(item.prompt)}</textarea></label>
    `;
  }

  return `
    <label>Date<input type="date" name="date" value="${escapeSavedNotesHtml(savedNotesDateValue(item.date))}"></label>
    <label>Category<select name="category">${savedNotesOptions(REVIT_EDIT_CATEGORIES, item.category || 'Modeling')}</select></label>
    <label class="wide">Issue title<input name="issue" value="${escapeSavedNotesHtml(item.issue)}"></label>
    <label class="wide">Problem description<textarea name="problem">${escapeSavedNotesHtml(item.problem)}</textarea></label>
    <label class="wide">Solution / notes<textarea name="solution">${escapeSavedNotesHtml(item.solution)}</textarea></label>
  `;
}

function getSavedNotesEditTitle(kind) {
  if (kind === 'dob') return 'Edit DOB Note';
  if (kind === 'prompt') return 'Edit AI Prompt';
  return 'Edit Revit Trouble Shoot';
}

function applySavedNotesEdit(kind, item, form) {
  const data = new FormData(form);
  const now = new Date().toISOString();

  if (kind === 'dob') {
    const notes = readSavedNotesArray(SAVED_NOTES_KEYS.dob);
    writeSavedNotesArray(SAVED_NOTES_KEYS.dob, notes.map((note) => note.id === item.id ? {
      ...note,
      date: String(data.get('date') || ''),
      category: String(data.get('category') || 'General'),
      title: String(data.get('title') || '').trim(),
      notes: String(data.get('notes') || ''),
      updatedAt: now,
    } : note));
    return;
  }

  if (kind === 'prompt') {
    const prompts = readSavedNotesArray(SAVED_NOTES_KEYS.prompts);
    writeSavedNotesArray(SAVED_NOTES_KEYS.prompts, prompts.map((prompt) => prompt.id === item.id ? {
      ...prompt,
      category: String(data.get('category') || 'Rendering'),
      title: String(data.get('title') || '').trim(),
      prompt: String(data.get('prompt') || ''),
      favorite: data.get('favorite') === 'on',
      updatedAt: now,
    } : prompt));
    return;
  }

  const logs = readSavedNotesArray(SAVED_NOTES_KEYS.revit);
  writeSavedNotesArray(SAVED_NOTES_KEYS.revit, logs.map((log) => log.id === item.id ? {
    ...log,
    date: String(data.get('date') || ''),
    category: String(data.get('category') || 'Modeling'),
    issue: String(data.get('issue') || '').trim(),
    problem: String(data.get('problem') || ''),
    solution: String(data.get('solution') || ''),
    updatedAt: now,
  } : log));
}

function openSavedNotesEditModal(kind, item) {
  const overlay = document.createElement('div');
  overlay.className = 'savedNotesEditOverlay';
  overlay.innerHTML = `
    <form class="savedNotesEditModal">
      <h2>${getSavedNotesEditTitle(kind)}</h2>
      <div class="savedNotesEditGrid">${buildSavedNotesEditFields(kind, item)}</div>
      <div class="savedNotesEditActions">
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
  overlay.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    applySavedNotesEdit(kind, item, event.currentTarget);
    close();
    window.location.reload();
  });

  document.body.appendChild(overlay);
  overlay.querySelector('input, textarea, select')?.focus();
}

function addSavedNotesEditButton(actions, handler) {
  if (!actions || actions.querySelector('.savedNotesEditButton, .finalEditButton')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'savedNotesEditButton';
  button.textContent = 'Edit';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    handler();
  });
  actions.insertBefore(button, actions.firstElementChild);
}

function enhanceDobNotesEdit() {
  document.querySelectorAll('.dobLinkPanel ~ .libraryGrid .libraryCard').forEach((card) => {
    addSavedNotesEditButton(card.querySelector('.cardActions'), () => {
      const note = findDobNoteForCard(card);
      if (note) openSavedNotesEditModal('dob', note);
    });
  });
}

function enhancePromptEdit() {
  document.querySelectorAll('.libraryGrid .libraryCard').forEach((card) => {
    addSavedNotesEditButton(card.querySelector('.cardActions'), () => {
      const prompt = findPromptForCard(card);
      if (prompt) openSavedNotesEditModal('prompt', prompt);
    });
  });
}

function enhanceRevitEdit() {
  document.querySelectorAll('.libraryGrid .libraryCard').forEach((card) => {
    addSavedNotesEditButton(card.querySelector('.cardActions'), () => {
      const log = findRevitLogForCard(card);
      if (log) openSavedNotesEditModal('revit', log);
    });
  });
}

function enhanceAllSavedNotesEdit() {
  const activeTab = document.querySelector('.mainNav button.active')?.textContent?.trim() || '';
  if (activeTab === 'DOB Notes') enhanceDobNotesEdit();
  if (activeTab === 'AI Prompt Library') enhancePromptEdit();
  if (activeTab === 'Revit Trouble Shoot') enhanceRevitEdit();
}

installSavedNotesEditStyles();
window.setInterval(enhanceAllSavedNotesEdit, 350);
window.addEventListener('resize', enhanceAllSavedNotesEdit);
window.addEventListener('load', enhanceAllSavedNotesEdit);
document.addEventListener('click', (event) => {
  if (event.target.closest('.mainNav button, .cardActions button')) window.setTimeout(enhanceAllSavedNotesEdit, 80);
}, true);
enhanceAllSavedNotesEdit();
