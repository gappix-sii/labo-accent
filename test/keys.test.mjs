// Tests de la phase 5, tâche 1 : clé Gemini gardée sur l'appareil, vérification de la clé, CSP, aucune clé dans le dépôt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { KEY_STORE, cleanKey, loadKey, saveKey, clearKey, maskKey } from "../js/core/keys.js";
import { checkKey, request, errorText, statusCode, MODELS, HOST } from "../js/engine/gemini.js";
import { defaults, save, STORE_KEY } from "../js/core/store.js";
import { route } from "../js/main.js";

// Fausse clé : n'a pas la forme d'une vraie clé Google (« AIza… »), pour que le test anti-fuite ne la voie pas.
const FAKE = "test-key-not-real-0123456789abcdefXYZ";

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}
const brokenStorage = { getItem() { throw new Error("bloqué"); }, setItem() { throw new Error("plein"); }, removeItem() { throw new Error("bloqué"); } };

test("clé : nettoyée, gardée à part de la sauvegarde, effaçable", () => {
  assert.equal(cleanKey(`  ${FAKE}\n`), FAKE);
  for (const bad of ["", "court", "avec des espaces dedans 0123456789abcdef", "<img src=x onerror=alert(1)>0123456789abcdef", null, 42])
    assert.equal(cleanKey(bad), null, String(bad));
  const st = memoryStorage();
  assert.equal(loadKey(st), null);
  assert.equal(saveKey("pas une clé", st), "bad");
  assert.equal(saveKey(FAKE, st), "ok");
  assert.equal(loadKey(st), FAKE);
  assert.deepEqual([...st.m.keys()], [KEY_STORE]);
  assert.notEqual(KEY_STORE, STORE_KEY);
  save(defaults(), st);
  assert.ok(!st.m.get(STORE_KEY).includes(FAKE), "la clé n'est jamais dans la sauvegarde");
  st.setItem(KEY_STORE, "abîmée !");
  assert.equal(loadKey(st), null);
  assert.equal(clearKey(st), true);
  assert.equal(st.getItem(KEY_STORE), null);
  assert.equal(maskKey(FAKE), "test…fXYZ");
  assert.equal(maskKey(null), "");
});

test("clé : stockage bloqué ou plein, sans planter", () => {
  assert.equal(loadKey(brokenStorage), null);
  assert.equal(saveKey(FAKE, brokenStorage), "storage");
  assert.equal(clearKey(brokenStorage), false);
});

// Faux fetch : garde la dernière demande et renvoie la réponse prévue.
function fakeFetch(reply) {
  const f = async (url, opts) => { f.url = url; f.opts = opts; if (reply instanceof Error) throw reply; return reply; };
  return f;
}
const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test("tester la clé : clé dans l'en-tête, jamais dans l'adresse, sans cookie ni redirection", async () => {
  const f = fakeFetch(json(200, { name: `models/${MODELS.chat}`, displayName: "Gemini <b>Flash</b>" }));
  const r = await checkKey(FAKE, { fetchFn: f });
  assert.deepEqual(r, { ok: true, name: "Gemini bFlash/b" });
  assert.equal(f.url, `${HOST}/v1beta/models/${MODELS.chat}`);
  assert.ok(!f.url.includes(FAKE) && !f.url.includes("key="), "pas de clé dans l'adresse");
  assert.equal(f.opts.headers["x-goog-api-key"], FAKE);
  assert.equal(f.opts.credentials, "omit");
  assert.equal(f.opts.redirect, "error");
  assert.equal(f.opts.referrerPolicy, "strict-origin");
  assert.equal(f.opts.method, "GET");
});

test("tester la clé : chaque erreur donne un message clair", async () => {
  assert.deepEqual(await checkKey(null), { ok: false, error: "no_key" });
  for (const [status, code] of [[400, "key"], [403, "key"], [404, "model"], [429, "quota"], [503, "server"], [418, "unexpected"]]) {
    assert.equal(statusCode(status), code);
    assert.deepEqual(await checkKey(FAKE, { fetchFn: fakeFetch(json(status, {})) }), { ok: false, error: code });
  }
  assert.deepEqual(await checkKey(FAKE, { fetchFn: fakeFetch(new TypeError("Failed to fetch")) }), { ok: false, error: "network" });
  assert.deepEqual(await checkKey(FAKE, { fetchFn: fakeFetch(json(200, { name: "models/autre" })) }), { ok: false, error: "unexpected" });
  assert.deepEqual(await checkKey(FAKE, { fetchFn: fakeFetch({ ok: true, status: 200, json: async () => { throw new SyntaxError("pas du JSON"); } }) }), { ok: false, error: "unexpected" });
  assert.deepEqual(await checkKey(FAKE, { model: "../../evil?x=1", fetchFn: fakeFetch(json(200, {})) }), { ok: false, error: "model" });
  // délai dépassé : la demande est annulée
  const slow = (url, opts) => new Promise((_, rej) => opts.signal.addEventListener("abort", () => rej(new Error("aborted"))));
  assert.deepEqual(await request("models/x", FAKE, { fetchFn: slow, timeoutMs: 20 }), { ok: false, error: "timeout" });
  for (const c of ["no_key", "key", "model", "quota", "server", "timeout", "offline", "network", "unexpected"])
    assert.ok(errorText(c).length > 10, c);
});

test("CSP : seule l'adresse de Gemini est autorisée en plus de l'appli", () => {
  const page = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const csp = /Content-Security-Policy" content="([^"]+)"/.exec(page)[1];
  assert.match(csp, /connect-src 'self' https:\/\/generativelanguage\.googleapis\.com;/);
  assert.ok(!/connect-src[^;]*\*/.test(csp), "pas de joker");
  assert.equal(HOST, "https://generativelanguage.googleapis.com");
});

test("aucune vraie clé Google (« AIza… » ou « AQ.… ») dans les fichiers du dépôt", () => {
  const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const skip = new Set(["node_modules", ".git", "data", "ancien", "models"]);
  const found = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (skip.has(name)) continue;
      const p = join(dir, name), st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(js|mjs|html|css|json|md|txt)$/.test(name) && st.size < 2e6 && /AIza[0-9A-Za-z_-]{35}|AQ\.[0-9A-Za-z_-]{30,}/.test(readFileSync(p, "utf8"))) found.push(p);
    }
  })(root);
  assert.deepEqual(found, []);
});

test("adresse de l'écran des réglages", () => {
  assert.deepEqual(route("#reglages"), { screen: "settings" });
  assert.deepEqual(route("#reglages/x"), { screen: "home" });
});
