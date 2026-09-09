/* ===================================================================
   SERVICE WORKER  —  so the game works with no signal

   A tablet in a car, a classroom with bad wifi, a plane. The whole game
   is static, so it can simply be kept.

   The version string is the only thing that matters here: bump it and
   every device fetches everything again on next launch. Forget to, and
   children keep playing last month's build forever — which is the usual
   way a service worker goes wrong.
=================================================================== */
var VERSION = "amazed-v1";

var SHELL = [
  "./",
  "./index.html",
  "./math-challenge.js",
  "./word-challenge.js",
  "./word-sentences.js",
  "./word-gate.js",
  "./number-gate.js",
  "./profile.js",
  "./unlocks.js",
  "./sound.js",
  "./title.js",
  "./world.js",
  "./castle.js",
  "./intro.js",
  "./sound-test.html",
  "./sequencer.html",
  "./maze-editor.html",
  "./numbers.html",
  "./words.html",
  "./manifest.webmanifest",
  "./icon-48.png",
  "./icon-72.png",
  "./icon-96.png",
  "./icon-144.png",
  "./icon-192.png",
  "./icon-256.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION)
      /* addAll fails the whole install if ONE file 404s, which would leave
         no cache at all; take them one at a time instead */
      .then(function (c) {
        return Promise.all(SHELL.map(function (url) {
          return c.add(url).catch(function () {
            console.warn("service worker could not cache", url);
          });
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(names.filter(function (n) { return n !== VERSION; })
                                .map(function (n) { return caches.delete(n); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  /* Network first, cache as backup. A child on wifi gets today's build;
     a child with no signal gets the last one that worked. Cache-first
     would be faster and would also serve a stale game indefinitely. */
  e.respondWith(
    fetch(e.request)
      .then(function (res) {
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(e.request).then(function (hit) {
          return hit || caches.match("./index.html");
        });
      })
  );
});
