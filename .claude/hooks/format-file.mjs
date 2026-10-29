#!/usr/bin/env node
// PostToolUse(Edit|Write): prettier + eslint --fix on the edited file, once the foundation
// epic has installed them. Before that it does nothing. Exit 2 feeds remaining lint errors back.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const file = input.tool_input?.file_path ? resolve(root, input.tool_input.file_path) : null;
if (!file || !existsSync(file) || relative(root, file).startsWith('..')) process.exit(0);
if (/(^|\/)(node_modules|dist|build|coverage)\//.test(relative(root, file))) process.exit(0);

const bin = (name) => join(root, 'node_modules/.bin', name);
const ext = extname(file);
const PRETTIER = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.jsx', '.json', '.md', '.css', '.html', '.yml', '.yaml'];
const ESLINT = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.jsx'];

if (PRETTIER.includes(ext) && existsSync(bin('prettier'))) {
  try {
    execFileSync(bin('prettier'), ['--write', '--ignore-unknown', '--log-level', 'warn', file], { cwd: root, stdio: 'pipe' });
  } catch {
    // Unparseable files are reported by eslint/typecheck instead.
  }
}

if (ESLINT.includes(ext) && existsSync(bin('eslint'))) {
  try {
    execFileSync(bin('eslint'), ['--fix', '--no-warn-ignored', file], { cwd: root, stdio: 'pipe', encoding: 'utf8' });
  } catch (e) {
    const out = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim();
    if (out) {
      process.stderr.write(`eslint errors remain in ${relative(root, file)}:\n${out}\n`);
      process.exit(2);
    }
  }
}
process.exit(0);
