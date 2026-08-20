# FILES — Am+zed Kingdoms

Everything below goes in **one folder, flat** — beside `index.html`, not in a
subfolder. That is also what GitHub Pages needs.

A missing `.js` file does not break the page: it 404s quietly and that lock
falls back to a placeholder that opens on any keypress. If the game looks like
it has reverted, a file is missing — and the game names it in a red box, bottom
left, and in the browser console.

## The game

| file | what breaks without it |
| --- | --- |
| `index.html` | — the game itself |
| `math-challenge.js` | number doors become placeholders |
| `word-challenge.js` | word doors become placeholders |
| `word-sentences.js` | the Wordsmith gate cannot run |
| `word-gate.js` | Wordsmith gates become placeholders |
| `number-gate.js` | Numbersmith gates become placeholders |
| `profile.js` | players stop being separate |
| `unlocks.js` | the workshop can never be earned |
| `sound.js` | the game is silent |
| `title.js` | no title scroll |
| `world.js` | no sky, hills, castles or bridge |
| `castle.js` | no castles, keys or bridge stones |
| `intro.js` | the story never plays |

## The tools

| file | |
| --- | --- |
| `sound-test.html` | choose each sound — opens inside the game |
| `sequencer.html` | write tunes — opens inside the game |
| `maze-editor.html` | draw mazes by hand |
| `numbers.html` | the number drill on its own |
| `words.html` | the word drill on its own |
| `speech-test.html` | diagnose a device with no voice |
| `check-sentences.js` | run with node after editing carriers |

## Publishing to GitHub Pages

1. New repo. Everything at the **root**, flat.
2. Push.
3. **Settings → Pages → Deploy from a branch → `main` → `/ (root)`.**
4. Visit `https://USERNAME.github.io/REPO/` — `index.html` is the game, so the
   bare link lands on it.

No build step. Pages is case-sensitive where Windows is not, so filenames must
match exactly; they currently do.

## What `index.html` asks for

```
  profile.js
  unlocks.js
  math-challenge.js
  word-challenge.js
  word-sentences.js
  word-gate.js
  number-gate.js
  title.js
  world.js
  castle.js
  sound.js
  intro.js
```
