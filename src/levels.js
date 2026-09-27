// Level data. Every `par` here is the true shortest solution, checked by
// `npm test` (tools/verify.mjs) with a breadth-first solver.
//
// Rule patterns use `/` between rows: 'ab/cd' is a 2×2 pattern.

const rule = (id, from, to, extra = {}) => ({ id, from: from.split('/'), to: to.split('/'), ...extra });
const sealed = (id, from, to) => rule(id, from, to, { sealed: true });

export const chapters = [
  { id: 'lines', title: 'Lines', blurb: 'One row. Learn to read a rule and where it fits.' },
  { id: 'planes', title: 'Planes', blurb: 'Rules with height. Some moves cannot be taken back.' },
  { id: 'seals', title: 'Seals', blurb: 'You can see what a sealed rule looks for, not what it writes. Use it once to open it.' },
  { id: 'coda', title: 'Coda', blurb: 'One rule, nine glyphs.' },
];

export const levels = [
  {
    id: 'drift', chapter: 'lines', title: 'Drift', par: 3,
    note: 'A rule rewrites a pattern into another pattern of the same size. Apply one by naming it and the row,column of its top-left cell: A@0,0.',
    start: ['●···'], goal: ['···●'],
    rules: [rule('A', '●·', '·●')],
  },
  {
    id: 'passing', chapter: 'lines', title: 'Passing', par: 5,
    note: 'Each rule only matches exactly what it shows. Neither glyph can pass the other except where C allows it.',
    start: ['●··○'], goal: ['○··●'],
    rules: [rule('A', '●·', '·●'), rule('B', '·○', '○·'), rule('C', '●○', '○●')],
  },
  {
    id: 'bloom', chapter: 'lines', title: 'Bloom', par: 6,
    note: 'Rules can create and destroy. Grow first, then carve.',
    start: ['··●··'], goal: ['●·●·●'],
    rules: [rule('A', '●·', '●●'), rule('B', '·●', '●●'), rule('C', '●●●', '●·●')],
  },
  {
    id: 'order', chapter: 'lines', title: 'Order', par: 8,
    note: 'Three kinds of glyph, three ways to trade places. Count what is out of order.',
    start: ['■▲●■●▲'], goal: ['●●▲▲■■'],
    rules: [rule('A', '▲●', '●▲'), rule('B', '■●', '●■'), rule('C', '■▲', '▲■')],
  },
  {
    id: 'carrier', chapter: 'lines', title: 'Carrier', par: 10,
    note: 'Lowercase letters are variables: x matches any glyph and writes back the same glyph. Here anything can step into an empty cell, and ● can slip leftward past anything.',
    start: ['▲■○●··'], goal: ['·●·▲■○'],
    rules: [rule('A', 'x·', '·x'), rule('B', 'x●', '●x')],
  },
  {
    id: 'reader', chapter: 'lines', title: 'The Reader', par: 6,
    note: 'The reader ◇ only moves forward. It can swap its two neighbours, but whatever it leaves behind stays behind.',
    start: ['▲◇●■◆'], goal: ['●■◆▲◇'],
    rules: [rule('A', 'x◇y', 'y◇x'), rule('B', '◇x', 'x◇')],
  },
  {
    id: 'alchemy', chapter: 'lines', title: 'Alchemy', par: 9,
    note: 'Two make one, and nothing unmakes. Some paths end where no rule can reach the goal. Undo is free.',
    start: ['●●●●●·'], goal: ['·····★'],
    rules: [rule('A', '●●', '○·'), rule('B', '○○', '◆·'), rule('C', 'x·', '·x'), rule('D', '◆●', '★·')],
  },
  {
    id: 'rain', chapter: 'planes', title: 'Rain', par: 6,
    note: 'Patterns can be tall: ●/· is ● above an empty cell. What falls stays fallen. ■ is a glyph like any other, and nothing here moves it.',
    start: ['●··●', '·■··', '··■·', '····'], goal: ['····', '·■··', '●·■·', '··●·'],
    rules: [rule('A', '●/·', '·/●'), rule('B', '●·', '·●'), rule('C', '·●', '●·')],
  },
  {
    id: 'turn', chapter: 'planes', title: 'Turn', par: 9,
    note: 'A turns any 2×2 block a quarter clockwise: ab/cd becomes ca/db. Swap the two rows.',
    start: ['□○◆', '■●▲'], goal: ['■●▲', '□○◆'],
    rules: [rule('A', 'ab/cd', 'ca/db')],
  },
  {
    id: 'garden', chapter: 'planes', title: 'Garden', par: 15,
    note: 'Bloom, in two directions. Many orders work; the short ones waste nothing.',
    start: ['·····', '··●··', '·····'], goal: ['●·●·●', '·····', '●·●·●'],
    rules: [
      rule('A', '●·', '●●'), rule('B', '·●', '●●'), rule('C', '●/·', '●/●'),
      rule('D', '·/●', '●/●'), rule('E', '●●●', '●·●'), rule('F', '●/●/●', '●/·/●'),
    ],
  },
  {
    id: 'four-seals', chapter: 'seals', title: 'Four Seals', par: 6,
    note: 'Most orders of these four rules lead nowhere. Find out what each one writes before you trust it.',
    start: ['●○●○●○'], goal: ['○○○·○·'],
    rules: [sealed('A', '●○', '○●'), sealed('B', '○●', '●●'), sealed('C', '●●', '○·'), sealed('D', '·x', 'x·')],
  },
  {
    id: 'forge', chapter: 'seals', title: 'The Forge', par: 9,
    note: 'Six become one. The seals hide the recipe.',
    start: ['●●●·', '●●●·'], goal: ['····', '···★'],
    rules: [
      sealed('A', '●●', '○·'), sealed('B', '○/○', '·/◆'), rule('C', 'x·', '·x'),
      sealed('D', '◆○', '·★'), rule('E', 'x/·', '·/x'),
    ],
  },
  {
    id: 'half-turn', chapter: 'coda', title: 'Half Turn', par: 12,
    note: 'Turn the whole picture upside down, one quarter-turn of a 2×2 block at a time.',
    start: ['▲●■', '◆○□', '★☆▼'], goal: ['▼☆★', '□○◆', '■●▲'],
    rules: [rule('A', 'ab/cd', 'ca/db')],
  },
];
