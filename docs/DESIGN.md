# Glyphwork: design

## The pitch

Glyphwork is a puzzle game about reading and rewriting grids of symbols. Each
level gives you a grid, a goal grid, and a few rewrite rules. A rule says
"this pattern becomes that pattern". You apply rules one at a time, anywhere
they fit, until the grid matches the goal.

It is built for AI agents first. That shapes almost every decision below.

## Why an agent might want to play it

Most games ask for things agents are bad at or indifferent to: reflexes, pixel
hunting, reading a canvas. The part of a puzzle that is actually enjoyable
for a reasoning system is the moment the structure clicks, when you see why a
position is stuck, or that two rules together make a third. Glyphwork tries to
be only that part:

- **The whole state is text.** The grid, the goal and the rules are all
  written out. Nothing is hidden in animation or layout. (Sealed rules hide one
  thing on purpose, and say so.)
- **No time pressure, no randomness.** A level is a fixed, finite problem.
- **Answers are checkable.** Every par is the true optimum, proved by a
  breadth-first solver (`npm test`). "At par" means you found a shortest
  solution, not that you matched a designer's guess.
- **Mistakes explain themselves.** A move that doesn't fit says which cell
  disagreed with which part of the rule. Undo is free.

## Core rules

- A grid is rows of single glyphs. `·` is an empty cell, but it is a glyph
  like any other: rules can require it, create it, or fill it.
- A rule rewrites a rectangle into a rectangle of the same size. Patterns are
  written row by row with `/` between rows: `ab/cd` is a 2×2 block.
- A move is a rule plus the row,column of the pattern's top-left cell:
  `A@1,2`. It must match exactly there and must change the grid.
- Lowercase letters are variables. `x` matches any glyph and writes back the
  same glyph; a repeated letter must match the same glyph each time. `*`
  matches anything and, on the right side, leaves the cell alone.
- A level is solved when the grid equals the goal (`*` in a goal means any
  glyph). Your move count is the number of moves in your current line of play,
  so undoing a mistake costs nothing.

## Interface

One source of truth: a text session (`src/session.js`). Everything else is a
view of it.

- **Console.** Type `help`, `look`, `A@0,2`, `undo`, `level 5`. Several
  commands can go on one line separated by `;`, so an agent can submit a whole
  plan at once.
- **`window.glyphwork`.** `look()`, `do(cmd)`, `state()` for agents driving a
  browser with JavaScript.
- **Clickable board.** For humans: pick a rule, hover to see where it fits
  (green) or doesn't (red), click to apply. Clicks go through the console, so
  the transcript is complete either way.
- `?level=N` or `?level=id` opens a level directly.
- **Solution codes.** `share` prints the best line for a level as
  `drift:A@0,0+A@0,1+A@0,2`, the same string in a post, a command and a URL.
  `replay <code>` (or `?replay=<code>`) checks it on a scratch grid without
  touching progress, so players can report and compare solutions and anyone
  can verify a claimed score.

## Level arc

Thirteen levels in four chapters. Each introduces one idea and then asks you to
use it where it isn't obvious.

| Chapter | Idea | Levels |
|---|---|---|
| Lines | Reading a rule, then creation, variables, and irreversible moves in one row | Drift, Passing, Bloom, Order, Carrier, The Reader, Alchemy |
| Planes | Tall and square patterns; gravity; permutations | Rain, Turn, Garden |
| Seals | Rules whose output is hidden until first use; experiment, then plan | Four Seals, The Forge |
| Coda | One quarter-turn rule on a 3×3 picture; turn it upside down | Half Turn |

Difficulty comes from three sources, used deliberately:

1. **Dead ends.** Alchemy, The Reader, Four Seals and The Forge have many
   positions from which the goal is unreachable. You have to look ahead.
2. **Search depth.** Half Turn has 362,880 reachable positions and a par of
   12. It rewards finding structure (compositions of turns that act like
   swaps) over trial and error.
3. **Hidden information.** Seals make you spend moves to learn, then decide
   whether to undo and replan.

## Design principles for new levels

- Every level must pass `npm test`: solvable, and `par` equal to the solver's
  optimum.
- Prefer few rules and small grids. A level should fit on one screen of text.
- A goal should be describable in a sentence ("swap the rows", "six become
  one"). If it can't be, it's probably arbitrary.
- Each level's note names the new idea, not the solution.

## What's next

Ideas I want to try after the first build:

- **Inference levels**: rules shown only as before/after examples; you must
  work out the rule before you can name it.
- **Goal by property**: "no two ● touch" instead of an exact picture.
- **A level editor** backed by the solver, so every custom level gets an exact
  par.

## Code map

- `src/engine.js`: grids, rule matching, the solver. No DOM.
- `src/levels.js`: level data.
- `src/session.js`: the text game (commands, messages, progress).
- `src/ui.js`, `index.html`, `style.css`: the page.
- `play.mjs`, `play.md`: the command-line player and the agent guide, for
  agents that have a shell but no browser. Saves between calls.
- `tools/verify.mjs`: proves every par. `tools/smoke.mjs`: plays every level
  through the text interface. `tools/cli.mjs`: plays through `play.mjs`
  across separate processes.
