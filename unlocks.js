/* ===================================================================
   UNLOCKS  —  what finishing the journey earns

   A child who has crossed the whole maze has heard every sound in the
   game several hundred times. That is exactly the person who should be
   allowed to change them, and exactly the wrong person to have shown a
   sequencer to at the start.

   So the tools are not advertised. They arrive once, from the sphinx,
   after the bridge stands — and then they stay.

   Per PLAYER, not per device: siblings on one tablet and a class
   sharing a machine each earn their own, and one child's tune must not
   arrive uninvited in another's game.

       Unlocks.has("sound")   Unlocks.grant("sound")   Unlocks.list()
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

  var BASE = "carry.unlocks";
  function KEY() { return root.Profile ? root.Profile.key(BASE) : BASE; }

  var held = {};
  function load() {
    held = {};
    try { held = JSON.parse(store.get(KEY()) || "{}") || {}; } catch (e) { held = {}; }
  }
  function save() { store.set(KEY(), JSON.stringify(held)); }
  load();
  if (root.Profile && root.Profile.onChange) root.Profile.onChange(load);

  root.Unlocks = {
    has: function (name) { return !!held[name]; },
    /* returns true only the FIRST time, so the giving can be a moment */
    grant: function (name) {
      if (held[name]) return false;
      held[name] = Date.now();
      save();
      return true;
    },
    revoke: function (name) { delete held[name]; save(); },
    list: function () { return Object.keys(held); },
    reload: load
  };
})(typeof window !== "undefined" ? window : this);
