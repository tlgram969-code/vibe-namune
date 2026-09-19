/**
 * Runs the API and the Vite dev server side by side.
 *   node scripts/dev.js          → API on 4173, site on http://localhost:5173
 * Ctrl+C stops both.
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const children = [];

function run(label, cwd, args, env = {}) {
  const child = spawn(npm, args, {
    cwd: join(root, cwd),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
  });

  const tag = (stream) => (chunk) => {
    for (const line of String(chunk).split('\n')) {
      if (line.trim()) stream.write(`[${label}] ${line}\n`);
    }
  };
  child.stdout.on('data', tag(process.stdout));
  child.stderr.on('data', tag(process.stderr));
  child.on('exit', (code) => {
    console.log(`[${label}] exited with code ${code}`);
    stopAll();
  });

  children.push(child);
  return child;
}

function stopAll() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on('SIGINT', () => {
  stopAll();
  process.exit(0);
});

run('api', 'server', ['run', 'dev'], { PORT: '4173' });
run('web', 'client', ['run', 'dev']);

console.log('\n  وایب نمونه — حالت توسعه: http://localhost:5173\n');
