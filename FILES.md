# FILES — Am+zed Kingdoms

Everything below goes in **one folder**, beside `maze.html`. A missing `.js`
file does not break the page: it 404s quietly and that lock falls back to a
placeholder that opens on any keypress. If the game looks like it has reverted,
a file is missing — and the game now says which one in a red box, bottom left.

## The game needs all of these

| file | what breaks without it |
| --- | --- |
| `maze.html` | — the game itself |
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

## The tools, opened from inside the game

| file | |
| --- | --- |
| `sound-test.html` | choose each sound |
| `sequencer.html` | write tunes |
| `maze-editor.html` | draw mazes by hand |
| `index.html` | the number drill on its own |
| `words.html` | the word drill on its own |
| `speech-test.html` | diagnose a device with no voice |
| `check-sentences.js` | run with node after editing carriers |

## What `maze.html` actually asks for

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

If a name above is not in your folder, that is the fault.
