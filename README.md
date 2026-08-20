# AM+ZED KINGDOMS

Adaptive addition and subtraction flash cards. One file, no build step, no dependencies.

## Put it online

1. New GitHub repo, drop `index.html` in the root.
2. **Settings → Pages** → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. Live at `https://<username>.github.io/<repo>/` within a minute or two.

Locally, just open `index.html` in a browser.

## Layout: long form, ones first

Equations are set in **long form** — stacked columns, right-aligned, rule line,
answer boxes underneath — not on a single horizontal line. That's the whole point of
colour-coding places: the ones column is one colour from the top row to the answer box,
so the alignment teaches itself.

```
        6 3 8
  [+] 4 5 1 7
  -----------
    _ _ _ _ _
```

Answers are entered **ones column first** by default, right to left, the direction the
written algorithm actually runs. Untick "Ones first" in the settings to type left to
right instead; both directions read the same boxes, and blank columns are skipped, so
you can leave leading boxes empty.

Addition always shows one spare box, so the number of boxes never gives away whether
the answer spills into the next place.

### The zone panel is hidden

The equation sits directly under the HUD. A zone panel used to occupy that spot,
showing the place chart and a difficulty index like `6 / 14` — the position among the
fourteen (places x regrouping) combinations, ordered by expected solve time. That index
isn't legible to a child, and the panel pushed the equation too far down the screen, so
the whole block is commented out in `index.html`.

None of the zone *logic* changed. The adapter still tracks places and regrouping, moves
between them, and saves the state; `drawMeter()` simply returns early when the markup
isn't found. Un-comment the block to bring it back — the CSS and rendering code are
both still there.

Level changes are still announced to the student in the status line under the sum
("new place unlocked", "easing off the carrying").

## Colour: the Montessori hierarchy

**Places** follow the Montessori decimal colour code: units **green**, tens **blue**,
hundreds **red** — and the same three repeat in every family, so unit thousands are
green again, ten thousands blue, hundred thousands red. In code that's simply
`place % 3`, which is the point: the colour teaches that the pattern repeats.

| place | colour | hex |
| --- | --- | --- |
| ones, thousands, millions | green | `#00843D` |
| tens, ten thousands | blue | `#003DA5` |
| hundreds, hundred thousands | red | `#E4002B` |

Because green recurs at ones *and* thousands, the columns are separated into families
by a gap — following the wooden hierarchical material, where the green thousand cube is
set down with extra space "because we are starting a new family." The gap falls exactly
where the comma goes:

```
      5 2   3 4 1
 [+]  1 7   6 0 8
     -------------
      _ _   _ _ _
      r b   r b g
```

A zone chart rendering each live place as a solid stamp-game tile is built and styled,
but **not currently displayed** — see Layout below.

**Operations** also use the Montessori code — addition **red**, subtraction **green**
(multiplication yellow and division blue, if you extend it). That deliberately collides
with hundreds-red and units-green, so the two are kept on separate visual channels: an
operation is a *solid filled block with a white glyph* in its own column outside the
grid, a place is a *coloured glyph* on the mat. Same distinction the classroom makes
between a red-bordered equation slip and a red hundred square.

## Contrast

Montessori's true dark blue scores **1.85:1** on a dark background — unreadable. So the
sum sits on a light work mat (`#F5F0E4`) and the canonical hues are used unmodified.
Measured:

- large numerals on the mat: green 4.23, blue 8.35, red 4.26 (need 3.0)
- white numerals on solid tiles: 4.81 / 9.50 / 4.85 (need 4.5)
- small status text uses darkened green `#00703C` (5.46) and red `#C8102E` (5.17)

## Theme

16-bit console styling for the chrome: chunky bordered panels with hard offset shadows,
a checkerboard ground, CRT scanlines, and pixel typefaces (Press Start 2P for numerals
and HUD, Silkscreen for prose). Era styling and palette only — no character art,
sprites, or logos, so there's nothing to worry about hosting it publicly.

The working area is a light Montessori mat set into that frame, which is what lets the
true bead hierarchy colours read at full saturation. Gold is reserved for chrome (title,
HUD, cursor) so it never competes with a place colour.

## Difficulty is two independent axes, per operation

