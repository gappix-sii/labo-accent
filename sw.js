// Service worker : fonctionnement hors ligne de l'interface, et en-têtes de sécurité
// (CSP, isolation cross-origin pour le calcul multi-cœurs). Ne touche jamais aux requêtes d'autres sites.
const VERSION = "labo-v2.1.0";
const SHELL = [
  "./", "index.html", "css/app.css", "js/app.js", "js/audio.js", "js/phonemes.js", "js/content.js", "js/worker.js", "js/game.js", "js/mascot.js", "js/fx.js",
  "fonts/barlow-condensed-latin-800-italic.woff2", "fonts/barlow-condensed-latin-900-italic.woff2",
  "fonts/nunito-latin-400-normal.woff2", "fonts/nunito-latin-700-normal.woff2", "fonts/nunito-latin-800-normal.woff2",
  "vendor/transformers.min.js", "vendor/ort-wasm-simd-threaded.asyncify.mjs", "vendor/ort-wasm-simd-threaded.asyncify.wasm",
  "data/cmudict.json", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png"
];
const CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self'; font-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("labo-") && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function secure(resp) {
  if (!resp || resp.type === "opaque" || resp.type === "opaqueredirect") return resp;
  const h = new Headers(resp.headers);
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Cross-Origin-Embedder-Policy", "require-corp");
  h.set("Cross-Origin-Resource-Policy", "same-origin");
  h.set("Content-Security-Policy", CSP);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "no-referrer");
  h.set("Permissions-Policy", "microphone=(self), camera=(), geolocation=(), payment=(), usb=()");
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return; // autres sites : non modifiés
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const key = req.mode === "navigate" ? new URL("index.html", self.registration.scope).href : url.origin + url.pathname;
    try {
      // Réseau d'abord pour avoir les mises à jour, cache si hors ligne.
      const net = await fetch(req.mode === "navigate" ? key : req);
      if (net.ok && net.type === "basic") cache.put(key, net.clone());
      return secure(net);
    } catch (err) {
      const hit = await cache.match(key);
      if (hit) return secure(hit);
      throw err;
    }
  })());
});
