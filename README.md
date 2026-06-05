# ARCH DAILY WORK DESK

A personal architecture work desk for daily logs, task tracking, code / DOB notes, Revit troubleshooting, prompt library, and a fixed monthly calendar.

## Current version

This version stores data in your browser with localStorage.

## V3 updates

- Calendar is fixed on the right side of the desktop layout.
- Tasks can have both Start date and Due date.
- Calendar task bars stretch continuously across each week from start date through due date.
- Existing tasks with only a due date still show on that due date.

## Pages

- Daily Desk
- Task Dashboard
- Code / DOB Quick Notes
- Revit Troubleshoot Log
- AI Prompt Library
- Fixed Monthly Calendar

## Deploy

Upload these files to GitHub, then Vercel will redeploy automatically.

Vercel settings:

- Framework Preset: Vite
- Build Command: npm run build
- Output Directory: dist


## V4 update

- Fixed browser resizing issue where the side calendar could overlap the main workspace.
- Main content now automatically leaves safe space for the fixed right calendar.
- At narrower browser widths, the calendar switches to a top sticky layout instead of covering the desk content.


## V5 update

- Full desktop layout is now a balanced 3:2 desk/calendar composition.
- Calendar no longer floats far away from the desk on wide screens.
- Calendar task bars are color-coded:
  - Urgent priority overrides everything with red.
  - High priority uses a warm warning color.
  - In Progress uses blue.
  - Waiting uses muted gold.
  - Done uses green.
  - Other tasks use the original brown planned color.
- Project accents add subtle left stripes so different projects/tasks are easier to distinguish.
