/* ===================================================================
   WORD GATE  —  the Wordsmith challenge

   The sphinx reads a sentence with one word missing. The choices are
   shown in writing and never spoken.

   That inversion is the whole point. At a DOOR, homophones must be
   banned: no voice can distinguish "to" from "two", so offering both
   would be an item with no correct answer. At a GATE, because the
   options are read rather than heard, homophones become the BEST
   distractors available — they test comprehension instead of decoding.

       "She has __ red apples."     two, and only two
       "I want __ go outside."      to, and only to

   The words come from what the child actually met on the way here, so
   the gate rehearses the last few mazes rather than the corpus at large.

   Needs word-sentences.js and word-challenge.js.
=================================================================== */
(function (root) {
  "use strict";

  var rand = function (lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); };
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* ---------------------------------------------------------------
     Choosing what to ask

     Recently met and has a carrier sentence. Words the child got wrong
     are worth more than words they breezed through, so a shaky word is
     three times as likely to come up.
  ----------------------------------------------------------------*/
  function candidates(sinceMaze) {
    var WS = root.WordSentences, WC = root.WordChallengeState;
    if (!WS) return [];
    var pool = [];

    if (WC && WC.recent) {
      pool = WC.recent({ sinceMaze: sinceMaze, filter: function (w) { return WS.has(w); } });
    }
    /* early on, or after a reset, the child may not have met much yet */
    if (pool.length < 6 && WC && WC.recent) {
      pool = WC.recent({ filter: function (w) { return WS.has(w); } });
    }
    if (pool.length < 6) {
      /* fall back to the words at or below the band they are working at */
      var band = (WC && WC.zone) ? WC.zone().band : 0;
      var all = (WC && WC.words) ? WC.words() : [];
      var extra = all.filter(function (r) { return r.band <= band && WS.has(r.w); })
                     .map(function (r) { return { w: r.w.toLowerCase(), box: 0, wrong: 0 }; });
      var seen = {};
      pool.forEach(function (p) { seen[p.w] = true; });
      extra.forEach(function (e) { if (!seen[e.w]) pool.push(e); });
    }
    return pool;
  }

  function pickWord(pool, avoid) {
    var live = pool.filter(function (p) { return p.w !== avoid; });
    if (!live.length) live = pool;
    var wts = live.map(function (p) { return 1 + Math.min(3, (p.wrong || 0)) * 2; });
    var total = wts.reduce(function (a, b) { return a + b; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < live.length; i++) { r -= wts[i]; if (r <= 0) return live[i].w; }
    return live[live.length - 1].w;
  }

  /* ---------------------------------------------------------------
     Building the options

     Homophones first, because they are the sharpest test available
     here and the reason this gate exists at all. Then near-misses from
     the corpus, then anything to fill.
  ----------------------------------------------------------------*/
  function lev(a, b) {
    var m = a.length, n = b.length, i, j, prev = [], cur = [];
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++)
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1,
                          prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      prev = cur.slice();
    }
    return prev[n];
  }

  function buildOptions(target, count) {
    var WS = root.WordSentences, WC = root.WordChallengeState;
    var tl = target.toLowerCase();
    var picked = [], used = {};
    used[tl] = true;

    /* A distractor that also fits the sentence is not a distractor, it is
       a second right answer. "We ▢ eggs for breakfast" takes had or has;
       "I have ▢ pencils" takes any number. Marking one of those wrong
       teaches a child that being right is not enough. */
    var take = function (w, type) {
      if (picked.length >= count - 1) return false;
      var lw = String(w).toLowerCase();
      if (used[lw]) return false;
      if (WS.interchangeable && WS.interchangeable(target, w)) return false;
      used[lw] = true;
      picked.push({ w: w, type: type });
      return true;
    };

    /* 1. a homophone, if this word has one — the whole point of a gate */
    var extras = (WS.extras && WS.extras[tl]) || [];
    shuffle(extras).forEach(function (h) { take(h, "homophone"); });

    /* 2. words that look like it, from what the child has met */
    var corpus = (WC && WC.words) ? WC.words().map(function (r) { return r.w; }) : [];
    var near = corpus.filter(function (w) {
      var lw = w.toLowerCase();
      return lw !== tl && lev(lw, tl) === 1;
    });
    shuffle(near).forEach(function (w) { take(w, "visual"); });

    /* 3. same first letter — the guess a child makes from the sound alone */
    var onset = corpus.filter(function (w) {
      return w.charAt(0).toLowerCase() === tl.charAt(0) && w.toLowerCase() !== tl;
    });
    shuffle(onset).forEach(function (w) { take(w, "onset"); });

    /* 4. fill */
    shuffle(corpus).forEach(function (w) { take(w, "random"); });

    return shuffle(picked.concat([{ w: target, type: "target" }]));
  }

  /* ---------------------------------------------------------------
     Style
  ----------------------------------------------------------------*/
  var STYLED = false;
  function injectStyle() {
    if (STYLED) return; STYLED = true;
    var css = [
      '.wg-root{--wg-mat:#F5F0E4;--wg-ink:#2A2620;--wg-edge:#040A22;--wg-line:#C9C1AE;',
      ' --wg-green:#00703C;--wg-red:#C8102E;--wg-gold:#FFD52E;--wg-pink:#FF6BB3;',
      ' --wg-pixel:"Press Start 2P",monospace;',
      ' background:var(--wg-mat);color:var(--wg-ink);border:4px solid var(--wg-edge);',
      ' padding:clamp(12px,3.4vw,18px);text-align:center}',
      '.wg-say{font-family:var(--wg-pixel);font-size:.66rem;background:#003DA5;color:#fff;',
      ' border:4px solid var(--wg-edge);padding:16px 14px;cursor:pointer;width:100%;',
      ' box-shadow:4px 4px 0 rgba(4,10,34,.3)}',
      '.wg-say:active{transform:translate(3px,3px);box-shadow:none}',
      '.wg-again{font-family:var(--wg-pixel);font-size:.46rem;background:#fff;color:var(--wg-ink);',
      ' border:3px solid var(--wg-edge);padding:9px 11px;cursor:pointer;margin-top:8px}',
      '.wg-sentence{font-size:1.15rem;line-height:1.7;margin:14px 4px 4px;color:var(--wg-ink)}',
      '.wg-blank{display:inline-block;min-width:3.6em;border-bottom:4px solid var(--wg-ink);',
      ' margin:0 .18em;vertical-align:bottom}',
      '.wg-blank.wg-filled{border-bottom-color:var(--wg-green);color:var(--wg-green);font-weight:700}',
      '.wg-blank.wg-bad{border-bottom-color:var(--wg-red);color:var(--wg-red);font-weight:700}',
      '.wg-opts{display:grid;gap:9px;margin-top:14px}',
      '.wg-opt{font-family:var(--wg-pixel);font-size:.74rem;background:#fff;color:var(--wg-ink);',
      ' border:4px solid var(--wg-edge);padding:16px 6px;cursor:pointer;width:100%}',
      '.wg-opt:active{background:var(--wg-gold)}',
      '.wg-opt.wg-right{background:#DDF3E4;border-color:var(--wg-green)}',
      '.wg-opt.wg-wrong{background:#FBDDE2;border-color:var(--wg-red)}',
      '.wg-opt[disabled]{cursor:default}',
      '.wg-verdict{font-family:var(--wg-pixel);font-size:.5rem;line-height:1.7;',
      ' min-height:3em;margin:12px 0 0;color:#6B6355}',
      '.wg-verdict.wg-ok{color:var(--wg-green)} .wg-verdict.wg-no{color:var(--wg-red)}',
      '.wg-verdict small{display:block;font-size:1em;margin-top:6px;color:#6B6355}',
      '.wg-fail{background:#FBDDE2;border:3px solid var(--wg-red);padding:12px;',
      ' font-size:.9rem;color:var(--wg-red)}',
      '.wg-root :focus-visible{outline:3px solid var(--wg-gold);outline-offset:3px}'
    ].join("\n");
    var st = document.createElement("style");
    st.setAttribute("data-wg", "1");
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
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

    var V = { item: null, opts: [], live: false, replays: 0, startedAt: 0,
              firstDone: false, dead: false, nextTimer: 0, unlocked: false, last: null };

    var el = document.createElement("div");
    el.className = "wg-root";
    el.innerHTML =
      '<button type="button" class="wg-say">HEAR THE SENTENCE</button>' +
      '<div><button type="button" class="wg-again">SAY IT AGAIN</button></div>' +
      '<p class="wg-sentence"></p>' +
      '<div class="wg-opts"></div>' +
      '<p class="wg-verdict" role="status" aria-live="polite"></p>';
    mount.appendChild(el);

    var q = function (s) { return el.querySelector(s); };
    var $say = q(".wg-say"), $again = q(".wg-again"),
        $sentence = q(".wg-sentence"), $opts = q(".wg-opts"), $verdict = q(".wg-verdict");

    if (!root.WordSentences) {
      var f = document.createElement("div");
      f.className = "wg-fail";
      f.textContent = "word-sentences.js is missing, so this gate cannot run.";
      el.insertBefore(f, el.firstChild);
      $say.disabled = true; $again.disabled = true;
      return { focus: function () {}, abandon: function () {}, destroy: function () {
        if (el.parentNode) el.parentNode.removeChild(el); } };
    }

    /* only the mazes since the last gate */
    var sinceMaze = 1;
    if (root.MazeJourney && root.MazeJourney.state && root.MazeJourney.shape) {
      var st = root.MazeJourney.state(), sh = root.MazeJourney.shape();
      sinceMaze = Math.max(1, st.maze - sh.mazesPerGate + 1);
    }

    function speak(text, cb) {
      if (WC && WC.say) { WC.say(text, cb || function () {}); return true; }
      return false;
    }

    function nextItem() {
      if (V.dead) return;
      var pool = candidates(sinceMaze);
      if (!pool.length) { $sentence.textContent = "No words to ask about yet."; return; }
      var word = pickWord(pool, V.last);
      V.last = word;
      var sentence = root.WordSentences.pick(word);
      if (!sentence) { nextItem(); return; }

      V.item = { word: word, sentence: sentence };
      V.opts = buildOptions(word, optionCount);
      V.replays = 0;
      V.live = false;

      $verdict.className = "wg-verdict";
      $verdict.textContent = "";
      showSentence(null, null);
      $opts.style.gridTemplateColumns = optionCount >= 4 ? "1fr 1fr" : "1fr";
      $opts.innerHTML = "";
      V.opts.forEach(function (o) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "wg-opt"; b.textContent = o.w;
        b.addEventListener("click", function () { choose(o, b); });
        $opts.appendChild(b);
      });
      $say.textContent = "HEAR THE SENTENCE";
      if (V.unlocked) say();
    }

    /* the blank is shown, never spoken as a word */
    function showSentence(filled, ok) {
      var s = V.item.sentence;
      var parts = s.split(root.WordSentences.BLANK);
      $sentence.innerHTML = "";
      $sentence.appendChild(document.createTextNode(parts[0] || ""));
      var span = document.createElement("span");
      span.className = "wg-blank" + (filled ? (ok ? " wg-filled" : " wg-bad") : "");
      span.textContent = filled || "\u00A0";
      $sentence.appendChild(span);
      $sentence.appendChild(document.createTextNode(parts[1] || ""));
    }

    function say() {
      $say.textContent = "\u2026";
      var ok = speak(root.WordSentences.spoken(V.item.sentence), function (r) {
        $say.textContent = "HEAR THE SENTENCE";
        if (r && r.error) { $verdict.textContent = "SPEECH FAILED: " + r.error; return; }
        /* the clock starts when she stops talking */
        if (!V.live) { V.live = true; V.startedAt = (root.performance || Date).now(); }
      });
      if (!ok) {
        /* no speech on this device: the sentence is on screen, so it is
           still answerable — just harder for a child who cannot read it */
        $say.textContent = "HEAR THE SENTENCE";
        V.live = true; V.startedAt = (root.performance || Date).now();
      }
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
        if (V.opts[i].type === "target") b.className = "wg-opt wg-right";
        else if (b === btn) b.className = "wg-opt wg-wrong";
      });
      showSentence(ok ? V.item.word : o.w, ok);

      $verdict.className = "wg-verdict " + (ok ? "wg-ok" : "wg-no");
      var note = "";
      if (!ok && o.type === "homophone")
        note = '"' + o.w + '" sounds the same, but it is not the word here';
      if (!ok && o.type === "visual") note = "look closely — one letter apart";
      if (!ok && o.type === "onset") note = "it starts the same, but read on";
      $verdict.innerHTML = (ok ? "YES" : V.item.word.toUpperCase()) +
        (note ? "<small>" + note + "</small>" : "");

      /* the gate does not adapt the reading ladder; the doors do that */
      report({
        correct: ok, ms: ms,
        detail: { gate: "word", word: V.item.word, chose: o.w, type: o.type,
                  sentence: V.item.sentence, options: optionCount,
                  replays: V.replays, reentry: reentry }
      });

      V.nextTimer = setTimeout(nextItem, ok ? 950 : 2400);
    }

    $say.addEventListener("click", function () { V.unlocked = true; say(); });
    $again.addEventListener("click", function () {
      if (!V.item) return;
      V.unlocked = true;
      if (V.live) V.replays++;
      say();
    });

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

  root.WordGate = factory;
  root.WordGateState = { candidates: candidates, buildOptions: buildOptions, pickWord: pickWord };
  if (root.Challenges && typeof root.Challenges.register === "function") {
    root.Challenges.register("word-gate", factory,
      { lockTitle: "WORDSMITH GATE", keyLabel: "A" });
  }
})(typeof window !== "undefined" ? window : this);
