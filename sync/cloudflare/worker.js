export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, service: 'ntn-sync-worker' });
    }

    if (request.method === 'GET' && url.pathname === '/db') {
      const raw = await env.NTN_DB.get('ntn-database');
      const data = raw ? JSON.parse(raw) : [];
      return json(data);
    }

    if (request.method === 'POST' && url.pathname === '/db') {
      const body = await request.json();
      if (!Array.isArray(body)) {
        return json({ ok: false, error: 'Body must be an array' }, 400);
      }
      await env.NTN_DB.put('ntn-database', JSON.stringify(body));
      return json({ ok: true, count: body.length });
    }

    return json({ ok: false, error: 'Not found' }, 404);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });
}
