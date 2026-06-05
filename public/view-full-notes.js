/*
  ARCH DAILY WORK DESK - View Full Notes patch
  Surgical DOM add-on: does not touch React files, localStorage keys, layout logic, calendar logic, or saved data.
*/
(function () {
  'use strict';

  const PATCH_ID = 'arch-daily-work-desk-view-full-notes-only-v1';
  if (window[PATCH_ID]) return;
  window[PATCH_ID] = true;

  const COLOR = {
    ink: '#1f2933',
    muted: '#667085',
    warm: '#9b5f34',
    warmDark: '#7a431f',
    border: '#e6d8c8',
    card: '#fffaf3',
    page: 'rgba(34, 27, 22, 0.42)',
    soft: '#f6efe6'
  };

  const STORAGE_HINTS = [
    'archDailyWorkDesk.tasks.v2',
    'archDailyWorkDesk.dailyTaskLog.v2',
    'archDailyWorkDesk.dobNotes.v2',
    'archDailyWorkDesk.aiPromptLibrary.v2',
    'archDailyWorkDesk.revitTroubleShoot.v2',
    'archDailyWorkDesk.tasks',
    'archDailyWorkDesk.dailyTaskLog',
    'archDailyWorkDesk.dobNotes',
    'archDailyWorkDesk.aiPromptLibrary',
    'archDailyWorkDesk.revitTroubleShoot',
    'tasks',
    'dashboardTasks',
    'dailyTaskLog',
    'dobNotes',
    'quickNotes',
    'aiPromptLibrary',
    'promptLog',
    'revitTroubleShoot'
  ];

  function injectStyles() {
    if (document.getElementById('vfn-modal-style')) return;
    const style = document.createElement('style');
    style.id = 'vfn-modal-style';
    style.textContent = `
      .vfn-clickable-card {
        cursor: pointer !important;
      }
      .vfn-clickable-card:hover {
        filter: brightness(0.995);
      }
      .vfn-view-btn {
        appearance: none !important;
        border: 1px solid ${COLOR.border} !important;
        background: ${COLOR.soft} !important;
        color: ${COLOR.warmDark} !important;
        border-radius: 999px !important;
        font: 700 11px/1.1 Inter, Arial, sans-serif !important;
        letter-spacing: 0.01em !important;
        padding: 7px 10px !important;
        margin-top: 10px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: auto !important;
        min-width: 0 !important;
        min-height: 0 !important;
        height: auto !important;
        box-shadow: none !important;
        cursor: pointer !important;
      }
      .vfn-view-btn:hover {
        background: #efe1d3 !important;
        border-color: #d7bfa8 !important;
        color: ${COLOR.warmDark} !important;
        transform: none !important;
      }
      .vfn-modal-backdrop {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483000 !important;
        background: ${COLOR.page} !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 24px !important;
      }
      .vfn-modal {
        width: min(760px, 94vw) !important;
        max-height: min(84vh, 820px) !important;
        background: ${COLOR.card} !important;
        border: 1px solid ${COLOR.border} !important;
        border-radius: 22px !important;
        box-shadow: 0 22px 70px rgba(32, 24, 18, 0.28) !important;
        overflow: hidden !important;
        color: ${COLOR.ink} !important;
        font-family: Inter, Arial, sans-serif !important;
        display: flex !important;
        flex-direction: column !important;
      }
      .vfn-modal-header {
        display: flex !important;
        justify-content: space-between !important;
        gap: 18px !important;
        align-items: flex-start !important;
        padding: 22px 24px 16px !important;
        border-bottom: 1px solid ${COLOR.border} !important;
        background: rgba(255, 252, 247, 0.96) !important;
      }
      .vfn-modal-eyebrow {
        margin: 0 0 6px !important;
        color: ${COLOR.warm} !important;
        text-transform: uppercase !important;
        letter-spacing: 0.12em !important;
        font-size: 11px !important;
        font-weight: 800 !important;
      }
      .vfn-modal-title {
        margin: 0 !important;
        color: ${COLOR.ink} !important;
        font-size: clamp(22px, 3vw, 30px) !important;
        line-height: 1.08 !important;
        font-weight: 850 !important;
        word-break: break-word !important;
      }
      .vfn-modal-close {
        width: 38px !important;
        height: 38px !important;
        border-radius: 999px !important;
        border: 1px solid ${COLOR.border} !important;
        background: white !important;
        color: ${COLOR.ink} !important;
        font-size: 24px !important;
        line-height: 1 !important;
        padding: 0 !important;
        cursor: pointer !important;
        flex: 0 0 auto !important;
      }
      .vfn-modal-body {
        padding: 20px 24px 24px !important;
        overflow: auto !important;
      }
      .vfn-meta-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
        gap: 10px !important;
        margin: 0 0 18px !important;
      }
      .vfn-meta-item {
        border: 1px solid ${COLOR.border} !important;
        border-radius: 14px !important;
        padding: 10px 12px !important;
        background: rgba(255, 255, 255, 0.62) !important;
      }
      .vfn-meta-label {
        color: ${COLOR.muted} !important;
        display: block !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        margin-bottom: 5px !important;
      }
      .vfn-meta-value {
        color: ${COLOR.ink} !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        word-break: break-word !important;
      }
      .vfn-section-title {
        margin: 20px 0 8px !important;
        color: ${COLOR.warmDark} !important;
        font-size: 13px !important;
        font-weight: 850 !important;
        letter-spacing: 0.06em !important;
        text-transform: uppercase !important;
      }
      .vfn-full-text {
        white-space: pre-wrap !important;
        word-break: break-word !important;
        background: #fffdf9 !important;
        border: 1px solid ${COLOR.border} !important;
        border-radius: 16px !important;
        padding: 16px !important;
        color: #344054 !important;
        line-height: 1.6 !important;
        font-size: 15px !important;
      }
      .vfn-modal-actions {
        display: flex !important;
        justify-content: flex-end !important;
        gap: 10px !important;
        padding: 0 24px 22px !important;
      }
      .vfn-copy-btn {
        border: 1px solid ${COLOR.border} !important;
        background: white !important;
        color: ${COLOR.warmDark} !important;
        border-radius: 999px !important;
        padding: 9px 14px !important;
        font: 800 12px/1 Inter, Arial, sans-serif !important;
        cursor: pointer !important;
      }
      @media (max-width: 720px) {
        .vfn-modal-backdrop { padding: 12px !important; align-items: flex-start !important; }
        .vfn-modal { max-height: 92vh !important; border-radius: 18px !important; }
        .vfn-modal-header, .vfn-modal-body { padding-left: 18px !important; padding-right: 18px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function normalize(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .trim()
      .toLowerCase();
  }

  function safeJson(value) {
    try { return JSON.parse(value); } catch { return null; }
  }

  function getAllStorageRecords() {
    const seenKeys = new Set();
    const keys = [];
    STORAGE_HINTS.forEach((key) => {
      if (localStorage.getItem(key) != null && !seenKeys.has(key)) {
        seenKeys.add(key);
        keys.push(key);
      }
    });
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || seenKeys.has(key)) continue;
      if (/arch|daily|task|dob|prompt|revit|trouble|note/i.test(key)) {
        seenKeys.add(key);
        keys.push(key);
      }
    }

    const records = [];
    keys.forEach((key) => {
      const parsed = safeJson(localStorage.getItem(key));
      const items = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.items)
          ? parsed.items
          : Array.isArray(parsed?.data)
            ? parsed.data
            : [];
      items.forEach((item, index) => {
        if (!item || typeof item !== 'object') return;
        records.push({ ...item, __storageKey: key, __storageIndex: index, __kind: inferKind(key, item) });
      });
    });
    return records;
  }

  function inferKind(key, item) {
    const hay = `${key} ${Object.keys(item).join(' ')}`.toLowerCase();
    if (hay.includes('revit') || hay.includes('trouble') || item.problem || item.solution) return 'Revit Trouble Shoot';
    if (hay.includes('prompt') || item.prompt) return 'AI Prompt Library';
    if (hay.includes('dob') || hay.includes('quicknotes')) return 'DOB Notes';
    if (hay.includes('daily') || hay.includes('log')) return 'Daily Task Log';
    if (hay.includes('task') || item.status || item.priority || item.dueDate || item.startDate) return 'Task Dashboard';
    return 'Full notes';
  }

  function formatDate(value) {
    if (!value) return '';
    const raw = String(value);
    const date = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function recordTitle(record) {
    return record.title || record.name || record.issue || record.taskTitle || record.promptTitle || record.subject || 'Full notes';
  }

  function recordText(record) {
    const chunks = [];
    [
      record.project,
      record.notes,
      record.details,
      record.content,
      record.prompt,
      record.problem,
      record.solution,
      record.description,
      record.text,
      record.body
    ].forEach((value) => {
      if (value && !chunks.includes(String(value))) chunks.push(String(value));
    });
    return chunks.join('\n\n').trim();
  }

  function recordMeta(record) {
    const rows = [];
    const add = (label, value) => {
      if (value === undefined || value === null || String(value).trim() === '') return;
      rows.push([label, String(value)]);
    };
    add('Project', record.project);
    add('Category', record.category || record.type);
    add('Priority', record.priority);
    add('Status', record.status);
    add('Start date', formatDate(record.startDate));
    add('Due date', formatDate(record.dueDate));
    add('Date', formatDate(record.date));
    add('Created', record.createdAt ? new Date(record.createdAt).toLocaleString() : '');
    add('Updated', record.updatedAt ? new Date(record.updatedAt).toLocaleString() : '');
    return rows;
  }

  function cardText(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll('.vfn-view-btn, button, select, input, textarea, option, svg').forEach((node) => node.remove());
    return clone.textContent || '';
  }

  function likelyCard(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (element.dataset.vfnProcessed === '1') return false;
    if (element.closest('.vfn-modal-backdrop')) return false;
    if (element.closest('form')) return false;
    if (element.matches('button, input, textarea, select, option, nav, header')) return false;

    const rect = element.getBoundingClientRect();
    if (rect.width < 90 || rect.height < 36) return false;

    const classes = String(element.className || '').toLowerCase();
    const cardish = element.matches('article, li') || /card|task|note|prompt|trouble|log|item/.test(classes);
    if (!cardish) return false;

    const text = normalize(cardText(element));
    if (!text || text.length < 18) return false;
    if (/no tasks here yet|no saved items yet|add one above|project filter|priority filter/.test(text)) return false;
    if (element.querySelector('.vfn-view-btn')) return false;

    return true;
  }

  function collectCardElements() {
    const selectors = [
      '.task-card', '.note-card', '.prompt-card', '.trouble-card', '.troubleshoot-card', '.log-card',
      '.preview-card', '.daily-card', '.dashboard-card', '.saved-card', '.card',
      '[class*="task-card"]', '[class*="note-card"]', '[class*="prompt-card"]', '[class*="trouble"]', '[class*="log-card"]', '[class*="preview-card"]',
      'article', 'li'
    ];
    const set = new Set();
    selectors.forEach((selector) => document.querySelectorAll(selector).forEach((element) => set.add(element)));
    return [...set].filter(likelyCard);
  }

  function findHeadingText(element) {
    const heading = element.querySelector('h1,h2,h3,h4,h5,strong,b,[class*="title"],[class*="name"]');
    const text = heading ? heading.textContent : cardText(element).split('\n').find(Boolean);
    return String(text || '').trim().replace(/\s+/g, ' ');
  }

  function matchRecord(element) {
    const records = getAllStorageRecords();
    if (!records.length) return null;

    const text = normalize(cardText(element));
    const title = normalize(findHeadingText(element));
    const id = element.getAttribute('data-id') || element.dataset?.id || element.dataset?.taskId || element.dataset?.itemId;

    if (id) {
      const exact = records.find((record) => String(record.id || record.uid || record.key) === String(id));
      if (exact) return exact;
    }

    const scored = records.map((record) => {
      const rt = normalize(recordTitle(record));
      const full = normalize(recordText(record));
      let score = 0;
      if (rt && title && (rt === title || title.includes(rt) || rt.includes(title))) score += 80;
      if (rt && text.includes(rt)) score += 45;
      if (record.project && text.includes(normalize(record.project))) score += 15;
      if (record.status && text.includes(normalize(record.status))) score += 8;
      if (record.priority && text.includes(normalize(record.priority))) score += 8;
      if (record.date && text.includes(normalize(String(record.date)))) score += 8;
      if (record.dueDate && text.includes(normalize(String(record.dueDate)))) score += 8;
      if (full) {
        const sample = full.slice(0, Math.min(80, full.length));
        if (sample.length > 18 && text.includes(sample.slice(0, 28))) score += 30;
        if (text && full.includes(text.slice(0, Math.min(35, text.length)))) score += 12;
      }
      return { record, score };
    }).sort((a, b) => b.score - a.score);

    return scored[0]?.score >= 40 ? scored[0].record : null;
  }

  function fallbackData(element) {
    const title = findHeadingText(element) || 'Full notes';
    const text = cardText(element).trim() || 'No notes yet.';
    return {
      title,
      kind: 'Full notes',
      meta: [],
      sections: [['Full notes / details', text]],
      copyText: text
    };
  }

  function modalDataFromRecord(record) {
    const sections = [];
    const addSection = (label, value) => {
      if (value === undefined || value === null || String(value).trim() === '') return;
      const text = String(value).trim();
      if (!sections.some(([, existing]) => existing === text)) sections.push([label, text]);
    };

    if (record.__kind === 'Revit Trouble Shoot') {
      addSection('Problem description', record.problem || record.description || record.notes);
      addSection('Solution / notes', record.solution || record.content || record.details);
    } else if (record.__kind === 'AI Prompt Library') {
      addSection('Full prompt', record.prompt || record.content || record.notes || record.text);
    } else if (record.__kind === 'DOB Notes') {
      addSection('Full DOB notes', record.content || record.notes || record.details || record.text);
    } else if (record.__kind === 'Task Dashboard') {
      addSection('Task notes / details', record.notes || record.details || record.content || record.description);
    } else if (record.__kind === 'Daily Task Log') {
      addSection('Full daily notes', record.notes || record.content || record.text || record.body);
    } else {
      addSection('Full notes / details', recordText(record));
    }

    if (!sections.length) addSection('Full notes / details', recordText(record) || 'No notes yet.');
    const copyText = sections.map(([label, text]) => `${label}\n${text}`).join('\n\n');

    return {
      title: recordTitle(record),
      kind: record.__kind || 'Full notes',
      meta: recordMeta(record),
      sections,
      copyText
    };
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[char]));
  }

  function openModal(data) {
    closeModal();
    const backdrop = document.createElement('div');
    backdrop.className = 'vfn-modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');

    const metaHtml = data.meta && data.meta.length
      ? `<div class="vfn-meta-grid">${data.meta.map(([label, value]) => `
          <div class="vfn-meta-item">
            <span class="vfn-meta-label">${escapeHtml(label)}</span>
            <span class="vfn-meta-value">${escapeHtml(value)}</span>
          </div>`).join('')}
        </div>`
      : '';

    const sectionsHtml = data.sections.map(([label, text]) => `
      <div class="vfn-section-title">${escapeHtml(label)}</div>
      <div class="vfn-full-text">${escapeHtml(text || 'No notes yet.')}</div>
    `).join('');

    backdrop.innerHTML = `
      <section class="vfn-modal">
        <div class="vfn-modal-header">
          <div>
            <p class="vfn-modal-eyebrow">${escapeHtml(data.kind || 'Full notes')}</p>
            <h2 class="vfn-modal-title">${escapeHtml(data.title || 'Full notes')}</h2>
          </div>
          <button type="button" class="vfn-modal-close" aria-label="Close">×</button>
        </div>
        <div class="vfn-modal-body">
          ${metaHtml}
          ${sectionsHtml}
        </div>
        <div class="vfn-modal-actions">
          <button type="button" class="vfn-copy-btn">Copy full text</button>
        </div>
      </section>
    `;

    const closeButton = backdrop.querySelector('.vfn-modal-close');
    const copyButton = backdrop.querySelector('.vfn-copy-btn');
    closeButton.addEventListener('click', closeModal);
    backdrop.addEventListener('mousedown', (event) => {
      if (event.target === backdrop) closeModal();
    });
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(data.copyText || '');
        copyButton.textContent = 'Copied';
        setTimeout(() => { copyButton.textContent = 'Copy full text'; }, 1200);
      } catch {
        copyButton.textContent = 'Copy failed';
        setTimeout(() => { copyButton.textContent = 'Copy full text'; }, 1200);
      }
    });

    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';
    setTimeout(() => closeButton.focus(), 0);
  }

  function closeModal() {
    document.querySelectorAll('.vfn-modal-backdrop').forEach((node) => node.remove());
    document.body.style.overflow = '';
  }

  function getDataForCard(element) {
    const record = matchRecord(element);
    return record ? modalDataFromRecord(record) : fallbackData(element);
  }

  function enhanceCard(element) {
    element.dataset.vfnProcessed = '1';
    element.classList.add('vfn-clickable-card');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vfn-view-btn';
    button.textContent = 'View full notes';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openModal(getDataForCard(element));
    });

    const actionArea = element.querySelector('[class*="action"], [class*="button"], footer');
    if (actionArea && actionArea.parentElement === element) {
      element.insertBefore(button, actionArea);
    } else {
      element.appendChild(button);
    }

    element.addEventListener('click', (event) => {
      const interactive = event.target.closest('button, a, input, textarea, select, option, label');
      if (interactive && interactive !== button) return;
      if (event.target === button || button.contains(event.target)) return;
      openModal(getDataForCard(element));
    });
  }

  function runEnhancer() {
    injectStyles();
    collectCardElements().forEach(enhanceCard);
  }

  let timer = null;
  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(runEnhancer, 80);
  }

  function start() {
    runEnhancer();
    const root = document.getElementById('root') || document.body;
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal();
    });
    window.__viewFullNotesPatchRefresh = runEnhancer;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
