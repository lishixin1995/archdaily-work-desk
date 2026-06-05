import pg from 'pg';

const { Pool } = pg;

let pool;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured in Vercel Environment Variables.');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3
    });
  }

  return pool;
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;

  let raw = '';
  for await (const chunk of req) raw += chunk;

  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

async function ensureTable(client) {
  await client.query(`
    create table if not exists app_cloud_data (
      app_key text not null,
      data_key text not null,
      data jsonb not null default 'null'::jsonb,
      updated_at timestamptz not null default now(),
      primary key (app_key, data_key)
    )
  `);
}

export default async function handler(req, res) {
  try {
    const client = getPool();
    await ensureTable(client);

    if (req.method === 'GET') {
      const app = String(req.query.app || '').trim();
      const key = String(req.query.key || '').trim();

      if (!app) return res.status(400).json({ ok: false, message: 'Missing app.' });

      if (key) {
        const result = await client.query(
          'select data, updated_at from app_cloud_data where app_key = $1 and data_key = $2',
          [app, key]
        );
        const row = result.rows[0];
        return res.status(200).json({ ok: true, data: row?.data ?? null, updatedAt: row?.updated_at ?? null });
      }

      const result = await client.query(
        'select data_key, data, updated_at from app_cloud_data where app_key = $1',
        [app]
      );
      const snapshot = {};
      for (const row of result.rows) {
        snapshot[row.data_key] = { data: row.data, updatedAt: row.updated_at };
      }
      return res.status(200).json({ ok: true, snapshot });
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const app = String(body.app || '').trim();
      const key = String(body.key || '').trim();

      if (!app || !key) return res.status(400).json({ ok: false, message: 'Missing app or key.' });

      await client.query(
        `insert into app_cloud_data (app_key, data_key, data, updated_at)
         values ($1, $2, $3::jsonb, now())
         on conflict (app_key, data_key)
         do update set data = excluded.data, updated_at = now()`,
        [app, key, JSON.stringify(body.data ?? null)]
      );

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, message: 'Method not allowed.' });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Cloud sync failed.' });
  }
}