**places** — 1 to 5 columns, ones through ten thousands.
**regroup** — 0 = nothing carries, 1 = one column carries, 2 = most columns do.

That's 14 reachable combinations. The two axes move separately, which matters:
carrying across two columns (67 + 58) is a different skill from holding five columns
(31,204 + 25,371), and a student can be fluent at one and lost at the other. Widening
the places doesn't force more carrying, and easing the carrying doesn't take away
places they've already earned.

**Addition and subtraction each get their own ladder.** Borrowing is harder than
carrying at the same width, so one shared ladder either holds addition back or drops a
child into subtraction they can't do. Each operation carries its own places,
regrouping, per-axis failure memory and rolling window.

The separate window is the part that matters most. Alternating add and sub through one
shared window mixes evidence from two different difficulties — the same mistake as not
clearing it on a level change. Simulated against lopsided learners:

| learner | addition parks at | subtraction parks at |
| --- | --- | --- |
| strong add, weak sub | (5 places, 2 regroup) | (2, 2) |
| weak add, strong sub | (3, 0) | (5, 2) |
| fluent at both | (5, 2) | (5, 2) |

The cost is speed: each ladder sees about half the cards, so a zone takes roughly
twice as many problems to settle — around 24 instead of 10 in simulation. Worth it,
but it means a short session may not reach a child's real level on both operations.

The chart at the top of the page shows both at once: solid columns are the places in
play, the dashed column is where the answer can spill over, and the small `1` marks
sit exactly where a carry lands — the same marks you'd write above a sum by hand.

## How it moves

Every answer is stored as `{correct, milliseconds, tag}` in a rolling window of the
last three. Each setting has its own pace target, `1900 + 1400·places + 500·regroup·places`
milliseconds — 3.3s for single digits, 13.9s for five-digit sums with carrying throughout.
The base is a little higher than a single free-text box would need, to cover the extra
motor cost of moving across columns.

| Window of last three | Move |
| --- | --- |
| 2+ wrong | down |
| 1 wrong **and** average slower than 1.4× target | down |
| all three correct **and** average under 0.7× target | up |
| anything else | stay |

Asymmetric on purpose: two answers can send it down, but it takes a clean sweep of
three to move up. Quick to help, slow to escalate.

**Which axis moves** is the interesting part. Going up, it advances whichever axis has
given less recent trouble. Coming down, it reads the wrong answer by place value:

- off by exactly 10, 100, 1000… → a dropped carry or borrow → ease **regroup**
- answer has the wrong number of digits → place-value confusion → ease **places**
- off by under 10 → a number-fact slip → ease **regroup**
- no clear signal → slow answers ease **places**, otherwise **regroup**

Two failed attempts at an axis blocks it, so the app stops shoving a student into the
same wall. The block decays after 12 more cards, so it re-probes periodically.

## Does it work

`node sim.js`-style simulations against learners with a hard ceiling on one axis:

| learner | success rate | settles at |
| --- | --- | --- |
| 5 places, can't carry at all | 77% | (5,1) / (5,0) |
| 1 place only, carrying fine | 73% | (2,1) / (1,1) |
| 3 places, single carry only | 77% | (4,1) / (3,1) |
| solid two-digit, nothing beyond | 75% | (3,2) / (2,2) |
| fluent throughout | 96% | (5,2), ceiling |

It finds the right region in 8–25 cards and holds a ~75% success rate, which is about
where practice should sit. The fluent learner pins at the ceiling, as it should.

## Tuning

Everything worth changing is near the top of the `<script>`:

- `MAX_PLACES` — raise past 5 and add labels to `COL_LABELS` / `PLACE_NAMES`.
- `targetFor(N,R)` — the pace model. It also generates the "n / 14" display order.
- `adapt()` — the thresholds above. Raising `0.7` promotes more eagerly; lowering `1.4`
  demotes more readily; the `>= 2` in the axis guard controls how stubbornly it retries.
- `diagnose()` — the error classifier. Add patterns here if you spot mistakes it misreads.
- Window size: the `3` in `if(S.win.length > 3)`.

Problems are built by rejection sampling against the exact carry/borrow count, so a
setting that asks for regrouping always gets it. Subtraction is generated answer-first
and never goes negative. Progress saves to `localStorage`, wrapped so the page still
runs where storage is blocked.

