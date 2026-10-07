// Fetches a site's icon through Google's favicon service. When a site has no
// icon of its own, Google answers 404 but still sends a generic globe picture,
// which a browser shows anyway. This passes that on as a bare 404 so the page
// can draw its own planet instead.
const HOST = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const MAX_BYTES = 256 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }

  const domain = String(req.query?.domain || '').trim().toLowerCase();
  if (!HOST.test(domain)) return res.status(400).end();

  try {
    const upstream = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`, { redirect: 'follow' });
    const type = upstream.headers.get('content-type') || '';
    const body = upstream.ok && type.startsWith('image/') ? Buffer.from(await upstream.arrayBuffer()) : null;

    if (!body || !body.length || body.length > MAX_BYTES) {
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
      return res.status(404).end();
    }

    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
    return res.status(200).send(body);
  } catch {
    return res.status(502).end();
  }
}
