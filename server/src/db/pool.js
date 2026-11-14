import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';
import { config } from '../config.js';
import { cfEnv, keepAlive, onWorkers } from '../lib/runtime.js';

// NUMERIC -> JS number (prices are small, safe as floats for display)
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
// BIGINT (count(*)) -> number
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

/** Hyperdrive (pooled, fast) when bound on Cloudflare, else DATABASE_URL. */
const connectionString = () => cfEnv().HYPERDRIVE?.connectionString || config.databaseUrl;

const makePool = (max) =>
  new pg.Pool({
    connectionString: connectionString(),
    ssl: config.databaseSsl && !cfEnv().HYPERDRIVE ? { rejectUnauthorized: false } : undefined,
    max,
  });

/*
 * Node keeps one pool for the whole process.
 * Cloudflare Workers cannot reuse a connection across requests, so each request gets its own small pool
 * (attachRequestDb), closed when the response is done.
 */
const nodePool = onWorkers ? null : makePool(Number(process.env.DATABASE_POOL_MAX || 10));
const requestDb = new AsyncLocalStorage();

function current() {
  if (nodePool) return nodePool;
  const store = requestDb.getStore();
  if (!store) throw new Error('Database used outside of a request');
  store.pool ??= makePool(3);
  return store.pool;
}

/** Express middleware (Workers only): scopes a database pool to the request. */
export function attachRequestDb(req, res, next) {
  if (!onWorkers) return next();
  const store = { tasks: [] };
  let closed = false;
  // Closed once the response is sent AND the work queued in store.tasks is done (that work runs after
  // this listener, so the pool is closed a tick later, once the tasks are registered).
  const close = () => {
    if (closed) return;
    closed = true;
    queueMicrotask(() => keepAlive(Promise.allSettled(store.tasks).then(() => store.pool?.end().catch(() => null))));
  };
  res.once('finish', close);
  res.once('close', close);
  requestDb.run(store, next);
}

/** Database access outside an HTTP request (Workers cron trigger): own pool, closed when `fn` is done. */
export async function withDb(fn) {
  if (!onWorkers) return fn();
  const store = { tasks: [] };
  try {
    return await requestDb.run(store, fn);
  } finally {
    await store.pool?.end().catch(() => null);
  }
}

export const pool = {
  query: (text, params) => current().query(text, params),
  connect: () => current().connect(),
  end: () => (nodePool ? nodePool.end() : Promise.resolve()),
};

export const query = (text, params) => pool.query(text, params);

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
