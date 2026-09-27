// The game as a text conversation. Session.exec(line) takes a command and
// returns the text a player (human or agent) reads back. The page and the
// window.glyphwork API are both thin layers over this.

import { apply, compileLevel, gridKey, isSolved, match, ANY } from './engine.js';

const HELP = `Glyphwork: rewrite the grid until it matches the goal.

Commands (separate several with ; or new lines):
  A@1,2        apply rule A with its top-left cell at row 1, column 2
               (also accepted: "A 1 2", "A 1,2")
  undo [n]     take back the last n moves (default 1)
  reset        return to the start of this level
  look         show the level again
  levels       list levels and your progress
  level <n>    go to level n (number or id), next, prev
  history      show the moves so far
  help         show this

Reading rules:
  Patterns are written row by row, rows separated by "/".
  "ab/cd" is a 2x2 block: a b on top, c d below.
  Lowercase letters are variables. In the left side each matches any
  glyph (the same glyph wherever the letter repeats); the right side
  writes back what it matched.
  "*" matches anything and, on the right side, leaves the cell as it was.
  A sealed rule shows "?" until you use it once.
  A move must change the grid. Rows and columns count from 0.
  Par is the fewest moves that solve the level. It is exact: a solver
  checked every level.`;

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function ruleText(rule, revealed = true) {
  const from = rule.from.map((row) => row.join('')).join('/');
  const to = revealed ? rule.to.map((row) => row.join('')).join('/') : rule.to.map((row) => row.map(() => '?').join('')).join('/');
  return `${from} → ${to}`;
}

export function gridLines(grid) {
  const w = Math.max(...grid.map((row) => row.length));
  const lines = ['   ' + Array.from({ length: w }, (_, c) => String(c % 10)).join(' ')];
  grid.forEach((row, r) => lines.push(`${String(r).padStart(2)} ${row.join(' ')}`));
  return lines;
}

function sideBySide(left, right, gap = 6) {
  const width = Math.max(...left.map((l) => [...l].length));
  const n = Math.max(left.length, right.length);
  const out = [];
  for (let i = 0; i < n; i++) {
    const l = left[i] ?? '';
    out.push((l + ' '.repeat(width - [...l].length + gap) + (right[i] ?? '')).trimEnd());
  }
  return out;
}

export class Session {
  constructor({ levels, chapters, store = null, onChange = () => {} }) {
    this.levels = levels.map(compileLevel);
    this.chapters = chapters;
    this.store = store;
    this.onChange = () => {};
    this.progress = this.read('progress', {}); // id -> best move count
    this.revealed = this.read('revealed', {}); // id -> [rule ids]
    this.load(0);
    this.onChange = onChange; // set after the first load so the UI can finish wiring up
  }

