/* ===================================================================
   PROFILE  —  more than one child, one browser

   localStorage belongs to the browser, not the person, so without this
   two children on the same tablet share everything: both maths ladders,
   the word bands, the journey, the bridge. The second child inherits a
   difficulty they did not earn and a bridge they did not build.

   Every PLAYER key gets a prefix. Every DEVICE key does not:

     player   carry.math  carry.words  carry.intro  carrymaze
     device   carry.sound  carry.device.voice  carrymaze.authored
              carrymaze.wordlocks

   The voice, the volume and the mazes you drew belong to the tablet,
   not to whoever is holding it.

   The FIRST player uses no prefix at all, so a save made before profiles
   existed simply becomes Player 1. Nothing is migrated and nothing can
   be lost doing it.

       Profile.key("carry.math")     -> "carry.math" or "p2.carry.math"
       Profile.onChange(fn)          -> modules re-read when it switches
=================================================================== */
(function (root) {
  "use strict";

  var store = (function () {
    var mem = {};
    try {
      var k = "__t"; localStorage.setItem(k, "1"); localStorage.removeItem(k);
      return {
        get: function (n) { try { return localStorage.getItem(n); } catch (e) { return mem[n] || null; } },
        set: function (n, v) { try { localStorage.setItem(n, v); } catch (e) { mem[n] = v; } },
        del: function (n) { try { localStorage.removeItem(n); } catch (e) { delete mem[n]; } },
        keys: function () {
          try { var out = [], i; for (i = 0; i < localStorage.length; i++) out.push(localStorage.key(i)); return out; }
          catch (e) { return Object.keys(mem); }
        }
      };
    } catch (e) {
      return { get: function (n) { return mem[n] || null; }, set: function (n, v) { mem[n] = v; },
               del: function (n) { delete mem[n]; }, keys: function () { return Object.keys(mem); } };
    }
  })();

  var REG = "carry.players";
  /* Sound splits down a natural line. Mute and volume are about the ROOM
     you are sitting in, so they stay with the device. Which sounds you
     chose and any tunes you wrote are about YOU, so they travel with the
     player — siblings on one tablet, or a class sharing a machine, should
     not overwrite each other's music. */
  var PLAYER_KEYS = ["carry.math", "carry.words", "carry.intro", "carrymaze",
                     "carry.sound.player", "carry.unlocks"];

  var state = { players: [], currentId: 0, nextId: 1 };
  var listeners = [];

  function load() {
    try {
      var d = JSON.parse(store.get(REG) || "null");
      if (d && d.players && d.players.length) {
        state = d;
        return;
      }
    } catch (e) {}
    /* nobody has ever picked a name: whatever is already saved is Player 1 */
    state = { players: [{ id: 0, name: "Player 1" }], currentId: 0, nextId: 1 };
    save();
  }
  function save() { store.set(REG, JSON.stringify(state)); }

  function current() {
    var i;
    for (i = 0; i < state.players.length; i++)
      if (state.players[i].id === state.currentId) return state.players[i];
    return state.players[0];
  }
  function prefixFor(id) { return id ? ("p" + id + ".") : ""; }
  function prefix() { return prefixFor(current().id); }
  function key(name) {
    /* device keys are shared; only the player ones are namespaced */
    return PLAYER_KEYS.indexOf(name) >= 0 ? prefix() + name : name;
  }

  function notify() {
    listeners.forEach(function (fn) { try { fn(current()); } catch (e) {} });
  }

  root.Profile = {
    list: function () { return state.players.slice(); },
    current: current,
    prefix: prefix,
    key: key,
    playerKeys: function () { return PLAYER_KEYS.slice(); },

    use: function (id) {
      if (!state.players.some(function (p) { return p.id === id; })) return false;
      state.currentId = id; save(); notify(); return true;
    },
    create: function (name) {
      var p = { id: state.nextId++, name: (name || "").trim() || ("Player " + (state.players.length + 1)) };
      state.players.push(p); state.currentId = p.id; save(); notify();
      return p;
    },
    rename: function (id, name) {
      state.players.forEach(function (p) { if (p.id === id) p.name = (name || "").trim() || p.name; });
      save(); notify();
    },
    remove: function (id) {
      if (state.players.length < 2) return false;      /* never leave nobody */
      PLAYER_KEYS.forEach(function (k) { store.del(prefixFor(id) + k); });
      state.players = state.players.filter(function (p) { return p.id !== id; });
      if (state.currentId === id) state.currentId = state.players[0].id;
      save(); notify(); return true;
    },

    onChange: function (fn) { if (typeof fn === "function") listeners.push(fn); },

    /* ---- moving a child between devices, and surviving Safari ---- */
    exportPlayer: function (id) {
      var p = null, i;
      for (i = 0; i < state.players.length; i++) if (state.players[i].id === id) p = state.players[i];
      if (!p) return null;
      var data = {};
      PLAYER_KEYS.forEach(function (k) {
        var v = store.get(prefixFor(id) + k);
        if (v != null) data[k] = v;
      });
      return JSON.stringify({ carrySave: 1, name: p.name, data: data }, null, 1);
    },
    importPlayer: function (json) {
      var d;
      try { d = JSON.parse(json); } catch (e) { return { ok: false, why: "that is not a saved player" }; }
      if (!d || d.carrySave !== 1 || !d.data) return { ok: false, why: "that is not a saved player" };
      var p = root.Profile.create(d.name || "Imported");
      Object.keys(d.data).forEach(function (k) {
        if (PLAYER_KEYS.indexOf(k) >= 0) store.set(prefixFor(p.id) + k, d.data[k]);
      });
      notify();
      return { ok: true, name: p.name };
    }
  };

  load();
})(typeof window !== "undefined" ? window : this);
