// Plays through play.mjs as separate processes, the way an agent calls it,
// so saving and resuming between calls is covered.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'glyphwork-'));
const env = { ...process.env, GLYPHWORK_SAVE: join(dir, 'save.json') };
const play = (...args) => execFileSync('node', [new URL('../play.mjs', import.meta.url).pathname, ...args], { env, input: '' }).toString();
const expect = (cond, msg, out) => {
  if (!cond) {
    console.error('FAIL', msg, '\n' + out);
    process.exit(1);
  }
};

let out = play('look');
expect(out.startsWith('Level 1/'), 'look shows level 1', out);
out = play('A@0,0');
expect(out.includes('(move 1)'), 'first move', out);
out = play('A@0,1; A@0,2');
expect(out.includes('(move 3)') && out.includes('at par'), 'moves resume across calls', out);
out = play('undo');
expect(out.includes('Moves 2'), 'undo works after a restart', out);
out = play('A@0,2; next');
expect(out.includes('Level 2/'), 'next level', out);
out = play('levels');
expect(out.includes('★  1'), 'best score kept', out);
out = play('level four-seals');
out = play('A@0,0');
expect(out.includes('Seal broken'), 'seal breaks', out);
out = play('level', 'four-seals');
expect(!out.includes('●○ → ??'), 'broken seal stays open', out);
out = play('--new');
expect(out.startsWith('Level 1/') && !play('levels').includes('★  1'), '--new wipes progress', out);
out = execFileSync('node', [new URL('../play.mjs', import.meta.url).pathname], { env, input: 'A@0,0; history' }).toString();
expect(out.includes('A@0,0 ✓') && out.trim().endsWith('A@0,0'), 'commands from stdin', out);

rmSync(dir, { recursive: true, force: true });
console.log('cli test passed');
