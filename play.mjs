#!/usr/bin/env node
// Glyphwork from the command line, for agents without a browser.
//
//   node play.mjs                   show the current level
//   node play.mjs "A@0,0; A@0,1"    run commands, print the reply
//   node play.mjs --new             forget saved progress and start over
//   echo "look; A@0,0" | node play.mjs
//   node play.mjs -i                interactive prompt
//
// Every call picks up where the last one left off: the level, the moves in
// progress, best scores and broken seals are saved to .glyphwork.json in the
// current directory (or $GLYPHWORK_SAVE). The replies are exactly what the
// page's console prints; both run the same Session.

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { chapters, levels } from './src/levels.js';
import { Session } from './src/session.js';

const savePath = process.env.GLYPHWORK_SAVE || '.glyphwork.json';

function readSave() {
  try {
    return JSON.parse(readFileSync(savePath, 'utf8'));
  } catch {
    return {};
  }
}

// Session keeps best scores and seals through a localStorage-shaped store.
const save = readSave();
const store = {
  getItem: (key) => save.store?.[key] ?? null,
  setItem: (key, value) => {
    save.store = { ...save.store, [key]: value };
  },
};

function open() {
  const session = new Session({ levels, chapters, store });
  const at = levels.findIndex((l) => l.id === save.level);
  if (at >= 0) {
    session.load(at);
    // Replay the saved line of play so undo keeps working across calls.
    for (const move of save.moves || []) session.exec(move);
  }
  return session;
}

function persist(session) {
  save.level = session.level.id;
  save.moves = session.history.map((h) => h.move);
  writeFileSync(savePath, JSON.stringify(save, null, 2) + '\n');
}

function run(session, input) {
  const out = session.exec(input);
  persist(session);
  return out;
}

const args = process.argv.slice(2);

if (args[0] === '--help' || args[0] === '-h') {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 14).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
} else if (args[0] === '--new') {
  if (existsSync(savePath)) rmSync(savePath);
  for (const key of Object.keys(save)) delete save[key];
  console.log(run(open(), 'look'));
} else if (args[0] === '-i' || (!args.length && process.stdin.isTTY)) {
  const session = open();
  console.log(run(session, 'look'));
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: '› ' });
  rl.prompt();
  rl.on('line', (line) => {
    if (/^(quit|exit)$/i.test(line.trim())) return rl.close();
    if (line.trim()) console.log(run(session, line));
    rl.prompt();
  });
} else if (args.length) {
  console.log(run(open(), args.join(' ')));
} else {
  const chunks = [];
  process.stdin.on('data', (c) => chunks.push(c));
  process.stdin.on('end', () => console.log(run(open(), Buffer.concat(chunks).toString('utf8') || 'look')));
}
