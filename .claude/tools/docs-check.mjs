#!/usr/bin/env node
// Validates docs/ against the conventions in docs/CLAUDE.md: frontmatter, status vocabulary,
// ID/folder agreement, traceability (PRD → epics → stories → ACs → TCs → tickets) and links.
// Usage: node .claude/tools/docs-check.mjs   (exit 1 on errors)
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  ACTIVE_STORY,
  STATUSES,
  loadModel,
  markdownFiles,
  readText,
  rel,
  stripNonContent,
} from './lib/docs.mjs';

const errors = new Map();
const err = (path, msg) => {
  const key = rel(path);
  if (!errors.has(key)) errors.set(key, []);
  errors.get(key).push(msg);
};

const model = loadModel();
const arr = (v) => (Array.isArray(v) ? v : null);

function checkStatusDoc(doc, label) {
  if (!doc) return;
  if (!doc.fm) return err(doc.path, `${label}: missing frontmatter`);
  if (!STATUSES.doc.includes(doc.fm.status))
    err(doc.path, `status "${doc.fm.status ?? ''}" must be one of ${STATUSES.doc.join('|')}`);
  if (!doc.fm.updated) err(doc.path, 'missing "updated:"');
}

// --- PRD, design doc, epic index ------------------------------------------------------
checkStatusDoc(model.prd, 'PRD');
checkStatusDoc(model.designDoc, 'design doc');
const reqIds = new Set();
const mustIds = new Set();
if (model.prd) {
  for (const r of model.prd.requirements) {
    if (reqIds.has(r.id)) err(model.prd.path, `requirement ${r.id} is defined twice`);
    reqIds.add(r.id);
    if (!['MUST', 'SHOULD', 'OUT'].includes(r.priority))
      err(model.prd.path, `${r.id}: priority "${r.priority}" must be MUST|SHOULD|OUT`);
    if (r.priority === 'MUST' && !r.id.startsWith('NFR')) mustIds.add(r.id);
  }
  if (model.prd.fm?.status === 'approved' && reqIds.size === 0)
    err(model.prd.path, 'approved PRD has no requirement rows (table with a Priority column)');
}
if (model.index && typeof model.index.fm?.frozen !== 'boolean')
  err(model.index.path, '"frozen:" must be true or false');

for (const p of model.unexpected)
  err(p, 'unexpected file or folder name (see docs/CLAUDE.md "Map" and "IDs")');

// --- Epics ----------------------------------------------------------------------------
const epicIds = new Set(model.epics.map((e) => e.folderId));
const coveredBy = new Map(); // requirement → [epic ids]

