# Arch Daily Work Desk

Personal architecture work desk: a task dashboard with a calendar, DOB / code notes, quick links, an AI prompt library and Revit troubleshooting notes.

The look and interactions follow Daily Desk's deep-space theme:

- **Dashboard** – the orbit (each task is a star; closer to the sun means due sooner), the task board (Not Started, In Progress, Waiting, Done) with search, project, priority, hide-done and date filters, and a month calendar with moon phases. Select any day to add a task to it.
- **Today's tasks** – a drawer on the right edge of every page. Hover the edge or click the tab to open it; it lists today's and overdue tasks and has a quick add.
- **Calendar** – Day, Week, Month and Year views. Each trail runs from a task's start date to its due date.
- **DOB Notes** and **Revit Trouble Shoot** – note cards with screenshots, PDFs and Word files; open a card to read, copy or edit it.
- **Spaces** – AI Prompt Library (star your favorites) and Links.
- **Search** – finds tasks, notes, prompts and links from any page.

A task's colour comes from its priority and status: Urgent, High, In progress, Waiting, then Medium and Low.

## Run locally

```txt
npm install
npm run dev
```

Without the Vercel API the site still runs on the data in this browser; cloud loads and saves fail quietly.

## Deploy on Vercel

1. Add `DATABASE_URL` (a Postgres connection string, e.g. Neon) to the project's environment variables.
2. Build command `npm run build`, output directory `dist` (already set in `vercel.json`).

## How data is saved

Every list is kept in `localStorage` and mirrored to the cloud table `app_cloud_data` through `api/cloud-data.js`. On start, `src/lib/cloudSync.js` merges the cloud copy with the browser copy (newest `updatedAt` wins per item), then saves every later change back to the cloud.

| Key | Holds |
| --- | --- |
| `archDailyWorkDesk.tasks.v2` | Dashboard tasks |
| `archDailyWorkDesk.dailyTaskLog.v2` | Old daily logs; each is copied to the dashboard as a Done task |
| `archDailyWorkDesk.dobNotes.v2` | DOB / code notes and their attachments |
| `archDailyWorkDesk.dobCodeLinks.v1` | Links |
| `archDailyWorkDesk.aiPromptLibrary.v2` | AI prompts |
| `archDailyWorkDesk.revitTroubleShoot.v2` | Revit troubleshooting notes and their files |

These key names must not change, or saved data will stop loading.

## Code layout

- `src/lib/` – storage and cloud sync, dates, task rules, categories, file attachments, moon phases
- `src/components/` – shared pieces: top menu, drawer, day card, orbit, calendar grid, task sheet, search
- `src/views/` – one file per page
- `src/styles/` – the theme and one stylesheet per area
- `api/cloud-data.js` – Vercel function that reads and writes the cloud table
