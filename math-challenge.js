/* ===================================================================
   MATH CHALLENGE  —  the number drill as a mountable module

   Implements the contract in CHALLENGE-API.md:
       factory(mount, session, report) -> { focus, abandon, destroy }

   Brings its own CSS so it renders the same inside a lock panel as it
   does on its own page. Owns its adaptive state and its own storage key,
   shared between embedded and standalone play — same child, same skill,
   one ladder.

   Load it after a registry and it registers itself, replacing any
   placeholder. Load it without one and it exports window.MathChallenge
   for a host to call directly.
=================================================================== */
(function (root) {
  "use strict";

  /* ---------------------------------------------------------------
     Storage — guarded, so a blocked or absent localStorage degrades
     to memory instead of throwing.
  ----------------------------------------------------------------*/
  var store = (function () {
    var mem = {};
    try {
      var k = "__t"; localStorage.setItem(k, "1"); localStorage.removeItem(k);
      return {
        get: function (n) { try { return localStorage.getItem(n); } catch (e) { return mem[n] || null; } },
        set: function (n, v) { try { localStorage.setItem(n, v); } catch (e) { mem[n] = v; } }
      };
    } catch (e) {
      return { get: function (n) { return mem[n] || null; }, set: function (n, v) { mem[n] = v; } };
    }
  })();
  /* Profile.key namespaces per-player keys and leaves device ones alone.
     Without profile.js loaded this is the plain key, exactly as before. */
  var BASEKEY = "carry.math";
  function KEY() { return root.Profile ? root.Profile.key(BASEKEY) : BASEKEY; }

  var rand = function (lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); };
  var pow10 = function (k) { return Math.pow(10, k); };
  var width = function (n) { return String(Math.abs(n)).length; };

  /* =================================================================
     ENGINE — unchanged from the standalone drill
  ================================================================= */
  function carries(a, b) { var n = 0; while (a > 0 || b > 0) { if ((a % 10) + (b % 10) >= 10) n++; a = Math.floor(a / 10); b = Math.floor(b / 10); } return n; }
  function borrows(a, b) { var n = 0; while (b > 0) { if ((a % 10) < (b % 10)) n++; a = Math.floor(a / 10); b = Math.floor(b / 10); } return n; }
  function pick(gen, ok) { for (var i = 0; i < 600; i++) { var p = gen(); if (ok(p[0], p[1])) return p; } return gen(); }
  function nDigit(n) { return n === 1 ? rand(1, 9) : rand(pow10(n - 1), pow10(n) - 1); }

  var MAX_PLACES = 5;
  function maxRegroupAt(N) { return N === 1 ? 1 : 2; }

  function wantCount(N, R) {
    if (R === 0) return function (c) { return c === 0; };
    if (R === 1) return function (c) { return c === 1; };
    var need = Math.max(2, N - 1);
    return function (c) { return c >= need; };
  }
  function genAdd(N, R) {
    var ok = wantCount(N, R);
    return pick(function () {
      return [nDigit(N), nDigit(N > 1 && Math.random() < 0.28 ? N - 1 : N)];
    }, function (a, b) { return ok(carries(a, b)); });
  }
  function genSub(N, R) {
    var ok = wantCount(N, R);
    return pick(function () {
      var b = nDigit(N);
      var r = nDigit(N > 1 && Math.random() < 0.35 ? N - 1 : N);
      return [b + r, b];
    }, function (a, b) {
      var w = width(a);
      if (R === 0 && w !== N) return false;
      if (w > N + 1 || w < N) return false;
      return ok(borrows(a, b));
    });
  }
  function targetFor(N, R) { return 1900 + 1400 * N + 500 * R * N; }

  function diagnose(given, truth) {
    var d = Math.abs(given - truth);
    if (d === 0) return null;
    for (var k = 1; k <= 6; k++) { if (d === pow10(k)) return "regroup"; }
    if (d < 10) return "fact";
    if (width(given) !== width(truth)) return "places";
    return "other";
  }

  /* =================================================================
     PERSISTENT STATE — one zone per operation, plus preferences
  ================================================================= */
  function newZone() { return { N: 1, R: 0, axisFail: { places: 0, regroup: 0 }, sinceProbe: 0, win: [] }; }

  var ZONES = { add: newZone(), sub: newZone() };
  var PREFS = { onesFirst: true, ops: { add: true, sub: true } };
  var TALLY = { solved: 0, right: 0, best: 0, streak: 0, times: [] };

  function save() {
    var pack = function (z) { return { N: z.N, R: z.R, fail: z.axisFail, probe: z.sinceProbe }; };
    store.set(KEY(), JSON.stringify({
      v: 2,
      zones: { add: pack(ZONES.add), sub: pack(ZONES.sub) },
      onesFirst: PREFS.onesFirst, ops: PREFS.ops,
      best: TALLY.best, solved: TALLY.solved, right: TALLY.right
    }));
  }
  function load() {
    try {
      var raw = store.get(KEY());
      if (!raw) {
        /* Before the drill became a module its progress lived under "carry".
           Adopt that once rather than silently restarting a child at one
           place. Both the v1 and v2 shapes are handled below. */
        var legacy = store.get("carry");
        if (legacy) { raw = legacy; store.set(KEY(), legacy); }
      }
      var d = JSON.parse(raw || "{}");
      var apply = function (z, src) {
        if (!src) return;
        if (typeof src.N === "number") z.N = Math.max(1, Math.min(MAX_PLACES, src.N));
        if (typeof src.R === "number") z.R = Math.max(0, Math.min(maxRegroupAt(z.N), src.R));
        if (src.fail && typeof src.fail.places === "number")
          z.axisFail = { places: src.fail.places | 0, regroup: src.fail.regroup | 0 };
        if (typeof src.probe === "number") z.sinceProbe = src.probe | 0;
      };
      if (d.zones) { apply(ZONES.add, d.zones.add); apply(ZONES.sub, d.zones.sub); }
      else if (typeof d.N === "number") { apply(ZONES.add, d); apply(ZONES.sub, d); }
      if (typeof d.onesFirst === "boolean") PREFS.onesFirst = d.onesFirst;
      if (d.ops && (d.ops.add || d.ops.sub)) PREFS.ops = d.ops;
      if (typeof d.best === "number") TALLY.best = d.best;
      if (typeof d.solved === "number") TALLY.solved = d.solved;
      if (typeof d.right === "number") TALLY.right = d.right;
    } catch (e) {}
  }
  load();

  /* the ladders in memory belong to whoever was playing; re-read on switch */
  function reload() {
    ZONES = { add: newZone(), sub: newZone() };
    TALLY = { solved: 0, right: 0, best: 0, streak: 0, times: [] };
    load();
  }
  if (root.Profile && root.Profile.onChange) root.Profile.onChange(reload);

  function resetAll() {
    ZONES = { add: newZone(), sub: newZone() };
    TALLY = { solved: 0, right: 0, best: 0, streak: 0, times: [] };
    save();
  }

  /* =================================================================
     ADAPTER — reads the last three answers at the current operation
  ================================================================= */
  function easeOn(z, axis) {
    var N = z.N, R = z.R;
    if (axis === "places" && N > 1) { N--; R = Math.min(R, maxRegroupAt(N)); }
    else if (axis === "regroup" && R > 0) { R--; }
    else if (N > 1) { N--; R = Math.min(R, maxRegroupAt(N)); }
    else if (R > 0) { R--; }
    else return null;
    return [N, R];
  }

  function adapt(z) {
    var w = z.win;
    if (w.length < 2) return null;
    var errors = 0, sum = 0, tags = [], i;
    for (i = 0; i < w.length; i++) {
      if (!w[i].ok) { errors++; if (w[i].tag) tags.push(w[i].tag); }
      sum += w[i].ms;
    }
    var avg = sum / w.length, t = targetFor(z.N, z.R), move = null;

    /* Asymmetric on purpose: two answers can send it down, a clean sweep
       of three is needed to move up. Quick to help, slow to escalate. */
    if (errors >= 2) move = "down";
    else if (errors === 1 && avg > t * 1.4) move = "down";
    else if (errors === 0 && w.length === 3 && avg <= t * 0.7) move = "up";

    if (move === "up") {
      var canWiden = z.N < MAX_PLACES, canDeepen = z.R < maxRegroupAt(z.N);
      if (!canWiden && !canDeepen) return null;
      var axis;
      if (!canWiden) axis = "regroup";
      else if (!canDeepen) axis = "places";
      else axis = (z.axisFail.places <= z.axisFail.regroup) ? "places" : "regroup";
      if (z.axisFail[axis] >= 2) {
        var other = axis === "places" ? "regroup" : "places";
        var otherOpen = other === "places" ? canWiden : canDeepen;
        if (!otherOpen || z.axisFail[other] >= 2) return null;
        axis = other;
      }
      if (axis === "places") z.N++; else z.R++;
      z.win = [];
      return { dir: 1, axis: axis };
    }
    if (move === "down") {
      var choose = tags.indexOf("places") >= 0 ? "places"
        : (tags.indexOf("regroup") >= 0 || tags.indexOf("fact") >= 0) ? "regroup"
        : (avg > t * 1.4 ? "places" : "regroup");
      var next = easeOn(z, choose);
      if (!next) return null;
      var moved = next[0] < z.N ? "places" : "regroup";
      z.N = next[0]; z.R = next[1];
      z.axisFail[moved] = Math.min(3, z.axisFail[moved] + 1);
      z.win = [];
      return { dir: -1, axis: moved };
    }
    return null;
  }

  /* =================================================================
     STYLE — injected once, all selectors namespaced under .mc-root so
     the drill looks identical in a lock panel and on its own page.
  ================================================================= */
  var STYLED = false;
  function injectStyle() {
    if (STYLED) return;
    STYLED = true;
    var css = [
      '.mc-root{',
      '  --mc-mat:#F5F0E4; --mc-line:#C9C1AE; --mc-ink:#2A2620; --mc-edge:#040A22;',
      '  --mc-green:#00843D; --mc-blue:#003DA5; --mc-red:#E4002B;',
      '  --mc-green-t:#00703C; --mc-red-t:#C8102E; --mc-gold:#FFD52E;',
      '  --mc-pixel:"Press Start 2P",monospace;',
      '  background:var(--mc-mat); color:var(--mc-ink);',
      '  border:4px solid var(--mc-edge); padding:clamp(12px,3.4vw,20px);',
      '  text-align:left;',
      '}',
      '.mc-sum{display:grid;justify-content:center;gap:2px 4px;',
      '  font-family:var(--mc-pixel);font-size:clamp(.85rem,4.2vw,1.5rem);}',
      '.mc-cell{display:flex;align-items:center;justify-content:center;padding:7px 0;min-width:1.85em;}',
      '.mc-d0{color:var(--mc-green)} .mc-d1{color:var(--mc-blue)} .mc-d2{color:var(--mc-red)}',
      '.mc-cell.mc-fam{margin-left:.5em}',
      '.mc-op{color:#fff;border:3px solid var(--mc-edge);padding:5px 0;min-width:1.6em;',
      '  text-align:center;box-shadow:3px 3px 0 rgba(4,10,34,.28);}',
      '.mc-op-add{background:var(--mc-red)} .mc-op-sub{background:var(--mc-green)}',
      '.mc-rule{height:5px;background:var(--mc-ink);margin:6px 0 8px}',
      '.mc-box{border:3px solid var(--mc-line);background:#fff;min-height:2.35em;',
      '  display:flex;align-items:center;justify-content:center;}',
      '.mc-box.mc-filled{border-color:currentColor}',
      '.mc-box.mc-active{border-color:var(--mc-ink);background:#FFF8DC;',
      '  animation:mcblink .9s steps(2,start) infinite}',
      '@keyframes mcblink{50%{border-color:var(--mc-gold)}}',
      '.mc-sum.mc-right .mc-box.mc-filled{background:#DDF3E4}',
      '.mc-sum.mc-wrong .mc-box.mc-filled{background:#FBDDE2}',
      '.mc-sum.mc-reveal .mc-box.mc-filled{background:#FFF3C4;border-color:currentColor}',
      '.mc-sum.mc-shake{animation:mcshake .28s steps(3,end)}',
      '@keyframes mcshake{33%{transform:translateX(-6px)}66%{transform:translateX(6px)}}',
      '@media (prefers-reduced-motion:reduce){',
      ' .mc-box.mc-active{animation:none;border-color:var(--mc-ink)}',
      ' .mc-sum.mc-shake{animation:none}}',
      '.mc-catcher{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}',
      '.mc-pace{height:9px;background:#E3DCCB;border:3px solid var(--mc-ink);margin:16px 0 12px}',
      '.mc-pace-fill{height:100%;width:0;background:var(--mc-green)}',
      '.mc-pace-fill.mc-over{background:var(--mc-red)}',
      '.mc-verdict{margin:12px 0 0;min-height:3.1em;text-align:center;',
      '  font-family:var(--mc-pixel);font-size:.56rem;line-height:1.75;color:#6B6355}',
      '.mc-verdict.mc-ok{color:var(--mc-green-t)} .mc-verdict.mc-no{color:var(--mc-red-t)}',
      '.mc-verdict small{display:block;font-size:1em;color:#6B6355;margin-top:7px}',
      '.mc-slots{display:flex;gap:5px;margin:10px 0 0;padding:0;list-style:none;justify-content:center}',
      '.mc-slot{font-family:var(--mc-pixel);font-size:.46rem;border:3px solid var(--mc-line);',
      '  color:#8A8272;padding:5px 6px;min-width:54px;text-align:center}',
      '.mc-slot.mc-ok{border-color:var(--mc-green);color:var(--mc-green-t)}',
      '.mc-slot.mc-no{border-color:var(--mc-red);color:var(--mc-red-t)}',
      '.mc-keypad{display:none;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px}',
      '.mc-keypad.mc-on{display:grid}',
      '.mc-key{font-family:var(--mc-pixel);font-size:.85rem;background:#fff;',
      '  border:3px solid var(--mc-edge);color:var(--mc-ink);padding:14px 0;cursor:pointer}',
      '.mc-key:active{background:var(--mc-gold)}',
      '.mc-key.mc-go{background:var(--mc-green);color:#fff;font-size:.55rem}',
      '.mc-key.mc-del{background:var(--mc-red);color:#fff;font-size:.55rem}',
      '.mc-settings{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;',
      '  margin-top:14px;font-size:.8rem;color:#6B6355}',
      '.mc-settings label{display:flex;align-items:center;gap:6px;cursor:pointer}',
      '.mc-settings input{accent-color:var(--mc-green);width:15px;height:15px}',
      '.mc-reset{margin-left:auto;font-family:var(--mc-pixel);font-size:.44rem;',
      '  background:var(--mc-red);color:#fff;border:3px solid var(--mc-edge);',
      '  padding:7px 9px;cursor:pointer}',
      '.mc-root :focus-visible{outline:3px solid var(--mc-gold);outline-offset:3px}',
      '.mc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}'
    ].join("\n");
    var st = document.createElement("style");
    st.setAttribute("data-mc", "1");
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  /* the Montessori triad repeats every three places; families are gapped */
  function placeClass(place) { return place % 3; }
  function famBreak(place, i) { return i > 0 && place % 3 === 2; }

  /* =================================================================
     THE FACTORY
  ================================================================= */
  function factory(mount, session, report) {
    injectStyle();
    session = session || {};
    var hints = session.hints || {};
    var showPace = hints.showPace !== false;      /* default on */
    var showEvidence = !!hints.showEvidence;
    var showSettings = !!hints.showSettings;
    var variant = session.variant || null;

    /* ---- per-instance view state ---- */
    var V = {
      kind: "add", card: null, entry: [], cursor: 0, cols: 1,
      startedAt: 0, live: false, tainted: false, raf: 0,
      firstDone: false, dead: false, revealTimer: 0, nextTimer: 0
    };

    /* ---- DOM ---- */
    var rootEl = document.createElement("div");
    rootEl.className = "mc-root";
    rootEl.innerHTML =
      '<div class="mc-sum" role="group" aria-label="Long-form sum"></div>' +
      '<label class="mc-sr">Your answer, ones column first' +
      '<input class="mc-catcher" type="text" inputmode="numeric" autocomplete="off"' +
      ' autocorrect="off" spellcheck="false"></label>' +
      (showPace ? '<div class="mc-pace" aria-hidden="true"><div class="mc-pace-fill"></div></div>' : '') +
      '<p class="mc-verdict" role="status" aria-live="polite"></p>' +
      (showEvidence ? '<ul class="mc-slots"></ul>' : '') +
      '<div class="mc-keypad"></div>' +
      (showSettings ? '<div class="mc-settings"></div>' : '');
    mount.appendChild(rootEl);

    var q = function (sel) { return rootEl.querySelector(sel); };
    var $sum = q(".mc-sum"), $catch = q(".mc-catcher"), $verdict = q(".mc-verdict"),
        $pace = q(".mc-pace-fill"), $slots = q(".mc-slots"),
        $keypad = q(".mc-keypad"), $settings = q(".mc-settings");

    var zone = function () { return ZONES[V.kind]; };
    var target = function () { return targetFor(zone().N, zone().R); };

    /* ---- which operations are in play ---- */
    function operations() {
      if (variant === "add") return ["add"];
      if (variant === "sub") return ["sub"];
      var out = [];
      if (PREFS.ops.add) out.push("add");
      if (PREFS.ops.sub) out.push("sub");
      return out.length ? out : ["add"];
    }

    /* ---- long-form rendering ---- */
    function rowCells(value, cols, extra) {
      var s = String(value), out = [], i, pad = cols - s.length;
      for (i = 0; i < cols; i++) {
        var place = cols - 1 - i;
        var fam = famBreak(place, i) ? " mc-fam" : "";
        if (i < pad) out.push('<div class="mc-cell' + fam + '"></div>');
        else out.push('<div class="mc-cell mc-d' + placeClass(place) + fam + ' ' + extra + '">' +
                      s.charAt(i - pad) + '</div>');
      }
      return out.join("");
    }
    function drawSum() {
      var c = V.card, cols = V.cols, i, isAdd = c.kind === "add";
      var html = '<div class="mc-cell"></div>' + rowCells(c.a, cols, "mc-a");
      html += '<div class="mc-cell mc-op ' + (isAdd ? "mc-op-add" : "mc-op-sub") + '">' +
              (isAdd ? "+" : "\u2212") + '</div>' + rowCells(c.b, cols, "mc-b");
      html += '<div class="mc-rule" style="grid-column:1 / -1"></div>';
      html += '<div class="mc-cell"></div>';
      for (i = 0; i < cols; i++) {
        var place = cols - 1 - i;
        html += '<div class="mc-cell mc-box mc-d' + placeClass(place) +
                (famBreak(place, i) ? " mc-fam" : "") + '" data-i="' + i + '"></div>';
      }
      $sum.style.gridTemplateColumns = "auto repeat(" + cols + ",minmax(1.55em,2.3em))";
      $sum.innerHTML = html;
      paint();
    }
    function paint() {
      var boxes = $sum.querySelectorAll(".mc-box"), i, b;
      for (i = 0; i < boxes.length; i++) {
        b = boxes[i];
        var v = V.entry[i], pl = V.cols - 1 - i;
        b.textContent = (v === null || v === undefined) ? "" : v;
        b.className = "mc-cell mc-box mc-d" + placeClass(pl) +
          (famBreak(pl, i) ? " mc-fam" : "") +
          (v !== null && v !== undefined ? " mc-filled" : "") +
          (V.live && i === V.cursor ? " mc-active" : "");
      }
    }

    /* ---- entry: ones column first by default ---- */
    var step = function () { return PREFS.onesFirst ? -1 : 1; };
    function typeDigit(d) {
      if (!V.live || V.cursor < 0 || V.cursor >= V.cols) return;
      V.entry[V.cursor] = d;
      V.cursor += step();
      paint();
    }
    function backspace() {
      if (!V.live) return;
      if (V.cursor >= 0 && V.cursor < V.cols && V.entry[V.cursor] !== null) {
        V.entry[V.cursor] = null; paint(); return;
      }
      var i = V.cursor - step();
      if (i >= 0 && i < V.cols) { V.cursor = i; V.entry[i] = null; }
      paint();
    }
    function readEntry() {
      var out = "", i;
      for (i = 0; i < V.cols; i++) if (V.entry[i] !== null && V.entry[i] !== undefined) out += V.entry[i];
      return out;
    }

    /* ---- cards ---- */
    function nextCard() {
      if (V.dead) return;
      var ops = operations();
      var kind = ops[rand(0, ops.length - 1)];
      V.kind = kind;
      var z = ZONES[kind];
      var p = kind === "add" ? genAdd(z.N, z.R) : genSub(z.N, z.R);
      var a = p[0], b = p[1];
      var card = { a: a, b: b, kind: kind, answer: kind === "add" ? a + b : a - b };
      if (V.card && V.card.a === a && V.card.b === b && V.card.kind === kind) return nextCard();

      V.card = card;
      /* addition always shows one spare column, so the box count never
         reveals whether the answer spills into the next place */
      V.cols = Math.max(width(a), width(b)) + (kind === "add" ? 1 : 0);
      V.entry = [];
      for (var i = 0; i < V.cols; i++) V.entry.push(null);
      V.cursor = PREFS.onesFirst ? V.cols - 1 : 0;

      $sum.className = "mc-sum";
      $verdict.className = "mc-verdict";
      $verdict.textContent = "";
      V.tainted = false;
      V.live = true;
      V.startedAt = (root.performance || Date).now();
      drawSum();
      tickPace();
      focus();
    }

    function focus() { try { $catch.focus({ preventScroll: true }); } catch (e) { $catch.focus(); } }

    function tickPace() {
      if (!showPace || !$pace) return;
      cancelAnimationFrame(V.raf);
      var run = function () {
        if (!V.live || V.dead) return;
        var frac = ((root.performance || Date).now() - V.startedAt) / target();
        $pace.style.width = Math.min(frac, 1) * 100 + "%";
        if (frac > 1) $pace.classList.add("mc-over"); else $pace.classList.remove("mc-over");
        V.raf = requestAnimationFrame(run);
      };
      V.raf = requestAnimationFrame(run);
    }

    function submit() {
      if (!V.live) return;
      var raw = readEntry();
      if (raw === "") {
        $sum.classList.remove("mc-shake"); void $sum.offsetWidth; $sum.classList.add("mc-shake");
        return;
      }
      V.live = false;
      cancelAnimationFrame(V.raf);

      var ms = (root.performance || Date).now() - V.startedAt;
      var given = parseInt(raw, 10);
      var ok = given === V.card.answer;

      /* Contract rule 5: the first answer after mounting carries the cost of
         arriving, not of difficulty. Score its timing as exactly average so
         it can neither promote nor demote. Accuracy still counts. */
      var reentry = !V.firstDone;
      V.firstDone = true;
      if (V.tainted || reentry) ms = target();
      ms = Math.min(ms, target() * 3);

      TALLY.solved++;
      if (ok) {
        TALLY.right++; TALLY.streak++; TALLY.times.push(ms);
        if (TALLY.streak > TALLY.best) TALLY.best = TALLY.streak;
      } else TALLY.streak = 0;

      var tag = ok ? null : diagnose(given, V.card.answer);
      var z = zone();
      z.win.push({ ok: ok, ms: ms, tag: tag });
      if (z.win.length > 3) z.win.shift();
      var shown = z.win.slice();

      z.sinceProbe++;
      if (z.sinceProbe >= 12) {
        z.sinceProbe = 0;
        z.axisFail.places = Math.max(0, z.axisFail.places - 1);
        z.axisFail.regroup = Math.max(0, z.axisFail.regroup - 1);
      }

      $sum.className = "mc-sum " + (ok ? "mc-right" : "mc-wrong");
      paint();
      $verdict.className = "mc-verdict " + (ok ? "mc-ok" : "mc-no");
      var line = ok
        ? (ms / 1000).toFixed(1) + "S" + (TALLY.streak > 2 ? "  \u2022  " + TALLY.streak + " IN A ROW" : "")
        : "= " + V.card.answer;
      var note = "";
      if (!ok && tag === "regroup") note = "dropped a " + (V.card.kind === "add" ? "carry" : "borrow");
      if (!ok && tag === "places") note = "check the place values";

      var moved = adapt(z);
      if (moved) {
        note = moved.dir > 0
          ? (moved.axis === "places" ? "new place unlocked" : "more carrying")
          : (moved.axis === "places" ? "one place fewer" : "easing off the carrying");
      }
      $verdict.innerHTML = line + (note ? "<small>" + note + "</small>" : "");
      drawSlots(moved ? [] : shown);
      save();

      /* the host decides what a wrong answer costs; we only report it */
      report({
        correct: ok,
        ms: ms,
        detail: {
          kind: V.card.kind, a: V.card.a, b: V.card.b, given: given,
          answer: V.card.answer, tag: tag,
          places: z.N, regroup: z.R,
          moved: moved ? moved.dir * (moved.axis === "places" ? 1 : 2) : 0,
          reentry: reentry
        }
      });

      if (!ok) {
        V.revealTimer = setTimeout(function () {
          if (V.live || V.dead) return;
          var str = String(V.card.answer), pad = V.cols - str.length, i;
          for (i = 0; i < V.cols; i++) V.entry[i] = i < pad ? null : str.charAt(i - pad);
          $sum.className = "mc-sum mc-reveal";
          paint();
        }, 650);
      }
      /* wrong answers hold long enough to read the correction — which is
         also what makes guessing slower than thinking */
      V.nextTimer = setTimeout(nextCard, ok ? 800 : 2100);
    }

    function drawSlots(list) {
      if (!$slots) return;
      $slots.innerHTML = "";
      for (var i = 0; i < 3; i++) {
        var li = document.createElement("li");
        var r = list[i];
        li.className = "mc-slot" + (r ? (r.ok ? " mc-ok" : " mc-no") : "");
        li.textContent = r ? (r.ok ? "OK " : "X ") + (r.ms / 1000).toFixed(1) + "s" : "--";
        $slots.appendChild(li);
      }
    }

    /* ---- keypad ---- */
    ["7", "8", "9", "4", "5", "6", "1", "2", "3", "DEL", "0", "GO"].forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mc-key" + (k === "GO" ? " mc-go" : k === "DEL" ? " mc-del" : "");
      b.textContent = k;
      b.setAttribute("aria-label", k === "DEL" ? "Delete" : k === "GO" ? "Check answer" : k);
      b.addEventListener("click", function () {
        if (k === "GO") submit();
        else if (k === "DEL") backspace();
        else typeDigit(k);
        focus();
      });
      $keypad.appendChild(b);
    });
    if (root.matchMedia && root.matchMedia("(pointer: coarse)").matches) {
      $keypad.classList.add("mc-on");
      $catch.setAttribute("inputmode", "none");
    }

    /* ---- settings, only when the host asks for them ---- */
    if (showSettings && $settings) {
      var mk = function (label, checked, onch) {
        var l = document.createElement("label");
        var i = document.createElement("input");
        i.type = "checkbox"; i.checked = checked;
        i.addEventListener("change", function () { onch(i); });
        l.appendChild(i);
        l.appendChild(document.createTextNode(" " + label));
        $settings.appendChild(l);
        return i;
      };
      var addBox, subBox;
      addBox = mk("Add", PREFS.ops.add, function (i) {
        if (!i.checked && !PREFS.ops.sub) { i.checked = true; return; }
        PREFS.ops.add = i.checked; save();
      });
      subBox = mk("Subtract", PREFS.ops.sub, function (i) {
        if (!i.checked && !PREFS.ops.add) { i.checked = true; return; }
        PREFS.ops.sub = i.checked; save();
      });
      mk("Ones first", PREFS.onesFirst, function (i) {
        PREFS.onesFirst = i.checked;
        V.cursor = PREFS.onesFirst ? V.cols - 1 : 0;
        paint(); save(); focus();
      });
      var rb = document.createElement("button");
      rb.type = "button"; rb.className = "mc-reset"; rb.textContent = "RESET";
      rb.addEventListener("click", function () {
        resetAll();
        if (addBox) addBox.checked = PREFS.ops.add;
        if (subBox) subBox.checked = PREFS.ops.sub;
        drawSlots([]); nextCard();
      });
      $settings.appendChild(rb);
    }

    /* ---- input: arrows move, Enter commits. Same contract as the maze. ---- */
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key >= "0" && e.key <= "9") { e.preventDefault(); typeDigit(e.key); return; }
      if (e.key === "Backspace") { e.preventDefault(); backspace(); return; }
      if (e.key === "Enter") { e.preventDefault(); submit(); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); if (V.cursor > 0) { V.cursor--; paint(); } return; }
      if (e.key === "ArrowRight") { e.preventDefault(); if (V.cursor < V.cols - 1) { V.cursor++; paint(); } return; }
      if (e.key.length === 1) e.preventDefault();
    }
    $catch.addEventListener("keydown", onKey);
    $catch.addEventListener("input", function () { $catch.value = ""; });
    $sum.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".mc-box") : null;
      if (b && V.live) { V.cursor = parseInt(b.getAttribute("data-i"), 10); paint(); }
      focus();
    });
    function onHide() { if (document.hidden && V.live) V.tainted = true; }
    document.addEventListener("visibilitychange", onHide);

    drawSlots([]);
    nextCard();

    /* ---- the handle ---- */
    return {
      focus: focus,
      /* Rule 4: the in-flight problem is dropped, never reported. */
      abandon: function () {
        V.live = false;
        cancelAnimationFrame(V.raf);
        clearTimeout(V.revealTimer); clearTimeout(V.nextTimer);
        save();
      },
      destroy: function () {
        V.dead = true; V.live = false;
        cancelAnimationFrame(V.raf);
        clearTimeout(V.revealTimer); clearTimeout(V.nextTimer);
        document.removeEventListener("visibilitychange", onHide);
        if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
        save();
      }
    };
  }

  /* =================================================================
     EXPORT — usable directly, and self-registering when a host exists
  ================================================================= */
  root.MathChallenge = factory;
  root.MathChallengeState = {
    zones: function () { return ZONES; },
    tally: function () { return TALLY; },
    prefs: function () { return PREFS; },
    reset: resetAll,
    reload: reload
  };
  if (root.Challenges && typeof root.Challenges.register === "function") {
    root.Challenges.register("math", factory, { lockTitle: "NUMBER LOCK", keyLabel: "#" });
  }

})(typeof window !== "undefined" ? window : this);