## Files

| file | what it is |
| --- | --- |
| `maze.html` | the journey: mazes, keys, locks, gates, the bridge. **Start here.** |
| `math-challenge.js` | the number drill, mountable |
| `word-challenge.js` | the sight-word drill, mountable |
| `word-sentences.js` | carrier sentences for the word gate |
| `word-gate.js` | the Wordsmith gate challenge |
| `number-gate.js` | the Numbersmith gate challenge |
| `title.js` | the title, drawn as pixel blackletter |
| `world.js` | the background: hills, castles, the bridge, the sky |
| `index.html` | thin host running the number drill on its own |
| `words.html` | thin host running the word drill on its own |
| `profile.js` | one browser, more than one child |
| `castle.js` | the keep, transcribed from a drawing |
| `intro.js` | the story, in eight skippable beats |
| `unlocks.js` | what finishing the journey earns |
| `sound.js` | all game audio, synthesised |
| `sound-test.html` | audition bench for choosing sounds |
| `sequencer.html` | step sequencer for writing tunes |
| `maze-editor.html` | draw mazes by hand |
| `speech-test.html` | speech diagnostic and word-lock trial |
| `CHALLENGE-API.md` | the contract for what goes behind a lock or gate |
| `MAZE-FORMAT.md` | the `carrymaze/1` level document format |

Keep them in one folder. No build step.

## The journey

Two kingdoms with a river between them. The world has become a literal maze, and
the only person who can bridge it is someone skilled in both crafts.

**Every third maze ends at a gold exit instead of a brown one.** Ordinary exits
are the same brown as the doors and you simply walk through. A gold one is a
**Gate Challenge**, and passing it sets a stone in the bridge.

| | |
| --- | --- |
| mazes per gate | 3 |
| gates | 7 |
| mazes in a full journey | 21 |

Gates alternate: Wordsmith, Numbersmith, Wordsmith… Word gates build out from the
Wordsmith bank, number gates from the Numbersmith bank, three stones each. The
seventh gate demands **four correct of each** and sets the keystone. That is the
win.

**A gate cannot be failed.** The drill keeps easing until it is passable, so the
weight comes from what it takes and what it gives, not from risk of loss.

**Each gate also opens the next land**, so the reward is a stone *and* a change of
scenery for the three mazes that follow. There are seven palettes and they are
**unnamed**: earlier drafts used names that sat too close to another game's level
titles, so they are gone. Set `name` on a theme in `maze.html` and it appears in
the top-right of the sky; leave it empty and no land name is shown at all. The
`id` is internal and never displayed.

**The bridge is the progress display.** Two kingdoms, a river, and a seven-stone
arch filling inward from both banks with the keystone last. Placed stones are
solid, the rest outlines, so the gap says how far is left without anyone reading a
number.

Finishing resets the world but not the child: **reading and number levels carry
over into a replay.**

## Gate challenges

Different tasks from door challenges, registered as their own kinds
(`word-gate`, `number-gate`) so real ones drop in exactly the way the drills did.
Both are currently placeholders.

**The Wordsmith gate is fill-in-the-blank.** Speech reads a sentence with one word
missing; the choices are shown in writing. Because the choices are never spoken,
**homophones become the best distractors here** — the exact inverse of the door
drill, where they must be banned. `She has ▢ red apples.` has one right answer and
a wrong one that sounds identical.

`word-sentences.js` holds 307 carriers over 141 words, written to disambiguate.
Zero missing blanks, zero self-revealing sentences. The four Dolch-internal
clashes — to/two, by/buy, right/write, red/read — all have carriers on both sides.

The gate asks about **words the child actually met on the way there** — the drill
now records when and in which maze each word was answered, and the gate draws from
the mazes since the last gate. Words that were got wrong are three times as likely
to come up. If the child has not met enough words with carriers yet, it widens to
anything they have met, then to their current band, so a gate is never stuck.

**A distractor that also fits the sentence is not a distractor — it is a second
right answer.** "We ▢ eggs for breakfast" takes *had* or *has*; "I have ▢ pencils"
takes any number at all. Marking one of those wrong teaches a child that being
right is not enough, which is the worst thing this game could do.

