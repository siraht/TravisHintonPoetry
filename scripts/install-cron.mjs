import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const projectRoot = path.resolve(new URL('..', import.meta.url).pathname);
const markerStart = '# BEGIN TravisHintonPoetry';
const markerEnd = '# END TravisHintonPoetry';
const cronLine = `*/30 * * * * cd ${projectRoot} && /usr/bin/flock -n ${projectRoot}/.sync.lock /usr/bin/npm run sync:publish >> ${projectRoot}/.sync.log 2>&1`;

const current = spawnSync('crontab', ['-l'], {
  encoding: 'utf8',
});

const currentText = current.status === 0 ? current.stdout : '';
const withoutBlock = currentText
  .split('\n')
  .filter((line) => line.trim() !== markerStart && line.trim() !== markerEnd && line.trim() !== cronLine)
  .join('\n')
  .trim();

const nextText = [
    withoutBlock,
    markerStart,
    cronLine,
    markerEnd,
  ]
  .filter(Boolean)
  .join('\n')
  .concat('\n');

const applied = spawnSync('crontab', ['-'], {
  input: nextText,
  encoding: 'utf8',
});

if (applied.status !== 0) {
  console.error(applied.stderr || 'Failed to install cron entry.');
  process.exit(applied.status ?? 1);
}

console.log('Installed 30-minute poetry sync cron entry.');
