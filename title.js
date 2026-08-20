/* ===================================================================
   TITLE  —  AM+ZED KINGDOMS on a scroll

   A pixel blackletter, drawn as a grid so it belongs to the same world
   as the castle and the keys. Blackletter at this size is not a font
   choice, it is three rules:

     - stems are two pixels wide and dead vertical
     - every stroke END gets a diamond, which is what the broad nib
       leaves behind; that is the whole look
     - the few diagonals stay short and steep, or the letter turns to mush

   Amazed already contains maze, which is the joke: the land was made
   into one. The A is the Wordsmith device and the + is the Numbersmith
   device, so the title is the two kingdoms standing side by side, and
   everything between them is white.

       Title.draw(g, x, y, scale)
       Title.measure(scale) -> {w,h}
=================================================================== */
(function (root) {
  "use strict";

  /* 9 rows. Row 0 and row 8 carry the terminals. */
  var GLYPH = {
    "A": ["..#####..",
          ".##...##.",
          "##.....##",
          "##.....##",
          "#########",
          "##.....##",
          "##.....##",
          "##.....##",
          "#.#...#.#"],
    "M": ["#.#.....#",
          "###...###",
          "#####.###",
          "##.###.##",
          "##..#..##",
          "##.....##",
          "##.....##",
          "##.....##",
          "#.#...#.#"],
    "Z": ["#########",
          "#.....##.",
          ".....##..",
          "....##...",
          "...##....",
          "..##.....",
          ".##......",
          "##.....#.",
          "#########"],
    "E": ["#########",
          "##.....#.",
          "##.......",
          "##.......",
          "#######..",
          "##.......",
          "##.......",
          "##.....#.",
          "#########"],
    "D": ["######...",
          "##..##...",
          "##...##..",
          "##....##.",
          "##....##.",
          "##....##.",
          "##...##..",
          "##..##...",
          "######..."],
    "K": ["#.#...#.#",
          "##...##..",
          "##..##...",
          "##.##....",
          "####.....",
          "##.##....",
          "##..##...",
          "##...##..",
          "#.#...#.#"],
    "I": ["#.#####.#",
          "...###...",
          "...###...",
          "...###...",
          "...###...",
          "...###...",
          "...###...",
          "...###...",
          "#.#####.#"],
    "N": ["#.#...#.#",
          "###....##",
          "####...##",
          "##.##..##",
          "##..##.##",
          "##...####",
          "##....###",
          "##.....##",
          "#.#...#.#"],
    "G": ["..#####..",
          ".##...##.",
          "##.......",
          "##.......",
          "##..#####",
          "##....##.",
          "##....##.",
          ".##..###.",
          "..#####.#"],
    "O": ["..#####..",
          ".##...##.",
          "##.....##",
          "##.....##",
          "##.....##",
          "##.....##",
          "##.....##",
          ".##...##.",
          "..#####.."],
    "S": ["..######.",
          ".##....#.",
          "##.......",
          ".###.....",
          "...###...",
          ".....###.",
          ".......##",
          "#....##..",
          ".######.."],
    /* A plus, not a starburst. The old glyph flared to a diamond in the
       middle, welding the two strokes into a blob. The arms now hold one
       width the whole way across, and that width matches the 2px stems of
       the letters beside it, so the cross reads as a cross. */
    "+": ["....##...",
          "....##...",
          "....##...",
          "....##...",
          "#########",
          "#########",
          "....##...",
          "....##...",
          "....##..."],
    " ": ["_________"]
  };

  var GH = 9;
  var SPACE = 5;     /* blank columns for a word gap */
  var GAP = 2;       /* columns between letters */

  var C = {
    scroll:   "#F2E9D0",     /* slightly off white, like old paper        */
    scrollLo: "#E0D3B2",
    edge:     "#040A22",
    roll:     "#C9B888",
    rollLo:   "#A8905F",
    ink:      "#2A2620",
    pink:     "#FF6BB3",
    yellow:   "#FFD52E"
  };

  function glyphWidth(ch) {
    if (ch === " ") return SPACE;
    var g = GLYPH[ch.toUpperCase()];
    return g ? g[0].length : SPACE;
  }
  function lineWidth(text) {
    var w = 0;
    for (var i = 0; i < text.length; i++) {
      w += glyphWidth(text.charAt(i));
      if (i < text.length - 1) w += GAP;
    }
    return w;
  }

  /* which colour a letter is: the two devices, everything else ink */
  function colourFor(ch, i, text) {
    if (ch === "+") return C.yellow;
    if (ch.toUpperCase() === "A" && i === 0) return C.pink;
    return C.ink;
  }

  function drawText(g, text, x, y, s, forceColour) {
    var cx = x;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch === " ") { cx += (SPACE + GAP) * s; continue; }
      var gl = GLYPH[ch.toUpperCase()];
      if (!gl) { cx += (SPACE + GAP) * s; continue; }
      var col = forceColour || colourFor(ch, i, text);
      for (var r = 0; r < GH; r++) {
        for (var c = 0; c < gl[r].length; c++) {
          if (gl[r].charAt(c) !== "#") continue;
          g.fillStyle = col;
          g.fillRect(cx + c * s, y + r * s, s, s);
        }
      }
      cx += (glyphWidth(ch) + GAP) * s;
    }
  }

  var LINE1 = "AM+ZED";
  var LINE2 = "KINGDOMS";
  var ONELINE = "AM+ZED KINGDOMS";

  var PAD_X = 8, PAD_Y = 4, GAP_Y = 4, ROLL = 6, BLEED = 3;

  function stackW() { return Math.max(lineWidth(LINE1), lineWidth(LINE2)) + PAD_X * 2; }
  function stackH() { return GH * 2 + GAP_Y + PAD_Y * 2 + 2; }
  function bannerW() { return lineWidth(ONELINE) + PAD_X * 2; }
  function bannerH() { return GH + PAD_Y * 2 + 2; }

  function measure(s, mode) {
    s = s || 3;
    return mode === "banner"
      ? { w: bannerW() * s, h: bannerH() * s, units: bannerW() }
      : { w: stackW() * s, h: stackH() * s, units: stackW() };
  }

  function sheet(g, x, y, W, H, s) {
    var px = function (a, b, w, h, col) {
      g.fillStyle = col;
      g.fillRect(Math.round(x + a * s), Math.round(y + b * s), Math.round(w * s), Math.round(h * s));
    };
    px(0, 0, W, H, C.edge);
    px(0, 1, W, H - 2, C.scroll);
    px(0, H - 4, W, 3, C.scrollLo);
    for (var i = 0; i < W; i += 3) {
      if ((i / 3) % 2 === 0) { px(i, 1, 2, 1, C.scrollLo); px(i, H - 2, 2, 1, C.scrollLo); }
    }
    /* rolled ends, hanging off both sides */
    var ry = -1, rh = H + 2;
    px(-BLEED - ROLL, ry, ROLL + BLEED, rh, C.edge);
    px(-BLEED - ROLL + 1, ry + 1, ROLL + BLEED - 1, rh - 2, C.roll);
    px(-BLEED - ROLL + 1, ry + 1, ROLL + BLEED - 1, 2, C.rollLo);
    px(W, ry, ROLL + BLEED, rh, C.edge);
    px(W + 1, ry + 1, ROLL + BLEED - 1, rh - 2, C.roll);
    px(W + 1, ry + 1, ROLL + BLEED - 1, 2, C.rollLo);
  }

  /* two lines, short and square — the shape that hangs in the sky */
  function draw(g, x, y, s) {
    s = s || 3;
    var W = stackW(), H = stackH();
    sheet(g, x, y, W, H, s);
    var x1 = x + Math.round((W - lineWidth(LINE1)) / 2) * s;
    var x2 = x + Math.round((W - lineWidth(LINE2)) / 2) * s;
    drawText(g, LINE1, x1, y + PAD_Y * s, s);
    drawText(g, LINE2, x2, y + (PAD_Y + GH + GAP_Y) * s, s, C.ink);
  }

  /* one long line, for anywhere wide */
  function drawBanner(g, x, y, s) {
    s = s || 3;
    var W = bannerW(), H = bannerH();
    sheet(g, x, y, W, H, s);
    drawText(g, ONELINE, x + PAD_X * s, y + PAD_Y * s, s);
  }

  function fit(cv, maxScale, mode) {
    var unit = mode === "banner" ? bannerW() : stackW();
    var s = Math.max(1, Math.min(maxScale || 3, Math.floor(cv.width / (unit + 2 * (ROLL + BLEED)))));
    var m = measure(s, mode);
    var g = cv.getContext("2d");
    if (g.imageSmoothingEnabled !== undefined) g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, cv.width, cv.height);
    var x = Math.round((cv.width - m.w) / 2), y = Math.round((cv.height - m.h) / 2);
    if (mode === "banner") drawBanner(g, x, y, s); else draw(g, x, y, s);
    return s;
  }

  root.Title = {
    draw: draw,
    drawBanner: drawBanner,
    fit: fit,
    measure: measure,
    text: LINE1 + " " + LINE2,
    glyphs: GLYPH,
    colours: C,
    /* for anywhere else that wants the face */
    drawText: drawText,
    lineWidth: lineWidth,
    height: GH
  };
})(typeof window !== "undefined" ? window : this);