So `word-sentences.js` groups words by what they can substitute for — all the
numbers, all the colours, has/had/have, this/that/these/those, him/her/them, and
so on — and the gate never offers one as a distractor for another. Same kind of
rule as the homophone ban at the doors: structural, checkable, and not dependent
on anyone remembering it. Verified across 12,690 option sets: none contain two
right answers.

Run `node check-sentences.js` after adding or editing carriers. It rebuilds every
possible item and reports clashes, missing blanks, and sentences that give their
own answer away. `WordSentences.rivals(word)` lists what must never be offered
against a given word.

Homophones are drawn first when the target has one, since they are the sharpest
test available here. About 18% of items carry one; the rest use near-misses (one
letter apart), same-onset words, then fill. All 423 possible option sets were
checked: none malformed, none duplicated, exactly one right answer each.

**The Numbersmith gate is the same puzzle in the other language.** A door asks
`47 + 26 = ▢`; a gate asks `47 + ▢ = 73`. You cannot run the algorithm forward —
you have to work out what is missing.

It is set out **stacked, in long form**, the same way a sum appears at a door —
one column per digit with the places lined up and colour-coded down the page. A
horizontal line wraps once the numbers reach three digits, which makes it unreadable.

The blank spans the whole operand rather than the answer's own width, so the size
of the box never gives away how many digits the answer has.

Because the blank can sit in either operand it has a difficulty dial the doors do
not: `▢ + 26 = 73` is harder than `47 + ▢ = 73`, and only appears once the child
has some width behind them. Items are generated from that child's own maths
ladder, so a gate is exactly as hard as the doors they have been opening.

Every wrong answer names an error, using the drill's own taxonomy: **carry** (out
by exactly ten or a hundred), **reversed** (the whole sum rather than the missing
part — the commonest misread of this format), **places** (right digits, wrong
columns), **fact** (out by one or two), and fill. No wrong option is ever a number
already visible in the equation, or the item would be answerable by elimination
instead of arithmetic. Verified across 54,000 option sets at three ladder heights:
zero malformed, zero negative, zero giveaways, and every equation arithmetically
true across 20,000 items.

The sphinx reads these too — "forty-seven plus something makes seventy-three" —
so she asks both kingdoms' questions in her own voice.

## Sound

Everything is synthesised — an oscillator, an envelope and a noise channel, the
way the consoles this borrows its look from did it. No files to host, nothing to
licence, and every sound is parametric, so each land can sit in its own key and
the whole game re-colours itself as you travel.

**A melody is copyrighted separately from any recording of it**, so a chiptune
rewrite of an existing tune is still infringement. Everything here is original.

Twelve events, thirty-one candidates. `sound-test.html` plays them and lets you
choose; the choice is saved and the game reads it.

| event | candidates |
| --- | --- |
| step | tick, pad, grit, silent |
| bump | thud, scuff, silent |
| key | chime, ring, trill |
| lockTurn | ratchet, clunk, cog |
| doorOpen | swing, stone, unlatch |
| right | lift, blip, third |
| wrong | soften, muted, buzz |
| stone | set, forge, bell |
| newLand | rise, shimmer |
| win | united, fanfare |

The bench also plays **whole moments** rather than single sounds — walking a
corridor and finding a key, turning a lock three times until the door opens —
because a footstep judged alone is misleading and a footstep heard forty times is
the thing that will actually drive a classroom mad.

### The two motifs

| | |
| --- | --- |
| **Wordsmith** | G4 A4 B4 C5 — stepwise, singing |
| **Numbersmith** | C4 E4 G4 C5 — an arpeggio, built |

Played together, every beat is consonant — a perfect fifth, a perfect fourth, a
major third — and they finish on the same note. They start apart and end as one
pitch. That is the bridge, in sound, and it is what the keystone plays.

Audio stays asleep until the player interacts, which the first arrow key
satisfies. With no Web Audio at all the game runs silently rather than failing.

**The speaker in the top-right of the sky opens the sound control** — on/off and
volume, so the game can be silenced without silencing the whole machine. Both
settings persist per device, and the button hides itself if the browser has no
audio at all.

It shares a row with the player name, speaker on the left, and the drawn
readouts above stop clear of that row so nothing overlaps. The speaker stays put
on a narrow screen; the player name moves into the panel with the other
readouts.

