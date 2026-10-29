#!/usr/bin/env node
// Status board: planning docs, epics, the active epic's stories and tickets, branches, open CRs.
// Usage: node .claude/tools/board.mjs [--json]
import { execFileSync } from 'node:child_process';
import { ACTIVE_STORY, ROOT, loadModel, rel } from './lib/docs.mjs';

const git = (...args) => {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};

const model = loadModel();
const current = git('symbolic-ref', '--short', 'HEAD') ?? '(detached)';
const porcelain = git('status', '--porcelain', '--untracked-files=all');
const changed = porcelain ? porcelain.split('\n').length : 0;
const hasMaster = git('rev-parse', '--verify', '--quiet', 'refs/heads/master') !== null;

const branches = (git('for-each-ref', '--format=%(refname:short)', 'refs/heads') ?? '')
  .split('\n')
  .filter((b) => b && b !== 'master')
  .map((name) => {
    const counts = hasMaster ? git('rev-list', '--left-right', '--count', `master...${name}`) : null;
    const [behind, ahead] = (counts ?? '0 0').split(/\s+/).map(Number);
    return { name, ahead, behind, merged: hasMaster && ahead === 0 };
  });

const ticketSummary = (s) => {
  const done = s.tickets.filter((t) => t.fm?.status === 'done').length;
  const doing = s.tickets.filter((t) => t.fm?.status === 'doing').map((t) => t.folderId);
  const next = s.tickets.find((t) => t.fm?.status === 'todo')?.folderId ?? null;
  return { done, total: s.tickets.length, doing, next };
};

const epics = model.epics.map((e) => {
  const fm = e.doc?.fm ?? {};
  return {
    id: e.folderId,
    title: fm.title ?? '?',
    status: fm.status ?? '?',
    branch: fm.branch || null,
    covers: fm.covers ?? [],
    storiesDone: e.stories.filter((s) => s.doc?.fm?.status === 'done').length,
    storiesTotal: e.stories.length,
    stories: e.stories.map((s) => ({
      id: s.folderId,
      title: s.doc?.fm?.title ?? '?',
      status: s.doc?.fm?.status ?? '?',
      type: s.doc?.fm?.type ?? '?',
      verification: s.verification,
      tickets: ticketSummary(s),
    })),
    openCrs: e.crs.filter((c) => c.fm?.status === 'proposed').map((c) => `${e.folderId}/${c.folderId}`),
  };
});

const active =
  epics.find((e) => ['planning', 'in-progress', 'epic-review'].includes(e.status)) ??
  epics.find((e) => e.status === 'planned') ??
  null;

const board = {
  branch: current,
  changedFiles: changed,
  prd: model.prd?.fm?.status ?? 'missing',
  designDoc: model.designDoc?.fm?.status ?? 'missing',
  epicsFrozen: model.index?.fm?.frozen ?? false,
  epics,
  activeEpic: active?.id ?? null,
  activeStory: active?.stories.find((s) => ACTIVE_STORY.includes(s.status))?.id ?? null,
  branches,
  openCrs: epics.flatMap((e) => e.openCrs),
  unexpected: model.unexpected.map(rel),
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(board, null, 2));
  process.exit(0);
}

const pad = (s, n) => String(s).padEnd(n);
const out = [];
out.push(`LabSafe board · branch ${board.branch} · ${changed} uncommitted file(s)`);
out.push(
  `PRD: ${board.prd} · Design doc: ${board.designDoc} · Epics: ${
    board.epicsFrozen ? `frozen (${epics.length})` : epics.length ? `draft (${epics.length})` : 'none'
  }`,
);
if (epics.length) {
  out.push('');
  out.push(`${pad('Epic', 6)}${pad('Status', 13)}${pad('Stories', 9)}${pad('Title', 32)}Branch`);
  for (const e of epics) {
    const br = branches.find((b) => b.name === e.branch);
    const brText = e.branch ? `${e.branch}${br ? ` (+${br.ahead}/-${br.behind})` : ' (no local branch)'}` : '';
    out.push(
      `${pad(e.id, 6)}${pad(e.status, 13)}${pad(`${e.storiesDone}/${e.storiesTotal}`, 9)}${pad(e.title.slice(0, 30), 32)}${brText}`,
    );
  }
}
if (active?.stories.length) {
  out.push('');
  out.push(`Active epic ${active.id}: ${active.title}`);
  for (const s of active.stories) {
    const t = s.tickets;
    const extra = [t.doing.length ? `${t.doing.join(', ')} doing` : '', t.next ? `next ${t.next}` : '']
      .filter(Boolean)
      .join(', ');
    out.push(
      `  ${pad(s.id, 7)}${pad(s.status, 11)}tickets ${t.done}/${t.total}${extra ? ` (${extra})` : ''}${
        s.verification ? ` · verification ${s.verification}` : ''
      }  ${s.title}`,
    );
  }
}
const epicBranches = new Set(epics.map((e) => e.branch).filter(Boolean));
const others = branches.filter((b) => !epicBranches.has(b.name));
if (others.length) {
  out.push('');
  out.push(
    `Other branches: ${others
      .map((b) => `${b.name} (+${b.ahead}/-${b.behind}${b.merged ? ', merged' : ', not merged'})`)
      .join(' · ')}`,
  );
}
if (board.openCrs.length) out.push(`Open CRs: ${board.openCrs.join(', ')}`);
if (board.unexpected.length) out.push(`Unexpected doc paths: ${board.unexpected.join(', ')}`);
console.log(out.join('\n'));
