# carrymaze/1

The maze document format. The generator emits it; a level editor will emit the same
thing; the game only ever loads it. Nothing in the game knows or cares which produced a
given maze — that's what keeps the editor a separate app rather than a refactor.

See `sample-maze.json` for a complete generated example.

```jsonc
{
  "format": "carrymaze/1",
  "level": 1,                  // zone number; drives size and door count
  "seed": 20260729,            // regenerates this exact maze; omit for authored levels
  "size":  { "w": 8, "h": 6 }, // in CELLS, not blocks
  "spawn": { "x": 0, "y": 0 },
  "exit":  { "x": 5, "y": 5 },

  "open": [ [2, 12, 6, ...], ... ],   // one row per y, one bitmask per cell

  "doors": [
    { "id": 0,
      "cell": { "x": 3, "y": 2 },     // the LOWER-coordinate cell of the edge
      "side": "E",                    // always "E" or "S" — see Edges below
      "kind": "math",                 // "math" | "language"
      "required": 2,                  // correct answers needed to open
      "keyId": 0 }
  ],

  "keys": [
    { "id": 0, "cell": { "x": 1, "y": 4 }, "kind": "math" }
  ]
}
```

## Cells and open sides

`open[y][x]` is a bitmask of the sides you can walk through:

| side | bit |
| --- | --- |
| N | 1 |
| E | 2 |
| S | 4 |
| W | 8 |

So `6` = E + S. **Both cells must agree**: if cell `(x,y)` has E open, cell `(x+1,y)`
must have W open. The validator rejects documents where they disagree.

## Edges

Doors live on edges, not in cells, and every edge has two names — the E side of one cell
is the W side of its neighbour. Documents always store the **lower-coordinate** form, so
`side` is only ever `"E"` or `"S"`. The game normalises N and W into that form before
looking a door up, so both directions of travel find the same door.

## Blocks

For rendering and collision the cell grid expands to a block grid of
`(2w+1) x (2h+1)`:

- cell `(x,y)` → block `(2x+1, 2y+1)` — always floor
- the edge E of `(x,y)` → block `(2x+2, 2y+1)` — floor if E is open
- the edge S of `(x,y)` → block `(2x+1, 2y+2)` — floor if S is open
- everything else — wall

Doors and their progress notches are drawn in their edge block.

## The solvability guarantee

Documents aren't checked for solvability after the fact; they're built so it can't fail:

1. Carve a **perfect maze** — a spanning tree, exactly one route between any two cells.
2. Take the longest path from spawn. That's the solution path; the far end is the exit.
3. Place the R doors on edges **along that path**, ordered by distance from spawn.
   Removing a tree edge always splits the tree in two, so removing all R door edges
   leaves R+1 regions in a strict line.
4. **Key `i` goes in region `i`** — the region you're standing in when you first meet
   door `i`. You can always reach the key before you need it.

Within a region the key is placed at the dead end farthest from spawn, so finding it
means exploring rather than walking the through-route.

An authored maze must satisfy the same property. `validate(doc)` checks structure (walls
agree, fully connected, no loops) and then plays the maze — walking, collecting every
reachable key, opening every lock it can reach — and fails the document if the exit
can't be reached.

Verified across 3,000 generated mazes: 0 structural failures, 0 unsolvable. A separate
pass confirmed all 6,800 keys land in their own region, and 2,500 mazes were played to
completion using the game's own movement and lock rules rather than the generator's.

## What is NOT in the document

Play state is stored separately, under the `carrymaze` key:

```jsonc
{ "level": 1, "seed": 20260729,
  "cx": 3, "cy": 2,            // where the player is
  "held":   { "0": true },     // keys picked up
  "turned": { "0": 2 },        // lock progress — persists when you walk away
  "opened": { },               // locks fully opened
  "done": false }
```

Keeping the two apart means a document is a pure level: shareable, editable, and
diffable, with no play state baked into it.
