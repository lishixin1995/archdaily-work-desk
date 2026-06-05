const finalFixStyle = document.createElement('style');
finalFixStyle.textContent = `
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
`;
document.head.appendChild(finalFixStyle);
