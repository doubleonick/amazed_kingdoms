/* ===================================================================
   WORD CHALLENGE  —  sight reading as a mountable module

   Implements the contract in CHALLENGE-API.md:
       factory(mount, session, report) -> { focus, abandon, destroy }

   The device speaks a word; the child picks it from written options.

   Two difficulty axes, like the number drill:
     band     0..5  Montessori series crossed with Dolch level
     options  3..6  MORE options is harder — and the guessing floor
                    falls as the child climbs, so the measurement gets
                    cleaner exactly as it starts to matter

   Homophones are excluded STRUCTURALLY, not filtered at runtime: no
   distractor may share a homophone group with the target. "to" and
   "two" can both be taught; they can never be offered together, because
   no voice on earth can tell them apart.

   A wrong answer reveals the right word and moves to a NEW item after a
   hold. Never a retry of the same item — with the options still on
   screen, elimination takes a pure guesser to 100% in about 2.5 taps.
   The missed word comes back because the scheduler says it is due, not
   because the door is holding it hostage.
=================================================================== */
(function (root) {
  "use strict";

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
  var BASEKEY = "carry.words";
  function KEY() { return root.Profile ? root.Profile.key(BASEKEY) : BASEKEY; }
  /* The voice belongs to the tablet, not to whoever is holding it, so it
     is never namespaced — one child should not have to pick it again. */
  var VOICEKEY = "carry.device.voice";
  var rand = function (lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); };

  /* =================================================================
     CORPUS — Dolch lists, public domain
  ================================================================= */
  var DOLCH = {
    pp: ["a","and","away","big","blue","can","come","down","find","for","funny","go","help","here","I","in","is","it","jump","little","look","make","me","my","not","one","play","red","run","said","see","the","three","to","two","up","we","where","you"],
    g1: ["after","again","an","any","as","ask","by","could","every","fly","from","give","had","has","her","him","his","how","just","know","let","live","may","of","old","once","open","over","put","round","some","stop","take","thank","them","then","think","walk","were","when"],
    g2: ["always","around","because","been","before","best","both","buy","call","cold","does","fast","first","five","found","gave","goes","green","its","made","many","off","or","pull","read","right","sing","sit","sleep","tell","their","these","those","upon","us","use","very","wash","which","why","wish","work","would","write","your"],
    g3: ["about","better","bring","carry","clean","cut","done","draw","drink","eight","fall","far","full","got","grow","hold","hot","hurt","if","keep","kind","laugh","light","long","much","myself","never","only","own","pick","seven","shall","show","six","small","start","ten","today","together","try","warm"]
  };

  /* Words that simply have to be learned by sight. This hand list is what
     makes them irregular — everything else is classified by rule below. */
  var IRREGULAR = ["said","one","two","come","some","done","what","was","were","who","why",
    "could","would","should","again","any","many","does","goes","been","eight","laugh",
    "they","their","there","your","you","to","do","of","from","have","give","live","love",
    "walk","talk","know","write","right","light","night","four","only","both","the","a","I",
    "put","push","full","pull","use","very","where","here","buy","today","together",
    "myself","because"];
  var PHONOGRAM = ["ee","oo","ou","ow","ay","ai","igh","ough","ea","oa","ir","ur","aw","oi","oy","ew","ue","ar","or","er"];

  function seriesOf(w) {
    w = w.toLowerCase();
    if (IRREGULAR.indexOf(w) >= 0) return "green";
    for (var i = 0; i < PHONOGRAM.length; i++) if (w.indexOf(PHONOGRAM[i]) >= 0) return "green";
    if (/[aeiou][bcdfghjklmnpqrstvwxz]e$/.test(w)) return "green";         /* silent e */
    if (/^[bcdfghjklmnpqrstvwxyz]?[aeiou][bcdfghjklmnpqrstvwxyz]{0,2}$/.test(w) && w.length <= 4) return "pink";
    return "blue";
  }

  /* Bands cross the series with the Dolch level. Green holds most of the
     list — sight words are irregular by definition — so it spans three
     bands rather than one, which keeps the ladder evenly spaced. */
  var BAND_NAMES = [
    "pink, earliest", "pink, later", "blue, blends",
    "green, earliest", "green, middle", "green, hardest"
  ];
  function bandOf(w, lvl) {
    var s = seriesOf(w);
    var early = (lvl === "pp" || lvl === "g1");
    if (s === "pink") return early ? 0 : 1;
    if (s === "blue") return 2;
    return early ? 3 : (lvl === "g2" ? 4 : 5);
  }

  var WORDS = [];      /* {w, band, series, lvl} */
  var BY_BAND = [[], [], [], [], [], []];
  (function build() {
    var seen = {};
    ["pp", "g1", "g2", "g3"].forEach(function (lvl) {
      DOLCH[lvl].forEach(function (w) {
        var key = w.toLowerCase();
        if (seen[key]) return;
        seen[key] = true;
        var rec = { w: w, lvl: lvl, series: seriesOf(w), band: bandOf(w, lvl) };
        WORDS.push(rec);
        BY_BAND[rec.band].push(rec);
      });
    });
  })();
  var MAX_BAND = 5, MIN_OPTS = 3, MAX_OPTS = 6;

  /* =================================================================
     HOMOPHONES — the structural exclusion
  ================================================================= */
  var HOMOPHONE_GROUPS = [
    ["to","two","too"], ["there","their","they're"], ["one","won"], ["by","buy","bye"],
    ["right","write"], ["for","four"], ["no","know"], ["be","bee"], ["red","read"],
    ["ate","eight"], ["see","sea"], ["blue","blew"], ["new","knew"], ["hear","here"],
    ["would","wood"], ["I","eye"], ["our","hour"], ["so","sew"], ["your","you're"],
    ["its","it's"], ["made","maid"], ["some","sum"], ["not","knot"], ["threw","through"],
    ["week","weak"], ["meet","meat"], ["been","bean"], ["male","mail"], ["sale","sail"]
  ];
  var HOMO = {};   /* word -> { otherWord: true } */
  HOMOPHONE_GROUPS.forEach(function (g) {
    g.forEach(function (a) {
      var la = a.toLowerCase();
      HOMO[la] = HOMO[la] || {};
      g.forEach(function (b) { if (b !== a) HOMO[la][b.toLowerCase()] = true; });
    });
  });
  function clashes(a, b) {
    var m = HOMO[a.toLowerCase()];
    return !!(m && m[b.toLowerCase()]);
  }

  /* =================================================================
     DISTRACTORS — the wrong answer IS the diagnosis

       visual    looks like it   (was / saw)  -> not reading the letters
       onset     starts the same (when/went)  -> guessing from first sound
       phonetic  sounds close    (three/tree) -> hearing, not decoding
       random    unrelated                    -> does not know the word
  ================================================================= */
  function lev(a, b) {
    var m = a.length, n = b.length, i, j, prev = [], cur = [];
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1,
                          prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      }
      prev = cur.slice();
    }
    return prev[n];
  }
  function sorted(w) { return w.toLowerCase().split("").sort().join(""); }
  function rime(w) { w = w.toLowerCase(); return w.length <= 2 ? w : w.slice(-2); }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function buildOptions(target, count, pool) {
    var t = target.w, tl = t.toLowerCase();
    var notHomophone = function (r) { return r.w !== t && !clashes(t, r.w); };
    /* Random filler comes from the band, so the item stays at level.
       Confusable distractors are drawn from the WHOLE corpus — a word that
       looks or sounds like the target is a good distractor wherever it
       lives, and small bands would otherwise leave the mix mostly random,
       which carries no diagnosis. */
    var band = pool.filter(notHomophone);
    var wide = WORDS.filter(notHomophone);

    var pick = [], used = {};
    used[tl] = true;

    var take = function (list, type) {
      if (pick.length >= count - 1) return false;        /* never overshoot */
      var c = shuffle(list);
      for (var i = 0; i < c.length; i++) {
        var w = c[i].w;
        if (used[w.toLowerCase()]) continue;
        used[w.toLowerCase()] = true;
        pick.push({ w: w, type: type });
        return true;
      }
      return false;
    };

    var kinds = shuffle([
      { type: "visual", list: wide.filter(function (r) {
          return sorted(r.w) === sorted(t) || lev(r.w.toLowerCase(), tl) === 1; }) },
      { type: "onset", list: wide.filter(function (r) {
          return r.w.charAt(0).toLowerCase() === tl.charAt(0); }) },
      { type: "phonetic", list: wide.filter(function (r) { return rime(r.w) === rime(t); }) }
    ]);
    kinds.forEach(function (k) { take(k.list, k.type); });

    var guard = 0;
    while (pick.length < count - 1 && guard++ < 400) if (!take(band, "random")) break;
    guard = 0;
    while (pick.length < count - 1 && guard++ < 400) if (!take(wide, "random")) break;

    return shuffle(pick.concat([{ w: t, type: "target" }]));
  }

  /* =================================================================
     SCHEDULER — Leitner boxes over a finite corpus.
     A missed word comes back because it is due, never as a gate.
  ================================================================= */
  /* How long before a word is due again, by box. These were far too short:
     a word answered correctly came back three items later, which with a
     one-band pool meant the same handful cycling forever. */
  var INTERVAL = [4, 12, 30, 70, 150];
  var SEEN = {};                         /* word -> {box, due, right, wrong} */
  var CLOCK = 0;

  function rec(w) {
    var k = w.toLowerCase();
    if (!SEEN[k]) SEEN[k] = { box: 0, due: 0, right: 0, wrong: 0, at: 0, maze: 0 };
    return SEEN[k];
  }
  function schedule(w, ok) {
    var r = rec(w);
    if (ok) { r.right++; r.box = Math.min(INTERVAL.length - 1, r.box + 1); }
    else { r.wrong++; r.box = 0; }
    r.due = CLOCK + (ok ? INTERVAL[r.box] : 2);
    /* Provenance: when, and in which maze. The gates test what the child
       actually met on the way there, not the corpus at large. */
    r.at = Date.now();
    r.maze = (root.MazeJourney && root.MazeJourney.state) ? root.MazeJourney.state().maze : 0;
  }
  /* Explore before you drill. A word nobody has met yet beats a word that
     is merely due, unless something has been waiting a long time. */
  function nextWord(pool, band) {
    var seenBefore = function (r) { var s = rec(r.w); return (s.right + s.wrong) > 0; };
    var due = pool.filter(function (r) { return seenBefore(r) && rec(r.w).due <= CLOCK; });
    var fresh = pool.filter(function (r) { return !seenBefore(r); });
    var overdue = due.filter(function (r) { return rec(r.w).due <= CLOCK - 25; });

    if (overdue.length) return weighted(overdue, band);
    if (fresh.length && Math.random() < 0.75) return weighted(fresh, band);
    if (due.length) return weighted(due, band);
    if (fresh.length) return weighted(fresh, band);
    var settled = pool.slice().sort(function (a, b) { return rec(a.w).due - rec(b.w).due; });
    return settled[0] || pool[rand(0, pool.length - 1)];
  }

  /* The pool spans every band up to the current one, so easier words keep
     coming round — which is both more varied and better practice. This
     leans the choice back toward the band actually being worked on. */
  function weighted(list, band) {
    var total = 0, i, wts = [];
    for (i = 0; i < list.length; i++) {
      var gap = Math.abs((list[i].band == null ? band : list[i].band) - band);
      var wt = gap === 0 ? 6 : (gap === 1 ? 3 : 1);
      wts.push(wt); total += wt;
    }
    var r = Math.random() * total;
    for (i = 0; i < list.length; i++) { r -= wts[i]; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }

  /* =================================================================
     STATE
  ================================================================= */
  function newZone() { return { band: 0, opts: MIN_OPTS, axisFail: { band: 0, opts: 0 }, sinceProbe: 0, win: [] }; }
  var Z = newZone();
  var PREFS = { voice: null, rate: 0.85 };
  var TALLY = { asked: 0, right: 0, best: 0, streak: 0, replays: 0 };

  function save() {
    store.set(KEY(), JSON.stringify({
      v: 1,
      zone: { band: Z.band, opts: Z.opts, fail: Z.axisFail, probe: Z.sinceProbe },
      seen: SEEN, clock: CLOCK,
      asked: TALLY.asked, right: TALLY.right, best: TALLY.best
    }));
    store.set(VOICEKEY, JSON.stringify({ voice: PREFS.voice, rate: PREFS.rate }));
  }
  function load() {
    try {
      var d = JSON.parse(store.get(KEY()) || "{}");
      if (d.zone) {
        Z.band = Math.max(0, Math.min(MAX_BAND, d.zone.band | 0));
        Z.opts = Math.max(MIN_OPTS, Math.min(MAX_OPTS, d.zone.opts || MIN_OPTS));
        if (d.zone.fail) Z.axisFail = { band: d.zone.fail.band | 0, opts: d.zone.fail.opts | 0 };
        Z.sinceProbe = d.zone.probe | 0;
      }
      if (d.seen) SEEN = d.seen;
      if (typeof d.clock === "number") CLOCK = d.clock;
      /* an older save kept the voice per player; adopt it once */
      if (d.prefs) { if (d.prefs.voice) PREFS.voice = d.prefs.voice; if (d.prefs.rate) PREFS.rate = d.prefs.rate; }
      var dev = JSON.parse(store.get(VOICEKEY) || "null");
      if (dev) { if (dev.voice) PREFS.voice = dev.voice; if (dev.rate) PREFS.rate = dev.rate; }
      if (typeof d.asked === "number") TALLY.asked = d.asked;
      if (typeof d.right === "number") TALLY.right = d.right;
      if (typeof d.best === "number") TALLY.best = d.best;
    } catch (e) {}
  }
  load();
  /* Start fetching voices immediately rather than at the first word lock —
     the story speaks long before any door is reached. */
  try { loadVoices(function () {}); } catch (e) {}

  /* When the player changes, everything held in memory belongs to the old
     one. Drop it and read the new player's save. */
  function reload() {
    Z = newZone(); SEEN = {}; CLOCK = 0;
    TALLY = { asked: 0, right: 0, best: 0, streak: 0, replays: 0 };
    load();
  }
  if (root.Profile && root.Profile.onChange) root.Profile.onChange(reload);

  function resetAll() { Z = newZone(); SEEN = {}; CLOCK = 0; TALLY = { asked: 0, right: 0, best: 0, streak: 0, replays: 0 }; save(); }

  /* =================================================================
     ADAPTER — same shape as the number drill, different axes.

     A close-but-wrong answer (visual, onset, phonetic) means the child is
     in the right area but swamped by choices, so ease the OPTIONS. An
     unrelated answer means the words themselves are too hard, so ease
     the BAND.
  ================================================================= */
  function easeOn(axis) {
    if (axis === "opts" && Z.opts > MIN_OPTS) return { band: Z.band, opts: Z.opts - 1 };
    if (axis === "band" && Z.band > 0) return { band: Z.band - 1, opts: Z.opts };
    if (Z.opts > MIN_OPTS) return { band: Z.band, opts: Z.opts - 1 };
    if (Z.band > 0) return { band: Z.band - 1, opts: Z.opts };
    return null;
  }
  function adapt() {
    var w = Z.win;
    if (w.length < 2) return null;
    var errors = 0, tags = [], i;
    for (i = 0; i < w.length; i++) if (!w[i].ok) { errors++; if (w[i].tag) tags.push(w[i].tag); }

    var move = null;
    if (errors >= 2) move = "down";
    else if (errors === 0 && w.length === 3) move = "up";

    if (move === "up") {
      var canBand = Z.band < MAX_BAND, canOpts = Z.opts < MAX_OPTS;
      if (!canBand && !canOpts) return null;
      var axis;
      if (!canBand) axis = "opts";
      else if (!canOpts) axis = "band";
      else axis = (Z.axisFail.band <= Z.axisFail.opts) ? "band" : "opts";
      if (Z.axisFail[axis] >= 2) {
        var other = axis === "band" ? "opts" : "band";
        var open = other === "band" ? canBand : canOpts;
        if (!open || Z.axisFail[other] >= 2) return null;
        axis = other;
      }
      if (axis === "band") Z.band++; else Z.opts++;
      Z.win = [];
      return { dir: 1, axis: axis };
    }
    if (move === "down") {
      var close = tags.filter(function (t) { return t === "visual" || t === "onset" || t === "phonetic"; }).length;
      var lost = tags.filter(function (t) { return t === "random"; }).length;
      var choose = lost > close ? "band" : "opts";
      var next = easeOn(choose);
      if (!next) return null;
      var moved = next.band < Z.band ? "band" : "opts";
      Z.band = next.band; Z.opts = next.opts;
      Z.axisFail[moved] = Math.min(3, Z.axisFail[moved] + 1);
      Z.win = [];
      return { dir: -1, axis: moved };
    }
    return null;
  }

  /* =================================================================
     SPEECH — with a fallback chain, because whatever voice works on one
     device may simply not exist on another.
  ================================================================= */
  var SS = root.speechSynthesis;
  var VOICES = [];
  function loadVoices(cb) {
    var done = false, tries = 0;
    function finish(v) { if (done) return; done = true; VOICES = v || []; cb(VOICES); }
    if (!SS) return finish([]);
    var v = SS.getVoices();
    if (v && v.length) return finish(v);
    try {
      SS.addEventListener("voiceschanged", function once() {
        SS.removeEventListener("voiceschanged", once); finish(SS.getVoices());
      });
    } catch (e) {}
    var iv = setInterval(function () {
      var vv = SS.getVoices();
      if ((vv && vv.length) || ++tries > 24) { clearInterval(iv); finish(vv); }
    }, 140);
  }
  /* Which voice to reach for when the child has not chosen one.

     Falling back to "first English voice on the device" lands on David
     on Windows and Alex on macOS — both male, both the OS default, and
     neither is what early-reading material normally uses. Score instead,
     so the sensible choice wins without anyone configuring anything.

     Names are matched as substrings because platforms decorate them:
     "Microsoft Zira Desktop - English (United States)". */
  var PREFERRED = ["zira","samantha","karen","moira","fiona","tessa","serena",
                   "allison","ava","susan","zoe","nicky","hazel","female"];
  var DEMOTED   = ["david","mark","george","daniel","oliver","thomas","alex",
                   "fred","james","ryan","guy","eddy","reed","rocko","male"];

  function voiceScore(v) {
    var n = (v.name || "").toLowerCase(), lang = v.lang || "", s = 0, i;
    if (/^en/i.test(lang)) s += 8;              /* English at all matters most */
    if (v.localService) s += 4;                 /* offline beats network       */
    if (/^en[-_]?us/i.test(lang)) s += 1;
    for (i = 0; i < PREFERRED.length; i++) if (n.indexOf(PREFERRED[i]) >= 0) { s += 6; break; }
    for (i = 0; i < DEMOTED.length; i++) if (n.indexOf(DEMOTED[i]) >= 0) { s -= 3; break; }
    return s;
  }

  function pickVoice() {
    if (!VOICES.length) return null;
    var i;
    /* an explicit choice always wins, matched loosely so a saved short name
       still finds a platform-decorated one */
    if (PREFS.voice) {
      for (i = 0; i < VOICES.length; i++) if (VOICES[i].name === PREFS.voice) return VOICES[i];
      var want = PREFS.voice.toLowerCase();
      for (i = 0; i < VOICES.length; i++) {
        var nm = (VOICES[i].name || "").toLowerCase();
        if (nm.indexOf(want) >= 0 || want.indexOf(nm) >= 0) return VOICES[i];
      }
    }
    var ranked = VOICES.slice().sort(function (a, b) { return voiceScore(b) - voiceScore(a); });
    return ranked[0] || null;
  }

  /* The voice list arrives asynchronously. Speaking before it lands gets the
     browser's default — which is why the story used to be read by a
     different voice from the one at the doors. Wait for the list, then
     speak, so the sphinx sounds like herself from her very first word. */
  function say(text, cb) {
    if (!SS) { cb && cb({ error: "unsupported" }); return; }
    if (!VOICES.length) { loadVoices(function () { speakNow(text, cb); }); return; }
    speakNow(text, cb);
  }
  function speakNow(text, cb) {
    try { SS.cancel(); } catch (e) {}
    var u = new SpeechSynthesisUtterance(text);
    var v = pickVoice();
    if (v) u.voice = v;
    u.rate = PREFS.rate; u.pitch = 1;
    var fired = false;
    u.onend = function () { if (!fired) { fired = true; cb && cb({}); } };
    u.onerror = function (e) { if (!fired) { fired = true; cb && cb({ error: (e && e.error) || "error" }); } };
    SS.speak(u);
    setTimeout(function () { if (!fired) { fired = true; cb && cb({ error: "timeout" }); } }, 5000);
  }

  /* =================================================================
     STYLE — namespaced, injected once
  ================================================================= */
  var STYLED = false;
  function injectStyle() {
    if (STYLED) return; STYLED = true;
    var css = [
      '.wc-root{--wc-mat:#F5F0E4;--wc-ink:#2A2620;--wc-edge:#040A22;--wc-line:#C9C1AE;',
      ' --wc-green:#00703C;--wc-red:#C8102E;--wc-gold:#FFD52E;--wc-blue:#003DA5;',
      ' --wc-pixel:"Press Start 2P",monospace;',
      ' background:var(--wc-mat);color:var(--wc-ink);border:4px solid var(--wc-edge);',
      ' padding:clamp(12px,3.4vw,20px);text-align:center;}',
      '.wc-play{font-family:var(--wc-pixel);font-size:.72rem;background:var(--wc-blue);',
      ' color:#fff;border:4px solid var(--wc-edge);padding:20px 18px;cursor:pointer;width:100%;',
      ' box-shadow:4px 4px 0 rgba(4,10,34,.3);}',
      '.wc-play:active{transform:translate(3px,3px);box-shadow:none}',
      '.wc-again{font-family:var(--wc-pixel);font-size:.5rem;background:#fff;color:var(--wc-ink);',
      ' border:3px solid var(--wc-edge);padding:11px 12px;cursor:pointer;margin-top:9px;}',
      '.wc-opts{display:grid;gap:9px;margin-top:14px;}',
      '.wc-opt{font-family:var(--wc-pixel);font-size:.8rem;background:#fff;color:var(--wc-ink);',
      ' border:4px solid var(--wc-edge);padding:18px 6px;cursor:pointer;width:100%;}',
      '.wc-opt:active{background:var(--wc-gold)}',
      '.wc-opt.wc-right{background:#DDF3E4;border-color:var(--wc-green)}',
      '.wc-opt.wc-wrong{background:#FBDDE2;border-color:var(--wc-red)}',
      '.wc-opt[disabled]{cursor:default;opacity:.85}',
      '.wc-verdict{font-family:var(--wc-pixel);font-size:.54rem;line-height:1.7;',
      ' min-height:3.2em;margin:12px 0 0;color:#6B6355;}',
      '.wc-verdict.wc-ok{color:var(--wc-green)} .wc-verdict.wc-no{color:var(--wc-red)}',
      '.wc-verdict small{display:block;font-size:1em;margin-top:6px;color:#6B6355}',
      '.wc-slots{display:flex;gap:5px;margin:10px 0 0;padding:0;list-style:none;justify-content:center}',
      '.wc-slot{font-family:var(--wc-pixel);font-size:.44rem;border:3px solid var(--wc-line);',
      ' color:#8A8272;padding:5px 6px;min-width:44px}',
      '.wc-slot.wc-ok{border-color:var(--wc-green);color:var(--wc-green)}',
      '.wc-slot.wc-no{border-color:var(--wc-red);color:var(--wc-red)}',
      '.wc-settings{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;',
      ' margin-top:14px;font-size:.8rem;color:#6B6355}',
      '.wc-settings select{font-family:inherit;font-size:.8rem;padding:5px;',
      ' border:3px solid var(--wc-line);background:#fff;color:var(--wc-ink);max-width:100%}',
      '.wc-reset{font-family:var(--wc-pixel);font-size:.42rem;background:var(--wc-red);color:#fff;',
      ' border:3px solid var(--wc-edge);padding:7px 9px;cursor:pointer}',
      '.wc-fail{background:#FBDDE2;border:3px solid var(--wc-red);padding:14px;',
      ' font-size:.9rem;color:var(--wc-red)}',
      '.wc-root :focus-visible{outline:3px solid var(--wc-gold);outline-offset:3px}'
    ].join("\n");
    var st = document.createElement("style");
    st.setAttribute("data-wc", "1");
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  /* =================================================================
     THE FACTORY
  ================================================================= */
  function factory(mount, session, report) {
    injectStyle();
    session = session || {};
    var hints = session.hints || {};
    var showEvidence = !!hints.showEvidence;
    var showSettings = !!hints.showSettings;
    var variant = session.variant || null;   /* "pink" | "blue" | "green" */

    var V = { item: null, opts: [], startedAt: 0, live: false, replays: 0,
              firstDone: false, dead: false, unlocked: false, nextTimer: 0 };

    var rootEl = document.createElement("div");
    rootEl.className = "wc-root";
    rootEl.innerHTML =
      '<button type="button" class="wc-play">PLAY WORD</button>' +
      '<div><button type="button" class="wc-again">SAY AGAIN</button></div>' +
      '<div class="wc-opts"></div>' +
      '<p class="wc-verdict" role="status" aria-live="polite"></p>' +
      (showEvidence ? '<ul class="wc-slots"></ul>' : '') +
      (showSettings ? '<div class="wc-settings"></div>' : '');
    mount.appendChild(rootEl);

    var q = function (s) { return rootEl.querySelector(s); };
    var $play = q(".wc-play"), $again = q(".wc-again"), $opts = q(".wc-opts"),
        $verdict = q(".wc-verdict"), $slots = q(".wc-slots"), $settings = q(".wc-settings");

    /* every band up to the current one, not just the current one */
    function pool() {
      var list = [];
      for (var b = 0; b <= Z.band; b++) list = list.concat(BY_BAND[b]);
      if (variant) {
        var only = list.filter(function (r) { return r.series === variant; });
        if (only.length) list = only;
      }
      return list.length ? list : BY_BAND[0];
    }

    /* ---- speech availability is a hard dependency; say so if missing ---- */
    var speechOk = true;
    function checkSpeech() {
      if (!SS) { failSpeech("This device has no speech, so the word lock cannot run."); return; }
      loadVoices(function (v) {
        if (!v.length) failSpeech("No voices are installed, so the word lock cannot run.");
        else { speechOk = true; buildSettings(); }
      });
    }
    function failSpeech(msg) {
      speechOk = false;
      var d = document.createElement("div");
      d.className = "wc-fail";
      d.textContent = msg + " Ask a grown-up.";
      rootEl.insertBefore(d, rootEl.firstChild);
      $play.disabled = true; $again.disabled = true;
    }

    /* ---- items ---- */
    function nextItem() {
      if (V.dead) return;
      CLOCK++;
      var target = nextWord(pool(), Z.band);
      V.item = target;
      V.opts = buildOptions(target, Z.opts, pool());
      V.replays = 0;
      V.live = false;
      $verdict.className = "wc-verdict";
      $verdict.textContent = "";
      $opts.style.gridTemplateColumns = Z.opts >= 5 ? "1fr 1fr 1fr" : "1fr 1fr";
      $opts.innerHTML = "";
      V.opts.forEach(function (o) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "wc-opt"; b.textContent = o.w;
        b.addEventListener("click", function () { choose(o, b); });
        $opts.appendChild(b);
      });
      $play.textContent = "PLAY WORD";
      if (V.unlocked) speak();
    }

    function speak() {
      if (!speechOk) return;
      $play.textContent = "\u2026";
      say(V.item.w, function (r) {
        $play.textContent = "PLAY WORD";
        if (r && r.error) { $verdict.textContent = "SPEECH FAILED: " + r.error; return; }
        /* the clock starts when the word finishes, not when it is requested */
        if (!V.live) { V.live = true; V.startedAt = (root.performance || Date).now(); }
      });
    }

    function choose(o, btn) {
      if (!V.live || V.dead) return;
      V.live = false;
      var ms = (root.performance || Date).now() - V.startedAt;
      var ok = o.type === "target";

      /* Contract rule 5: arriving costs time that isn't difficulty. */
      var reentry = !V.firstDone;
      V.firstDone = true;

      TALLY.asked++;
      if (ok) { TALLY.right++; TALLY.streak++; if (TALLY.streak > TALLY.best) TALLY.best = TALLY.streak; }
      else TALLY.streak = 0;
      TALLY.replays += V.replays;

      schedule(V.item.w, ok);
      Z.win.push({ ok: ok, tag: ok ? null : o.type });
      if (Z.win.length > 3) Z.win.shift();
      var shown = Z.win.slice();

      Z.sinceProbe++;
      if (Z.sinceProbe >= 12) {
        Z.sinceProbe = 0;
        Z.axisFail.band = Math.max(0, Z.axisFail.band - 1);
        Z.axisFail.opts = Math.max(0, Z.axisFail.opts - 1);
      }

      /* reveal: mark the choice and light the right answer */
      Array.prototype.forEach.call($opts.children, function (el, i) {
        el.disabled = true;
        if (V.opts[i].type === "target") el.className = "wc-opt wc-right";
        else if (el === btn) el.className = "wc-opt wc-wrong";
      });

      $verdict.className = "wc-verdict " + (ok ? "wc-ok" : "wc-no");
      var line = ok
        ? "YES" + (V.replays ? "  \u2022  " + V.replays + " REPLAY" + (V.replays > 1 ? "S" : "") : "")
        : V.item.w.toUpperCase();
      var note = "";
      if (!ok && o.type === "visual") note = "look at the letters again";
      if (!ok && o.type === "onset") note = "it starts the same, but read on";
      if (!ok && o.type === "phonetic") note = "close in sound";

      var moved = adapt();
      if (moved) {
        note = moved.dir > 0
          ? (moved.axis === "band" ? "harder words now" : "one more choice")
          : (moved.axis === "band" ? "easier words" : "fewer choices");
      }
      $verdict.innerHTML = line + (note ? "<small>" + note + "</small>" : "");
      drawSlots(moved ? [] : shown);
      save();

      report({
        correct: ok, ms: ms,
        detail: {
          word: V.item.w, chose: o.w, type: o.type,
          band: Z.band, options: Z.opts, series: V.item.series,
          replays: V.replays, box: rec(V.item.w).box, reentry: reentry
        }
      });

      /* wrong answers hold long enough to read the correction, which is
         also what stops guessing being faster than thinking */
      V.nextTimer = setTimeout(nextItem, ok ? 900 : 2200);
    }

    function drawSlots(list) {
      if (!$slots) return;
      $slots.innerHTML = "";
      for (var i = 0; i < 3; i++) {
        var li = document.createElement("li");
        var r = list[i];
        li.className = "wc-slot" + (r ? (r.ok ? " wc-ok" : " wc-no") : "");
        li.textContent = r ? (r.ok ? "OK" : "X") : "--";
        $slots.appendChild(li);
      }
    }

    function buildSettings() {
      if (!showSettings || !$settings) return;
      $settings.innerHTML = "";
      var sel = document.createElement("select");
      var en = VOICES.filter(function (v) { return /^en/i.test(v.lang || ""); });
      (en.length ? en : VOICES).forEach(function (v) {
        var o = document.createElement("option");
        o.value = v.name;
        o.textContent = v.name + (v.localService ? "" : " (network)");
        sel.appendChild(o);
      });
      var cur = pickVoice();
      if (cur) sel.value = cur.name;
      sel.addEventListener("change", function () { PREFS.voice = sel.value; save(); say(V.item ? V.item.w : "ready"); });
      $settings.appendChild(sel);

      var rb = document.createElement("button");
      rb.type = "button"; rb.className = "wc-reset"; rb.textContent = "RESET";
      rb.addEventListener("click", function () { resetAll(); drawSlots([]); nextItem(); });
      $settings.appendChild(rb);
    }

    $play.addEventListener("click", function () { V.unlocked = true; speak(); });
    $again.addEventListener("click", function () {
      if (!V.item) return;
      V.unlocked = true;
      if (V.live) V.replays++;
      speak();
    });

    checkSpeech();
    drawSlots([]);
    nextItem();

    return {
      focus: function () { try { $play.focus({ preventScroll: true }); } catch (e) { $play.focus(); } },
      abandon: function () {
        V.live = false;
        clearTimeout(V.nextTimer);
        try { if (SS) SS.cancel(); } catch (e) {}
        save();
      },
      destroy: function () {
        V.dead = true; V.live = false;
        clearTimeout(V.nextTimer);
        try { if (SS) SS.cancel(); } catch (e) {}
        if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
        save();
      }
    };
  }

  /* =================================================================
     EXPORT
  ================================================================= */
  root.WordChallenge = factory;
  root.WordChallengeState = {
    zone: function () { return Z; },
    tally: function () { return TALLY; },
    seen: function () { return SEEN; },
    words: function () { return WORDS; },
    byBand: function () { return BY_BAND; },
    bandNames: BAND_NAMES,
    buildOptions: buildOptions,
    clashes: clashes,
    reset: resetAll,
    reload: reload,

    /* Words met recently, newest first — what a gate should be asking about.
       `sinceMaze` bounds it to the mazes since the last gate; `limit` caps
       the list. Falls back to anything ever met, then to the current band,
       so a gate is never left with nothing to ask. */
    recent: function (opts) {
      opts = opts || {};
      var out = [], k;
      for (k in SEEN) {
        if (!Object.prototype.hasOwnProperty.call(SEEN, k)) continue;
        var r = SEEN[k];
        if (!r.at) continue;
        if (opts.sinceMaze && r.maze && r.maze < opts.sinceMaze) continue;
        if (opts.filter && !opts.filter(k)) continue;
        out.push({ w: k, at: r.at, maze: r.maze, box: r.box,
                   right: r.right, wrong: r.wrong });
      }
      out.sort(function (a, b) { return b.at - a.at; });
      if (opts.limit) out = out.slice(0, opts.limit);
      return out;
    },
    /* the word records, so a gate can weight by how shaky a word is */
    record: function (w) { return SEEN[String(w).toLowerCase()] || null; },
    /* config surface for hosts — the challenge still owns the storage */
    voices: function () { return VOICES; },
    loadVoices: loadVoices,
    currentVoice: function () { return pickVoice(); },
    setVoice: function (name) { PREFS.voice = name || null; save(); },
    rate: function (r) { if (typeof r === "number") { PREFS.rate = r; save(); } return PREFS.rate; },
    say: say,
    voiceScore: voiceScore
  };
  if (root.Challenges && typeof root.Challenges.register === "function") {
    root.Challenges.register("language", factory, { lockTitle: "WORD LOCK", keyLabel: "A" });
  }

})(typeof window !== "undefined" ? window : this);