### Writing your own — `sequencer.html`

A tracker: four channels on a step grid, 8, 16 or 32 steps.

**The rows are locked to a scale**, so a note can be moved anywhere and still fit.
Change the key or swap major for minor and the pattern keeps its shape — each note
moves to the same degree of the new scale, so a tune transposes rather than breaks.

Channels carry their own waveform, volume and note length; the fourth is noise, and
it reads the same note names as a filter centre, which is how you write drums on a
pitch grid. Other channels show as faint outlines behind the one you are editing,
so you can write a counter-melody against what is already there.

Both motifs load as presets, including **BOTH AT ONCE** — worth starting from,
since you can see them converge on the same C5 at the end.

**SAVE TO EVENT** stores a pattern against one of the twelve game events, and
`Sound.play` will use it in preference to the built-in sound from then on. Remove
it and the built-in comes back. Patterns are plain JSON in the box at the bottom,
so they can be copied out, edited and pasted back.

```jsonc
{ "v":1, "bpm":132, "steps":16, "key":60, "scale":"major",
  "tracks":[ { "wave":"square", "vol":0.22, "gate":1.6,
               "rows":["G4",null,null,null,"A4", ...] } ] }
```

## The story

Eight beats, played once on a first run and replayable from **STORY** in the
footer. `intro.js` is an optional include: without it the game simply starts.

1. Two kingdoms, with a valley between them.
2. Once they meant to bridge it — but neither would build to the other's design.
3. Instead each raised a wall, and each answered the other's, until the land
   between was a maze.
4. A sphinx came, because a tangle like that is hard to walk past.
5. She found the bridge they never built, and pulled a stone to begin it herself.
6. Then she smiled and hid the stone instead. Six more followed, behind gates.
7. She fitted the doors with locks — some asking sums, some asking words.
8. Chased into the middle, she calls out: answer them all and the bridge is yours.

The valley is older than the walls, which is where the one in the bridge panel
comes from. The bridge was **their** idea, abandoned over whose design was better,
so the Master Smith finishes an abandoned plan rather than imposing a foreign one
— and the reason it takes an outsider is that neither side would learn the other's
craft.

**The sphinx made every lock**, not just the gates. That is what earns her voice at
every word door for the rest of the game, and it makes the maze a curriculum rather
than a border: she alternates sums and words deliberately, because only someone
willing to learn both can reach the stones. Her motive stays selfish — she could
have built the bridge, and chose the better puzzle instead.

Three channels carry it at once: the line on screen, the same line **spoken by the
sphinx**, and a picture. A child who cannot read yet gets it from the voice and the
image; a tablet with no speech still works from the text and the image.

**Skipping is unconditional.** Any key or tap advances, Escape or SKIP STORY leaves,
and eight dots show how long it runs. Advancing on *any* key is deliberate: it
teaches the action key before a lock depends on it. The intro is also the session's
first interaction, so it is where the browser unlocks audio.

Roughly 200 words, about 75 seconds spoken.

### Replacing the art

Each beat owns a `draw(g, W, H, t)` and nothing else depends on it — `g` is a
240x140 pixellated context and `t` is milliseconds since the beat appeared, for
anything that moves. Swap one at a time, in the file or from outside:

```js
Intro.setArt(5, function (g, W, H, t) { /* the sphinx, properly */ });
```

The placeholders in there now are scaffolding, not a proposal.

## The castle

One keep serves both kingdoms. Transcribed from a line drawing by measuring its
proportions rather than tracing it, so it can be re-scaled without going back to
the image:

| | drawing | grid |
| --- | --- | --- |
| aspect w/h | 1.06 | 1.07 |
| keep width / total | 0.51 | 0.53 |

**The masonry is the maze's own stone** — the same `#24408C` / `#4A78D8` /
`#12225A` the corridor walls are drawn in, because they are the same walls. The
maze *is* the kingdoms' walls, run wild, and the castles should say so.

**Colour lives only on the banner:** Wordsmith pink, Numbersmith yellow. Verified
— no pink or yellow pixel appears below the flag on either castle.

