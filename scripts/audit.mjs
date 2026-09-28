import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
if (!process.env.npm_execpath) throw new Error('Run npm run audit.');
for (const folder of ['app', 'app/server', 'app/client']) {
  console.log(`\nDependency audit: ${folder}`);
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'audit', '--audit-level=moderate'], {
    cwd: path.join(root, folder), stdio: 'inherit', windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}
