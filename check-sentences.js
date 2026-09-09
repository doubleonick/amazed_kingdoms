/* Run this after adding or editing carrier sentences. It reports any item
   the gate could build with two right answers in it.

       node check-sentences.js

   Telling a child they are wrong when they are right is the worst thing an
   educational game can do, so this rebuilds every item the gate can produce
   and looks for the ways that happens. It exits non-zero when it finds one,
   so it can stand in front of a release.

   No dependencies, deliberately. It loads the game's own files into a bare
   sandbox with node's vm module: the four modules here touch the DOM only
   inside functions the checker never calls, so a DOM was never needed. A
   checker that cannot run because an install is missing does not get run. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* The game is a flat folder and this script sits in it. Resolving from
   __dirname rather than the working directory means it runs the same from
   anywhere, and cannot end up checking some other copy of the game. */
const DIR = __dirname;
const FILES = ['profile.js', 'word-sentences.js', 'word-challenge.js', 'word-gate.js'];

function makeSandbox() {
  /* profile.js reads storage as it loads, and enumerates it by index. */
  const store = Object.create(null);
  const localStorage = {
    getItem(k) { return k in store ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
    key(i) { const ks = Object.keys(store); return i < ks.length ? ks[i] : null; },
    clear() { for (const k of Object.keys(store)) delete store[k]; },
    get length() { return Object.keys(store).length; }
  };

  /* The word drills speak. Nothing here listens, but they may ask at load. */
  const speechSynthesis = {
    getVoices: () => [],
    cancel() {},
    speak(u) { if (u && u.onend) u.onend(); },
    addEventListener() {},
    removeEventListener() {}
  };

  /* No DOM, on purpose — but say so in as many words if anything reaches
     for one, rather than failing as `undefined is not an object` twelve
     frames down. If this ever fires, the module started building UI at load
     time and that is the thing worth knowing. */
  const document = new Proxy({}, {
    get(_, prop) {
      throw new Error(
        'check-sentences.js: something touched document.' + String(prop) +
        ' while loading. This harness has no DOM because the gate logic ' +
        'never needed one. If a module now builds UI at load time, either ' +
        'move that into its factory or give this sandbox a real DOM.');
    }
  });

  const sandbox = {
    localStorage, speechSynthesis, document,
    SpeechSynthesisUtterance: function (t) { this.text = t; },
    setTimeout, clearTimeout, setInterval, clearInterval, console,
    performance: { now: () => Date.now() },
    location: { href: 'https://x.test/', protocol: 'https:' },
    navigator: { language: 'en-US', userAgent: 'check-sentences' }
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  return vm.createContext(sandbox);
}

const ctx = makeSandbox();
for (const f of FILES) {
  const p = path.join(DIR, f);
  if (!fs.existsSync(p)) {
    console.error('check-sentences.js: cannot find ' + f + ' beside this script (' + DIR + ').');
    process.exit(2);
  }
  vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f });
}

const WS = ctx.window.WordSentences, WG = ctx.window.WordGateState;
if (!WS || !WG) {
  console.error('check-sentences.js: loaded the files but WordSentences or ' +
                'WordGateState never appeared. Did a module stop registering itself?');
  process.exit(2);
}

let sets = 0, clashes = [], noCarrier = [], multiBlank = [], selfReveal = [];
for (const word of WS.words()) {
  for (const s of WS.map[word]) {
    const n = (s.match(new RegExp(WS.BLANK, 'g')) || []).length;
    if (n !== 1) multiBlank.push(word + ': ' + s);
    if (new RegExp('\\b' + word + '\\b', 'i').test(s.replace(WS.BLANK, ''))) selfReveal.push(word + ': ' + s);
  }
  for (const n of [3, 4, 5]) {
    for (let k = 0; k < 30; k++) {
      const set = WG.buildOptions(word, n); sets++;
      for (const o of set) {
        if (o.type === 'target') continue;
        if (WS.interchangeable(word, o.w)) clashes.push(word + ' / ' + o.w);
      }
    }
  }
}
console.log("CARRIER SENTENCE CHECK");
console.log("  words with carriers   :", WS.words().length);
console.log("  option sets built     :", sets);
console.log("  TWO RIGHT ANSWERS     :", clashes.length ? [...new Set(clashes)] : "none");
console.log("  wrong number of blanks:", multiBlank.length ? multiBlank : "none");
console.log("  answer shown in its own sentence:", selfReveal.length ? selfReveal : "none");
console.log();
console.log("  a word's forbidden partners, e.g. 'had':");
console.log("   ", JSON.stringify(WS.rivals('had')));

/* Reporting a clash and exiting 0 makes it something a person has to notice.
   These three faults all put a wrong "wrong" in front of a child, so they
   stop a release instead. */
const failures = clashes.length + multiBlank.length + selfReveal.length;
if (failures) {
  console.log();
  console.log("FAILED:", failures, "problem(s) above. Fix the carriers before shipping.");
  process.exit(1);
}