The gate and windows use the maze doors' arched profile, and the gate is painted
in the maze doors' brown, because it is the same door. It carries that kingdom's
own device cut through it: `A` for the Wordsmiths, `#` for the Numbersmiths,
matching the flag above it. So the device on the banner, the
keyhole in the gate and the bit of the key are one family. The device is stamped
per kingdom rather than baked into the grid, which is what fixes the Wordsmith
gate wearing a `#`.

`Castle.tower()` crops to the keep alone for places too narrow for the curtain
wall. `castle.js` is an optional include; without it the intro and bridge fall
back to plain block towers.

### The bridge panel

There is no river. Each kingdom keeps its own **green hill**, and the maze lies in
the **valley between them** — a run of the same wall blocks the corridors are made
of. The arch springs from hilltop to hilltop and vaults the valley.

Each stone is a rock prised out of the wall with a **gem set in it** — pink for
one won at a Wordsmith gate, yellow at a Numbersmith gate, white for the
keystone. Before a gate is passed the rock is an outline and there is no gem in
it at all, so the arch fills with light as the journey goes on.

The silhouette is deliberately lopsided — a square shoulder on one side, a corner
knocked off the other — because a symmetrical rock reads as a tile. Light falls
from the upper left, and the gem carries the only saturated colour on the sprite,
which is what makes it look set *into* the stone rather than painted on. Three
tones do the shining: a dark facet, a bright face, and a single glint.

`Castle.stone(g, x, y, kind, scale, filled)` draws it; the sky uses 2x and the
compact bridge 1x.

`Castle.hill(g, x, y, w, h)` draws a mound, so the same land can be used
elsewhere. `Castle.colours` exposes the stone, gate, grass and banner values for
anything else that needs to match.

## Drawing mazes — `maze-editor.html`

A separate app, as intended: it emits `carrymaze/1` documents, the same thing the
generator produces, so the game cannot tell which made a given maze.

Click a doorway to open or close it; click a cell to move the start, the exit, or
drop a key; click an open doorway to set a lock. Locks and keys pair by number, so
lock 3 wants key 3. **GENERATE ONE** gives you a random maze to carve into rather
than starting from a blank grid.

**CHECK is the point of the tool.** It walks the maze the way a player would —
collecting every key it can reach, opening every lock it has the key for — and
tells you plainly what is wrong: a lock whose key is behind it, cells walled off
from everything, walls that disagree between two cells. An authored maze has to
pass the same test a generated one does.

**PLACE MISSING KEYS** drops a key for every lock that lacks one, in the region
you can reach before meeting that lock, preferring a dead end so finding it means
exploring. If there is nowhere legal to put one it says which lock and why, rather
than silently doing nothing.

**SAVE** puts a maze in a library that the game reads: **AUTHORED** in the maze
footer lists them and plays one. The game re-checks before loading, so a broken
maze cannot be played by accident.

### Two validators, one contract

The editor carries its own copy of the validator, because the game must not depend
on a file the editor owns. They are checked against each other: 324 documents —
320 generated across eight levels, plus four deliberately broken ones — judged by
both, with zero disagreements. `MAZE-FORMAT.md` is the contract they both answer to.

## The world is the board

The background is not wallpaper. `world.js` paints a full-viewport scene behind
the game: the two kingdoms standing on hills at the left and right edges, the
bridge spanning the valley between them, the title hanging in the sky above, and
grass along the bottom.

**The bridge sits in the clear band below the game column.** An arch across the
middle of the screen loses to the middle of the screen — the maze window hid the
stones near the apex and the title scroll hid the keystone. So the span is put
where nothing else is, and it is a wide shallow segmental arch rather than a tall
semicircle, which is both what fits a short band and what a long bridge actually
looks like. The castles stand outboard of where it springs, so a stone can never
be mistaken for a wall.

An unearned stone is drawn as a dark socket rather than a pale outline: white
vanishes against a bright sky, which is exactly where the top of the span sits.

**The readouts live in the sky too.** Maze, locks and the keys you are carrying
sit in the top-left corner; the land, the countdown to the next gold gate and
whose game it is sit in the top-right. Key chips carry the kingdom device and
dim once their lock is open.

