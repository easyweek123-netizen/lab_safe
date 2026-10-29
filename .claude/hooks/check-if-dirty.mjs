#!/usr/bin/env node
// Stop hook: if docs changed, run docs-check; if code changed and a typecheck script exists,
// run it. Exit 2 (with the errors on stderr) makes Claude fix them before finishing.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8'));
if (input.stop_hook_active) process.exit(0); // already continuing because of this hook
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

let changed;
try {
  changed = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map((l) => l.slice(3).replace(/^.* -> /, ''));
} catch {
  process.exit(0);
}

const failures = [];
const run = (label, cmd, args) => {
  try {
    execFileSync(cmd, args, { cwd: root, stdio: 'pipe', encoding: 'utf8' });
  } catch (e) {
    failures.push(`${label} failed:\n${`${e.stdout ?? ''}${e.stderr ?? ''}`.trim()}`);
  }
};

if (changed.some((p) => p.startsWith('docs/'))) run('docs-check', 'node', ['.claude/tools/docs-check.mjs']);

const pkg = join(root, 'package.json');
const hasTypecheck =
  existsSync(pkg) && existsSync(join(root, 'node_modules')) && !!JSON.parse(readFileSync(pkg, 'utf8')).scripts?.typecheck;
if (hasTypecheck && changed.some((p) => /\.(ts|tsx|mts|cts)$/.test(p))) run('typecheck', 'pnpm', ['-s', 'typecheck']);

if (failures.length) {
  process.stderr.write(`${failures.join('\n\n')}\n\nFix these before finishing.\n`);
  process.exit(2);
}
process.exit(0);
