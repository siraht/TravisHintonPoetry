import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const projectRoot = path.resolve(new URL('..', import.meta.url).pathname);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(process.execPath, [path.join(projectRoot, 'scripts/sync-poems.mjs')]);
run('npm', ['run', 'build']);

const status = spawnSync('git', ['status', '--porcelain'], {
  cwd: projectRoot,
  encoding: 'utf8',
});

if (status.status !== 0) {
  console.error('Git is not initialized for this project yet.');
  process.exit(status.status ?? 1);
}

if (!status.stdout.trim()) {
  console.log('No poetry site changes to commit.');
  process.exit(0);
}

run('git', ['add', '.']);
run('git', ['commit', '-m', 'chore: sync poetry site content']);
run('git', ['push']);
console.log('Content pushed. Cloudflare Pages will deploy the updated production branch.');
