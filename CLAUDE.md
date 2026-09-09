# Am+zed Kingdoms

A static browser game teaching arithmetic and sight-reading to children roughly
5–8. Two kingdoms separated by a maze; answer the locks, win seven stones, build
the bridge. No build step, no dependencies, no server — plain files served by
GitHub Pages.

Read `kit/CONVENTIONS.md` before changing anything structural. It is short, and
almost every entry is a bug that already happened once.

---

## Layout

Everything is flat at the repo root, because Pages serves it that way and the
game loads its scripts by bare name.

| | |
| --- | --- |
| `index.html` | **the game.** Not `maze.html` — that name is gone |
| `numbers.html`, `words.html` | the two drills, standalone |
| `math-challenge.js`, `word-challenge.js` | the door challenges |
| `word-gate.js`, `number-gate.js`, `word-sentences.js` | the gate challenges |
| `profile.js`, `unlocks.js`, `sound.js` | players, earned features, audio |
| `title.js`, `world.js`, `castle.js`, `intro.js` | art and the story |
| `sound-test.html`, `sequencer.html`, `maze-editor.html` | authoring tools |
| `sw.js`, `manifest.webmanifest`, `icon-*.png` | installable, offline |
| `kit/` | the reusable engine, extracted for the next project |
| `tools/` | scripts that regenerate things |

`FILES.md` says what breaks without each file.

---

## Rules that are load-bearing

**Every module is optional and registers itself.** A missing `.js` file must
leave the game playable with a placeholder — *and* must be named in the red
warning box, which `index.html` builds from `Challenges.missing()`. Silent
fallback cost two long debugging sessions.

**Art is data.** Sprites are arrays of strings plus a palette. No image files
except the app icons, and those are generated from `castle.js` by
`tools/make-icons.py` so they cannot drift.

**Storage splits two ways.** Device keys are about the room (volume, mute,
voice). Player keys are about the person (progress, unlocks, chosen sounds) and
get namespaced by `profile.js`. Adding a new saved thing means deciding which it
is.

**The host counts progress; the challenge owns difficulty.** See
`CHALLENGE-API.md`. Do not let the maze learn what makes a question hard.

**Never let one flag answer two questions.** `World.roomy()` is about width;
`World.bridgeFits()` is about height. Merging them put a whole panel back on
screen. And a panel must never be gated on the height of the column it sits in —
that is circular and it can never recover.

---

## Testing

**Render it and look.** Three bugs here passed a syntax check, a unit test and a
careful read, and died the moment something was actually drawn: a title that
read as a starburst, a panel that could not hide itself, and a deleted function
that froze the player.

- `node --check` every file after editing. The inline scripts in `index.html`
  need extracting first — there are three of them.
- `node check-sentences.js` after touching carrier sentences. It rebuilds every
  possible gate item and reports any with two right answers.
- For layout questions, **ask for a screenshot from the real browser.** A
  preview composed from drawing calls cannot show an HTML panel that should not
  be there, and once misled us both for two rounds.

There is no test runner. Ad-hoc `jsdom` harnesses have worked well; write one,
use it, delete it.

---

## Publishing

Push to `main`; Pages serves the root.

**Bump `VERSION` at the top of `sw.js` on every release.** Otherwise installed
tablets keep the old build forever, silently. This is the single easiest thing
to forget.

Pages is case-sensitive and Windows is not, so filename case must match exactly.

---

## In flight

**Multiplication**, gated on a second win plus evidence of place value — not
just persistence, so a stubborn child does not get times tables while still on
single digits.

Montessori research already done, and it contradicted the obvious plan: tables
are worked in **numeric order**, not easy-first, and Montessori's own
static/dynamic split maps exactly onto the existing regroup axis. So the ladder
is two-phase — tables 1–10 single-digit, then multi-digit static before dynamic
— rather than a new set of axes. The commutative property is taught explicitly,
which halves the fact space honestly.

**An operation-choice setting** under TOOLS, ungated: a teacher needs it on day
one, not after two playthroughs. Hand it to the adult, not the child — turning
off the hard operation is exactly what a struggling learner will do.