for (const epic of model.epics) {
  const d = epic.doc;
  if (!d) {
    err(epic.dir, 'epic folder without epic.md');
    continue;
  }
  const fm = d.fm;
  if (!fm) {
    err(d.path, 'missing frontmatter');
    continue;
  }
  if (fm.id !== epic.folderId) err(d.path, `id "${fm.id}" must match folder (${epic.folderId})`);
  if (!fm.title) err(d.path, 'missing "title:"');
  if (!STATUSES.epic.includes(fm.status))
    err(d.path, `status "${fm.status ?? ''}" must be one of ${STATUSES.epic.join('|')}`);
  const covers = arr(fm.covers);
  if (!covers) err(d.path, '"covers:" must be a list');
  for (const id of covers ?? []) {
    if (model.prd && !reqIds.has(id)) err(d.path, `covers ${id}, which is not a PRD requirement`);
    coveredBy.set(id, [...(coveredBy.get(id) ?? []), epic.folderId]);
  }
  for (const dep of arr(fm.depends_on) ?? (err(d.path, '"depends_on:" must be a list'), []))
    if (!epicIds.has(dep)) err(d.path, `depends_on ${dep}, which does not exist`);
  if (STATUSES.epic.includes(fm.status) && fm.status !== 'planned' && !fm.branch)
    err(d.path, `status ${fm.status} needs "branch:"`);
  if (['planning', 'in-progress', 'epic-review', 'done'].includes(fm.status)) {
    if (!epic.design) err(d.path, `status ${fm.status} needs design.md`);
    else if (epic.design.fm?.status !== 'approved')
      err(epic.design.path, `epic is ${fm.status}, so design.md must be approved`);
  }
  if (epic.design) checkStatusDoc(epic.design, 'design');

  for (const cr of epic.crs) {
    if (!cr.fm) {
      err(cr.path, 'missing frontmatter');
      continue;
    }
    if (cr.fm.id !== cr.folderId) err(cr.path, `id "${cr.fm.id}" must match file name (${cr.folderId})`);
    if (cr.fm.epic !== epic.folderId) err(cr.path, `epic "${cr.fm.epic}" must be ${epic.folderId}`);
    if (!STATUSES.cr.includes(cr.fm.status))
      err(cr.path, `status "${cr.fm.status ?? ''}" must be one of ${STATUSES.cr.join('|')}`);
  }

  // --- Stories ------------------------------------------------------------------------
  const storyCovers = new Set();
  const active = [];
  for (const s of epic.stories) {
    checkStory(s, epic, covers ?? [], storyCovers);
    if (ACTIVE_STORY.includes(s.doc?.fm?.status)) active.push(s.folderId);
  }
  if (active.length > 1) err(d.path, `more than one active story: ${active.join(', ')} (work one at a time)`);
  if (epic.stories.length)
    for (const id of covers ?? [])
      if (!storyCovers.has(id)) err(d.path, `covers ${id}, but no story covers it`);
  if (fm.status === 'done' && epic.stories.some((s) => s.doc?.fm?.status !== 'done'))
    err(d.path, 'epic is done but not all stories are done');
}

