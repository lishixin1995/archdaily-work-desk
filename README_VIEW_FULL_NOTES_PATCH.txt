ARCH DAILY WORK DESK - VIEW FULL NOTES ONLY PATCH

This is a surgical patch. It does NOT replace src/App.jsx and does NOT change the dashboard, calendar, nav, layout, localStorage keys, or existing saved data.

Upload/merge these files into the repo root:

1. index.html
2. public/view-full-notes.js

What it does:
- Adds a small "View full notes" button to existing cards.
- Lets Dashboard / DOB Notes / AI Prompt Library / Revit Trouble Shoot / Daily Task Log cards open a full notes modal.
- Reads full text from the existing card DOM and, when possible, from existing localStorage saved data.

After upload:
- Commit to GitHub.
- Redeploy on Vercel.

If anything looks wrong, rollback this commit only. This patch only added index.html script reference + one public JS file.
