// Tests de la relecture complète (2026-11-18) : sauvegarde entre onglets, sauvegarde refusée, annuler l'import, codes trafiqués.
import { test } from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { defaults, sanitize, save, load, isBlocked, takeNotices, onStoreNotice, STORE_KEY, DAMAGED_KEY } from "../js/core/store.js";
import { unpack, pick, toB64url, LISTS, transferError } from "../js/core/transfer.js";
import { swapForUndo, isOlder } from "../js/screens/transfer.js";

// Faux stockage du navigateur, partagé par deux « onglets ».
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };

test("n° 1 : deux onglets — le plus ancien n'écrase plus ce que l'autre a enregistré", () => {
  const st = mem(), seen = []; const off = onStoreNotice((k) => seen.push(k));
  const A = load(st), B = load(st);
  A.progress.xp = 50; assert.equal(save(A, st), true);
  B.progress.xp = 10; assert.equal(save(B, st), false, "l'onglet B a une copie périmée");
  assert.equal(JSON.parse(st.getItem(STORE_KEY)).progress.xp, 50, "le travail de A est gardé");
  assert.equal(isBlocked(B), "other-tab"); assert.deepEqual(seen, ["other-tab"]);
  assert.equal(save(B, st), false, "B reste bloqué jusqu'au rechargement");
  A.progress.xp = 60; assert.equal(save(A, st), true, "A continue normalement");
  const C = load(st); assert.equal(C.progress.xp, 60); C.progress.xp = 70; assert.equal(save(C, st), true, "un onglet rechargé repart de la dernière sauvegarde");
  off();
});

test("n° 3 : sauvegarde illisible gardée de côté, version plus récente jamais écrasée", () => {
  takeNotices();
  const st = mem(); st.setItem(STORE_KEY, "{pas du json");
  const S = load(st);
  assert.deepEqual(S, defaults()); assert.equal(st.getItem(DAMAGED_KEY), "{pas du json", "copie de secours");
  assert.deepEqual(takeNotices(), ["damaged"]);
  st.setItem(STORE_KEY, "[1,2]"); load(st); assert.deepEqual(takeNotices(), ["damaged"]);
  assert.equal(st.getItem(DAMAGED_KEY), "{pas du json", "la première copie de secours n'est pas écrasée");
  const t2 = mem(), future = JSON.stringify({ version: 2, progress: { xp: 999 } }); t2.setItem(STORE_KEY, future);
  const N = load(t2); assert.equal(isBlocked(N), "newer"); assert.deepEqual(takeNotices(), ["newer"]);
  N.progress.xp = 5; assert.equal(save(N, t2), false); assert.equal(t2.getItem(STORE_KEY), future, "rien d'écrit");
  const ok = mem(); ok.setItem(STORE_KEY, JSON.stringify({ ...defaults(), progress: { ...defaults().progress, xp: 42 } }));
  assert.equal(load(ok).progress.xp, 42); assert.deepEqual(takeNotices(), [], "une bonne sauvegarde ne déclenche rien");
});

test("n° 2 : « Annuler l'import » échange les deux sauvegardes, et passe devant les autres onglets", () => {
  const now = { ...defaults(), rev: 9, progress: { ...defaults().progress, xp: 300 } }, before = { ...defaults(), rev: 4, progress: { ...defaults().progress, xp: 120 } };
  const sw = swapForUndo(JSON.stringify(now), JSON.stringify(before));
  assert.equal(JSON.parse(sw.store).progress.xp, 120); assert.equal(JSON.parse(sw.store).rev, 10, "révision au-dessus de celle enregistrée");
  assert.equal(JSON.parse(sw.backup).progress.xp, 300, "ce qui a été fait depuis l'import reste gardé de côté");
  const st = mem(), old = load(st); st.setItem(STORE_KEY, sw.store); old.progress.xp = 1;
  assert.equal(save(old, st), false, "un onglet resté ouvert n'écrase pas l'annulation");
});

test("n° 10 : progression reçue moins avancée signalée", () => {
  assert.equal(isOlder({ xp: 300, words: 50, lessons: 2 }, { xp: 1200, words: 50, lessons: 2 }), true);
  assert.equal(isOlder({ xp: 1200, words: 40, lessons: 2 }, { xp: 1200, words: 50, lessons: 2 }), true);
  assert.equal(isOlder({ xp: 1300, words: 60, lessons: 3 }, { xp: 1200, words: 50, lessons: 2 }), false);
});

test("n° 8 et 9 : code fabriqué (jour aberrant) refusé sans planter ; navigateur sans compression prévenu", async () => {
  const data = { ...pick(defaults()), srs: { v: 1, level: "A1", perDay: 10, fresh: { day: "", n: 0 }, t: 1e9, c: [0, 1, 0] } };
  const code = "1." + toB64url(new Uint8Array(zlib.deflateRawSync(Buffer.from(JSON.stringify(data)))));
  const r = await unpack(code);
  assert.equal(r.ok, true, "lu sans erreur"); assert.deepEqual(r.data.srs.cards, {}, "fiches au jour aberrant ignorées");
  const save1 = globalThis.CompressionStream; globalThis.CompressionStream = undefined;
  try { assert.deepEqual(await unpack(code), { ok: false, error: "old-browser" }); } finally { globalThis.CompressionStream = save1; }
  assert.match(transferError("old-browser"), /trop ancien/);
  assert.equal(data.lists, LISTS);
});