Two vocabularies meet in this game: the fiction says *word* and *number*, the
challenge registry says *language* and *math*. `castle.js` accepts both, because
a lookup that quietly falls back to a default is how every key ended up wearing
the Wordsmith `A`. `Castle.device()` now returns `null` for a kind it does not
know rather than guessing. So the progress display is not a panel any more —
it is the place you are standing in. Stones fill inward from both banks as gates
are passed, and the sky changes with the land as each gate opens the next one.

The hills are drawn in the same checkerboard as the ground, anchored to the same
grid, because it is the same grass. Each has a flat top wide enough to stand a
castle on — and if the screen is too narrow for that, the keep alone is shown
rather than letting the curtain wall hang over the edge.

**The ending happens across the whole page.** Fireworks over a dusk sky, the
finished arch, and a figure walking out from each kingdom to meet on the
keystone. The win card is reduced to a caption over the top of it.

Two separate questions, deliberately kept apart:

- **`World.roomy()`** — is there room *beside* the game column? If so the sky
  carries the readouts and the top panel is hidden entirely.
- **`World.bridgeFits()`** — is there room *below* it for a span? If not, only
  the bridge falls back to a compact panel; the HUD stays in the sky.

Conflating those two put the whole HUD panel back on screen the moment a window
was a little short, which is a much worse trade than a flatter bridge. The span
now flattens rather than refusing, and only gives up below 44px of band.

**Neither panel may depend on the height of the column it sits in.** Gating the
compact bridge on the space below the game was circular: showing the panel made
the column taller, which kept the panel showing forever. Both panels now key off
side room alone, which nothing they do can change.

## The page fits the window

The intended reading order is **title scroll, sky, maze, bridge over the valley,
grass and castles** — top to bottom, all at once. A page that scrolls hides the
thing it is showing, so the maze canvas is capped at `52vh` and scales to
whatever height is left. Checked from 1920x1080 down to 1024x640: nothing
scrolls, and 76-367px of clear band remains for the bridge.

The reading order top to bottom is scroll, sky, maze, bridge, grass — so the
title hangs at a fixed height near the top rather than floating in the middle of
whatever gap is above the game, and the maze starts a few lines of open sky
below it. The **tools row sits down on the grass**, pushed there by the column
rather than trailing the maze; opening it may make the page taller, which is
fine, because nobody opens it mid-maze.

The bridge is placed against the bottom of the **maze**, not of the column — the
column now runs to the floor so the tools can reach the grass, and measuring
that would leave no band at all.

The arrow-key legend retires itself after 200 steps. It is worth a great deal on
a first run and nothing at all on a twentieth, and it is still reachable under
TOOLS. When there is, the top panel is **hidden entirely** — everything in it is
already in the sky, so keeping it would only cover the title. When there is not,
the panel comes back with the readouts and a compact bridge inside it: progress
has to be visible on a phone as much as on a desk.

The player name is the exception. It can be pressed, so it is a real button that
moves to the top-right of the sky rather than disappearing with the rest.

## Screen space

The developer tools — new maze, JSON, attempt log, word locks, voice, story,
authored, reset — are folded behind a single **TOOLS** toggle, closed by default,
so the maze and the bridge fit one screen without scrolling.

## More than one player

Progress lives in the browser, not on a server: it survives closing the tab and
rebooting, but it does not follow anyone to another device, and by default two
children on one tablet would share everything.

**The name in the top-right of the sky opens the picker.** Each player keeps their
own maths ladders, word bands, journey and bridge.

Press **NAME** on a row to rename that player in place — the name is the only
thing that changes, so nobody has to delete a player and start again just to stop
being called Player 1. Enter saves, Escape cancels, and a blank name keeps the old
one. Deleting is a separate button, and its warning names what is lost and points
at NAME as the thing you probably wanted.

Some things belong to the *device* rather than the player, and are deliberately
shared: the reading voice, mute and volume, the chosen sounds, the word-lock
switch, and any mazes drawn in the editor. Nobody should have to pick a voice
twice on the same tablet.

**The first player carries no prefix**, so a save made before profiles existed
simply becomes Player 1 — nothing is migrated and nothing can be lost doing it.
Later players get `p1.`, `p2.` and so on.

### Moving and backing up

Switching mid-maze abandons the maze being stood in — keys picked up and locks
part-turned belong to that attempt — so it asks first, and only when there is
something to lose. Tapping the player already selected just closes the picker.

