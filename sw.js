// Service worker du Labo d'accent.
// 1. Pré-cache VÉRIFIÉ : à l'installation, chaque fichier de l'appli est téléchargé puis comparé à son empreinte
//    SHA-256 (liste générée par tools/build-sw.mjs). Une seule différence et la nouvelle version n'est pas installée :
//    l'appli continue avec l'ancienne, intacte (échec fermé).
// 2. Ensuite, l'appli est servie depuis ce cache (hors ligne, versions cohérentes) avec les en-têtes de sécurité :
//    CSP du document (Trusted Types, pas de script externe), CSP des workers, isolation cross-origin, anti-iframe.
// 3. Ne touche jamais aux requêtes vers d'autres sites (les modèles sont vérifiés dans les workers, voir js/integrity.js).
/* BUILD:BEGIN */
const VERSION = "labo-13afa79c6a50";
const MANIFEST = {"css/app.css":{"h":"cfb318b89e112eb8827a45d279f5d91c1fc13b501f3e9588d1690c9ae655b0db","n":89657},
  "data/cmudict.json":{"h":"ca8e790ec08466b37153a35576e2ac3ede1dfe3b1a16ccdb7605deef4add654b","n":4114306},
  "fonts/barlow-condensed-latin-800-italic.woff2":{"h":"59b48100622b2dea5b10bbf9e98d02eecf20ea8ae000821877f2d470ec16ee55","n":23780},
  "fonts/barlow-condensed-latin-900-italic.woff2":{"h":"b58672f4b405724353d140e19cfead74fefc9004271e846d4884cd9b76f36dbf","n":23212},
  "fonts/nunito-latin-400-normal.woff2":{"h":"a5906e15ceb68f73d3b2c2076b4057c3f6ed401186d56283b45ce12944ca0735","n":16316},
  "fonts/nunito-latin-700-normal.woff2":{"h":"fa89300b9bbb3bd0f60d6991aa055965d98e2ccca27bf8688fe0c39cdc796846","n":16228},
  "fonts/nunito-latin-800-normal.woff2":{"h":"2363d3ed037283ebb961e8c4b4917e40a8bc8853cf9965cf1ea7b4daa1df630a","n":16520},
  "icons/icon-192.png":{"h":"92d781707e174907327bc66aed26d3d7c5751a3d00ade01832c032531f21e132","n":3584},
  "icons/icon-512.png":{"h":"6d46b0b296865b477d8c78fc94bee366ff4b40341313ae12e7c1eadfc777207d","n":12913},
  "icons/icon.svg":{"h":"4047b4dcbd186860a3cfb5f7f2dc9c98952f2a47118e9812100d0ded42c84708","n":400},
  "index.html":{"h":"d0f1ce3303bcf0a70a3ab4d2d6171414b6b2aa784e3ebcc6b2b9936d92e30bd8","n":6542},
  "js/app.js":{"h":"390187f016651d960928ec60cb927ed48d3937715ff4df061731db9239d06f3a","n":165198},
  "js/art.js":{"h":"2c9a402ba01e48e371275a8e8210acfd05e7ce43658d972907fb4c2a3fbd6d46","n":7111},
  "js/audio.js":{"h":"3ed9fe642351caf208cb9fd8842bfacd557bdedc5e13a968f27966515f619b01","n":5998},
  "js/avatar.js":{"h":"13f903a38031257621a9a4cd220a7672b64e20de8bdafe9e098a104ae423bcff","n":76221},
  "js/basics.js":{"h":"8589f931d501039d46ce32d7f7c57fe0ca5acc5123b999ab4bd3670220e9e93f","n":17876},
  "js/chat-worker.js":{"h":"8395e917acf223292e5f793a8d2224b1a75b82aae9efe69f0083875d81b9076f","n":2959},
  "js/chrono.js":{"h":"3f8acd26be32cc5abbc5f40cf0585b82a61b79d4e16cef0793400b39d52a5b9c","n":2067},
  "js/content.js":{"h":"b5b839bf38c93db4d2d1f7d7c0d29a363f8319068f96fd7de7ae534413c8b836","n":12140},
  "js/core/dom.js":{"h":"cf0b04f6214c6e19ea6cc581b58205c5008accdad394508403367c55282bc084","n":6467},
  "js/core/economy.js":{"h":"c5ccf1bf3ffe072b6d0208ae842c2d716a4d941d8fd7fd5f08175a5a22766544","n":7976},
  "js/core/seal.js":{"h":"8ff111a96959a19c29c95e094e1a899ad6eda2d0cd4fb49a29b6f2d3108e3fef","n":1899},
  "js/core/secret.js":{"h":"9e8ff9e69dc1993bcb3c9e3214e071ffbeecff1df764b6780804f62d80fe3226","n":3002},
  "js/core/store.js":{"h":"1d302ea9d40beb76fbf8449239c4056394937afddb16ce8c62d8811dda96c2c6","n":11646},
  "js/dialogues.js":{"h":"5291c9b56e61879b0f7c04b38fb13af5a85d3aa399bbd2014089c51c8c632e34","n":16800},
  "js/fx.js":{"h":"e92947b3e0d0dba9a351d82203ef66b494b9e85cb0bc8d040d132144d3ffe2a8","n":7847},
  "js/game.js":{"h":"c55e280078647f0234433f51a0914e7ae1c312d66066304579906f4bbb1d5b09","n":10362},
  "js/grammar.js":{"h":"18323d4fc8096f7a57fb332999f710c40de18ee9cbb11e279ae97a1837a5a413","n":30662},
  "js/integrity.js":{"h":"5496eeb233a33d68ef579964c574f58014a377269cd8375acd6b030e1587c18b","n":6091},
  "js/irregular.js":{"h":"b47b647aa1840de6e88934856e0c6681901b35ae83e0969233ed835ab50cf17b","n":19777},
  "js/mascot.js":{"h":"2bf1076d68c152fe01aba0bc16368f3cac419e7be35c8ab5ababcdcff376fb5a","n":2511},
  "js/meta.js":{"h":"f03ef4637eb4de9046dd489dbcf9064e77e4e756e746ba5deb3de50acac266e9","n":11613},
  "js/mistakes.js":{"h":"7190f9253cc152ab161fc47d29b16991e93eb408d0b0471c40faa20de0a554e0","n":5294},
  "js/phonemes.js":{"h":"3594fe52b95ba9d15bc4e2bd49361a426a5e76a6b8e19693aae89c1dd018ba44","n":15498},
  "js/scenes.js":{"h":"ddcd906743eda2eda92ffb3c90d01a73f5ab67eda0f75514b034d79738f32ee5","n":3070},
  "js/sha256.js":{"h":"a5031526d8129eafe51967778287a21f65727f1cf39da08ffa0977163fd28570","n":4206},
  "js/social.js":{"h":"60fff7e0d856cdc83fe2ba33649b463a874f39e9e14fb8fe5fec178ae76fad27","n":8800},
  "js/views/arena.js":{"h":"26792dd4886fb4c591bd3fd1a3757666354b34815e5d47196b8f56561d2b82ce","n":15422},
  "js/views/friends.js":{"h":"cb3beb9d0bb0fc625017a16dbbb959663e0bdd705b9efecc950e27629d777121","n":19385},
  "js/views/locker.js":{"h":"afbea92a75303b3e63300adf451149e2587cdcfc169284f3524afe6198ede287","n":17132},
  "js/views/lootbox.js":{"h":"eafc6f72b4f6e76f9920954d9471468adaf1058b0ac756db88374e3a305f1aaa","n":9516},
  "js/views/verbs.js":{"h":"fe8b8efa9150700b40beba384e9b28acf016eb07bf0a9854e1d5281df4093120","n":19022},
  "js/vocab.js":{"h":"7550d525a813b7570cf6cb5e9991975b6f58e7863c12039aa8364c956ee763f2","n":11241},
  "js/worker.js":{"h":"c8151c3e371fce679dea8f64cdcf63b4553f6f70c2a37b3c8a2f6fd8a8e709b6","n":2950},
  "manifest.webmanifest":{"h":"abc8d70fbf7514cf470e2f129ada80ac309d14c9480903dc08eecede6ec56123","n":590},
  "vendor/ort-wasm-simd-threaded.asyncify.mjs":{"h":"0966b6105cd936744498aa60df7a22cbd47af3374dbc64a9ab561c08a71e3611","n":53057},
  "vendor/ort-wasm-simd-threaded.asyncify.wasm":{"h":"49871f5a4409519797e127440868a6d1923339d9185907f301a5b2a1d90af082","n":26861777},
  "vendor/transformers.min.js":{"h":"8b5a3171f8876bab2b1820a7d65eb87628e3d30bb5ea85b9dd398e76eb34decb","n":587917}};
