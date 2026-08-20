/* ===================================================================
   NUMBER GATE  —  the Numbersmith challenge

   The same puzzle in the other language. A door asks

       47 + 26 = ▢

   and a gate asks

       47 + ▢ = 73

   which is a different act of thinking: you cannot run the algorithm
   forward, you have to work out what is missing. And because the blank
   can sit in either operand, the gate has a difficulty dial the doors
   do not — ▢ + 26 = 73 is harder than 47 + ▢ = 73, since you cannot
   simply subtract from the left.

   Multiple choice, like the word gate, and the wrong answers are the
   diagnosis — the same taxonomy the number drill already uses:

       carry     off by exactly ten or a hundred — a dropped carry
       places    right digits, wrong columns
       fact      off by one or two — a number-fact slip
       reversed  the answer to the sum as written, not the blank
       random    unrelated

   Difficulty comes from the child's own maths ladder, so a gate is
   exactly as hard as the doors they have been opening.

   Needs math-challenge.js for the ladder; works without it at a default.
=================================================================== */
(function (root) {
  "use strict";

  var rand = function (lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); };
  var pow10 = function (k) { return Math.pow(10, k); };
  var width = function (n) { return String(Math.abs(n)).length; };
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function carries(a, b) { var n = 0; while (a > 0 || b > 0) { if ((a % 10) + (b % 10) >= 10) n++; a = Math.floor(a / 10); b = Math.floor(b / 10); } return n; }
  function borrows(a, b) { var n = 0; while (b > 0) { if ((a % 10) < (b % 10)) n++; a = Math.floor(a / 10); b = Math.floor(b / 10); } return n; }
  function nDigit(n) { return n === 1 ? rand(1, 9) : rand(pow10(n - 1), pow10(n) - 1); }
  function pick(gen, ok) { for (var i = 0; i < 500; i++) { var p = gen(); if (ok(p)) return p; } return gen(); }

  /* ---------------------------------------------------------------
     What to ask

     Read the ladder the child has actually earned at the doors. A gate
     should be a test of that, not of something else.
  ----------------------------------------------------------------*/
  function ladder() {
    var Z = root.MathChallengeState && root.MathChallengeState.zones
          ? root.MathChallengeState.zones() : null;
    if (!Z) return { add: { N: 2, R: 1 }, sub: { N: 2, R: 1 } };
    return { add: { N: Z.add.N, R: Z.add.R }, sub: { N: Z.sub.N, R: Z.sub.R } };
  }

  function makeItem(prefer) {
    var L = ladder();
    var kind = prefer || (Math.random() < 0.5 ? "add" : "sub");
    var z = L[kind];
    var N = Math.max(1, z.N), R = z.R;

    var a, b;
    if (kind === "add") {
      var p = pick(function () { return [nDigit(N), nDigit(N > 1 && Math.random() < 0.3 ? N - 1 : N)]; },
        function (q) {
          var c = carries(q[0], q[1]);
          return R === 0 ? c === 0 : (R === 1 ? c >= 1 : c >= Math.max(2, N - 1));
        });
      a = p[0]; b = p[1];
    } else {
      var q2 = pick(function () {
        var sub = nDigit(N), r = nDigit(N > 1 && Math.random() < 0.35 ? N - 1 : N);
        return [sub + r, sub];
      }, function (q) {
        var bo = borrows(q[0], q[1]);
        return R === 0 ? bo === 0 : (R === 1 ? bo >= 1 : bo >= Math.max(2, N - 1));
      });
      a = q2[0]; b = q2[1];
    }

    var total = kind === "add" ? a + b : a - b;
    /* Which operand goes missing. The first is harder — you cannot get it
       by working straight along the line — so it comes up less often, and
       only once the child has some width behind them. */
    var slot = (N > 1 && Math.random() < 0.35) ? 0 : 1;

    return { kind: kind, a: a, b: b, total: total, slot: slot,
             answer: slot === 0 ? a : b,
             other: slot === 0 ? b : a };
  }

  /* ---------------------------------------------------------------
     Options: every wrong answer means something
  ----------------------------------------------------------------*/
  function buildOptions(item, count) {
    var truth = item.answer;
    var picked = [], used = {};
    used[truth] = true;

    /* A wrong answer must not be a number already on the screen: dropping
       the visible total or the other operand into the choices makes the
       item answerable by elimination rather than by arithmetic. */
    var onScreen = {};
    onScreen[item.total] = true;
    onScreen[item.other] = true;

    var take = function (v, type) {
      if (picked.length >= count - 1) return false;
      v = Math.round(v);
      if (v < 0 || used[v] || v === truth) return false;
      if (onScreen[v] && v !== truth) return false;
      used[v] = true;
      picked.push({ v: v, type: type });
      return true;
    };

    var w = width(truth);
    var cands = [];

    /* a dropped carry or borrow: out by exactly one higher unit */
    for (var k = 1; k < Math.max(2, w); k++) {
      cands.push([truth + pow10(k), "carry"]);
      cands.push([truth - pow10(k), "carry"]);
    }
    /* the sum as written rather than the missing piece — the commonest
       misread of this whole format */
    /* the sum as written rather than the missing piece — a real misread of
       this format, and only offered when it is not simply a number in view */
    cands.push([item.kind === "add" ? item.a + item.b : item.a - item.b, "reversed"]);
    cands.push([item.total + item.other, "reversed"]);
    cands.push([Math.abs(item.total - item.other * 2), "reversed"]);
    /* digits in the wrong columns */
    if (w > 1) {
      var s = String(truth);
      cands.push([parseInt(s.split("").reverse().join(""), 10), "places"]);
      cands.push([parseInt(s.slice(1) + s.charAt(0), 10), "places"]);
    }
    /* a number-fact slip */
    cands.push([truth + 1, "fact"]);
    cands.push([truth - 1, "fact"]);
    cands.push([truth + 2, "fact"]);

    shuffle(cands).forEach(function (c) { take(c[0], c[1]); });

    /* fill, staying in the same ballpark so nothing is obviously silly */
    var guard = 0;
    while (picked.length < count - 1 && guard++ < 300) {
      var span = Math.max(4, Math.round(truth * 0.4));
      take(truth + rand(-span, span), "random");
    }
    return shuffle(picked.concat([{ v: truth, type: "target" }]));
  }

  /* ---------------------------------------------------------------
     Style
  ----------------------------------------------------------------*/
  var STYLED = false;
  function injectStyle() {
    if (STYLED) return; STYLED = true;
    var css = [
      '.ng-root{--ng-mat:#F5F0E4;--ng-ink:#2A2620;--ng-edge:#040A22;--ng-line:#C9C1AE;',
      ' --ng-green:#00703C;--ng-red:#C8102E;--ng-gold:#FFD52E;',
      ' --ng-g:#00843D;--ng-b:#003DA5;--ng-r:#E4002B;',
      ' --ng-pixel:"Press Start 2P",monospace;',
      ' background:var(--ng-mat);color:var(--ng-ink);border:4px solid var(--ng-edge);',
      ' padding:clamp(12px,3.4vw,18px);text-align:center}',
      /* Long form, stacked, exactly as the doors set a sum out. A line
         that wraps mid-equation is unreadable, and three digits was
         enough to make it wrap. */
      '.ng-eq{display:inline-grid;gap:3px 5px;justify-content:center;',
      ' font-family:var(--ng-pixel);font-size:clamp(.95rem,4.6vw,1.5rem);',
      ' font-variant-numeric:tabular-nums;margin:8px 0 2px}',
      '.ng-cell{display:flex;align-items:center;justify-content:center;padding:5px 0;min-width:1.5em}',
      '.ng-d0{color:var(--ng-g)} .ng-d1{color:var(--ng-b)} .ng-d2{color:var(--ng-r)}',
      '.ng-op{color:#fff;background:var(--ng-r);border:3px solid var(--ng-edge);',
      ' box-shadow:3px 3px 0 rgba(4,10,34,.28);min-width:1.4em}',
      '.ng-op.ng-sub{background:var(--ng-g)}',
      '.ng-rule{grid-column:1 / -1;height:5px;background:var(--ng-ink);margin:3px 0}',
      '.ng-blank{grid-column:2 / -1;border:4px solid var(--ng-line);background:#fff;',
      ' min-height:1.7em;display:flex;align-items:center;justify-content:center}',
      '.ng-blank.ng-ok{border-color:var(--ng-green);background:#DDF3E4}',
      '.ng-blank.ng-no{border-color:var(--ng-red);background:#FBDDE2}',
      '.ng-opts{display:grid;gap:9px;margin-top:16px}',
      '.ng-opt{font-family:var(--ng-pixel);font-size:.92rem;background:#fff;color:var(--ng-ink);',
      ' border:4px solid var(--ng-edge);padding:16px 6px;cursor:pointer;width:100%;',
      ' font-variant-numeric:tabular-nums}',
      '.ng-opt:active{background:var(--ng-gold)}',
      '.ng-opt.ng-right{background:#DDF3E4;border-color:var(--ng-green)}',
      '.ng-opt.ng-wrong{background:#FBDDE2;border-color:var(--ng-red)}',
      '.ng-verdict{font-family:var(--ng-pixel);font-size:.5rem;line-height:1.7;',
      ' min-height:3em;margin:12px 0 0;color:#6B6355}',
      '.ng-verdict.ng-ok{color:var(--ng-green)} .ng-verdict.ng-no{color:var(--ng-red)}',
      '.ng-verdict small{display:block;font-size:1em;margin-top:6px;color:#6B6355}',
      '.ng-say{font-family:var(--ng-pixel);font-size:.46rem;background:#fff;color:var(--ng-ink);',
      ' border:3px solid var(--ng-edge);padding:9px 11px;cursor:pointer;margin-bottom:6px}',
      '.ng-root :focus-visible{outline:3px solid var(--ng-gold);outline-offset:3px}'
    ].join("\n");
    var st = document.createElement("style");
    st.setAttribute("data-ng", "1");
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  /* the Montessori triad, so a number here is coloured as it is at the doors */
  function placeClass(place) { return place % 3; }
  function digits(n) {
    var s = String(n), out = "";
    for (var i = 0; i < s.length; i++) {
      var place = s.length - 1 - i;
      out += '<span class="ng-d' + placeClass(place) + '">' + s.charAt(i) + '</span>';
    }
    return out;
  }

  /* ---------------------------------------------------------------
     The factory
  ----------------------------------------------------------------*/
  function factory(mount, session, report) {
    injectStyle();
    session = session || {};
    var optionCount = 3;
    var WC = root.WordChallengeState;
    if (WC && WC.zone) optionCount = Math.max(3, Math.min(5, WC.zone().opts || 3));

    var V = { item: null, opts: [], live: false, startedAt: 0,
              firstDone: false, dead: false, nextTimer: 0 };

    var el = document.createElement("div");
    el.className = "ng-root";
    el.innerHTML =
      '<button type="button" class="ng-say">HEAR IT</button>' +
      '<div class="ng-eq"></div>' +
      '<div class="ng-opts"></div>' +
      '<p class="ng-verdict" role="status" aria-live="polite"></p>';
    mount.appendChild(el);

    var q = function (s) { return el.querySelector(s); };
    var $eq = q(".ng-eq"), $opts = q(".ng-opts"), $verdict = q(".ng-verdict"), $say = q(".ng-say");

    /* One column per digit, right-aligned, so the places line up the way
       they do at a door. The blank spans the whole operand rather than the
       answer's own width — a box sized to the answer would give away how
       many digits it has. */
    function row(value, cols, extra) {
      var str = String(value), out = "", pad = cols - str.length, i;
      for (i = 0; i < cols; i++) {
        if (i < pad) { out += '<div class="ng-cell"></div>'; continue; }
        var place = cols - 1 - i;
        out += '<div class="ng-cell ng-d' + placeClass(place) + (extra || "") + '">' +
               str.charAt(i - pad) + "</div>";
      }
      return out;
    }
    function drawEq(filled, ok) {
      var it = V.item;
      /* the widest of the three, so every row has the same number of digit
         columns and the places line up down the page */
      var cols = Math.max(String(it.a).length, String(it.b).length, String(it.total).length);
      var opSym = it.kind === "add" ? "+" : "\u2212";
      var opCls = "ng-cell ng-op" + (it.kind === "add" ? "" : " ng-sub");
      var blank = '<div class="ng-blank' +
                  (filled != null ? (ok ? " ng-ok" : " ng-no") : "") + '">' +
                  (filled != null ? String(filled) : "&nbsp;") + "</div>";

      var html = "";
      /* first line: the operand, or the blank if that is the missing one */
      html += '<div class="ng-cell"></div>' + (it.slot === 0 ? blank : row(it.a, cols));
      /* second line: the operator, then the other operand or the blank */
      html += '<div class="' + opCls + '">' + opSym + "</div>" +
              (it.slot === 1 ? blank : row(it.b, cols));
      html += '<div class="ng-rule"></div>';
      html += '<div class="ng-cell"></div>' + row(it.total, cols);

      $eq.style.gridTemplateColumns = "auto repeat(" + cols + ",minmax(1.2em,1.7em))";
      $eq.innerHTML = html;
    }

    /* She asks both kingdoms' questions, in her own voice. */
    function spoken() {
      var it = V.item;
      return it.slot === 0
        ? ("something " + (it.kind === "add" ? "plus " : "take away ") + it.b + " makes " + it.total)
        : (it.a + (it.kind === "add" ? " plus " : " take away ") + "something makes " + it.total);
    }
    function say() {
      if (WC && WC.say) WC.say(spoken(), function () {});
    }

    function nextItem() {
      if (V.dead) return;
      V.item = makeItem();
      V.opts = buildOptions(V.item, optionCount);
      V.live = true;
      V.startedAt = (root.performance || Date).now();
      $verdict.className = "ng-verdict";
      $verdict.textContent = "";
      drawEq(null, null);
      $opts.style.gridTemplateColumns = optionCount >= 4 ? "1fr 1fr" : "1fr 1fr 1fr";
      $opts.innerHTML = "";
      V.opts.forEach(function (o) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "ng-opt"; b.textContent = o.v;
        b.addEventListener("click", function () { choose(o, b); });
        $opts.appendChild(b);
      });
    }

    function choose(o, btn) {
      if (!V.live || V.dead) return;
      V.live = false;
      var ms = (root.performance || Date).now() - V.startedAt;
      var ok = o.type === "target";
      var reentry = !V.firstDone;
      V.firstDone = true;

      Array.prototype.forEach.call($opts.children, function (b, i) {
        b.disabled = true;
        if (V.opts[i].type === "target") b.className = "ng-opt ng-right";
        else if (b === btn) b.className = "ng-opt ng-wrong";
      });
      drawEq(ok ? V.item.answer : o.v, ok);

      var note = "";
      if (!ok && o.type === "carry") note = V.item.kind === "add" ? "a carry went missing" : "a borrow went missing";
      if (!ok && o.type === "reversed") note = "that is the whole sum, not the missing part";
      if (!ok && o.type === "places") note = "the right digits, in the wrong columns";
      if (!ok && o.type === "fact") note = "very close — count again";
      $verdict.className = "ng-verdict " + (ok ? "ng-ok" : "ng-no");
      $verdict.innerHTML = (ok ? "YES" : String(V.item.answer)) +
        (note ? "<small>" + note + "</small>" : "");

      /* the gate reports; the doors do the teaching */
      report({
        correct: ok, ms: ms,
        detail: { gate: "number", kind: V.item.kind, a: V.item.a, b: V.item.b,
                  total: V.item.total, slot: V.item.slot, answer: V.item.answer,
                  chose: o.v, type: o.type, options: optionCount, reentry: reentry }
      });

      V.nextTimer = setTimeout(nextItem, ok ? 950 : 2400);
    }

    $say.addEventListener("click", say);
    nextItem();

    return {
      focus: function () { try { $say.focus({ preventScroll: true }); } catch (e) { $say.focus(); } },
      abandon: function () {
        V.live = false; clearTimeout(V.nextTimer);
        try { if (root.speechSynthesis) root.speechSynthesis.cancel(); } catch (e) {}
      },
      destroy: function () {
        V.dead = true; V.live = false; clearTimeout(V.nextTimer);
        try { if (root.speechSynthesis) root.speechSynthesis.cancel(); } catch (e) {}
        if (el.parentNode) el.parentNode.removeChild(el);
      }
    };
  }

  root.NumberGate = factory;
  root.NumberGateState = { makeItem: makeItem, buildOptions: buildOptions, ladder: ladder };
  if (root.Challenges && typeof root.Challenges.register === "function") {
    root.Challenges.register("number-gate", factory,
      { lockTitle: "NUMBERSMITH GATE", keyLabel: "#" });
  }
})(typeof window !== "undefined" ? window : this);
