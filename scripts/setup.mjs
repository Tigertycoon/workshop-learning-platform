import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
if (Number(process.versions.node.split('.')[0]) !== 22) {
  throw new Error('Use Node.js 22 LTS for the tested native SQLite dependency.');
}
if (!process.env.npm_execpath) throw new Error('Please run npm run setup from the repository root.');
for (const folder of ['app', 'app/server', 'app/client']) {
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'ci'], {
    cwd: path.join(root, folder), stdio: 'inherit', windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const envPath = path.join(root, 'app/.env');
if (!existsSync(envPath)) {
  writeFileSync(envPath, [
    '# Local only. Never commit this file.',
    `JWT_SECRET=${randomBytes(48).toString('hex')}`,
    'HOST=127.0.0.1', 'PORT=3001', 'DATABASE_PATH=server/workshop.db', 'MEDIA_ROOT=.',
    `DEMO_ADMIN_PASSWORD=${randomBytes(18).toString('base64url')}`,
    `DEMO_STUDENT_PASSWORD=${randomBytes(18).toString('base64url')}`, '',
  ].join('\n'), { mode: 0o600, flag: 'wx' });
  console.log('Created app/.env with random secrets.');
} else {
  console.log('Kept existing app/.env unchanged.');
}
console.log('Next: npm run demo, then npm run dev. Demo passwords are in app/.env.');