/* BUILD:END */

const DOC_CSP = "default-src 'self'; script-src 'self'; worker-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com; img-src 'self'; media-src 'self' blob:; style-src 'self'; font-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types labo";
const WORKER_CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co; object-src 'none'; base-uri 'none'";
const PERMS = "microphone=(self), camera=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), display-capture=()";
const TYPES = { html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8", json: "application/json", wasm: "application/wasm", woff2: "font/woff2", svg: "image/svg+xml", png: "image/png", webmanifest: "application/manifest+json", txt: "text/plain; charset=utf-8" };
const typeOf = p => TYPES[p.split(".").pop()] || "application/octet-stream";
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");

// Fichier inchangé depuis la version précédente : on le reprend du cache (après revérification de son empreinte)
// au lieu de le retélécharger. Une mise à jour ne télécharge donc que ce qui a changé.
async function fromOldCache(href, want) {
  for (const k of await caches.keys()) {
    if (!k.startsWith("labo-") || k === VERSION) continue;
    const r = await (await caches.open(k)).match(href);
    if (!r) continue;
    const buf = await r.arrayBuffer();
    if (buf.byteLength === want.n && hex(await crypto.subtle.digest("SHA-256", buf)) === want.h) return buf;
  }
  return null;
}
async function fetchVerified(path, want) {
  const url = new URL(path, self.registration.scope);
  const old = await fromOldCache(url.href, want);
  if (old) return [url.href, new Response(old, { headers: { "Content-Type": typeOf(path), "Content-Length": String(old.byteLength) } })];
  const r = await fetch(url, { cache: "reload", credentials: "same-origin", redirect: "error" });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  const buf = await r.arrayBuffer();
  if (buf.byteLength !== want.n) throw new Error(`${path}: taille inattendue`);
  if (hex(await crypto.subtle.digest("SHA-256", buf)) !== want.h) throw new Error(`${path}: empreinte SHA-256 différente`);
  return [url.href, new Response(buf, { headers: { "Content-Type": typeOf(path), "Content-Length": String(buf.byteLength) } })];
}

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const entries = Object.entries(MANIFEST), done = [];
    for (let i = 0; i < entries.length; i += 6) done.push(...await Promise.all(entries.slice(i, i + 6).map(([p, w]) => fetchVerified(p, w))));
    const cache = await caches.open(VERSION);
    await Promise.all(done.map(([u, r]) => cache.put(u, r)));
    if (!self.registration.active) await self.skipWaiting(); // première installation : rien à remplacer
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("labo-") && k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

// La page demande d'activer une mise à jour déjà vérifiée et en attente.
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });

function secure(resp, dest) {
  if (!resp || resp.type === "opaque" || resp.type === "opaqueredirect" || resp.type === "error") return resp;
  const h = new Headers(resp.headers);
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Cross-Origin-Embedder-Policy", "require-corp");
  h.set("Cross-Origin-Resource-Policy", "same-origin");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "no-referrer");
  if (dest === "document") { h.set("Content-Security-Policy", DOC_CSP); h.set("Permissions-Policy", PERMS); h.set("X-Frame-Options", "DENY"); }
  else if (dest === "worker") h.set("Content-Security-Policy", WORKER_CSP);
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
}

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return; // autres sites : non modifiés
  const nav = req.mode === "navigate";
  e.respondWith((async () => {
    const key = nav ? new URL("index.html", self.registration.scope).href : url.origin + url.pathname;
    const cache = await caches.open(VERSION);
    let res = await cache.match(key);
    if (!res) {
      // Hors de la liste vérifiée (ou version de développement) : réseau, jamais mis en cache.
      try { res = await fetch(nav ? key : req); } catch (err) { return Response.error(); }
    }
    return secure(res, nav ? "document" : req.destination);
  })());
});
