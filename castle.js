/* ===================================================================
   CASTLE  —  one keep, two kingdoms

   Transcribed from a line drawing by measuring its proportions, so it
   can be re-scaled without going back to the image.

   The masonry is the SAME stone as the maze walls, because it is the
   same stone — the walls of the maze are these kingdoms' walls, run
   wild. Only the flag carries colour: Wordsmith pink, Numbersmith
   yellow.

   The gate and windows use the maze doors' arched profile, and the gate
   carries that kingdom's own device cut through it, because a kingdom's
   doors take that kingdom's keys. The same glyph flies on the flag.

       Castle.draw(g, x, y, "word" | "number", scale)
       Castle.tower(g, x, y, kind, scale)     just the keep, no wall
       Castle.stone(g, x, y, kind|null, scale, filled)

   Grid legend
       O outline   B body (stone)   P pole   F flag field
       D gate      d gate edge      W window
=================================================================== */
(function (root) {
  "use strict";

  var GRID = [
    ".................POOOOOOOOOOOOOOOO..............................",
    ".................PFFFFFFFFFFFFFFFO..............................",
    ".................PFFFFFFFFFFFFFFFO..............................",
    ".................PFFFFFFFFFFFFFFFO..............................",
    ".................PFFFFFFFFFFFFFFFO..............................",
    ".................PFFFFFFFFFFFFFFFO..............................",
    ".................PFFFFFFFFFFFFFFFO..............................",
    ".................PFFFFFFFFFFFFFFFO..............................",
    ".................PFFFFFFFFFFFFFFFO..............................",
    ".................PFFFFFFFFFFFFFFFO..............................",
    ".................PFFFFFFFFFFFFFFFO..............................",
    ".................POOOOOOOOOOOOOOOO..............................",
    ".................P..............................................",
    ".................P..............................................",
    ".................P..............................................",
    ".................P..............................................",
    ".................P..............................................",
    ".................P..............................................",
    "OOOOO..OOOOO..OOOPO..OOOOO..OOOOO...............................",
    "OBBBO..OBBBO..OBBPO..OBBBO..OBBBO...............................",
    "OBBBO..OBBBO..OBBBO..OBBBO..OBBBO...............................",
    "OBBBBOOBBBBBOOBBBBBOOBBBBBOOBBBBO...............................",
    "OBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBO...............................",
    "OOBBBBBBBBBBBBBBBBBBBBBBBBBBBBOOO...............................",
    "..OBBBBBBBBBBBBBBBBBBBBBBBBBBBO.................................",
    "..OBBBBBBBBBBBBBBBBBBBBBBBBBBBO.................................",
    "..OBBBBBBBBBBBBBBBBBBBBBBBBBBBO.................................",
    "..OBBBBOOOBBBBBBBBBBBBBOOOBBBBO.................................",
    "..OBBBOWWWOBBBBBBBBBBBOWWWOBBBO.................................",
    "..OBBBOWWWOBBBBBBBBBBBOWWWOBBBO.................................",
    "..OBBBOWWWOBBBBBBBBBBBOWWWOBBBO.................................",
    "..OBBBOWWWOBBBBBBBBBBBOWWWOBBBO.................................",
    "..OBBBOWWWOBBBBBBBBBBBOWWWOBBBO.................................",
    "..OBBBOWWWOBBBBBBBBBBBOWWWOBBBO.................................",
    "..OBBBBBBBBBBBBBBBBBBBBBBBBBBBOOOO..OOOOO..OOOOO..OOOOO..OOOOOOO",
    "..OBBBBBBBBBBBBBBBBBBBBBBBBBBBOBBO..OBBBO..OBBBO..OBBBO..OBBBBBO",
    "..OBBBBBBBBBBBBBBBBBBBBBBBBBBBOBBO..OBBBO..OBBBO..OBBBO..OBBBBBO",
    "..OBBBBBBBBBBBBBBBBBBBBBBBBBBBOBBBOOBBBBBOOBBBBBOOBBBBBOOBBBBBBO",
    "..OBBBBBBBBBBBBBBBBBBBBBBBBBBBOBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBO",
    "..OBBBBBBBBBBBBBBBBBBBBBBBBBBBOBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBO",
    "..OBBBBBBBBBBBBdddddBBBBBBBBBBOBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBO.",
    "..OBBBBBBBBBBdDDDDDDDdBBBBBBBBOBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBO.",
    "..OBBBBBBBBBdDDDDDDDDDdBBBBBBBOBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBO.",
    "..OBBBBBBBBdDDDDDDDDDDDdBBBBBBOBBBBOOOBBBBBBBOOOBBBBBBBOOOBBBBO.",
    "..OBBBBBBBBdDDDDDDDDDDDdBBBBBBOBBBOWWWOBBBBBOWWWOBBBBBOWWWOBBBO.",
    "..OBBBBBBBBdDDDDDDDDDDDdBBBBBBOBBBOWWWOBBBBBOWWWOBBBBBOWWWOBBBO.",
    "..OBBBBBBBBdDDDDDDDDDDDdBBBBBBOBBBOWWWOBBBBBOWWWOBBBBBOWWWOBBBO.",
    "..OBBBBBBBBdDDDDDDDDDDDdBBBBBBOBBBOWWWOBBBBBOWWWOBBBBBOWWWOBBBO.",
    "..OBBBBBBBBdDDDDDDDDDDDdBBBBBBOBBBOWWWOBBBBBOWWWOBBBBBOWWWOBBBO.",
    "..OBBBBBBBBdDDDDDDDDDDDdBBBBBBOBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBO.",
    "..OBBBBBBBBdDDDDDDDDDDDdBBBBBBOBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBO.",
    "..OBBBBBBBBdDDDDDDDDDDDdBBBBBBOBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBO.",
    "..OBBBBBBBBdDDDDDDDDDDDdBBBBBBOBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBO.",
    "..OBBBBBBBBdDDDDDDDDDDDdBBBBBBOBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBO.",
    "..OBBBBBBBBdDDDDDDDDDDDdBBBBBBOBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBO.",
    "..OBBBBBBBBdDDDDDDDDDDDdBBBBBBOBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBO.",
    "..OBBBBBBBBdDDDDDDDDDDDdBBBBBBOBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBO.",
    "..OBBBBBBBBdDDDDDDDDDDDdBBBBBBOBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBO.",
    "..OBBBBBBBBdDDDDDDDDDDDdBBBBBBOBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBO.",
    "..OOOOOOOOOdDDDDDDDDDDDdOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO."
  ];
  var W = 64, H = 60;
  var FLAG = { x: 18, y: 1, w: 15, h: 10 };
  var KEYHOLE = { x: 18, y: 48 };

  /* the maze's own wall colours — the castles are made of the maze */
  var STONE = { body:"#24408C", lit:"#4A78D8", low:"#12225A", ink:"#040A22" };

  /* the bridge stone: o outline, l lit face, b rock, d shaded face,
     g gem, G gem core */
  var STONE_GRID = [
    "...oooooo....",
    ".oolllllloo..",
    "ollbbbgbbllo.",
    "obbbb*Ggbbblo",
    "obbbbGGgbbbbo",
    "odbbbbgbbbbo.",
    ".odddddddddo.",
    "..ooddddddo..",
    "....ooooooo.."
  ];
  var STONE_GEM = {
    word:   { body:"#D62E82", core:"#FF6BB3", lit:"#FFD6EC" },
    number: { body:"#C79A12", core:"#FFD52E", lit:"#FFF7C7" },
    key:    { body:"#C9D2E8", core:"#FFFFFF", lit:"#FFFFFF" }
  };
  /* and the maze's own door brown, because it is the same door */
  var GATE  = { body:"#A9713C", lit:"#D6A06A", edge:"#6E4522" };
  /* the ground each kingdom stands on */
  var GRASS = { lit:"#3DC45C", body:"#2E9A48", low:"#1F6E33" };

  /* the only thing that differs between the kingdoms */
  var BANNER = {
    word:   { field:"#FF6BB3", device:"#3A0B22" },
    number: { field:"#FFD52E", device:"#3A2E05" }
  };
  /* Two vocabularies reach this file: the fiction calls them word and
     number, the challenge registry calls them language and math. Both
     are correct in their own place, so both are accepted here — a lookup
     that quietly falls through to a default is how every key ended up
     wearing the same glyph. */
  var DEVICE = {
    word:     [".###.", "#...#", "##.##", "#...#", "#...#"],
    language: [".###.", "#...#", "##.##", "#...#", "#...#"],
    /* A true hash: two verticals, two horizontals, and the gaps between
       them left open. The middle row used to be solid, which welded the
       strokes together and made it read as an asterisk. */
    number:   [".#.#.", "#####", ".#.#.", "#####", ".#.#."],
    math:     [".#.#.", "#####", ".#.#.", "#####", ".#.#."]
  };
  var BANNER_ALIAS = { language: "word", math: "number" };

  function stamp(g, gx, gy, s, x0, ox, oy, glyph, colour) {
    g.fillStyle = colour;
    for (var j = 0; j < glyph.length; j++)
      for (var i = 0; i < glyph[j].length; i++)
        if (glyph[j].charAt(i) === "#")
          g.fillRect(gx + (ox + i - x0) * s, gy + (oy + j) * s, s, s);
  }

  function paint(g, gx, gy, kind, s, x0, x1) {
    var key = BANNER_ALIAS[kind] || kind;
    var b = BANNER[key] || BANNER.word;
    var d = DEVICE[kind] || DEVICE[key] || DEVICE.word;
    s = s || 1; x0 = x0 || 0; x1 = (x1 == null) ? W - 1 : x1;
    for (var y = 0; y < H; y++) {
      var row = GRID[y];
      for (var x = x0; x <= x1; x++) {
        var c = row.charAt(x), col = null;
        if (!c || c === ".") continue;
        if (c === "O" || c === "P") col = STONE.ink;
        else if (c === "B") col = (y > 0 && GRID[y - 1].charAt(x) === "B") ? STONE.body : STONE.lit;
        else if (c === "D") col = (y > 0 && GRID[y - 1].charAt(x) === "D") ? GATE.body : GATE.lit;
        else if (c === "d") col = GATE.edge;
        else if (c === "W") col = "#0A1038";
        else if (c === "F") col = b.field;
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(gx + (x - x0) * s, gy + y * s, s, s);
      }
    }
    /* the device flies on the flag and is cut through the gate */
    stamp(g, gx, gy, s, x0, FLAG.x + Math.floor((FLAG.w - 5) / 2),
          FLAG.y + Math.floor((FLAG.h - 5) / 2), d, b.device);
    stamp(g, gx, gy, s, x0, KEYHOLE.x, KEYHOLE.y, d, "#0A1038");
  }

  root.Castle = {
    draw:  function (g, x, y, kind, s) { paint(g, x, y, kind, s, 0, W - 1); },
    tower: function (g, x, y, kind, s) { paint(g, x, y, kind, s, 0, 33); },
    /* ---------------------------------------------------------------
       A block prised out of the wall, with a gem set in it.

       Symmetry reads as a tile rather than a rock, so the silhouette is
       deliberately lopsided: a square shoulder on the left, a corner
       knocked off the right. Light falls from the upper left, and the
       gem is the only saturated colour on the sprite — which is what
       makes it read as set INTO the stone rather than painted on.

       Pink for a stone won at a Wordsmith gate, yellow at a Numbersmith
       gate, white for the keystone. Before a gate is passed the rock is
       an outline and the gem is not there at all.
    ----------------------------------------------------------------*/
    /* a green mound for a castle to stand on */
    hill: function (g, x, y, w, h) {
      for (var i = 0; i < w; i++) {
        var t = Math.min(1, Math.min(i, w - 1 - i) / 8);
        var top = Math.round(y + h - h * (0.35 + 0.65 * t));
        g.fillStyle = GRASS.body; g.fillRect(x + i, top, 1, y + h - top);
        g.fillStyle = GRASS.lit;  g.fillRect(x + i, top, 1, 2);
      }
    },
    stoneGrid: STONE_GRID,
    stone: function (g, x, y, kind, s, filled) {
      s = s || 1;
      var gem = STONE_GEM[kind] || STONE_GEM[BANNER_ALIAS[kind]] || STONE_GEM.key;
      for (var r = 0; r < STONE_GRID.length; r++) {
        for (var c = 0; c < STONE_GRID[r].length; c++) {
          var ch = STONE_GRID[r].charAt(c);
          if (ch === ".") continue;
          var col;
          if (!filled) {
            /* Not yet won: an empty socket in the span. Drawn dark rather
               than pale, because a white outline vanishes against a bright
               sky — which is exactly where the top of the arch sits. */
            if (ch === "o") col = "rgba(4,10,34,0.55)";
            else if (ch === "l" || ch === "b" || ch === "d") col = "rgba(4,10,34,0.16)";
            else col = null;
          } else if (ch === "g") col = gem.body;
          else if (ch === "G") col = gem.core;
          else if (ch === "*") col = gem.lit;
          else col = { o: STONE.ink, l: STONE.lit, b: STONE.body, d: STONE.low }[ch];
          if (!col) continue;
          g.fillStyle = col;
          g.fillRect(x + c * s, y + r * s, s, s);
        }
      }
    },

    /* the 5x5 devices, so anything else can draw a key or a chip */
    device: function (kind) {
      var d = DEVICE[kind] || DEVICE[BANNER_ALIAS[kind]];
      return d ? d.slice() : null;      /* null, not a silent wrong glyph */
    },
    size:   { w: W, h: H, towerW: 34 },
    stoneW: STONE_GRID[0].length, stoneH: STONE_GRID.length,
    colours: { stone: STONE, banner: BANNER, gate: GATE, grass: GRASS },
    grid:   GRID
  };
})(typeof window !== "undefined" ? window : this);
