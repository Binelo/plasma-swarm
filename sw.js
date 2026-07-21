/* Trivisor — service worker (cache-first, offline-capable) */
const CACHE = "trivisor-v1";
const ASSETS = ["./trivisor.html", "./manifest.webmanifest", "./icon.svg", "./"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // cacheia individualmente: um 404 não derruba a instalação inteira
      Promise.allSettled(ASSETS.map((a) => c.add(a)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request)
        .then((res) => {
          // só cacheia respostas OK do próprio escopo
          if (res.ok && new URL(e.request.url).origin === location.origin) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() =>
          // offline: navegações caem no app
          e.request.mode === "navigate" ? caches.match("./trivisor.html") : undefined
        );
    })
  );
});
