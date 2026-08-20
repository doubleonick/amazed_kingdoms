/* ===================================================================
   SOUND  —  everything synthesised, nothing downloaded

   The consoles this borrows its look from made sound the same way: an
   oscillator, an envelope, and a noise channel. So there are no files to
   host, nothing to licence, and every sound is parametric — which is why
   each land can shift the key and the whole game re-colours itself.

   Two motifs matter more than the rest:

     WORDSMITH   G4  A4  B4  C5      stepwise, singing
     NUMBERSMITH C4  E4  G4  C5      an arpeggio, built

   Played together every beat is consonant — a fifth, a fourth, a third,
   then the same note. They start apart and end on one pitch. That is the
   bridge, in sound, and it is what the keystone plays.

   Usage:  Sound.play("key")   Sound.mute(true)   Sound.setKey(2)
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
  /* the room's settings, shared by whoever is sitting in it */
  var DEVICE_KEY = "carry.sound";
  /* the player's own: which sounds they chose, and any tunes they wrote */
  var PLAYER_BASE = "carry.sound.player";
  function PLAYER_KEY() {
    return root.Profile ? root.Profile.key(PLAYER_BASE) : PLAYER_BASE;
  }

  /* ---------------------------------------------------------------
     Engine
  ----------------------------------------------------------------*/
  var AC = null, MASTER = null;
  var CFG = { muted: false, volume: 0.7, transpose: 0, choice: {}, patterns: {} };

  function ctx() {
    if (AC) return AC;
    var C = root.AudioContext || root.webkitAudioContext;
    if (!C) return null;
    AC = new C();
    MASTER = AC.createGain();
    MASTER.gain.value = CFG.volume;
    MASTER.connect(AC.destination);
    return AC;
  }
  /* browsers keep audio asleep until a gesture; every caller is one */
  function wake() {
    var c = ctx();
    if (c && c.state === "suspended") { try { c.resume(); } catch (e) {} }
    return c;
  }
  function bend(f) { return f * Math.pow(2, CFG.transpose / 12); }

  function voice(o) {
    var c = wake(); if (!c || CFG.muted) return;
    var t0 = c.currentTime + (o.at || 0);
    var dur = o.dur || 0.1;
    var osc = c.createOscillator();
    osc.type = o.type || "square";
    var f0 = bend(o.f0), f1 = bend(o.f1 == null ? o.f0 : o.f1);
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) {
      try { osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur); }
      catch (e) { osc.frequency.linearRampToValueAtTime(f1, t0 + dur); }
    }
    var g = c.createGain();
    var peak = Math.max(0.0001, (o.vol == null ? 0.25 : o.vol));
    var atk = o.attack == null ? 0.004 : o.attack;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    var node = osc;
    if (o.lp) { var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = o.lp; node.connect(lp); node = lp; }
    node.connect(g); g.connect(MASTER);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }

  function noise(o) {
    var c = wake(); if (!c || CFG.muted) return;
    var t0 = c.currentTime + (o.at || 0);
    var dur = o.dur || 0.06;
    var len = Math.max(1, Math.floor(c.sampleRate * dur));
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = c.createBufferSource(); src.buffer = buf;
    var f = c.createBiquadFilter();
    f.type = o.filter || "bandpass";
    f.Q.value = o.q == null ? 1 : o.q;
    f.frequency.setValueAtTime(bend(o.f0 || 1200), t0);
    if (o.f1) { try { f.frequency.exponentialRampToValueAtTime(Math.max(40, bend(o.f1)), t0 + dur); } catch (e) {} }
    var g = c.createGain();
    var peak = Math.max(0.0001, (o.vol == null ? 0.2 : o.vol));
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(MASTER);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  function seq(notes, o) {
    o = o || {};
    var step = o.step == null ? 0.09 : o.step;
    notes.forEach(function (n, i) {
      if (n == null) return;
      voice({ type: o.type || "square", f0: n, f1: o.slide ? n * o.slide : n,
              dur: o.dur == null ? step * 1.6 : o.dur,
              vol: o.vol == null ? 0.22 : o.vol, at: (o.at || 0) + i * step, lp: o.lp });
    });
  }

  /* ---------------------------------------------------------------
     Notes as names, so a saved pattern stays readable
  ----------------------------------------------------------------*/
  var NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function midiName(m) { return NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
  function nameToMidi(n) {
    var m = /^([A-Ga-g])(#|b)?(-?\d+)$/.exec(String(n).trim());
    if (!m) return null;
    var base = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 }[m[1].toUpperCase()];
    if (m[2] === "#") base++;
    if (m[2] === "b") base--;
    return base + (parseInt(m[3], 10) + 1) * 12;
  }
  function noteFreq(n) {
    if (typeof n === "number") return midiToFreq(n);
    var m = nameToMidi(n);
    return m == null ? null : midiToFreq(m);
  }

  /* ---------------------------------------------------------------
     PATTERNS  —  a tracker row of steps, per channel

       { v:1, name:"", bpm:132, steps:16, tracks:[
           { wave:"square", vol:0.22, gate:1.6, lp:0,
             rows:["G4", null, "A4", ...] }
       ]}

     Sixteen steps to the bar, so a step is a sixteenth note. A "noise"
     track reads the same note names, using them as the filter centre —
     which is how you write drums on a pitch grid.
  ----------------------------------------------------------------*/
  function playPattern(pat, atOffset) {
    if (!pat || !pat.tracks) return 0;
    var spb = 60 / (pat.bpm || 120) / 4;
    var base = atOffset || 0;
    pat.tracks.forEach(function (tr) {
      if (!tr || !tr.rows || tr.mute) return;
      tr.rows.forEach(function (n, i) {
        if (!n) return;
        var f = noteFreq(n);
        if (f == null) return;
        var at = base + i * spb;
        var dur = spb * (tr.gate == null ? 1.6 : tr.gate);
        if (tr.wave === "noise") {
          noise({ f0: f * 2.2, f1: f, dur: dur, vol: tr.vol == null ? 0.14 : tr.vol,
                  at: at, q: tr.q == null ? 1.2 : tr.q, filter: tr.filter || "bandpass" });
        } else {
          voice({ type: tr.wave || "square", f0: f, dur: dur,
                  vol: tr.vol == null ? 0.2 : tr.vol, at: at, lp: tr.lp || 0 });
        }
      });
    });
    return (pat.steps || 16) * spb;
  }

  /* note table, C4 up two octaves */
  var N = { C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, B4:493.88,
            C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00, B5:987.77, C6:1046.50,
            G3:196.00, C3:130.81, E3:164.81, A3:220.00 };

  var WORDSMITH   = [N.G4, N.A4, N.B4, N.C5];   /* stepwise  */
  var NUMBERSMITH = [N.C4, N.E4, N.G4, N.C5];   /* arpeggio  */

  /* ---------------------------------------------------------------
     The library. Every event offers alternatives so they can be
     auditioned side by side and chosen, rather than argued about.
  ----------------------------------------------------------------*/
  var LIB = {

    step: {   /* plays on every footfall, so it has to almost not be there */
      tick:  function () { noise({ dur: 0.025, f0: 2200, f1: 900, vol: 0.045, q: 0.8 }); },
      pad:   function () { voice({ type: "triangle", f0: 130, f1: 84, dur: 0.05, vol: 0.06 }); },
      grit:  function () { noise({ dur: 0.02, f0: 5200, vol: 0.035, filter: "highpass" }); },
      silent:function () {}
    },

    bump: {   /* walking into a wall */
      thud:  function () { voice({ type: "triangle", f0: 90, f1: 60, dur: 0.08, vol: 0.14 }); },
      scuff: function () { noise({ dur: 0.05, f0: 400, f1: 180, vol: 0.09, q: 0.7 }); },
      silent:function () {}
    },

    key: {    /* picking a key up should feel like a small prize */
      chime: function () { seq([N.E5, N.B5], { step: 0.07, dur: 0.16, vol: 0.24, type: "square" }); },
      ring:  function () { seq([N.G5, N.C6], { step: 0.06, dur: 0.22, vol: 0.2, type: "triangle" }); },
      trill: function () { seq([N.C5, N.E5, N.G5], { step: 0.045, dur: 0.1, vol: 0.19, type: "square" }); }
    },

    lockTurn: { /* one per correct answer: mechanical, incremental */
      ratchet: function () { noise({ dur: 0.04, f0: 1800, f1: 700, vol: 0.13, q: 2 });
                             voice({ type: "square", f0: 330, dur: 0.05, vol: 0.1, at: 0.01 }); },
      clunk:   function () { voice({ type: "square", f0: 200, f1: 150, dur: 0.07, vol: 0.16 }); },
      cog:     function () { noise({ dur: 0.03, f0: 2600, vol: 0.1, q: 3 });
                             noise({ dur: 0.03, f0: 2200, vol: 0.09, q: 3, at: 0.06 }); }
    },

    doorOpen: { /* the reward for finishing a lock: something releases */
      swing:  function () { voice({ type: "sawtooth", f0: 180, f1: 620, dur: 0.34, vol: 0.16, lp: 1800 });
                            seq([N.C5, N.G5], { step: 0.12, dur: 0.2, vol: 0.16, at: 0.16 }); },
      stone:  function () { voice({ type: "triangle", f0: 70, f1: 44, dur: 0.5, vol: 0.22 });
                            noise({ dur: 0.4, f0: 500, f1: 140, vol: 0.1, q: 0.6 }); },
      unlatch:function () { voice({ type: "square", f0: 240, f1: 180, dur: 0.06, vol: 0.16 });
                            seq([N.E5, N.G5, N.C6], { step: 0.07, dur: 0.16, vol: 0.16, at: 0.09 }); }
    },

    right: {  /* a correct answer inside a lock */
      lift:  function () { seq([N.E5, N.A5], { step: 0.06, dur: 0.13, vol: 0.18 }); },
      blip:  function () { voice({ type: "square", f0: N.A5, dur: 0.09, vol: 0.18 }); },
      third: function () { seq([N.C5, N.E5], { step: 0.0, dur: 0.18, vol: 0.13, type: "triangle" }); }
    },

    wrong: {  /* never harsh — a child hears this a lot */
      soften: function () { seq([N.E4, N.C4], { step: 0.08, dur: 0.16, vol: 0.13, type: "triangle" }); },
      muted:  function () { voice({ type: "triangle", f0: 160, f1: 120, dur: 0.16, vol: 0.14, lp: 700 }); },
      buzz:   function () { noise({ dur: 0.1, f0: 340, f1: 220, vol: 0.09, q: 1.4 }); }
    },

    stone: {  /* a gate is passed and a stone lands in the bridge */
      set:    function () { voice({ type: "triangle", f0: 96, f1: 58, dur: 0.42, vol: 0.28 });
                            noise({ dur: 0.22, f0: 900, f1: 200, vol: 0.14, q: 0.6 });
                            seq([N.C5, N.E5, N.G5, N.C6], { step: 0.085, dur: 0.3, vol: 0.16, at: 0.18, type: "triangle" }); },
      forge:  function () { noise({ dur: 0.07, f0: 3200, vol: 0.2, q: 2 });
                            voice({ type: "triangle", f0: 110, f1: 66, dur: 0.5, vol: 0.26 });
                            seq([N.G4, N.C5, N.E5], { step: 0.1, dur: 0.32, vol: 0.17, at: 0.2 }); },
      bell:   function () { voice({ type: "sine", f0: N.C5, dur: 0.9, vol: 0.22, attack: 0.002 });
                            voice({ type: "sine", f0: N.G5, dur: 0.7, vol: 0.12, at: 0.02 });
                            voice({ type: "triangle", f0: 88, f1: 60, dur: 0.4, vol: 0.2 }); }
    },

    gateWord: {   /* the Wordsmith motif, alone */
      motif: function () { seq(WORDSMITH, { step: 0.15, dur: 0.3, vol: 0.22, type: "square" }); }
    },
    gateNumber: { /* the Numbersmith motif, alone */
      motif: function () { seq(NUMBERSMITH, { step: 0.15, dur: 0.3, vol: 0.22, type: "sawtooth", lp: 2200 }); }
    },

    newLand: {  /* a gate has opened the next place */
      rise:   function () { seq([N.C5, N.E5, N.G5, N.C6, N.E5, N.G5], { step: 0.07, dur: 0.18, vol: 0.16 }); },
      shimmer:function () { voice({ type: "triangle", f0: 300, f1: 1500, dur: 0.5, vol: 0.13 });
                            seq([N.G5, N.C6], { step: 0.12, dur: 0.3, vol: 0.14, at: 0.22, type: "sine" }); }
    },

    win: {   /* both motifs at once: every beat consonant, ending in unison */
      united: function () {
        seq(WORDSMITH,   { step: 0.34, dur: 0.62, vol: 0.2,  type: "square" });
        seq(NUMBERSMITH, { step: 0.34, dur: 0.62, vol: 0.17, type: "sawtooth", lp: 2000 });
        voice({ type: "triangle", f0: N.C3, dur: 1.5, vol: 0.16 });
        seq([N.C6], { at: 1.36, dur: 0.9, vol: 0.2, type: "sine" });
      },
      fanfare: function () {
        seq([N.C5, N.E5, N.G5, N.C6], { step: 0.11, dur: 0.24, vol: 0.2, type: "sawtooth", lp: 2400 });
        seq([N.G4, N.C5, N.E5, N.G5], { step: 0.11, dur: 0.24, vol: 0.14, type: "square", at: 0.02 });
        voice({ type: "triangle", f0: N.C3, dur: 1.2, vol: 0.16, at: 0.44 });
      }
    }
  };

  /* what the game plays unless told otherwise */
  var DEFAULTS = {
    step: "tick", bump: "thud", key: "chime", lockTurn: "ratchet",
    doorOpen: "swing", right: "lift", wrong: "soften", stone: "set",
    gateWord: "motif", gateNumber: "motif", newLand: "rise", win: "united"
  };

  function load() {
    CFG.choice = {}; CFG.patterns = {};
    try {
      var dev = JSON.parse(store.get(DEVICE_KEY) || "{}");
      if (typeof dev.muted === "boolean") CFG.muted = dev.muted;
      if (typeof dev.volume === "number") CFG.volume = dev.volume;
      /* an older save kept everything together; adopt it once */
      if (dev.choice) CFG.choice = dev.choice;
      if (dev.patterns) CFG.patterns = dev.patterns;
    } catch (e) {}
    try {
      var mine = JSON.parse(store.get(PLAYER_KEY()) || "null");
      if (mine) {
        CFG.choice = mine.choice || {};
        CFG.patterns = mine.patterns || {};
      }
    } catch (e) {}
    if (MASTER) MASTER.gain.value = CFG.volume;
  }
  function save() {
    store.set(DEVICE_KEY, JSON.stringify({ muted: CFG.muted, volume: CFG.volume }));
    store.set(PLAYER_KEY(), JSON.stringify({ choice: CFG.choice, patterns: CFG.patterns }));
  }
  load();

  function variantFor(event) {
    return CFG.choice[event] || DEFAULTS[event] || Object.keys(LIB[event] || {})[0];
  }

  /* switching player brings their own sounds with them */
  if (root.Profile && root.Profile.onChange) root.Profile.onChange(function () { load(); });

  root.Sound = {
    reload: load,
    play: function (event, variant) {
      /* a pattern written in the sequencer wins over the built-in candidates */
      if (!variant && CFG.patterns[event]) { playPattern(CFG.patterns[event]); return; }
      var group = LIB[event]; if (!group) return;
      var fn = group[variant || variantFor(event)];
      if (typeof fn === "function") fn();
    },
    playPattern: playPattern,
    setPattern: function (event, pat) {
      if (pat) CFG.patterns[event] = pat; else delete CFG.patterns[event];
      save();
    },
    getPattern: function (event) { return CFG.patterns[event] || null; },
    patterns: function () { return CFG.patterns; },
    noteFreq: noteFreq, midiName: midiName, nameToMidi: nameToMidi,
    events: function () { return Object.keys(LIB); },
    variants: function (e) { return Object.keys(LIB[e] || {}); },
    choice: function (e) { return variantFor(e); },
    setChoice: function (e, v) { CFG.choice[e] = v; save(); },
    defaults: function () { return DEFAULTS; },
    muted: function () { return CFG.muted; },
    mute: function (on) { CFG.muted = !!on; save(); },
    volume: function (v) {
      if (typeof v === "number") { CFG.volume = Math.max(0, Math.min(1, v)); if (MASTER) MASTER.gain.value = CFG.volume; save(); }
      return CFG.volume;
    },
    /* each land can sit in its own key */
    setKey: function (semitones) { CFG.transpose = semitones || 0; },
    available: function () { return !!(root.AudioContext || root.webkitAudioContext); },
    config: function () { return JSON.parse(JSON.stringify({ muted: CFG.muted, volume: CFG.volume, choice: CFG.choice })); },
    motifs: function () { return { wordsmith: WORDSMITH.slice(), numbersmith: NUMBERSMITH.slice() }; },
    _lib: LIB
  };
})(typeof window !== "undefined" ? window : this);