  read(key, fallback) {
    try {
      const raw = this.store?.getItem(`glyphwork:${key}`);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  write(key, value) {
    try {
      this.store?.setItem(`glyphwork:${key}`, JSON.stringify(value));
    } catch {
      /* storage unavailable: progress lasts for this visit only */
    }
  }

  get level() {
    return this.levels[this.index];
  }

  get solved() {
    return isSolved(this.grid, this.level.goal);
  }

  isRevealed(level, rule) {
    return !rule.sealed || (this.revealed[level.id] || []).includes(rule.id);
  }

  load(index) {
    this.index = Math.max(0, Math.min(this.levels.length - 1, index));
    this.grid = this.level.start.map((row) => row.slice());
    this.history = [];
    this.onChange(this);
  }

  findLevel(arg) {
    if (arg === 'next') return this.index + 1 < this.levels.length ? this.index + 1 : -1;
    if (arg === 'prev') return this.index > 0 ? this.index - 1 : -1;
    if (/^\d+$/.test(arg)) {
      const n = Number(arg) - 1;
      return n >= 0 && n < this.levels.length ? n : -1;
    }
    return this.levels.findIndex((l) => l.id === arg.toLowerCase());
  }

  // The canonical text view of the current level.
  look() {
    const lv = this.level;
    const chapter = this.chapters.find((c) => c.id === lv.chapter);
    const best = this.progress[lv.id];
    const lines = [
      `Level ${this.index + 1}/${this.levels.length}: ${lv.title}  [${chapter.title}]`,
      `Moves ${this.history.length} · par ${lv.par}${best != null ? ` · your best ${best}` : ''}`,
      '',
      lv.note,
      '',
      ...sideBySide(['Grid', ...gridLines(this.grid)], ['Goal', ...gridLines(lv.goal)]),
      '',
      'Rules',
      ...lv.rules.map((r) => `  ${r.id}  ${ruleText(r, this.isRevealed(lv, r))}${this.isRevealed(lv, r) ? '' : '   (sealed)'}`),
    ];
    if (lv.goal.flat().includes(ANY)) lines.push('', '* in the goal means any glyph.');
    if (this.solved) lines.push('', this.solvedLine());
    return lines.join('\n');
  }

  solvedLine() {
    const n = this.history.length;
    const par = this.level.par;
    const verdict = n === par ? 'at par' : `par is ${par}`;
    const onward = this.index + 1 < this.levels.length ? ' Type "next" to continue.' : ' That was the last level.';
    return `Solved in ${plural(n, 'move')}, ${verdict}.${onward}`;
  }

  explainMiss(rule, r, c) {
    const g = this.grid;
    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length) return `${r},${c} is off the grid (rows 0-${g.length - 1}, columns 0-${g[0].length - 1}).`;
    if (r + rule.h > g.length || c + rule.w > g[r].length) {
      return `${rule.id} is ${rule.h} tall and ${rule.w} wide, so at ${r},${c} it would hang off the grid.`;
    }
    const vars = {};
    for (let i = 0; i < rule.h; i++) {
      for (let j = 0; j < rule.w; j++) {
        const want = rule.from[i][j];
        const got = g[r + i][c + j];
        if (want === ANY) continue;
        if (/^[a-z]$/.test(want)) {
          if (want in vars && vars[want] !== got) {
            return `${rule.id} doesn't fit at ${r},${c}: variable ${want} is ${vars[want]} at one place but ${got} at ${r + i},${c + j}.`;
          }
          vars[want] = got;
        } else if (want !== got) {
          return `${rule.id} doesn't fit at ${r},${c}: cell ${r + i},${c + j} is ${got}, the rule needs ${want}.`;
        }
      }
    }
    return `${rule.id} doesn't fit at ${r},${c}.`;
  }

  move(ruleId, r, c) {
    const lv = this.level;
    const rule = lv.rules.find((x) => x.id === ruleId.toUpperCase());
    if (!rule) return `No rule ${ruleId} here. Rules: ${lv.rules.map((x) => x.id).join(', ')}.`;
    if (this.solved) return 'This level is already solved. Type "next", "reset" or "undo".';
    if (!match(this.grid, rule, r, c)) return this.explainMiss(rule, r, c);
    const next = apply(this.grid, rule, r, c);
    if (gridKey(next) === gridKey(this.grid)) return `${rule.id}@${r},${c} would change nothing, so it doesn't count as a move.`;
    this.history.push({ move: `${rule.id}@${r},${c}`, grid: this.grid });
    this.grid = next;
    let out = `${rule.id}@${r},${c} ✓  (move ${this.history.length})`;
    if (!this.isRevealed(lv, rule)) {
      this.revealed[lv.id] = [...(this.revealed[lv.id] || []), rule.id];
      this.write('revealed', this.revealed);
      out += `\nSeal broken: ${rule.id} is ${ruleText(rule)}`;
    }
    if (this.solved) {
      const best = this.progress[lv.id];
      if (best == null || this.history.length < best) {
        this.progress[lv.id] = this.history.length;
        this.write('progress', this.progress);
      }
      out += `\n${this.solvedLine()}`;
    }
    return out;
  }

  levelsText() {
    const lines = [];
    let chapter = null;
    this.levels.forEach((lv, i) => {
      if (lv.chapter !== chapter) {
        chapter = lv.chapter;
        const ch = this.chapters.find((c) => c.id === chapter);
        lines.push(`${lines.length ? '\n' : ''}${ch.title}: ${ch.blurb}`);
      }
      const best = this.progress[lv.id];
      const mark = best == null ? ' ' : best <= lv.par ? '★' : '✓';
      const here = i === this.index ? ' ←' : '';
      lines.push(`  ${mark} ${String(i + 1).padStart(2)}  ${lv.title.padEnd(12)} par ${String(lv.par).padStart(2)}${best != null ? `  best ${best}` : ''}${here}`);
    });
    lines.push('', '★ solved at par  ✓ solved');
    return lines.join('\n');
  }

  exec(input) {
    const commands = String(input).split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
    if (!commands.length) return this.look();
    const outputs = commands.map((cmd) => this.execOne(cmd));
    this.onChange(this);
    return outputs.join('\n');
  }

  execOne(cmd) {
    const m = cmd.match(/^([A-Za-z])\s*(?:@\s*|\s+)(-?\d+)\s*[, ]\s*(-?\d+)$/);
    if (m && m[1] === m[1].toUpperCase()) return this.move(m[1], Number(m[2]), Number(m[3]));
    const [word, ...rest] = cmd.split(/\s+/);
    const arg = rest.join(' ');
    switch (word.toLowerCase()) {
      case 'help':
      case '?':
        return HELP;
      case 'look':
        return this.look();
      case 'levels':
        return this.levelsText();
      case 'history':
        return this.history.length ? this.history.map((h) => h.move).join('; ') : 'No moves yet.';
      case 'undo': {
        const n = arg ? Number(arg) : 1;
        if (!Number.isInteger(n) || n < 1) return 'undo takes a positive number.';
        if (!this.history.length) return 'Nothing to undo.';
        let k = 0;
        while (k < n && this.history.length) {
          this.grid = this.history.pop().grid;
          k++;
        }
        return `Undid ${plural(k, 'move')}. Moves ${this.history.length}.\n\n${sideBySide(['Grid', ...gridLines(this.grid)], ['Goal', ...gridLines(this.level.goal)]).join('\n')}`;
      }
      case 'reset':
        this.load(this.index);
        return `Reset.\n\n${this.look()}`;
      case 'next':
      case 'prev':
      case 'level': {
        const target = word.toLowerCase() === 'level' ? arg : word.toLowerCase();
        if (!target) return 'level takes a number or an id, e.g. "level 3".';
        const i = this.findLevel(target);
        if (i < 0) return target === 'next' ? 'This is the last level.' : target === 'prev' ? 'This is the first level.' : `No level ${target}. Type "levels" for the list.`;
        this.load(i);
        return this.look();
      }
      default:
        return `I don't know "${cmd}". Moves look like A@1,2. Type "help" for everything else.`;
    }
  }
}
