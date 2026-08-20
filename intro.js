/* ===================================================================
   INTRO  —  the story, in eight beats

   Spoken by the sphinx, using the same voice the word locks use, so she
   is not an intro device but a character the child meets again at every
   word gate for the rest of the game.

   Three channels carry the same story: voice, text and picture. A weak
   reader gets it from the voice and the image; a tablet with no speech
   still works from the text and the image. This is a game partly about
   learning to read, so a wall of prose would shut out exactly the child
   it is for.

   ---------------------------------------------------------------
   REPLACING THE ART
   ---------------------------------------------------------------
   Every beat has a draw(g, W, H, t) below and nothing else depends on
   it. Swap one at a time; the machinery will not notice.

       g  a 2D context, W x H = 240 x 140, pixellated
       t  milliseconds since the beat appeared, for anything that moves

   Or from outside:  Intro.setArt(4, function(g,W,H,t){ ... })

   The placeholders here are deliberately plain. They are scaffolding,
   not a proposal.
=================================================================== */
(function (root) {
  "use strict";

  var store = (function () {
    var mem = {};
    try {
      var k = "__t"; localStorage.setItem(k, "1"); localStorage.removeItem(k);
      return { get: function (n) { try { return localStorage.getItem(n); } catch (e) { return mem[n] || null; } },
               set: function (n, v) { try { localStorage.setItem(n, v); } catch (e) { mem[n] = v; } } };
    } catch (e) { return { get: function (n) { return mem[n] || null; }, set: function (n, v) { mem[n] = v; } }; }
  })();
  var BASEKEY = "carry.intro";
  function KEY() { return root.Profile ? root.Profile.key(BASEKEY) : BASEKEY; }

  var W = 240, H = 140;
  var P = {
    sky:"#0C1442", night:"#07102E", ink:"#040A22", white:"#FFFFFF",
    word:"#C77DFF", wordDark:"#5B3A80", num:"#FFD52E", numDark:"#8A6E14",
    stone:"#A9713C", stoneHi:"#D6A06A", stoneLo:"#6E4522",
    grass:"#31A94F", grassLo:"#22833C", river:"#123A6B", riverHi:"#1E5490",
    sand:"#E8C87A", sandLo:"#C9A85E"
  };

  /* ---- helpers shared by the placeholders ---- */
  function bg(g, top, bottom) {
    g.fillStyle = top; g.fillRect(0, 0, W, H);
    if (bottom) { g.fillStyle = bottom; g.fillRect(0, H - 26, W, 26); }
  }
  function tower(g, x, base, h, w, col, dark) {
    g.fillStyle = dark; g.fillRect(x - 1, base - h - 1, w + 2, h + 1);
    g.fillStyle = col;  g.fillRect(x, base - h, w, h);
    for (var y = base - h + 4; y < base - 3; y += 6) { g.fillStyle = dark; g.fillRect(x + 2, y, 2, 2); }
  }
  /* The transcribed castle if castle.js is present; the old block towers
     if it is not, so this file never depends on it. */
  function kingdom(g, x, base, col, dark, kind) {
    if (root.Castle) {
      root.Castle.draw(g, x - 2, base - root.Castle.size.h, kind || "word", 1);
      return;
    }
    tower(g, x, base, 22, 9, col, dark);
    tower(g, x + 12, base, 32, 12, col, dark);
    tower(g, x + 27, base, 18, 8, col, dark);
    g.fillStyle = col; g.fillRect(x - 2, base, 42, 3);
  }
  function keep(g, x, base, col, dark, kind) {
    if (root.Castle) {
      root.Castle.tower(g, x, base - root.Castle.size.h, kind || "word", 1);
      return;
    }
    tower(g, x + 6, base, 32, 12, col, dark);
  }

  /* the same blue stone the maze walls are drawn in — they are the same walls */
  function wallBlock(g, x, y, w, h) {
    g.fillStyle = "#12225A"; g.fillRect(x, y, w, h);
    g.fillStyle = "#24408C"; g.fillRect(x + 1, y + 1, w - 2, h - 2);
    g.fillStyle = "#4A78D8"; g.fillRect(x + 1, y + 1, w - 2, 1);
  }
  function figure(g, x, y, col) {
    g.fillStyle = P.ink;   g.fillRect(x - 1, y - 1, 8, 13);
    g.fillStyle = col;     g.fillRect(x, y, 6, 5); g.fillRect(x + 1, y + 6, 4, 5);
    g.fillStyle = P.white; g.fillRect(x + 1, y + 2, 4, 2);
  }
  function sphinx(g, cx, base, t) {
    var blink = (t % 3400) > 3200;
    g.fillStyle = P.ink;    g.fillRect(cx - 32, base - 30, 64, 31);
    g.fillStyle = P.sand;   g.fillRect(cx - 30, base - 28, 60, 28);
    g.fillStyle = P.sandLo; g.fillRect(cx - 30, base - 6, 60, 6);
    g.fillRect(cx + 22, base - 34, 8, 8);
    g.fillStyle = P.ink;    g.fillRect(cx - 26, base - 48, 22, 22);
    g.fillStyle = P.sand;   g.fillRect(cx - 24, base - 46, 18, 18);
    g.fillStyle = P.word;   g.fillRect(cx - 26, base - 48, 22, 5);
    g.fillRect(cx - 26, base - 43, 4, 14); g.fillRect(cx - 8, base - 43, 4, 14);
    g.fillStyle = P.ink;
    if (!blink) { g.fillRect(cx - 20, base - 39, 3, 2); g.fillRect(cx - 13, base - 39, 3, 2); }
    else { g.fillRect(cx - 20, base - 38, 3, 1); g.fillRect(cx - 13, base - 38, 3, 1); }
    g.fillRect(cx - 19, base - 34, 8, 1); g.fillRect(cx - 12, base - 35, 1, 1);
    g.fillStyle = P.sand; g.fillRect(cx - 34, base - 8, 10, 8);
    g.fillStyle = P.ink;  g.fillRect(cx - 34, base - 1, 10, 1);
  }
  /* the valley that always divided them, and the hill each kingdom keeps */
  function land(g, W, H) {
    var hillTop = H - 20, valley = H - 8;
    g.fillStyle = "#1F6E33"; g.fillRect(0, valley - 2, W, H - valley + 2);
    g.fillStyle = "#2E9A48"; g.fillRect(0, valley, W, H - valley);
    if (root.Castle) {
      root.Castle.hill(g, 0, hillTop, 52, valley - hillTop + 6);
      root.Castle.hill(g, W - 52, hillTop, 52, valley - hillTop + 6);
    } else {
      g.fillStyle = "#2E9A48";
      g.fillRect(0, hillTop, 46, H - hillTop); g.fillRect(W - 46, hillTop, 46, H - hillTop);
    }
  }
  /* a bridge that was only ever drawn, never built */
  function ghostArch(g, cx, cy, r, colour) {
    g.strokeStyle = colour; g.lineWidth = 1;
    for (var i = 0; i < 7; i++) {
      var a = Math.PI - (i / 6) * Math.PI;
      var x = Math.round(cx + r * Math.cos(a)), y = Math.round(cy - r * Math.sin(a));
      g.strokeRect(x - 5.5, y - 4.5, 11, 9);
    }
  }
  /* an arched door with a device cut through it, as the game draws them */
  function door(g, x, y, colour, glyph) {
    g.fillStyle = P.ink;   g.fillRect(x, y, 36, 52);
    g.fillStyle = "#A9713C"; g.fillRect(x + 3, y + 6, 30, 46);
    g.fillStyle = "#D6A06A"; g.fillRect(x + 7, y + 3, 22, 4);
    g.fillStyle = colour;  g.fillRect(x + 3, y + 6, 30, 3);
    var G = glyph === "#" ? [".#.#.", "#####", ".###.", "#####", ".#.#."]
                          : [".###.", "#...#", "##.##", "#...#", "#...#"];
    g.fillStyle = P.ink;
    for (var j = 0; j < 5; j++)
      for (var i = 0; i < 5; i++)
        if (G[j].charAt(i) === "#") g.fillRect(x + 16 + i * 3, y + 24 + j * 3, 3, 3);
  }
  function arch(g, cx, cy, r, filled) {
    for (var i = 0; i < 7; i++) {
      var a = Math.PI - (i / 6) * Math.PI;
      var x = Math.round(cx + r * Math.cos(a)), y = Math.round(cy - r * Math.sin(a));
      if (filled) wallBlock(g, x - 6, y - 5, 12, 10);
      else { g.strokeStyle = "#2A3A72"; g.lineWidth = 1; g.strokeRect(x - 5.5, y - 4.5, 11, 9); }
    }
  }

  /* =================================================================
     THE EIGHT BEATS
  ================================================================= */
  var BEATS = [
    { line: "Two kingdoms, with a valley between them. The Wordsmiths made stories. The Numbersmiths made sums.",
      draw: function (g, W, H) {
        bg(g, P.sky, null);
        land(g, W, H);
        keep(g, 0, H - 20, P.word, P.wordDark, "word");
        keep(g, W - 34, H - 20, P.num, P.numDark, "number");
      } },

    { line: "Once they meant to bridge that valley. But neither would build to the other's design, and so nothing was built at all.",
      draw: function (g, W, H, t) {
        bg(g, P.sky, null);
        land(g, W, H);
        keep(g, 0, H - 20, P.word, P.wordDark, "word");
        keep(g, W - 34, H - 20, P.num, P.numDark, "number");
        /* two plans for the same arch, neither of them built */
        var blink = (t % 1600) < 800;
        ghostArch(g, W / 2, H - 22, blink ? 44 : 36, blink ? P.word : P.num);
      } },

    { line: "Instead each raised a wall. Neither thought the other should have one, so each answered with more wall, until all the land between was an enormous maze.",
      draw: function (g, W, H, t) {
        bg(g, P.night, null);
        land(g, W, H);
        var n = Math.min(26, Math.floor(t / 90));
        for (var i = 0; i < n; i++) {
          /* they answer each other, one course at a time, from both sides */
          var side = i % 2, k = Math.floor(i / 2);
          var x = side ? (W - 46 - k * 13) : (40 + k * 13);
          wallBlock(g, x, H - 26 - (k % 3) * 8, 11, 8 + (k % 3) * 8);
        }
        keep(g, 0, H - 20, P.word, P.wordDark, "word");
        keep(g, W - 34, H - 20, P.num, P.numDark, "number");
      } },

    { line: "Then a sphinx came, part lion and part woman, because a tangle like that is very hard for a sphinx to walk past.",
      draw: function (g, W, H, t) {
        bg(g, P.night, P.grassLo);
        for (var x = 0; x < W; x += 13) wallBlock(g, x, 26, 11, 22);
        for (x = 6; x < W; x += 26) wallBlock(g, x, 48, 11, 18);
        sphinx(g, W / 2, H - 18, t);
      } },

    { line: "She found the bridge they never built. She pulled a stone from the wall to begin it herself.",
      draw: function (g, W, H, t) {
        bg(g, P.night, null);
        land(g, W, H);
        for (var x = 44; x < W - 44; x += 13) {
          if (x === 44 + 13 * 2) continue;                 /* the gap she just made */
          wallBlock(g, x, H - 24, 11, 12);
        }
        sphinx(g, 74, H - 12, t);
        /* the stone, lifted */
        var lift = Math.min(14, t / 40);
        wallBlock(g, 44 + 13 * 2, H - 26 - lift, 11, 12);
        ghostArch(g, W / 2, H - 22, 40, "#2A3A72");
      } },

    { line: "Then she smiled, and hid the stone instead. Six more followed, each behind a gate of her own.",
      draw: function (g, W, H, t) {
        bg(g, P.night, null);
        land(g, W, H);
        sphinx(g, 40, H - 12, t);
        /* seven gates across the valley, a stone waiting behind each */
        for (var i = 0; i < 7; i++) {
          var x = 74 + i * 22, lit = (Math.floor(t / 260) % 7) === i;
          g.fillStyle = "#040A22"; g.fillRect(x, H - 44, 16, 26);
          g.fillStyle = lit ? P.num : "#3A2E05"; g.fillRect(x + 2, H - 42, 12, 22);
          if (lit) wallBlock(g, x + 3, H - 36, 10, 10);
        }
      } },

    { line: "She fitted the doors with locks, some asking sums and some asking words, and keys that will not turn until you answer. Only someone willing to learn both could ever reach the stones.",
      draw: function (g, W, H) {
        bg(g, P.night, P.grassLo);
        for (var x = 0; x < W; x += 22) wallBlock(g, x, 44, 20, 54);
        /* one door of each kind, side by side */
        door(g, 66, 46, P.num, "#");
        door(g, 138, 46, P.word, "A");
        g.fillStyle = P.num;  g.fillRect(40, 112, 9, 9); g.fillRect(49, 115, 11, 3);
        g.fillStyle = P.word; g.fillRect(191, 112, 9, 9); g.fillRect(180, 115, 11, 3);
      } },

    { line: "The guards of both kingdoms chased her together, deep into the middle. From there she calls out: answer them all, and the bridge is yours. But you must be both. A Wordsmith and a Numbersmith. A Master Smith. That is you.",
      draw: function (g, W, H, t) {
        bg(g, P.night, null);
        land(g, W, H);
        for (var x = 44; x < W - 44; x += 13) wallBlock(g, x, H - 24, 11, 12);
        keep(g, 0, H - 20, P.word, P.wordDark, "word");
        keep(g, W - 34, H - 20, P.num, P.numDark, "number");
        var run = 60 + ((t / 26) % 90);
        sphinx(g, run, H - 14, t);
        figure(g, run - 40, H - 30, P.word);
        figure(g, run - 54, H - 30, P.num);
        ghostArch(g, W / 2, H - 22, 40, "#2A3A72");
      } }
  ];

  /* =================================================================
     Machinery
  ================================================================= */
  var STYLED = false;
  function injectStyle() {
    if (STYLED) return; STYLED = true;
    var css = [
      '.in-wrap{position:fixed;inset:0;z-index:90;display:none;align-items:center;',
      ' justify-content:center;padding:16px;background:rgba(4,10,34,.94)}',
      '.in-wrap.on{display:flex}',
      '.in-card{width:100%;max-width:430px;background:#0C1442;border:4px solid #FFFFFF;',
      ' box-shadow:0 0 0 4px #040A22;padding:16px}',
      '.in-art{display:block;width:100%;height:auto;image-rendering:pixelated;',
      ' border:3px solid #040A22;background:#07102E}',
      '.in-line{font-family:"Silkscreen","Press Start 2P",monospace;font-size:1rem;',
      ' line-height:1.6;color:#FFFFFF;margin:14px 2px 10px;min-height:5.4em}',
      '.in-foot{display:flex;align-items:center;justify-content:space-between;gap:10px}',
      '.in-dots{display:flex;gap:5px}',
      '.in-dot{width:8px;height:8px;border:2px solid #33407F;background:#0A1038}',
      '.in-dot.on{background:#FFD52E;border-color:#FFFFFF}',
      '.in-skip{font-family:"Press Start 2P",monospace;font-size:.44rem;background:none;',
      ' color:#8FA3D8;border:0;border-bottom:2px solid #8FA3D8;padding:0 0 2px;cursor:pointer}',
      '.in-skip:hover{color:#FFFFFF;border-color:#FFFFFF}',
      '.in-hint{font-family:"Press Start 2P",monospace;font-size:.44rem;color:#8FA3D8;',
      ' margin:12px 0 0;letter-spacing:.08em;text-align:center}',
      '.in-hint.dim{opacity:.4}',
      '.in-card :focus-visible{outline:3px solid #FFD52E;outline-offset:3px}'
    ].join("\n");
    var st = document.createElement("style");
    st.setAttribute("data-intro", "1");
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  function seen() { return store.get(KEY()) === "1"; }
  function markSeen() { store.set(KEY(), "1"); }

  /* She borrows the word drill's voice, so the child meets her here and
     hears the same voice again at every word gate. */
  function speak(text) {
    try {
      if (root.WordChallengeState && root.WordChallengeState.say) {
        root.WordChallengeState.say(text, function () {});
        return true;
      }
    } catch (e) {}
    return false;
  }
  function hush() { try { if (root.speechSynthesis) root.speechSynthesis.cancel(); } catch (e) {} }

  function play(onDone) {
    injectStyle();
    var touch = !!(root.matchMedia && root.matchMedia("(pointer: coarse)").matches);

    var wrap = document.createElement("div");
    wrap.className = "in-wrap on";
    wrap.innerHTML =
      '<div class="in-card">' +
      '<canvas class="in-art" width="' + W + '" height="' + H + '"></canvas>' +
      '<p class="in-line"></p>' +
      '<div class="in-foot"><div class="in-dots"></div>' +
      '<button type="button" class="in-skip">SKIP STORY</button></div>' +
      '<p class="in-hint">' + (touch ? "TAP TO GO ON" : "PRESS ANY KEY") + '</p>' +
      '</div>';
    document.body.appendChild(wrap);

    var art = wrap.querySelector(".in-art"), g = art.getContext("2d");
    var lineEl = wrap.querySelector(".in-line");
    var dotsEl = wrap.querySelector(".in-dots");
    var hintEl = wrap.querySelector(".in-hint");
    var skipEl = wrap.querySelector(".in-skip");

    var i = -1, t0 = 0, raf = 0, done = false;
    for (var d = 0; d < BEATS.length; d++) {
      var dot = document.createElement("div"); dot.className = "in-dot"; dotsEl.appendChild(dot);
    }
    function paintDots() {
      for (var k = 0; k < dotsEl.children.length; k++)
        dotsEl.children[k].className = "in-dot" + (k <= i ? " on" : "");
    }
    function frame(now) {
      if (done) return;
      if (g.imageSmoothingEnabled !== undefined) g.imageSmoothingEnabled = false;
      try { BEATS[i].draw(g, W, H, now - t0); }
      catch (e) { g.fillStyle = "#07102E"; g.fillRect(0, 0, W, H); }
      raf = requestAnimationFrame(frame);
    }
    function advance() {
      if (done) return;
      i++;
      if (i >= BEATS.length) { finish(); return; }
      hush();
      lineEl.textContent = BEATS[i].line;
      speak(BEATS[i].line);
      paintDots();
      hintEl.className = "in-hint" + (i === 0 ? "" : " dim");
      t0 = (root.performance || Date).now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
      /* Sound hook: a page-turn blip belongs here once sounds are wired. */
    }
    function finish() {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      hush();
      document.removeEventListener("keydown", onKey, true);
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      markSeen();
      if (typeof onDone === "function") onDone();
    }
    /* Any key advances, which quietly teaches the action key before any
       lock depends on it. Escape leaves outright. */
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); finish(); return; }
      e.preventDefault(); e.stopPropagation();
      advance();
    }
    function onTap(e) { if (e.target !== skipEl) advance(); }
    document.addEventListener("keydown", onKey, true);
    wrap.addEventListener("pointerdown", onTap);
    skipEl.addEventListener("click", function (e) { e.stopPropagation(); finish(); });

    advance();
    return { skip: finish };
  }

  root.Intro = {
    play: play,
    seen: seen,
    reset: function () { store.set(KEY(), "0"); },
    beats: function () { return BEATS.map(function (b) { return b.line; }); },
    /* swap one beat's art without touching anything else */
    setArt: function (index, fn) { if (BEATS[index] && typeof fn === "function") BEATS[index].draw = fn; },
    size: { w: W, h: H }
  };
})(typeof window !== "undefined" ? window : this);
