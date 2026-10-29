// Shared, dependency-free model of docs/ for docs-check.mjs and board.mjs.
// Conventions it reads are documented in docs/CLAUDE.md.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const DOCS = join(ROOT, 'docs');

export const STATUSES = {
  doc: ['draft', 'approved'],
  epic: ['planned', 'planning', 'in-progress', 'epic-review', 'done'],
  story: ['draft', 'building', 'in-review', 'qa', 'done'],
  ticket: ['todo', 'doing', 'done'],
  cr: ['proposed', 'applied', 'rejected'],
};
export const ACTIVE_STORY = ['building', 'in-review', 'qa'];

export const EPIC_DIR = /^E(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const STORY_DIR = /^S(\d{2})\.(\d+)-[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const TICKET_FILE = /^(BE|FE)-(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
export const CR_FILE = /^CR-(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

const read = (p) => readFileSync(p, 'utf8');
const isDir = (p) => existsSync(p) && statSync(p).isDirectory();
export const rel = (p) => p.slice(ROOT.length + 1);

/** Minimal YAML-subset frontmatter: `key: value`, `key: [a, b]`, booleans, `# comments`. */
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!m) return { data: null, body: text };
  const data = {};
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '');
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (kv) data[kv[1]] = parseValue(kv[2].trim());
  }
  return { data, body: text.slice(m[0].length) };
}

function parseValue(v) {
  const unquote = (s) => s.replace(/^(['"])(.*)\1$/, '$2');
  if (v.startsWith('[') && v.endsWith(']'))
    return v
      .slice(1, -1)
      .split(',')
      .map((s) => unquote(s.trim()))
      .filter(Boolean);
  if (v === 'true') return true;
  if (v === 'false') return false;
  return unquote(v);
}

/** Body without HTML comments and fenced code blocks (keeps line count). */
export function stripNonContent(body) {
  return body
    .replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ''))
    .replace(/^(```|~~~)[\s\S]*?^\1[ \t]*$/gm, (c) => c.replace(/[^\n]/g, ''));
}

const cells = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim().replace(/^`(.*)`$/, '$1'));

/** Yields {header: string[], rows: string[][]} for every pipe table in the text. */
export function* tables(text) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].trim().startsWith('|') || !/^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) continue;
    const header = cells(lines[i]).map((h) => h.toLowerCase());
    const rows = [];
    let j = i + 2;
    for (; j < lines.length && lines[j].trim().startsWith('|'); j++) rows.push(cells(lines[j]));
    yield { header, rows };
    i = j - 1;
  }
}

/** Requirement rows ({id, priority}) from PRD tables that have a Priority column. */
export function parseRequirements(body) {
  const reqs = [];
  for (const { header, rows } of tables(stripNonContent(body))) {
    const p = header.indexOf('priority');
    if (p < 0) continue;
    for (const r of rows)
      if (/^(US|R|NFR)\d+$/.test(r[0])) reqs.push({ id: r[0], priority: (r[p] || '').toUpperCase() });
  }
  return reqs;
}

export function parseStoryBody(body) {
  const text = stripNonContent(body);
  const acs = [...text.matchAll(/^\s*[-*]\s+\*\*(AC\d+)\*\*/gm)].map((m) => m[1]);
  const tcs = [];
  for (const { header, rows } of tables(text)) {
    const col = (name) => header.indexOf(name);
    if (col('tc') < 0 || col('type') < 0 || col('ticket') < 0) continue;
    for (const r of rows)
      tcs.push({
        id: r[col('tc')],
        ac: r[col('ac')] ?? '',
        type: (r[col('type')] || '').toLowerCase(),
        ticket: r[col('ticket')] ?? '',
      });
  }
  return { acs, tcs, verification: verdict(text) };
}

/** GREEN | RED | null from the `## Verification` section. */
export function verdict(text) {
  const m = /^##\s+Verification[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/m.exec(stripNonContent(text));
  if (!m) return null;
  if (/\*\*GREEN\*\*/.test(m[1])) return 'GREEN';
  if (/\*\*RED\*\*/.test(m[1])) return 'RED';
  return null;
}

function loadDoc(path) {
  if (!existsSync(path)) return null;
  const { data, body } = parseFrontmatter(read(path));
  return { path, fm: data, body };
}

/** Everything under docs/ that the conventions define, plus anything unexpected. */
export function loadModel() {
  const model = {
    prd: loadDoc(join(DOCS, 'prd/PRD.md')),
    designDoc: loadDoc(join(DOCS, 'technical-design/design-doc.md')),
    index: loadDoc(join(DOCS, 'epics/README.md')),
    epics: [],
    unexpected: [],
  };
  if (model.prd) model.prd.requirements = parseRequirements(model.prd.body);

  const epicsDir = join(DOCS, 'epics');
  if (!isDir(epicsDir)) return model;
  for (const name of readdirSync(epicsDir).sort()) {
    const dir = join(epicsDir, name);
    if (['README.md', '.gitkeep'].includes(name)) continue;
    const em = EPIC_DIR.exec(name);
    if (!em || !isDir(dir)) {
      model.unexpected.push(dir);
      continue;
    }
    const epic = {
      dir,
      folderId: `E${em[1]}`,
      doc: loadDoc(join(dir, 'epic.md')),
      design: loadDoc(join(dir, 'design.md')),
      crs: [],
      stories: [],
    };
    for (const child of readdirSync(dir).sort()) {
      const p = join(dir, child);
      if (['epic.md', 'design.md', 'epic-review.md', 'qa.md', 'qa', '.gitkeep'].includes(child)) continue;
      const cm = CR_FILE.exec(child);
      if (cm) {
        epic.crs.push({ ...loadDoc(p), folderId: `CR-${cm[1]}` });
        continue;
      }
      const sm = STORY_DIR.exec(child);
      if (sm && isDir(p)) {
        epic.stories.push(loadStory(p, sm, model));
        continue;
      }
      model.unexpected.push(p);
    }
    model.epics.push(epic);
  }
  return model;
}

function loadStory(dir, sm, model) {
  const doc = loadDoc(join(dir, 'story.md'));
  const story = {
    dir,
    folderId: `S${sm[1]}.${sm[2]}`,
    epicNum: sm[1],
    doc,
    tickets: [],
    ...(doc ? parseStoryBody(doc.body) : { acs: [], tcs: [], verification: null }),
  };
  for (const child of readdirSync(dir).sort()) {
    const p = join(dir, child);
    if (['story.md', 'review.md', 'qa.md', 'qa', '.gitkeep'].includes(child)) continue;
    if (['be', 'fe'].includes(child) && isDir(p)) {
      for (const f of readdirSync(p).sort()) {
        const tm = TICKET_FILE.exec(f);
        if (!tm) {
          if (f !== '.gitkeep') model.unexpected.push(join(p, f));
          continue;
        }
        story.tickets.push({ ...loadDoc(join(p, f)), folderId: `${tm[1]}-${tm[2]}`, layerDir: child });
      }
      continue;
    }
    model.unexpected.push(p);
  }
  return story;
}

/** All markdown files under docs/ except templates. */
export function markdownFiles(dir = DOCS) {
  if (!isDir(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === '_templates' || name.startsWith('.')) continue;
    if (isDir(p)) out.push(...markdownFiles(p));
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

export const readText = read;
