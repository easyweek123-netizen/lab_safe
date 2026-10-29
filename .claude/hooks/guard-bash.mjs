#!/usr/bin/env node
// PreToolUse(Bash) guard. Exit 2 blocks the command; stderr is shown to Claude.
// Defence in depth on top of the permission deny-list in .claude/settings.json.
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const cmd = String(input.tool_input?.command ?? '');

function block(reason) {
  process.stderr.write(`Blocked by .claude/hooks/guard-bash.mjs: ${reason}\n`);
  process.exit(2);
}

// --- git: the user owns commits, pushes, merges, tags and history --------------------
if (/\bgit\s+(-c\s+\S+\s+)*commit\b/.test(cmd))
  block('agents never commit. Leave a verified working tree; the user commits.');
if (/\bgit\s+push\b/.test(cmd)) block('pushing is done by the user.');
if (/\bgit\s+merge\b(?!-base)/.test(cmd)) block('merging is done by the user.');
if (/\bgit\s+rebase\b/.test(cmd)) block('rebasing is not allowed; ask the user.');
if (/\bgit\s+tag\b/.test(cmd)) block('tagging is done by the user.');
if (/\bgit\s+reset\s+[^|;&]*--hard\b/.test(cmd)) block('git reset --hard discards work.');
if (/\bgit\s+clean\b[^|;&]*\s-[a-zA-Z]*f/.test(cmd)) block('git clean -f deletes untracked files.');
if (/\bgit\s+branch\s+[^|;&]*(-D\b|--delete\s+--force|-d\s+-f|-f\s+-d)/.test(cmd))
  block('force-deleting branches loses work; use -d.');
if (/\bgit\s+stash\s+(drop|clear)\b/.test(cmd)) block('dropping stashes loses work.');
if (/\bgit\s+(checkout|restore)\b[^|;&]*\s(--\s+)?\.(\s|$)/.test(cmd))
  block('discarding all working-tree changes is not allowed.');
if (/--no-verify\b/.test(cmd)) block('skipping git hooks is not allowed.');

// --- secrets ------------------------------------------------------------------------
if (
  /(^|[\s;&|<>(])(cat|less|more|head|tail|grep|rg|sed|awk|source|\.|bat|strings|xxd|cp|base64)\s([^|;&]*[\s/])?\.env(\.(?!example\b)[\w.]+)?(\s|$|[;&|])/.test(
    cmd,
  ) &&
  !/^\s*cp\s+\.env\.example\s+\.env\s*$/.test(cmd)
)
  block('.env holds secrets and must not be read. Use .env.example for variable names.');
if (/(^|[;&|]\s*)(printenv|env|export\s+-p|set)\s*($|[;&|])/.test(cmd))
  block('dumping the environment may expose secrets.');

// --- destructive filesystem ops -----------------------------------------------------
const SAFE_RM =
  /^(\.\/)?([\w@.-]+\/)*(node_modules|dist|build|coverage|test-results|playwright-report|uploads-test|\.vite|\.turbo|[\w.-]+\.tsbuildinfo)\/?$/;
for (const m of cmd.matchAll(/\brm\s+((?:-[a-zA-Z]+\s+)+)([^|;&]+)/g)) {
  if (!/r/i.test(m[1])) continue;
  const targets = m[2].trim().split(/\s+/);
  if (!targets.every((t) => SAFE_RM.test(t) && !t.includes('..')))
    block(`recursive rm is only allowed on build output (node_modules, dist, coverage …), not: ${m[2].trim()}`);
}

// --- databases: destructive ops only against the test DB (labsafe_test on 5443) ------
const touchesTestDb = /5443|labsafe_test|db-test|test:db:prepare/.test(cmd);
if (/schema:drop|migration:revert|\bDROP\s+(SCHEMA|DATABASE|TABLE)\b|\bTRUNCATE\b/i.test(cmd) && !touchesTestDb)
  block('destructive DB commands may only target the test DB (labsafe_test on 5443). Write a new migration instead.');
if (/docker\s+compose\s+[^|;&]*down\b[^|;&]*(-v\b|--volumes)/.test(cmd))
  block('removing volumes deletes the dev database.');
if (/docker\s+(volume\s+(rm|prune)|system\s+prune)/.test(cmd)) block('pruning Docker volumes/system is not allowed.');

// --- remote code execution ----------------------------------------------------------
if (/\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|z|da)?sh\b/.test(cmd)) block('piping downloads into a shell is not allowed.');
if (/\bsudo\b/.test(cmd)) block('sudo is not allowed.');

process.exit(0);
