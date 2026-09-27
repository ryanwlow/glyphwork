// Proves every level is solvable and that its stated par is the true optimum.
import { compileLevel, solve } from '../src/engine.js';
import { chapters, levels } from '../src/levels.js';

let failed = 0;
const ids = new Set();
for (const level of levels) {
  const problems = [];
  if (ids.has(level.id)) problems.push('duplicate id');
  ids.add(level.id);
  if (!chapters.some((c) => c.id === level.chapter)) problems.push(`unknown chapter ${level.chapter}`);
  let result;
  try {
    compileLevel(level);
    result = solve(level);
  } catch (e) {
    problems.push(e.message);
  }
  if (result && !result.moves) problems.push(`unsolvable (${result.explored} states explored)`);
  if (result?.moves && result.moves.length !== level.par) problems.push(`par is ${level.par} but the optimum is ${result.moves.length}`);
  const shown = result?.moves ? `${result.moves.length} moves, ${result.explored} states` : '';
  console.log(`${problems.length ? 'FAIL' : 'ok  '} ${level.id.padEnd(12)} ${shown}${problems.length ? '  ' + problems.join('; ') : ''}`);
  if (problems.length) failed++;
}
if (failed) {
  console.error(`\n${failed} level(s) failed`);
  process.exit(1);
}
console.log(`\nall ${levels.length} levels verified`);
