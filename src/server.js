// Your app starts here.
//
// Two things the hosting platform depends on. Don't change them:
//   1. The app listens on port 8080.
//   2. GET /healthz answers with HTTP 200.
// Everything else on this page is yours to rewrite.

import http from 'node:http';
import { Router, readBody, parseForm, BodyTooLargeError } from './router.js';
import * as db from './db.js';
import * as views from './views.js';

const PORT = Number(process.env.PORT) || 8080;

const routes = new Router();

// ---------------------------------------------------------------------------
// Health check
//
// The platform calls this every few seconds to decide whether your app is
// alive. If it stops answering 200, your site stops receiving visitors.
//
// Note what it does NOT do: it doesn't touch the database. If it did, a
// two-second database hiccup would convince the platform your whole app was
// dead. Database health is reported separately, at /api/status.
// ---------------------------------------------------------------------------
routes.get('/healthz', async () => json(200, { status: 'ok' }));

// ---------------------------------------------------------------------------
// Your routes
// ---------------------------------------------------------------------------

routes.get('/', async () => {
  const notes = await db.listNotes();
  return html(200, views.home(notes, db.hasDatabase()));
});

routes.post('/notes', async (req) => {
  const form = parseForm(await readBody(req));
  try {
    await db.addNote(form.body);
  } catch (err) {
    console.warn('Rejected note:', err.message);
  }
  return { status: 303, headers: { Location: '/' }, body: '' };
});

routes.get('/api/notes', async () => json(200, await db.listNotes()));

routes.get('/api/status', async () => {
  const configured = db.hasDatabase();
  let reachable = null;

  if (configured) {
    try {
      await db.listNotes(1);
      reachable = true;
    } catch {
      reachable = false;
    }
  }

  return json(200, {
    app: 'ok',
    database: { configured, reachable },
    storage: configured ? 'postgresql' : 'in-memory (resets on restart)',
  });
});

// ---------------------------------------------------------------------------
// Plumbing. You shouldn't need to touch anything below here.
// ---------------------------------------------------------------------------

function json(status, data) {
  return {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(data, null, 2),
  };
}

function html(status, body) {
  return { status, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body };
}

export const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const handler = routes.match(req.method, path);

  let result;
  try {
    result = handler
      ? await handler(req)
      : html(404, views.notFound());
  } catch (err) {
    if (err instanceof BodyTooLargeError) {
      console.warn(`${req.method} ${path}: ${err.message}`);
      result = html(413, views.tooLarge());
    } else {
      console.error(`${req.method} ${path} failed:`, err);
      result = html(500, views.serverError());
    }
  }

  res.writeHead(result.status, {
    'X-Content-Type-Options': 'nosniff',
    ...result.headers,
  });
  res.end(result.body);
});

// Only start listening when run directly, so tests can import this file.
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  server.listen(PORT, '0.0.0.0', async () => {
    console.log(`Listening on http://0.0.0.0:${PORT}`);
    try {
      await db.init();
      console.log(db.hasDatabase()
        ? 'Database connected.'
        : 'No DATABASE_URL set. Using in-memory storage.');
    } catch (err) {
      // Deliberately not fatal. Pages still render and /healthz still answers
      // 200, so the site stays up while the database sorts itself out.
      console.error('Database setup failed, continuing without it:', err.message);
    }
  });

  // Finish in-flight requests before exiting, so deploys don't drop traffic.
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      console.log(`${signal} received, shutting down.`);
      server.close(async () => {
        await db.close().catch(() => {});
        process.exit(0);
      });
    });
  }
}
