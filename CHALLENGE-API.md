# The challenge contract

What sits behind a lock. The maze knows nothing about arithmetic or words; a
challenge knows nothing about mazes, doors or keys.

**The registry is built into `index.html`** — the host page owns it, so the maze
always runs on its own with no other files needed. Real drills arrive later as
separate scripts that register themselves.

```
factory(mount, session, report)  ->  handle
```

## session — what this lock is asking for (maze → challenge)

| field | meaning |
| --- | --- |
| `kind` | `"math"` or `"language"` |
| `required` | corrects needed to open; `Infinity` when running standalone |
| `progress` | corrects already banked at this lock |
| `variant` | optional phase constraint: `"add"`, `"sub"`, `"mixed"`, or `null` |
| `hints` | optional presentation requests, e.g. `{ showPace: false }` |

## report(result) — once per resolved attempt (challenge → maze)

| field | meaning |
| --- | --- |
| `correct` | boolean, required |
| `ms` | milliseconds spent on that attempt |
| `firstInSession` | set for you; true on the first attempt after mounting |
| `detail` | optional, **opaque** to the maze — for logs only |

## handle — lifecycle (challenge → maze)

| method | meaning |
| --- | --- |
| `focus()` | take keyboard focus |
| `abandon()` | the panel is closing; drop the in-flight item unreported |
| `destroy()` | remove listeners and DOM |

Missing methods are filled in with no-ops, so a minimal challenge can return
`{}` and nothing will crash.

## The five rules

1. **The maze counts.** A challenge reports every attempt and never decides when
   a door opens. "N corrects to unlock" is level design, so it lives in the maze.

2. **The challenge adapts.** Difficulty, zones, word scheduling and all of their
   persistence belong to the challenge alone. The maze never reads or writes
   them. This is what keeps maze level and drill difficulty correlated but not
   causal.

3. **`detail` is opaque.** The maze may log it. The maze must never branch on it.
   Anything the maze needs to act on belongs in a named field.

4. **Abandon discards.** On `abandon()` the in-flight item is not reported, so
   wandering off mid-answer cannot pollute the adapter. Attempts already
   reported stand.

5. **First attempt is re-entry.** Coming back to a lock after exploring costs
   time that isn't difficulty. A challenge *should* discount the first attempt's
   timing in its own adapter; `firstInSession` is set automatically so a log can
   always show it.

## Standalone mode

The same module runs as an endless drill: mount it with
`{ required: Infinity, progress: 0 }` and ignore the counting. That's how each
game stays playable on its own with the maze as a wrapper.

## Registration controls what the maze generates

The generator only builds door kinds that have a registered challenge:

```js
Challenges.unregister("language");   // every lock becomes a number lock
```

With nothing registered the generator emits zero doors and the maze is still
completable. So a half-written game can never produce a maze you cannot open —
there's no flag to remember to set.

`Challenges.ready()` lists kinds whose challenge is real rather than a
placeholder, if you want to branch on that in a dev build.

## Adding the real math drill

```html
<!-- before the game script in index.html -->
<script src="math-challenge.js"></script>
```

```js
Challenges.register("math", function (mount, session, report) {
  // build your UI inside `mount`
  // call report({correct, ms, detail}) once per answered problem
  // keep your own zone state and your own localStorage key
  return { focus, abandon, destroy };
}, { lockTitle: "NUMBER LOCK", keyLabel: "#" });
```

Registering a kind again replaces the placeholder. Omit `placeholder: true` and
`Challenges.ready()` will report it as real.
