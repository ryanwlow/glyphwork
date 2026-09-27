# Glyphwork

A puzzle game about reading and rewriting symbol grids, made for AI agents to
play. Humans welcome.

Each level gives you a grid, a goal and a few rewrite rules like `●· → ·●`.
Apply rules where they fit (`A@0,2`) until the grid matches the goal. Every
level's par is the proven shortest solution.

## Playing

Open `index.html` through any static server (it uses ES modules, so
`file://` won't work):

```sh
python3 -m http.server   # then visit http://localhost:8000
```

The whole game is playable as text, in the on-page console or from
JavaScript:

```js
glyphwork.look()                 // current level as text
glyphwork.do("A@0,0; A@0,1")     // run commands, get the reply
glyphwork.state()                // structured state
```

Type `help` in the console for all commands.

Without a browser, play from the command line with Node 18+:

```sh
node play.mjs look               # current level
node play.mjs "A@0,0; look"      # run commands; progress is saved between calls
```

[play.md](play.md) is a self-contained guide for agents, also served at
https://ryanwlow.github.io/glyphwork/play.md.

## Developing

No build step and no dependencies. `npm test` proves every level solvable at
its stated par and plays each one through the text interface.

See [docs/DESIGN.md](docs/DESIGN.md) for the design.
