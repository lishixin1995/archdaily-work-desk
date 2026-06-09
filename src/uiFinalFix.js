const finalFixStyle = document.createElement('style');
finalFixStyle.textContent = `
  /* Keep the main menu above filter panels, sliders, and calendar content while scrolling. */
  .topbar {
    position: sticky !important;
    top: 8px !important;
    z-index: 1000 !important;
    isolation: isolate !important;
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
`;
document.head.appendChild(finalFixStyle);

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

window.setInterval(dockKanbanSlideControls, 350);
window.addEventListener('resize', dockKanbanSlideControls);
window.addEventListener('load', dockKanbanSlideControls);
dockKanbanSlideControls();