**SAVE TO TEXT** copies a player out as a blob; **LOAD FROM TEXT** takes it back,
on any device. That is how a child moves from a tablet to a laptop, and the only
protection against Safari, which evicts localStorage after seven days without a
visit.

| | |
| --- | --- |
| survives | closing the tab, closing the browser, rebooting |
| does not survive | a different browser or device, clearing browsing data, private mode |
| at risk | Safari after 7 idle days |

## The title

**AM+ZED KINGDOMS**, in a pixel blackletter drawn as data rather than set in a
font, so it belongs to the same world as the castle and the keys.

*Amazed* already contains *maze*, which is the joke: the land was made into one.
The **A** is the Wordsmith device and the **+** is the Numbersmith device, so the
title is the two kingdoms standing either side of the word, and everything between
them is ink.

Blackletter at nine pixels is three rules: stems two pixels wide and dead
vertical, a diamond terminal on every stroke end — that is the whole look — and
diagonals kept short and steep or the letter turns to mush.

The `+` holds one arm width the whole way across and matches those 2px stems. An
earlier version flared to a diamond in the middle, which welded the two strokes
together and read as a starburst rather than a plus. The `#` device on flags,
gates and key chips had the same fault — a solid middle row fusing the two
horizontals — and now leaves every other row open.

It sits on an off-white scroll with rolled ends, **two short lines**, hanging in
the sky above the game rather than sitting in a panel.

`Title.draw` renders the stacked form and `Title.drawBanner` a single wide line,
so the same face serves a title card and a header. `Title.fit(canvas, max, mode)`
sizes and centres either one.

## On borrowing

The palettes take their cue from 16-bit console games and that is fine — colour
schemes are not protectable, and blocky type and hard-edged panels are a whole
era's house style, not one game's.

Names are a different matter, so none are borrowed. The seven lands ship
unnamed, and the word for a level is **maze**, not the term another series uses
for its levels. Tunes are original for the same reason: a melody is copyrighted
separately from any recording of it, so a chiptune rewrite of an existing theme
would still be infringement.

## If something breaks

The animation loop steps movement first, in its own `try`, and wraps each drawing
pass separately. A browser's `requestAnimationFrame` chain stops dead the moment
one frame throws — and everything after it stops too, walking included. So a
fault in the scenery now skips that piece, reports itself once in the console,
and the game stays playable.

This is not hypothetical: `Castle.hill` went missing during an edit and every
frame threw, which silently froze the character. The maze itself was fine the
whole time.

## The sphinx's workshop

Finishing the bridge earns the two sound tools. They are **not advertised
beforehand** — a sequencer shown to a child at the start is a distraction; the
same sequencer handed to a child who has just crossed the whole maze is a
reward, and by then they have heard every sound in the game a few hundred times
and have opinions about them.

She offers it herself, in her own voice, after the fanfare. The screen plays the
**Wordsmith line**, the **Numbersmith line**, and then **both at once** — which
hands over the two motifs concretely and teaches the sequencer's central idea in
about eight seconds. Then it says where the tools live.

A small note appears beside the speaker in the sky and stays there. The workshop
opens as an **overlay over the running game** rather than navigating away, so
nothing is lost and the world keeps going underneath. **PUT IT ALL BACK**
restores every original sound, because a child will make the game unpleasant at
some point and needs an obvious way home.

### Per player, not per device

Siblings share tablets and classes share machines, so one child's tune must not
turn up uninvited in another's game. The split follows what each thing is really
about:

| | |
| --- | --- |
| the room you sit in | mute, volume |
| you | chosen sounds, written tunes, the unlock itself |

So Ben has to finish his own journey to earn his own workshop, and Ada's fanfare
stays Ada's. Verified: switching player swaps the sounds with them, while volume
and mute stay put.

## If the locks look like placeholders

Every `.js` file must sit in the **same folder** as `maze.html`. A missing one
404s quietly and that lock falls back to a placeholder that opens on any
keypress — deliberate, so a half-built game still runs, but it makes a finished
folder with a missing file look as though the game has reverted.

The game now names the missing files in a red box, bottom left, and repeats it
in the browser console. `FILES.md` lists everything and what breaks without it.
