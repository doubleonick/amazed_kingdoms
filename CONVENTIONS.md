# House style

Conventions arrived at by building one game. Most were learned by getting it
wrong first; the reasoning is kept here so the next project does not have to
re-learn it.

---

## Build it in pieces that can be missing

Every module registers itself and degrades to nothing.

```js
if (root.Challenges) root.Challenges.register("sum", factory, meta);
```

The host page works with none of them. That is what let the maze be walked and
playtested for weeks before a single real question existed.

**But say when something is missing.** A silent fallback is right for a
half-built game and wrong for a finished one — a missing file then looks
exactly like the game has reverted, and that cost real debugging time twice.
Name the missing files on screen and in the console.

```js
var missing = Challenges.missing().map(fileFor);
if (missing.length) showWarning(missing);
```

---

## Art is data, not files

Sprites are arrays of strings with a palette. Fonts too, and maps.

- diffs, so a change to a sprite is readable in a commit
- scales to whole multiples, no blur, no asset pipeline
- one shape recoloured per faction, per state, per theme
- nothing to 404, nothing to load before drawing
- editable in a text editor by a person who can see what they are doing

The one real cost is that a photograph cannot go in. That has never mattered.

**Derive the outline rather than drawing it** — then the shape can change and
the edge follows. `Sprite.outline()`.

**Symmetry reads as a tile.** A rock, a hill, a cloud wants one side different
from the other or it looks like a repeated texture.

---

## Two vocabularies will meet, so make lookups fail loudly

The fiction called them *word* and *number*; the challenge registry called them
*language* and *math*. Both correct in their own place. A lookup with a friendly
default —

```js
var glyph = DEVICE[kind] || DEVICE.word;      // silently wrong
```

— turned every key in the game into the wrong symbol for weeks, because a wrong
answer looked plausible. Prefer:

```js
var glyph = DEVICE[kind] || DEVICE[ALIAS[kind]] || null;   // visibly wrong
```

---

## Storage: split what is about the room from what is about the person

| device | volume, mute, which voice, brightness |
| player | progress, unlocks, chosen sounds, written tunes |

Siblings share tablets and classes share machines. Nobody should pick a voice
twice on the same device, and no sibling's settings should arrive uninvited.

**The first player carries no prefix**, so a save made before profiles existed
simply becomes Player 1. Nothing is migrated, so nothing can be lost migrating
it.

---

## Never let a flag answer two questions

`roomy()` meant "is there room beside the game for scenery". Then it also had to
mean "is there room below for a bridge". One short window later, the entire HUD
came back on screen.

Worse: a panel gated on the height of the column it sits in **is circular** —
showing the panel makes the column taller, which keeps it showing forever.

Split the questions. Let each answer only what it is about.

---

## A frame loop must survive a bad frame

`requestAnimationFrame` stops permanently the moment one frame throws, and
everything in that loop stops with it — movement included. A missing scenery
function once froze the player character with no error visible.

```js
function frame(now) {
  try { step(dt); }  catch (e) { reportOnce("movement", e); }
  try { draw(); }    catch (e) { reportOnce("drawing", e); }
  requestAnimationFrame(frame);
}
```

Clamp `dt` too, or a backgrounded tab teleports everything on return.

---

## Never offer a second right answer

A distractor that also fits is not a distractor. *"We ▢ eggs"* takes **had** or
**has**; *"I have ▢ pencils"* takes any number. Telling a child they are wrong
when they are right is the worst thing an educational game can do.

Group interchangeable items structurally and forbid the pairing — do not rely on
whoever writes the content remembering. Then **write a checker** that rebuilds
every possible item and reports clashes.

---

## Test by rendering, not by reasoning

Three bugs in one project survived a syntax check, a unit test and my own
reading, and died the moment something was actually drawn:

- a title that read as a starburst rather than a plus
- a panel that could never hide itself
- a deleted function that froze the game

Render it to a PNG and look. And when the layout is what is in question, **a
screenshot from the real browser beats any composite** — a preview assembled
from drawing calls cannot show an HTML panel that should not be there.

---

## Reward with authorship, not decoration

The tools that shaped the game are the best thing to hand over at the end. Do
not advertise them beforehand: a sequencer shown at the start is a distraction,
and the same sequencer handed to someone who has just finished is a gift.

Grant once, keep forever, and always leave an obvious way back to the defaults.

---

## Make the background do the work

A full-viewport canvas behind the app can carry the readouts, the progress and
the celebration. Then the panels are only the things you touch, and the game
stops looking like a form.

Keep the reading order deliberate, top to bottom, and **fit the window** — a page
that scrolls hides the thing it is showing.
