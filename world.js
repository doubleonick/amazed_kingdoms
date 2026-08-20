/* ===================================================================
   WORLD  —  the background is the board

   Everything that used to sit in a panel now sits behind the game. The
   two kingdoms stand on hills at the edges of the screen, the bridge
   arches over the maze window, the title hangs in the sky, and when the
   bridge is finished the fireworks go off across the whole page rather
   than inside a little card.

   The maze is a window cut into the land, so the arch springs from
   hilltop to hilltop and passes over it. Stones fill inward from both
   banks — pink from the Wordsmith side, yellow from the Numbersmith —
   with the keystone last.

       World.attach(canvas)
       World.setState({stones, keystone, theme, mazeRect})
       World.celebrate(true|false)
       World.roomy()      is there space beside the app for any of this?

   When the viewport is too narrow for hills and castles, roomy() goes
   false and the host puts its compact bridge back in the panel — the
   progress must be visible on a phone as much as on a desk.
=================================================================== */
(function (root) {
  "use strict";

  var cv = null, ctx = null, raf = 0;
  var S = {
    stones: { word: 0, number: 0 },
    keystone: false,
    total: 7, perSide: 3,
    theme: null,
    mazeRect: null,
    celebrating: false,
    /* the readouts that used to sit in a panel */
    hud: { maze: 1, locks: "0/0", keys: [], land: "", gate: "", player: "" }
  };
  var sparks = [], t0 = 0;

  var SKY_DEFAULT = ["#8FD4FF", "#5CB8FF", "#1B4FD6"];
  var GRASS = { lit: "#3DC45C", body: "#2E9A48", low: "#1F6E33" };
  var STONE = { body: "#24408C", lit: "#4A78D8", low: "#12225A", ink: "#040A22" };
  var BANNER = { word: "#FF6BB3", number: "#FFD52E" };

  function dpr() { return Math.min(2, root.devicePixelRatio || 1); }

  function attach(canvas) {
    cv = canvas;
    ctx = cv.getContext("2d");
    resize();
    root.addEventListener("resize", resize);
    /* the pixel font arrives late; repaint once it has */
    if (root.document && root.document.fonts && root.document.fonts.ready)
      root.document.fonts.ready.then(function () { draw(); });
    return cv;
  }

  function resize() {
    if (!cv) return;
    var r = dpr();
    cv.width = Math.floor(root.innerWidth * r);
    cv.height = Math.floor(root.innerHeight * r);
    cv.style.width = root.innerWidth + "px";
    cv.style.height = root.innerHeight + "px";
    draw();
  }

  /* how much room there is beside the game column */
  function sideRoom() {
    var appW = 560;
    if (S.mazeRect && S.mazeRect.width) appW = S.mazeRect.width;
    return (root.innerWidth - appW) / 2;
  }
  /* Two separate questions, and conflating them is what dragged the whole
     HUD panel back onto the screen:

       roomy()      is there room BESIDE the game for hills and readouts?
                    if so the sky carries the HUD and the panel goes away
       bridgeFits() is there room BELOW the game for a span?
                    if not, only the bridge falls back — not everything else
  */
  function roomy() { return sideRoom() >= 120; }

  function bandBelow() {
    var H = root.innerHeight;
    var appBottom = (S.mazeRect && S.mazeRect.appBottom) || Math.round(H * 0.62);
    var groundY = H - Math.max(64, Math.round(H * 0.12));
    return groundY - (appBottom + 10);
  }
  function bridgeFits() { return roomy() && bandBelow() >= 44; }

  /* wide enough to stand a castle on, and never wider than the room beside
     the game column plus a little overlap behind it */
  function hillW() {
    var want = (root.Castle ? root.Castle.size.w : 64) + 60;
    return Math.max(want, Math.min(340, Math.round(sideRoom() * 1.25)));
  }

  /* =================================================================
     Geometry: where the land and the arch sit
  ================================================================= */
  /* Only stand a castle on ground that can hold it: if the flat top is not
     wide enough for the whole thing, show the keep alone rather than let
     the curtain wall hang over the edge. */
  function castleFit(L) {
    var C = root.Castle;
    if (!C) return { s: 1, w: 34, full: false };
    var s;
    for (s = 2; s >= 1; s--) if (C.size.w * s + 8 <= L.plateau) return { s: s, w: C.size.w * s, full: true };
    for (s = 2; s >= 1; s--) if (C.size.towerW * s + 8 <= L.plateau) return { s: s, w: C.size.towerW * s, full: false };
    return { s: 1, w: C.size.towerW, full: false };
  }

  /* =================================================================
     WHERE THE BRIDGE GOES

     An arch that spans the middle of the screen loses to the middle of
     the screen: the maze window hides the stones near the apex and the
     title scroll hides the keystone. So the bridge is put where nothing
     else is — the clear band BELOW the game column and above the ground.

     That is also what a long bridge actually looks like: a wide, shallow
     span rather than a tall semicircle. The castles stand outboard of it
     on their hills, and the arch springs from inside them, so a stone is
     never mistaken for a wall.
  ================================================================= */
  function layout() {
    var W = root.innerWidth, H = root.innerHeight;
    var groundH = Math.max(64, Math.round(H * 0.12));
    var groundY = H - groundH;
    var hw = hillW();

    /* the band between the bottom of the game and the ground */
    var appBottom = (S.mazeRect && S.mazeRect.appBottom) || Math.round(H * 0.62);
    var bandTop = appBottom + 14;
    var bandH = groundY - bandTop;

    /* hilltops sit just above the ground; the arch rises through the band */
    var hillTop = groundY - Math.max(18, Math.round(bandH * 0.28));
    /* a shallow band gives a flat span rather than no span at all */
    var rise = Math.max(16, Math.min(120, bandH - 22));
    var apexY = hillTop - rise;

    var cx = W / 2;
    /* spring the arch inboard of the castles so the two never overlap */
    var rx = Math.max(80, cx - hw * 0.92);

    var L = { W: W, H: H, groundY: groundY, groundH: groundH,
              hw: hw, hillTop: hillTop, cx: cx, rx: rx, ry: rise,
              bandTop: bandTop, bandH: bandH, apexY: apexY,
              plateau: 0, fit: null };
    L.plateau = Math.round(hw * 0.72);
    L.fit = castleFit(L) || { s: 1, w: 34, full: false };
    return L;
  }

  /* A shallow segmental arch, not a semicircle — the ends stay near the
     hilltops and only the middle lifts, which is what fits a wide, short
     band and what a long bridge actually looks like. */
  function stonePos(i, L) {
    var u = i / (S.total - 1);              /* 0..1 across the span */
    var lift = Math.sin(u * Math.PI);       /* 0 at the banks, 1 at the middle */
    return { x: Math.round(L.cx + L.rx * (u * 2 - 1)),
             y: Math.round(L.hillTop - L.ry * lift) };
  }
  function stoneFilled(i) {
    if (i === S.perSide) return S.keystone;
    if (i < S.perSide) return S.stones.word >= (i + 1);
    return S.stones.number >= (S.total - i);
  }

  /* =================================================================
     Painting
  ================================================================= */
  function sky(g, L, t) {
    var cols = (S.theme && S.theme.sky) || SKY_DEFAULT;
    var grad = g.createLinearGradient(0, 0, 0, L.H);
    grad.addColorStop(0, cols[0]);
    grad.addColorStop(0.45, cols[1]);
    grad.addColorStop(1, cols[2]);
    g.fillStyle = grad;
    g.fillRect(0, 0, L.W, L.H);
    if (!S.celebrating) return;
    /* dusk for the ending, so the fireworks have something to sit on */
    g.fillStyle = "rgba(20,8,52,0.55)";
    g.fillRect(0, 0, L.W, L.H);
    for (var i = 0; i < 70; i++) {
      var sx = (i * 137) % L.W, sy = (i * 89) % Math.round(L.H * 0.7);
      g.fillStyle = ((t / 500 + i) % 6 < 3) ? "#FFFFFF" : "#9A8FD8";
      g.fillRect(sx, sy, 2, 2);
    }
  }

  function fireworks(g, L, t) {
    while (sparks.length < 9) {
      sparks.push({ x: 30 + Math.random() * (L.W - 60),
                    y: 30 + Math.random() * (L.H * 0.5),
                    t0: t + Math.random() * 2200,
                    hue: ["#FFD52E", "#FF6BB3", "#3DDC84", "#8FD4FF"][(Math.random() * 4) | 0] });
    }
    sparks.forEach(function (s) {
      var age = t - s.t0;
      if (age < 0) return;
      if (age > 1600) {
        s.t0 = t + Math.random() * 2600;
        s.x = 30 + Math.random() * (L.W - 60);
        s.y = 30 + Math.random() * (L.H * 0.5);
        s.hue = ["#FFD52E", "#FF6BB3", "#3DDC84", "#8FD4FF"][(Math.random() * 4) | 0];
        return;
      }
      var r = age / 1600 * 34, fade = 1 - age / 1600;
      g.fillStyle = s.hue;
      for (var k = 0; k < 14; k++) {
        var a = k / 14 * Math.PI * 2;
        if (Math.random() > fade * 1.3) continue;
        g.fillRect(Math.round(s.x + Math.cos(a) * r), Math.round(s.y + Math.sin(a) * r), 3, 3);
      }
    });
  }

  function ground(g, L) {
    var checker = (S.theme && S.theme.checker) || ["#31A94F", "#22833C"];
    var c = 24;
    for (var y = L.groundY; y < L.H; y += c) {
      for (var x = 0; x < L.W; x += c) {
        var odd = (Math.floor(x / c) + Math.floor(y / c)) % 2;
        g.fillStyle = odd ? checker[1] : checker[0];
        g.fillRect(x, y, c, c);
      }
    }
    g.fillStyle = STONE.ink;
    g.fillRect(0, L.groundY - 3, L.W, 3);
  }

  /* A hill with a flat top wide enough to stand a castle on, drawn in the
     same checkerboard as the ground — it is the same land, so it should be
     the same grass. */
  function hillTopAt(i, w, plateau, topY, baseY) {
    var slope = Math.max(1, (w - plateau) / 2);
    var t = i < slope ? (i / slope)
          : (i > w - slope ? ((w - i) / slope) : 1);
    t = Math.max(0, Math.min(1, t));
    /* ease it, so the shoulders curve rather than ramp */
    t = t * t * (3 - 2 * t);
    return Math.round(baseY - (baseY - topY) * t);
  }

  function hill(g, x, w, plateau, topY, baseY, checker) {
    var c = 24;
    for (var i = 0; i < w; i++) {
      var top = hillTopAt(i, w, plateau, topY, baseY);
      var gx = x + i;
      for (var y = top; y < baseY; y += 1) {
        /* the checker is anchored to the page, so hill and ground line up */
        var odd = (Math.floor(gx / c) + Math.floor(y / c)) % 2;
        g.fillStyle = odd ? checker[1] : checker[0];
        g.fillRect(gx, y, 1, 1);
      }
      /* a lit crown along the surface */
      g.fillStyle = GRASS.lit; g.fillRect(gx, top, 1, 3);
      g.fillStyle = STONE.ink; g.fillRect(gx, top - 1, 1, 1);
    }
  }

  /* stood on the flat top, at whatever size that ground can carry */
  function castles(g, L) {
    var C = root.Castle;
    if (!C) return;
    var f = L.fit, h = C.size.h * f.s;
    /* outboard of where the arch springs, so a castle and a stone can
       never be mistaken for one another */
    var lx = Math.round(L.hw * 0.45 - f.w / 2);
    var rx = Math.round(L.W - L.hw * 0.45 - f.w / 2);
    var y = L.hillTop - h + 3;
    if (f.full) { C.draw(g, lx, y, "word", f.s); C.draw(g, rx, y, "number", f.s); }
    else { C.tower(g, lx, y, "word", f.s); C.tower(g, rx, y, "number", f.s); }
  }

  function bridge(g, L, t) {
    var C = root.Castle;
    for (var i = 0; i < S.total; i++) {
      var p = stonePos(i, L), on = stoneFilled(i), key = (i === S.perSide);
      var kind = key ? "key" : (i < S.perSide ? "word" : "number");
      if (C && C.stone) {
        /* the rock is 13x9, drawn at 2x so it reads across the whole sky */
        var s = 2;
        C.stone(g, p.x - C.stoneW * s / 2, p.y - C.stoneH * s / 2, kind, s, on);
      } else {
        var w = 26, h = 20;
        if (on) { g.fillStyle = STONE.body; g.fillRect(p.x - w / 2, p.y - h / 2, w, h); }
        else { g.strokeStyle = "rgba(255,255,255,0.28)"; g.lineWidth = 2;
               g.strokeRect(p.x - w / 2, p.y - h / 2, w, h); }
      }
    }
    /* the two kingdoms walk out to meet once it stands */
    if (!S.celebrating) return;
    var walk = Math.min(1, Math.max(0, (t - 900) / 4200));
    function figure(u, col) {
      var a = Math.PI - (u * 0.5) * Math.PI;
      var x = Math.round(L.cx + L.rx * Math.cos(a));
      var y = Math.round(L.hillTop - L.ry * Math.sin(a)) - 20;
      var bob = (walk < 1 && Math.floor(t / 170) % 2) ? 2 : 0;
      g.fillStyle = STONE.ink; g.fillRect(x - 6, y - 2 + bob, 14, 24);
      g.fillStyle = col;       g.fillRect(x - 4, y + bob, 10, 9);
      g.fillRect(x - 2, y + 11 + bob, 6, 9);
      g.fillStyle = "#FFFFFF"; g.fillRect(x - 2, y + 3 + bob, 6, 4);
    }
    figure(walk * 0.98, BANNER.word);
    figure(2 - walk * 0.98, BANNER.number);
  }

  /* =================================================================
     THE READOUTS

     Keys, zone and progress live in the top corners of the sky rather
     than in a panel, so the whole page is the game and the panels are
     only the things you touch.
  ================================================================= */
  function pixelFont(g, size) {
    g.font = size + 'px "Press Start 2P", monospace';
    g.textBaseline = "top";
  }
  function shadowText(g, text, x, y, col, align) {
    g.textAlign = align || "left";
    g.fillStyle = "rgba(4,10,34,0.55)";
    g.fillText(text, x + 2, y + 2);
    g.fillStyle = col;
    g.fillText(text, x, y);
  }
  function keyChip(g, x, y, kind, spent) {
    var s = 2, dev = root.Castle ? root.Castle.device(kind) : null;
    g.globalAlpha = spent ? 0.32 : 1;
    g.fillStyle = "#040A22"; g.fillRect(x, y, 5 * s + 6, 5 * s + 6);
    g.fillStyle = "#FFD52E"; g.fillRect(x + 1, y + 1, 5 * s + 4, 5 * s + 4);
    if (dev) {
      g.fillStyle = "#040A22";
      for (var j = 0; j < dev.length; j++)
        for (var i = 0; i < dev[j].length; i++)
          if (dev[j].charAt(i) === "#") g.fillRect(x + 3 + i * s, y + 3 + j * s, s, s);
    }
    g.globalAlpha = 1;
    return 5 * s + 10;
  }
  function hud(g, L) {
    var h = S.hud, pad = Math.max(14, Math.round(L.W * 0.02));
    var lab = "#0A1C4A", val = "#FFFFFF", gold = "#FFD52E";

    /* left: where you are and how much of this maze is done */
    pixelFont(g, 9);
    shadowText(g, "MAZE", pad, 16, lab);
    shadowText(g, "LOCKS", pad + 92, 16, lab);
    pixelFont(g, 15);
    shadowText(g, String(h.maze), pad, 30, gold);
    shadowText(g, h.locks, pad + 92, 30, gold);
    pixelFont(g, 9);
    shadowText(g, "KEYS", pad, 58, lab);
    var kx = pad;
    for (var i = 0; i < h.keys.length && i < 8; i++)
      kx += keyChip(g, kx, 72, h.keys[i].kind, h.keys[i].spent);

    /* right: the land, and how far to the next gold gate */
    /* Right column, ending above the button row that sits at 52px — the
       speaker and the player name live there, and text must not run into
       them. */
    var rx = L.W - pad;
    pixelFont(g, 9);
    if (h.land) shadowText(g, h.land, rx, 14, lab, "right");
    pixelFont(g, 11);
    shadowText(g, h.gate, rx, h.land ? 28 : 18, val, "right");
    g.textAlign = "left";
  }

  /* The scroll hangs near the top of the sky at a fixed height, rather
     than floating in the middle of whatever gap happens to be above the
     game. That lets the gap below it grow into open sky without dragging
     the title down with it. */
  function title(g, L) {
    if (!root.Title) return;
    var s = L.W < 560 ? 2 : 3;
    var m = root.Title.measure(s);
    root.Title.draw(g, Math.round((L.W - m.w) / 2), Math.round(L.H * 0.012) + 8, s);
  }

  /* =================================================================
     Draw
  ================================================================= */
  var drawFaulted = false;
  function draw() {
    if (!ctx) return;
    try { paintAll(); }
    catch (e) {
      if (!drawFaulted) { drawFaulted = true;
        try { console.error("Am+zed Kingdoms: the background failed —", e); } catch (x) {} }
    }
  }
  function paintAll() {
    var L = layout(), t = S.celebrating ? (performance.now() - t0) : 0;
    var r = dpr();
    ctx.setTransform(r, 0, 0, r, 0, 0);
    if (ctx.imageSmoothingEnabled !== undefined) ctx.imageSmoothingEnabled = false;

    sky(ctx, L, t);
    if (S.celebrating) fireworks(ctx, L, t);
    ground(ctx, L);

    if (roomy()) {
      var checker = (S.theme && S.theme.checker) || ["#31A94F", "#22833C"];
      hill(ctx, 0, L.hw, L.plateau, L.hillTop, L.groundY + 6, checker);
      hill(ctx, L.W - L.hw, L.hw, L.plateau, L.hillTop, L.groundY + 6, checker);
      castles(ctx, L);
      if (bridgeFits()) bridge(ctx, L, t);
    }
    title(ctx, L);
    if (roomy()) hud(ctx, L);
  }

  function loop() {
    draw();
    if (S.celebrating) raf = requestAnimationFrame(loop);
  }

  root.World = {
    attach: attach,
    draw: draw,
    resize: resize,
    roomy: roomy,
    bridgeFits: bridgeFits,
    bandBelow: bandBelow,
    setState: function (o) {
      o = o || {};
      if (o.stones) S.stones = o.stones;
      if (typeof o.keystone === "boolean") S.keystone = o.keystone;
      if (o.theme) S.theme = o.theme;
      if (o.mazeRect) S.mazeRect = o.mazeRect;
      if (o.hud) S.hud = o.hud;
      if (typeof o.total === "number") S.total = o.total;
      if (typeof o.perSide === "number") S.perSide = o.perSide;
      draw();
    },
    celebrate: function (on) {
      S.celebrating = !!on;
      cancelAnimationFrame(raf);
      if (on) { t0 = performance.now(); sparks = []; loop(); }
      else draw();
    },
    state: function () { return JSON.parse(JSON.stringify(S)); }
  };
})(typeof window !== "undefined" ? window : this);
