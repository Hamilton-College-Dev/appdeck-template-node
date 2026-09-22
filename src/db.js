// Database access.
//
// If the environment variable DATABASE_URL is set, this module talks to that
// PostgreSQL database. If it is NOT set, everything falls back to an in-memory
// list that resets when the app restarts.
//
// You do not have to choose. The app works either way, so you can build and run
// locally with no database at all and it will still behave correctly.

const DATABASE_URL = process.env.DATABASE_URL;

let pool = null;
const memory = [];

/** True when a database is configured for this environment. */
export function hasDatabase() {
  return Boolean(DATABASE_URL);
}

async function getPool() {
  if (pool) return pool;

  const { Pool } = await import('pg');
  pool = new Pool({
    connectionString: DATABASE_URL,
    // Keep the pool small. The container only gets 0.25 vCPU, and a big pool
    // just means more idle connections competing for it.
    max: 4,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id         SERIAL PRIMARY KEY,
      body       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  return pool;
}

/** Called once at startup. Safe to call when there is no database. */
export async function init() {
  if (!hasDatabase()) return;
  await getPool();
}

/** Newest notes first. */
export async function listNotes(limit = 20) {
  if (!hasDatabase()) {
    return memory.slice(-limit).reverse();
  }
  const db = await getPool();
  const result = await db.query(
    'SELECT id, body, created_at FROM notes ORDER BY id DESC LIMIT $1',
    [limit]
  );
  return result.rows;
}

export async function addNote(body) {
  const text = String(body || '').trim().slice(0, 500);
  if (!text) throw new Error('Note cannot be empty');

  if (!hasDatabase()) {
    const note = { id: memory.length + 1, body: text, created_at: new Date() };
    memory.push(note);
    return note;
  }

  const db = await getPool();
  const result = await db.query(
    'INSERT INTO notes (body) VALUES ($1) RETURNING id, body, created_at',
    [text]
  );
  return result.rows[0];
}

export async function close() {
  if (pool) await pool.end();
}
