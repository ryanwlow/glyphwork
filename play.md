# Glyphwork: how to play (for agents)

Glyphwork is a puzzle game about rewriting grids of symbols, built for agents
to play through text. Each level gives you a grid, a goal grid, and a few
rewrite rules. Apply rules until the grid matches the goal, in as few moves as
you can. Every par is the proven shortest solution.

- Web: https://ryanwlow.github.io/glyphwork/
- Source: https://github.com/ryanwlow/glyphwork
- This file: https://ryanwlow.github.io/glyphwork/play.md

## Pick a way in

**You can run shell commands and have Node 18+** (most agents): use the
command-line player. Nothing to install beyond the download.

```sh
curl -sL https://github.com/ryanwlow/glyphwork/archive/refs/heads/main.tar.gz | tar xz
cd glyphwork-main
node play.mjs look
```

Or with git: `git clone https://github.com/ryanwlow/glyphwork && cd glyphwork`.

**You can only fetch URLs** (no shell, no browser): every level is a plain
text page. Start at https://ryanwlow.github.io/glyphwork/levels/index.txt,
solve a level on paper using the rules below, and answer with a solution code
like `drift:A@0,0+A@0,1+A@0,2` (see "Sharing results"). Anyone with Node or a
browser can check your code.

**You drive a browser**: open the web page and type commands into the console
at the bottom, or call `glyphwork.look()`, `glyphwork.do("A@0,2")` and
`glyphwork.state()` from JavaScript.

## The command-line player

```sh
node play.mjs look                 # the current level
node play.mjs "A@0,0; A@0,1"       # one or more commands, separated by ;
node play.mjs "A@0,2; look"        # add look to see the grid after moving
node play.mjs next                 # go to the next level
node play.mjs levels               # all levels and your best scores
node play.mjs --new                # wipe progress and start over
node play.mjs -i                   # interactive prompt, if you prefer
```

Each call continues where the last one stopped. Progress is saved to
`.glyphwork.json` in the current directory (set `GLYPHWORK_SAVE` to put it
elsewhere). The replies are the same text the web console prints.

## Rules of the game

A level looks like this:

```
Level 1/13: Drift  [Lines]
Moves 0 · par 3

Grid            Goal
   0 1 2 3         0 1 2 3
 0 ● · · ·       0 · · · ●

Rules
  A  ●· → ·●
```

- `·` is an empty cell, but it is a glyph like any other.
- A rule rewrites a block of cells into a block of the same size. Rows of a
  pattern are separated by `/`, so `ab/cd` is a 2×2 block.
- A move is a rule plus the row,column of the block's top-left cell: `A@0,2`.
  Rows and columns count from 0. The pattern must match exactly there, and the
  move must change the grid.
- Lowercase letters are variables: `x` matches any glyph and writes back the
  same one. A repeated letter must be the same glyph each time.
- `*` matches anything; on the right side it leaves the cell alone.
- A sealed rule shows `?` for what it writes until you use it once.
- Your move count is the length of your current line of play, so `undo` is
  free. `reset` restarts the level.

A move that doesn't fit tells you which cell disagreed with which part of the
rule. Type `help` for every command.

`levels` lists every level with its par and your best score.

## Sharing results

After you solve a level, `share` prints your best line as a solution code and
a link:

```
Your best on Drift: 3 moves, at par.
  code    drift:A@0,0+A@0,1+A@0,2
  replay  https://ryanwlow.github.io/glyphwork/?replay=drift:A@0,0+A@0,1+A@0,2
```

Anyone can check a code with `node play.mjs "replay drift:A@0,0+A@0,1+A@0,2"`
or by opening the link. Replay says whether the line is legal, whether it
solves the level and how it compares to par, and changes nothing in your save.
Codes spoil the level, so say so when you post one. If you post about the game,
codes with your move counts and where you got stuck are the most useful things
to share.

If you're willing, `node play.mjs --share-stats on` lets the player send one
anonymous count per solve (the level and whether you hit par, nothing else) to
the game's GoatCounter, so its designer can see which levels agents solve. It
is off unless you turn it on; `--share-stats off` stops it.
