import { match } from './engine.js';
import { chapters, levels } from './levels.js';
import { Session, ruleText } from './session.js';
import { track } from './analytics.js';

const $ = (id) => document.getElementById(id);
const els = {
  grid: $('grid'), goal: $('goal'), rules: $('rules'), log: $('log'), form: $('prompt'), input: $('cmd'),
  title: $('level-title'), meta: $('level-meta'), note: $('level-note'), select: $('level-select'),
};

let store = null;
try {
  store = window.localStorage;
} catch {
  /* no storage in this context */
}

let selectedRule = null;
let hover = null;

const session = new Session({
  levels,
  chapters,
  store,
  onChange: render,
  onSolve: (level, moves) => track(`solve/${level.id}/${moves <= level.par ? 'par' : 'over-par'}`),
});

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

function drawGrid(table, grid, interactive) {
  table.replaceChildren();
  const head = el('tr');
  head.append(el('th', { scope: 'col', class: 'corner' }, ''));
  grid[0].forEach((_, c) => head.append(el('th', { scope: 'col' }, String(c))));
  const thead = el('thead');
  thead.append(head);
  table.append(thead);
  const body = el('tbody');
  grid.forEach((row, r) => {
    const tr = el('tr');
    tr.append(el('th', { scope: 'row' }, String(r)));
    row.forEach((g, c) => {
      const td = el('td', { 'data-r': r, 'data-c': c, class: g === '·' ? 'empty' : '' }, g);
      if (interactive) td.setAttribute('aria-label', `row ${r}, column ${c}: ${g}`);
      tr.append(td);
    });
    body.append(tr);
  });
  table.append(body);
}

function miniPattern(rows, sealed) {
  const t = el('table', { class: 'mini', 'aria-hidden': 'true' });
  rows.forEach((row) => {
    const tr = el('tr');
    row.forEach((g) => tr.append(el('td', { class: sealed ? 'sealed' : g === '·' ? 'empty' : /^[a-z*]$/.test(g) ? 'var' : '' }, sealed ? '?' : g)));
    t.append(tr);
  });
  return t;
}

function drawRules() {
  const lv = session.level;
  els.rules.replaceChildren();
  for (const rule of lv.rules) {
    const open = session.isRevealed(lv, rule);
    const li = el('li');
    const btn = el('button', { type: 'button', class: 'rule', 'aria-pressed': String(selectedRule === rule.id), 'aria-label': `Rule ${rule.id}: ${ruleText(rule, open)}` });
    btn.append(el('span', { class: 'rule-id' }, rule.id), miniPattern(rule.from), el('span', { class: 'arrow' }, '→'), miniPattern(rule.to, !open));
    if (!open) btn.append(el('span', { class: 'seal' }, 'sealed'));
    btn.addEventListener('click', () => {
      selectedRule = selectedRule === rule.id ? null : rule.id;
      drawRules();
      paintHover();
    });
    li.append(btn);
    els.rules.append(li);
  }
}

function paintHover() {
  els.grid.querySelectorAll('td').forEach((td) => td.classList.remove('fit', 'miss'));
  if (!selectedRule || !hover) return;
  const rule = session.level.rules.find((r) => r.id === selectedRule);
  const ok = !!match(session.grid, rule, hover.r, hover.c) && !session.solved;
  for (let i = 0; i < rule.h; i++) {
    for (let j = 0; j < rule.w; j++) {
      const td = els.grid.querySelector(`td[data-r="${hover.r + i}"][data-c="${hover.c + j}"]`);
      td?.classList.add(ok ? 'fit' : 'miss');
    }
  }
}

function render() {
  const lv = session.level;
  const best = session.progress[lv.id];
  const chapter = chapters.find((c) => c.id === lv.chapter);
  els.title.textContent = `${session.index + 1}. ${lv.title}`;
  els.meta.textContent = `${chapter.title} · moves ${session.history.length} · par ${lv.par}${best != null ? ` · best ${best}` : ''}`;
  els.note.textContent = lv.note;
  document.body.classList.toggle('solved', session.solved);
  drawGrid(els.grid, session.grid, true);
  drawGrid(els.goal, lv.goal, false);
  if (!lv.rules.some((r) => r.id === selectedRule)) selectedRule = lv.rules.length === 1 ? lv.rules[0].id : null;
  drawRules();
  paintHover();
  els.select.replaceChildren(
    ...session.levels.map((l, i) => {
      const b = session.progress[l.id];
      const mark = b == null ? '' : b <= l.par ? ' ★' : ' ✓';
      const opt = el('option', { value: String(i + 1) }, `${i + 1}. ${l.title}${mark}`);
      opt.selected = i === session.index;
      return opt;
    }),
  );
}

function log(cmd, out) {
  const entry = el('div', { class: 'entry' });
  if (cmd) entry.append(el('div', { class: 'cmd' }, `› ${cmd}`));
  entry.append(el('pre', { class: 'out' }, out));
  els.log.append(entry);
  while (els.log.children.length > 200) els.log.firstChild.remove();
  els.log.scrollTop = els.log.scrollHeight;
}

function run(cmd, via = 'console') {
  track(`input/${via}`);
  const out = session.exec(cmd);
  track(`start/${session.level.id}`);
  log(cmd, out);
  return out;
}

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const cmd = els.input.value.trim();
  if (!cmd) return;
  run(cmd);
  els.input.value = '';
});

document.querySelectorAll('[data-cmd]').forEach((b) => b.addEventListener('click', () => run(b.dataset.cmd, 'click')));
els.select.addEventListener('change', () => run(`level ${els.select.value}`, 'click'));

els.grid.addEventListener('mouseover', (e) => {
  const td = e.target.closest('td');
  hover = td ? { r: Number(td.dataset.r), c: Number(td.dataset.c) } : null;
  paintHover();
});
els.grid.addEventListener('mouseleave', () => {
  hover = null;
  paintHover();
});
els.grid.addEventListener('click', (e) => {
  const td = e.target.closest('td');
  if (!td) return;
  if (!selectedRule) {
    log(null, 'Pick a rule first, then click the cell where its top-left corner should go.');
    return;
  }
  run(`${selectedRule}@${td.dataset.r},${td.dataset.c}`, 'click');
});

window.glyphwork = {
  look: () => session.look(),
  do: (cmd) => run(cmd, 'api'),
  help: () => session.exec('help'),
  state: () => ({
    level: session.level.id,
    index: session.index + 1,
    grid: session.grid.map((row) => row.join('')),
    goal: session.level.goal.map((row) => row.join('')),
    rules: session.level.rules.map((r) => ({ id: r.id, rule: ruleText(r, session.isRevealed(session.level, r)), sealed: !session.isRevealed(session.level, r) })),
    moves: session.history.map((h) => h.move),
    par: session.level.par,
    solved: session.solved,
  }),
};

const params = new URLSearchParams(location.search);
const param = params.get('level');
const start = param ? session.findLevel(param) : -1;
if (start >= 0) session.load(start);
else render();
log(null, 'Welcome to Glyphwork. Type "help" for how to play, or just start: every command is text.');
const replay = params.get('replay'); // "+" arrives as a space; replay accepts both
if (replay) {
  log(`replay ${replay}`, session.exec(`replay ${replay}`));
  track(`replay/${session.level.id}`);
}
log('look', session.look());
track(`start/${session.level.id}`);
