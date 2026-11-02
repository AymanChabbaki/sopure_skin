// Copies the API secrets from server/.env to the Cloudflare Worker (wrangler secret bulk).
// Usage, from the repository root, after `npx wrangler login`: npm run cf:secrets
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const SECRETS = [
  'DATABASE_URL', 'JWT_SECRET', 'GROQ_API_KEY',
  'RESEND_API_KEY', 'MAIL_FROM', 'ORDER_NOTIFY_EMAIL',
  'GOOGLE_SITE_VERIFICATION', 'BING_SITE_VERIFICATION', 'INDEXNOW_KEY',
];

const env = Object.fromEntries(
  readFileSync(path.resolve('server/.env'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^(['"])(.*)\1$/, '$2')]),
);

const values = Object.fromEntries(SECRETS.filter((k) => env[k]).map((k) => [k, env[k]]));
console.log(`Sending ${Object.keys(values).length} secrets: ${Object.keys(values).join(', ')}`);
const missing = SECRETS.filter((k) => !env[k]);
if (missing.length) console.log(`Not set in server/.env (skipped): ${missing.join(', ')}`);

// Temporary file outside the project, deleted right after
const file = path.join(os.tmpdir(), `sps-secrets-${process.pid}.json`);
writeFileSync(file, JSON.stringify(values), { mode: 0o600 });
try {
  execSync(`npx wrangler secret bulk "${file}"`, { stdio: 'inherit' });
} finally {
  rmSync(file, { force: true });
}
