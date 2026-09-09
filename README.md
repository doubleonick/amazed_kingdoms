# Kit

The reusable half of Am+zed Kingdoms, with the game taken out. Six modules and
two authoring tools, none of which know anything about mazes, sums or words.

Open `example.html` to see the whole thing working: a player picker, an unlock,
synthesised sound, a grid sprite and a real challenge, in about sixty lines of
game code.

---

## The modules

| file | what it gives you |
| --- | --- |
| `store.js` | localStorage that cannot throw. Falls back to memory. |
| `players.js` | more than one person on one browser, with export/import |
| `unlocks.js` | features earned by finishing, granted once |
| `challenges.js` | the registry and contract that lets a game be built in pieces |
| `sprite.js` | pixel art as text, with a derived outline and a checker |
| `audio.js` | synthesised sound, no files, plus a tune player |

| tool | |
| --- | --- |
| `sound-test.html` | audition every candidate sound and choose |
| `sequencer.html` | write tunes on a step grid, scale-locked |

Load in that order. Every one is optional except `store.js`, which the rest use.

---

## Starting a game

**1. Declare which storage keys belong to the player.** Everything else stays
with the device, shared by whoever is sitting there.

```js
Players.define(["game.progress", Unlocks.baseKey, "audio.player"]);
```

**2. Hand the audio engine your sounds.** Two or three candidates per event, so
they can be auditioned in `sound-test.html` rather than guessed.

```js
Audio.define({
  right: { ding()  { Audio.seq([[660,.07],[880,.12]], {type:"square", vol:.2}); },
           chirp() { Audio.voice({type:"triangle", f0:520, f1:900, dur:.14, vol:.2}); } },
  wrong: { thud()  { Audio.noise({f0:260, f1:90, dur:.14, vol:.2}); } }
}, { right:"ding", wrong:"thud" });
```

**3. Register a stub for every challenge kind**, then let the real ones replace
themselves as they are written.

```js
Challenges.register("sum", Challenges.stub("SUM"), { placeholder:true });
```

The game is now playable before a single real question exists. **Warn about what
is still a stub** — `Challenges.missing()` — or a finished game with a missing
file looks like it has reverted.

**4. Draw with data.**

```js
var KEEP = ["..###..", ".#####.", "#######"];
Sprite.draw(g, KEEP, { "#":"#24408C" }, x, y, 3);
```

**5. Grant something at the end.**

```js
if (Unlocks.grant("workshop")) offerTheGift();   // true only the first time
```

---

## The contract, in one paragraph

```js
factory(mount, session, report) -> { focus, abandon, destroy }
```

The **host** counts progress; the **challenge** owns difficulty. `detail` is
opaque — log it, never branch on it. Abandoning discards progress, so exploring
is free. Re-entry is not a first attempt, so flag it or reopening a lock looks
like lightning recall.

---

## Read this before the second project

`CONVENTIONS.md` is the part worth keeping. Most of it was learned by getting it
wrong once: flags that answered two questions, lookups that failed silently into
a plausible wrong answer, a frame loop that died and took the player's legs with
it, and three bugs that survived every check until something was rendered and
looked at.
