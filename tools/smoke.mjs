// Plays every level through the text interface using the solver's moves,
// so the command parser, the session and the level data agree end to end.
import { solve } from '../src/engine.js';
import { chapters, levels } from '../src/levels.js';
import { Session } from '../src/session.js';

const session = new Session({ levels, chapters });
const expect = (cond, msg) => {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
};

levels.forEach((level, i) => {
  session.exec(`level ${i + 1}`);
  const { moves } = solve(level, 5_000_000);
  const out = session.exec(moves.join('; '));
  expect(session.solved, `${level.id}: not solved after ${moves.join(' ')}\n${out}`);
  expect(out.includes('at par'), `${level.id}: expected "at par"\n${out}`);
});

session.exec('level 1');
expect(session.exec('A@0,1').includes('cell 0,1 is ·'), 'mismatch explanation');
expect(session.exec('A 0 0').includes('✓'), 'space syntax');
expect(session.exec('undo').includes('Undid 1 move'), 'undo');
expect(session.exec('Z@0,0').startsWith('No rule Z'), 'unknown rule');
expect(session.exec('A@0,3').includes('hang off'), 'off-grid');
const fresh = new Session({ levels, chapters });
fresh.exec('level four-seals');
expect(fresh.look().includes('●○ → ??   (sealed)'), 'seals hidden');
expect(fresh.exec('A@0,0').includes('Seal broken: A is ●○ → ○●'), 'seal breaks');
expect(session.exec('levels').includes('★'), 'levels list');
session.exec('level 1');
expect(session.exec('share').startsWith('Your best on Drift: 3 moves, at par'), 'share after solving');
expect(session.exec('replay drift:A@0,0+A@0,1+A@0,2').includes('Solves Drift in 3 moves, at par'), 'replay a code');
expect(session.exec('replay drift:A@0,0 A@0,1 A@0,2 A@0,2').includes('already solved'), 'replay past the solve');
expect(session.exec('replay drift:A@0,1').includes('stops at move 1'), 'replay a bad move');
const blind = new Session({ levels, chapters });
expect(blind.exec('share').startsWith('Solve Drift first'), 'share before solving');
blind.exec('replay four-seals:A@0,0');
expect(blind.look().includes('●○ → ??   (sealed)') && blind.index === 10, 'replay breaks no seals and lands on the level');
levels.forEach((level) => {
  const { moves } = solve(level, 5_000_000);
  expect(blind.exec(`replay ${level.id}:${moves.join('+')}`).includes('at par'), `${level.id}: replay of the solver's line`);
});
expect(Object.keys(blind.progress).length === 0, 'replay records no progress');
console.log('smoke test passed');
