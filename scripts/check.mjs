import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
function check(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'secrets'].includes(item.name)) continue;
    const file = path.join(dir, item.name);
    if (item.isDirectory()) check(file);
    else if (/\.(js|mjs)$/.test(item.name)) {
      const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      if (result.status) { console.error(result.stderr); process.exit(1); }
    }
  }
}
check('.');
console.log('All JavaScript syntax checks passed.');
