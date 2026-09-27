// Glyphwork rules engine. Pure functions, no DOM: shared by the page and by tools/.
//
// A grid is an array of rows; each row is an array of single-glyph strings.
// A rule rewrites a rectangular pattern into another pattern of the same size.
//   - Lowercase latin letters (a-z) in a pattern are variables. In `from` each
//     variable matches any glyph (the same glyph everywhere it appears); in `to`
//     it writes back whatever it matched.
//   - `*` in `from` matches any glyph without binding it; `*` in `to` leaves the
//     cell untouched. `*` in a goal grid means "anything".

export const EMPTY = '·';
export const ANY = '*';

const isVar = (g) => g.length === 1 && g >= 'a' && g <= 'z';

export function parseGrid(rows) {
  return rows.map((row) => Array.from(row));
}

export function gridKey(grid) {
  return grid.map((row) => row.join('')).join('/');
}

export function sameShape(a, b) {
  return a.length === b.length && a.every((row, i) => row.length === b[i].length);
}

export function compileRule(rule) {
  const from = parseGrid(rule.from);
  const to = parseGrid(rule.to);
  if (!sameShape(from, to)) throw new Error(`rule ${rule.id}: from/to shapes differ`);
  const bound = new Set(from.flat().filter(isVar));
  for (const g of to.flat()) {
    if (isVar(g) && !bound.has(g)) throw new Error(`rule ${rule.id}: variable ${g} is unbound`);
  }
  return { ...rule, from, to, h: from.length, w: from[0].length };
}

// Returns the variable bindings if `rule` matches with its top-left at (r, c), else null.
export function match(grid, rule, r, c) {
  if (r < 0 || c < 0 || r + rule.h > grid.length) return null;
  const vars = {};
  for (let i = 0; i < rule.h; i++) {
    const row = grid[r + i];
    if (c + rule.w > row.length) return null;
    for (let j = 0; j < rule.w; j++) {
      const want = rule.from[i][j];
      const got = row[c + j];
      if (want === ANY) continue;
      if (isVar(want)) {
        if (want in vars) {
          if (vars[want] !== got) return null;
        } else {
          vars[want] = got;
        }
      } else if (want !== got) {
        return null;
      }
    }
  }
  return vars;
}

// Returns a new grid with the rule applied at (r, c), or null if it does not match.
export function apply(grid, rule, r, c) {
  const vars = match(grid, rule, r, c);
  if (!vars) return null;
  const next = grid.map((row) => row.slice());
  for (let i = 0; i < rule.h; i++) {
    for (let j = 0; j < rule.w; j++) {
      const out = rule.to[i][j];
      if (out === ANY) continue;
      next[r + i][c + j] = isVar(out) ? vars[out] : out;
    }
  }
  return next;
}

// Every (rule, r, c) that matches and actually changes the grid.
export function legalMoves(grid, rules) {
  const moves = [];
  const before = gridKey(grid);
  for (const rule of rules) {
    for (let r = 0; r + rule.h <= grid.length; r++) {
      for (let c = 0; c + rule.w <= grid[r].length; c++) {
        const next = apply(grid, rule, r, c);
        if (next && gridKey(next) !== before) moves.push({ rule: rule.id, r, c, next });
      }
    }
  }
  return moves;
}

export function isSolved(grid, goal) {
  if (!sameShape(grid, goal)) return false;
  return goal.every((row, i) => row.every((g, j) => g === ANY || g === grid[i][j]));
}

export function compileLevel(level) {
  const start = parseGrid(level.start);
  const goal = parseGrid(level.goal);
  if (!sameShape(start, goal)) throw new Error(`level ${level.id}: start/goal shapes differ`);
  return { ...level, start, goal, rules: level.rules.map(compileRule) };
}

// Breadth-first search for a shortest solution. Returns { moves, explored } or
// { moves: null, explored } if unsolvable within `limit` states.
export function solve(level, limit = 2_000_000) {
  const lv = level.start && typeof level.start[0] === 'string' ? compileLevel(level) : level;
  const startKey = gridKey(lv.start);
  const prev = new Map([[startKey, null]]);
  let frontier = [lv.start];
  while (frontier.length) {
    const nextFrontier = [];
    for (const grid of frontier) {
      const key = gridKey(grid);
      if (isSolved(grid, lv.goal)) {
        const path = [];
        for (let k = key; prev.get(k); k = prev.get(k).from) path.unshift(prev.get(k).move);
        return { moves: path, explored: prev.size };
      }
      for (const m of legalMoves(grid, lv.rules)) {
        const nk = gridKey(m.next);
        if (prev.has(nk)) continue;
        prev.set(nk, { from: key, move: `${m.rule}@${m.r},${m.c}` });
        if (prev.size > limit) return { moves: null, explored: prev.size, truncated: true };
        nextFrontier.push(m.next);
      }
    }
    frontier = nextFrontier;
  }
  return { moves: null, explored: prev.size };
}
