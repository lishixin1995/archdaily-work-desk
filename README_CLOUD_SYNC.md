# Cloud Sync Overlay

Upload the contents of this folder to the matching GitHub repository root.

This adds true cloud sync using your Vercel/Neon DATABASE_URL:
- api/cloud-data.js creates/uses a shared app_cloud_data table.
- src/cloudSync.js pulls cloud data before React starts, merges it with localStorage, then saves changes back to cloud.
- index.html loads cloud sync before src/main.jsx.
- package.json adds the pg dependency.

Important:
1. DATABASE_URL must exist in this Vercel project.
2. After upload, redeploy the project in Vercel.
3. Open the website once on the computer that still has old localStorage data. It will upload that old local data to the cloud.
