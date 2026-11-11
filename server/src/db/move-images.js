/**
 * Points every stored image URL to a new R2 bucket address after the files were copied there
 * (new Cloudflare account, custom domain…). Image URLs live in many places (product images,
 * categories, brands, guides, order lines, hero/testimonials in settings JSON), so every text and
 * JSONB column of the database is scanned for the old prefix.
 *   npm run db:move-images -- --from=https://pub-old.r2.dev --to=https://images.sopureskin.com          (dry run)
 *   npm run db:move-images -- --from=https://pub-old.r2.dev --to=https://images.sopureskin.com --apply  (writes)
 */
import { pool } from './pool.js';

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=').replace(/\/$/, '');
const from = arg('from');
const to = arg('to');
const apply = process.argv.includes('--apply');

async function run() {
  if (!from || !to) throw new Error('Usage: --from=<old public URL> --to=<new public URL> [--apply]');
  const { rows: columns } = await pool.query(
    `SELECT table_name, column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND data_type IN ('text', 'jsonb', 'character varying') ORDER BY table_name, column_name`,
  );
  const client = await pool.connect();
  let total = 0;
  try {
    await client.query('BEGIN');
    for (const { table_name: table, column_name: column, data_type: type } of columns) {
      const col = `"${column}"`;
      const pattern = `%${from.replace(/[\\%_]/g, '\\$&')}%`;
      const set = type === 'jsonb' ? `replace(${col}::text, $1, $2)::jsonb` : `replace(${col}, $1, $2)`;
      const { rowCount } = await client.query(
        `UPDATE "${table}" SET ${col} = ${set} WHERE ${col}::text LIKE $3`,
        [from, to, pattern],
      );
      if (rowCount) console.log(`${table}.${column}: ${rowCount} row(s)`);
      total += rowCount;
    }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  console.log(apply ? `Updated ${total} row(s).` : `Dry run: ${total} row(s) would change. Add --apply to write.`);
}

run()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