function checkStory(s, epic, epicCovers, storyCovers) {
  const d = s.doc;
  if (s.epicNum !== epic.folderId.slice(1))
    err(s.dir, `story ${s.folderId} sits in epic ${epic.folderId}; numbers must match`);
  if (!d) return err(s.dir, 'story folder without story.md');
  const fm = d.fm;
  if (!fm) return err(d.path, 'missing frontmatter');
  if (fm.id !== s.folderId) err(d.path, `id "${fm.id}" must match folder (${s.folderId})`);
  if (fm.epic !== epic.folderId) err(d.path, `epic "${fm.epic}" must be ${epic.folderId}`);
  if (!fm.title) err(d.path, 'missing "title:"');
  if (!['feature', 'change'].includes(fm.type)) err(d.path, `type "${fm.type ?? ''}" must be feature|change`);
  if (!STATUSES.story.includes(fm.status))
    err(d.path, `status "${fm.status ?? ''}" must be one of ${STATUSES.story.join('|')}`);
  for (const id of arr(fm.covers) ?? (err(d.path, '"covers:" must be a list'), [])) {
    storyCovers.add(id);
    if (!epicCovers.includes(id)) err(d.path, `covers ${id}, which epic ${epic.folderId} does not cover`);
  }

  // ACs and test cases
  const acs = new Set(s.acs);
  if (!acs.size) err(d.path, 'no acceptance criteria (expected "- **AC1** Given …")');
  if (acs.size !== s.acs.length) err(d.path, 'an AC ID is used twice');
  const ticketIds = new Set(s.tickets.map((t) => t.folderId));
  const tcIds = new Set();
  const acsWithTc = new Set();
  for (const tc of s.tcs) {
    const m = /^TC-(\d+)\.(\d+)$/.exec(tc.id);
    if (!m) {
      err(d.path, `test case "${tc.id}" must look like TC-<ac>.<n>`);
      continue;
    }
    if (tcIds.has(tc.id)) err(d.path, `${tc.id} is used twice`);
    tcIds.add(tc.id);
    if (!acs.has(tc.ac)) err(d.path, `${tc.id} refers to ${tc.ac || 'no AC'}, which is not an AC of this story`);
    else if (tc.ac !== `AC${m[1]}`) err(d.path, `${tc.id} must belong to AC${m[1]}, not ${tc.ac}`);
    acsWithTc.add(tc.ac);
    const auto = /^auto:\s*(unit|api|web|e2e)$/.exec(tc.type);
    if (!auto && tc.type !== 'manual')
      err(d.path, `${tc.id}: type "${tc.type}" must be "auto: unit|api|web|e2e" or "manual"`);
    if (auto && !ticketIds.has(tc.ticket))
      err(d.path, `${tc.id} is automated by "${tc.ticket}", which is not a ticket of this story`);
  }
  for (const ac of acs) if (!acsWithTc.has(ac)) err(d.path, `${ac} has no test case`);

  // Tickets
  if (!s.tickets.length) err(d.path, 'story has no tickets (be/ or fe/)');
  for (const t of s.tickets) {
    if (!t.fm) {
      err(t.path, 'missing frontmatter');
      continue;
    }
    if (t.fm.id !== t.folderId) err(t.path, `id "${t.fm.id}" must match file name (${t.folderId})`);
    if (t.fm.story !== s.folderId) err(t.path, `story "${t.fm.story}" must be ${s.folderId}`);
    if (t.fm.layer !== t.layerDir) err(t.path, `layer "${t.fm.layer}" must be ${t.layerDir} (its folder)`);
    if (t.folderId.slice(0, 2).toLowerCase() !== t.layerDir)
      err(t.path, `${t.folderId} must live in ${t.folderId.slice(0, 2).toLowerCase()}/`);
    if (!STATUSES.ticket.includes(t.fm.status))
      err(t.path, `status "${t.fm.status ?? ''}" must be one of ${STATUSES.ticket.join('|')}`);
    for (const dep of arr(t.fm.depends_on) ?? (err(t.path, '"depends_on:" must be a list'), []))
      if (!ticketIds.has(dep)) err(t.path, `depends_on ${dep}, which is not a ticket of ${s.folderId}`);
    for (const ac of arr(t.fm.covers) ?? (err(t.path, '"covers:" must be a list'), []))
      if (!acs.has(ac)) err(t.path, `covers ${ac}, which is not an AC of ${s.folderId}`);
  }
  if (s.tickets.filter((t) => t.fm?.status === 'doing').length > 1)
    err(d.path, 'more than one ticket is "doing" (one at a time)');

  if (fm.status === 'done') {
    if (s.tickets.some((t) => t.fm?.status !== 'done')) err(d.path, 'story is done but not all tickets are done');
    if (s.verification !== 'GREEN') err(d.path, 'story is done but "## Verification" is not **GREEN**');
  }
}

// --- Coverage: every MUST requirement in exactly one epic (once epics are frozen) -----
if (model.index?.fm?.frozen === true && model.prd) {
  for (const id of mustIds) {
    const by = coveredBy.get(id) ?? [];
    if (by.length === 0) err(model.index.path, `MUST requirement ${id} is not covered by any epic`);
    if (by.length > 1) err(model.index.path, `MUST requirement ${id} is covered by several epics: ${by.join(', ')}`);
  }
}

// --- Relative links -------------------------------------------------------------------
let fileCount = 0;
for (const file of markdownFiles()) {
  fileCount++;
  const text = stripNonContent(readText(file)).replace(/`[^`\n]*`/g, '');
  for (const m of text.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = m[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const path = decodeURIComponent(target.split('#')[0].split('?')[0]);
    if (path && !existsSync(resolve(dirname(file), path))) err(file, `broken link: ${target}`);
  }
}

// --- Report ---------------------------------------------------------------------------
if (!errors.size) {
  console.log(`docs-check: OK (${fileCount} docs, ${model.epics.length} epics)`);
  process.exit(0);
}
let n = 0;
for (const [file, msgs] of errors) {
  console.log(file);
  for (const msg of msgs) console.log(`  - ${msg}`), n++;
}
console.log(`\ndocs-check: ${n} problem(s) in ${errors.size} file(s). Conventions: docs/CLAUDE.md`);
process.exit(1);
