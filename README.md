# Arch Daily Work Desk

Personal architecture work desk: a task dashboard with a calendar, DOB / code notes, quick links, an AI prompt library and Revit troubleshooting notes.

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

- `src/lib/` – storage and cloud sync, dates, task rules, categories, file attachments
- `src/components/` – shared pieces such as the note and edit dialogs
- `src/views/` – one file per page
- `api/cloud-data.js` – Vercel function that reads and writes the cloud table
