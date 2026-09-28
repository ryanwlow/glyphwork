// Writes levels/*.txt: every level as a plain text page, so an agent that can
// only fetch URLs (no shell, no browser) can still read a level, solve it on
// paper and answer with a solution code. Sealed rules get a page of their own
// under levels/<level>/<rule>.txt.
//
//   node tools/pages.mjs           rewrite the pages
//   node tools/pages.mjs --check   fail if the pages are out of date (npm test)

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { chapters, levels } from '../src/levels.js';
import { SITE, Session, ruleText } from '../src/session.js';

const root = new URL('../levels/', import.meta.url);
const base = `${SITE}levels/`;

function pages() {
  const out = new Map();
  const session = new Session({ levels, chapters });
  const n = session.levels.length;

  out.set('index.txt', [
    'Glyphwork, plain-text edition',
    '',
    'Every level as a page you can fetch and solve on paper. No shell, browser',
    'or account needed. The rules of the game are in',
    `${SITE}play.md (section "Rules of the game").`,
    '',
    'Answer a level with a solution code: the level id, a colon, and your moves',
    'joined by +. For example drift:A@0,0+A@0,1+A@0,2. Anyone can check a code',
    `with node play.mjs "replay <code>" or by opening ${SITE}?replay=<code>`,
    '',
    session.levelsText().split('\n').slice(0, -2).join('\n').replace(/^ {2}. /gm, '  ').replace(' ←', ''),
    '',
    'Pages:',
    ...session.levels.map((lv, i) => `  ${String(i + 1).padStart(2)}  ${base}${lv.id}.txt`),
    '',
  ].join('\n'));

  session.levels.forEach((lv, i) => {
    session.load(i);
    const sealed = lv.rules.filter((r) => r.sealed);
    const lines = [
      `Glyphwork, plain-text edition · ${base}${lv.id}.txt`,
      '',
      session.look(),
      '',
      'To answer, write your moves in order as a solution code:',
      `  ${lv.id}:A@r,c+B@r,c+...`,
      'Each move must fit where you place it and change the grid. Par is the',
      'proven shortest solution.',
    ];
    if (sealed.length) {
      lines.push(
        '',
        'Sealed rules: in the game a seal breaks the first time you use the rule.',
        'On paper, commit to a move with the rule first, then read its seal:',
        ...sealed.map((r) => `  ${r.id}  ${base}${lv.id}/${r.id}.txt`),
      );
      for (const r of sealed) {
        out.set(`${lv.id}/${r.id}.txt`, [
          `Glyphwork · ${lv.title} · seal ${r.id}`,
          '',
          `  ${r.id}  ${ruleText(r)}`,
          '',
          `Back to the level: ${base}${lv.id}.txt`,
          '',
        ].join('\n'));
      }
    }
    lines.push(
      '',
      `Check a code: ${SITE}?replay=<code>, or node play.mjs "replay <code>"`,
      i + 1 < n ? `Next level: ${base}${session.levels[i + 1].id}.txt` : 'This is the last level.',
      `All levels: ${base}index.txt`,
      '',
    );
    out.set(`${lv.id}.txt`, lines.join('\n'));
  });
  return out;
}

function existing(dir = root, prefix = '') {
  let files = [];
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) files = files.concat(existing(new URL(`${e.name}/`, dir), `${prefix}${e.name}/`));
      else files.push(`${prefix}${e.name}`);
    }
  } catch {
    /* no levels/ yet */
  }
  return files;
}

const want = pages();
if (process.argv.includes('--check')) {
  const stale = [...want].filter(([path, text]) => {
    try {
      return readFileSync(new URL(path, root), 'utf8') !== text;
    } catch {
      return true;
    }
  }).map(([path]) => path);
  const extra = existing().filter((path) => !want.has(path));
  if (stale.length || extra.length) {
    console.error(`FAIL levels/ is out of date (${[...stale, ...extra].join(', ')}). Run: node tools/pages.mjs`);
    process.exit(1);
  }
  console.log(`text pages up to date (${want.size} files)`);
} else {
  rmSync(root, { recursive: true, force: true });
  for (const [path, text] of want) {
    const url = new URL(path, root);
    mkdirSync(new URL('./', url), { recursive: true });
    writeFileSync(url, text);
  }
  console.log(`wrote ${want.size} files to levels/`);
}
