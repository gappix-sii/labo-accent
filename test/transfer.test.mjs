// Tests de la phase 7, tâche 1 : format du transfert de la progression (js/core/transfer.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { pack, unpack, receive, pick, linkFor, codeFrom, toB64url, fromB64url, transferError, SENT, CODE_MAX, LISTS, OWNABLE } from "../js/core/transfer.js";
import { defaults, sanitize } from "../js/core/store.js";
import { answer, setLevel, LEVEL_IDS } from "../js/core/srs.js";
import { buildQueue } from "../js/screens/vocab.js";
import { syncGame, openChest, mulberry32 } from "../js/core/game.js";
import { CATALOG } from "../js/content/avatar.js";
import { LESSONS } from "../js/content/lessons.js";
import { GRAMMAR } from "../js/content/grammar.js";
import { DIALOGUES } from "../js/content/dialogues.js";
import { FAMILIES } from "../js/content/verbs.js";
import { starsOf } from "../js/core/progress.js";

const DAY = 86400e3, t0 = Date.UTC(2026, 0, 1, 12);
const b64 = (buf) => toB64url(new Uint8Array(buf));

// Un an d'usage simulé : vocabulaire tous les jours, une note pour chaque élément de chaque leçon, règle, dialogue
// et famille de verbes (ajouté le 2026-11-20 : sans les notes, la taille était sous-estimée), jeu bien rempli, journal plein.
function yearOfUse() {
  const S = defaults(), rng = mulberry32(5); let now = t0;
  for (let d = 0; d < 365; d++) {
    setLevel(S.srs, LEVEL_IDS[Math.min(LEVEL_IDS.length - 1, Math.floor(d / 60))]); // un niveau tous les 2 mois
    for (const x of buildQueue(S.srs, now)) answer(S.srs, x.id, rng() > 0.3, now);
    S.progress.xp += 60; now += DAY;
  }
  const notes = (n) => Array.from({ length: n }, () => 60 + Math.floor(rng() * 41));
  for (const l of LESSONS) S.progress.lessons[l.id] = { done: 3, run: [], best: notes(l.items.length) };
  for (const g of GRAMMAR) S.progress.lessons["g-" + g.id] = { done: 1, run: [1], best: notes(g.ex.length) };
  for (const d of DIALOGUES) S.progress.lessons["r-" + d.id] = { done: 1, run: [], best: notes(d.turns.filter((t) => t.me).length) };
  for (const f of FAMILIES) S.progress.lessons["v-" + f.id] = { done: 1, run: [0, 4], best: notes(f.verbs.length * 3) };
  syncGame(S.game, S.progress); while (S.game.chests.length) openChest(S.game, rng);
  S.game.owned.push(...CATALOG.slice(0, 60));
  S.engine = true; S.voice = true;
  S.log = Array.from({ length: 100 }, (_, i) => ({ s: i % 10, kind: "soigné", score: 80, at: now, bad: [{ p: "θ", heard: "s" }] }));
  return sanitize(JSON.parse(JSON.stringify(S)));
}

test("aller-retour : ce qui est envoyé revient à l'identique", async () => {
  const S = yearOfUse(), code = await pack(S);
  assert.match(code, /^1\.[A-Za-z0-9_-]+$/, "code sans caractère spécial, utilisable dans une adresse");
  const r = await unpack(code);
  assert.equal(r.ok, true);
  const local = defaults(), got = receive(local, r.data);
  for (const k of SENT.filter((k) => k !== "srs" && k !== "game" && k !== "progress")) assert.deepEqual(got[k], S[k], k);
  // progression : tout pareil, sauf le détail des notes, lissé ; leur nombre, leur total et donc les étoiles sont identiques
  const { lessons, ...p } = got.progress, { lessons: l2, ...p2 } = S.progress;
  assert.deepEqual(p, p2);
  assert.deepEqual(Object.keys(lessons).sort(), Object.keys(l2).sort());
  const total = (b) => b.reduce((a, x) => a + x, 0);
  for (const [id, L] of Object.entries(l2)) {
    assert.deepEqual([lessons[id].done, lessons[id].run, lessons[id].best.length, total(lessons[id].best)], [L.done, L.run, L.best.length, total(L.best)], id);
    assert.ok(lessons[id].best.every((x) => Number.isInteger(x) && x >= 0 && x <= 100), id);
  }
  for (const l of LESSONS) assert.equal(starsOf(got.progress, l.id, l.items.length), starsOf(S.progress, l.id, l.items.length), l.id);
  // vocabulaire : boîte et date de révision de chaque mot (les compteurs internes, jamais affichés, ne partent pas)
  const bd = (R) => Object.fromEntries(Object.entries(R.cards).map(([id, c]) => [id, [c.box, c.due]]));
  assert.deepEqual(bd(got.srs), bd(S.srs)); assert.equal(got.srs.level, S.srs.level); assert.deepEqual(got.srs.fresh, S.srs.fresh);
  assert.ok(Object.values(got.srs.cards).every((c) => c.seen >= 1 && c.ok < c.seen));
  const { owned, ...g } = got.game, { owned: o2, ...g2 } = S.game;
  assert.deepEqual(g, g2); assert.deepEqual([...owned].sort(), [...o2].sort(), "mêmes objets");
});

test("ce qui ne part jamais : clé, journal du banc, moteur téléchargé", async () => {
  const S = yearOfUse(); S.gemini = ["AQ", "cle-qui-ne-doit-jamais-partir-1234567890"].join("."); // fabriquée ici : le test anti-clé du dépôt ne la confond pas avec une vraie
  const sent = pick(S);
  assert.deepEqual(Object.keys(sent).sort(), ["lists", "version", ...SENT].sort());
  const r = await unpack(await pack(S));
  for (const k of ["gemini", "log", "last", "engine", "voice"]) assert.ok(!(k in r.data), k);
  assert.ok(!JSON.stringify(r.data).includes("cle-qui-ne-doit"));
  // l'appareil qui reçoit garde son propre état « moteur », son journal et son dernier résultat
  const local = defaults(); local.engine = false; local.log = [{ s: 1, kind: "fautes", score: 50, at: t0, bad: [] }];
  const got = receive(local, r.data);
  assert.equal(got.engine, false); assert.deepEqual(got.log, local.log);
});

test("codes abîmés, trafiqués ou trop gros refusés", async () => {
  const good = await pack(yearOfUse());
  const bad = async (c) => (await unpack(c)).error;
  assert.equal(await bad(42), "format");
  assert.equal(await bad("bonjour"), "format");
  assert.equal(await bad("1.<script>alert(1)</script>"), "format");
  assert.equal(await bad("2." + good.slice(2)), "version");
  assert.equal(await bad(good.slice(0, good.length / 2)), "damaged", "lien coupé");
  assert.equal(await bad(good.slice(0, 40) + "AAAA" + good.slice(44)), "damaged", "lien mal copié");
  assert.equal(await bad("1." + "A".repeat(CODE_MAX)), "size");
  // bombe : petit code qui donnerait 3 Mo une fois décompressé
  assert.equal(await bad("1." + b64(zlib.deflateRawSync(Buffer.alloc(3e6, 32)))), "damaged");
  // JSON valide mais pas une sauvegarde, ou d'une autre version
  assert.equal(await bad("1." + b64(zlib.deflateRawSync(Buffer.from("[1,2]")))), "damaged");
  assert.equal(await bad("1." + b64(zlib.deflateRawSync(Buffer.from('{"version":9}')))), "version");
  assert.equal(await bad("1." + b64(zlib.deflateRawSync(Buffer.from('{"version":1,"lists":"autre"}')))), "version", "listes de mots ou d'objets d'une autre version");
  // données trafiquées : nettoyées comme une sauvegarde lue
  const evil = { version: 1, lists: LISTS, progress: { xp: "beaucoup" }, srs: { v: 1, t: 20000, c: [0, 1, -5, 99999, 2, 0, "x"] },
    game: { v: 1, coins: 1e12, o: "<script>", avatar: { species: "constructor", name: "<img onerror=x>" } }, __proto__: { pwned: 1 }, gemini: "x" };
  const r = await unpack("1." + b64(zlib.deflateRawSync(Buffer.from(JSON.stringify(evil)))));
  assert.equal(r.ok, true);
  const got = receive(defaults(), r.data);
  assert.equal(got.progress.xp, 0); assert.equal(got.game.coins, 0); assert.equal(got.game.avatar.species, "skunk");
  assert.ok(!got.game.avatar.name.includes("<")); assert.ok(!("gemini" in got)); assert.equal({}.pwned, undefined);
  assert.deepEqual(got.srs.cards, {}, "fiches abîmées ignorées"); assert.deepEqual(got.game.owned, ["phones"]);
  for (const e of ["format", "version", "size", "damaged", "inconnu"]) assert.ok(transferError(e).length > 10);
});

test("taille : un an d'usage tient dans un QR code", async () => {
  const S = yearOfUse(), code = await pack(S), link = linkFor(code, "https://gappix-sii.github.io/labo-accent/");
  const words = Object.keys(S.srs.cards).length;
  console.log(`Un an d'usage simulé : ${words} mots, sauvegarde ${JSON.stringify(S).length} caractères → code ${code.length}, lien ${link.length}`);
  assert.ok(words >= 450, `${words} mots`);
  assert.ok(OWNABLE.length > 100);
  assert.ok(link.length < 2900, "un QR code en contient 2 953 au plus (correction d'erreur basse)");
});

test("lien et code collé", () => {
  const code = "1.abcdefghij_-";
  assert.equal(linkFor(code, "https://gappix-sii.github.io/labo-accent/#accueil?x=1"), "https://gappix-sii.github.io/labo-accent/#transfert/1.abcdefghij_-");
  assert.equal(codeFrom(`https://x.test/labo/#transfert/${code}`), code);
  assert.equal(codeFrom(`  #transfert/${code} `), code);
  assert.equal(codeFrom(code), code);
  assert.equal(codeFrom("#transfert/1.abc<x>defgh"), null);
  assert.equal(codeFrom("https://x.test/#accueil"), null);
  assert.equal(codeFrom(null), null);
  const bytes = new Uint8Array([0, 1, 250, 251, 252, 253, 254, 255]);
  assert.deepEqual(fromB64url(toB64url(bytes)), bytes);
});

test("écran Transfert : adresses, résumé pour comparer", async () => {
  const { route } = await import("../js/main.js");
  const { summary } = await import("../js/screens/transfer.js");
  assert.deepEqual(route("#transfert"), { screen: "transfer", code: null });
  assert.deepEqual(route("#transfert/1.abcdefgh_-"), { screen: "transfer", code: "1.abcdefgh_-" });
  assert.deepEqual(route("#transfert/1.abc<x>defgh"), { screen: "home" });
  assert.deepEqual(route("#transfert/x"), { screen: "home" });
  const S = yearOfUse(), s = summary(S);
  assert.equal(s.xp, S.progress.xp); assert.equal(s.words, Object.keys(S.srs.cards).length); assert.ok(s.level > 1 && s.lessons > 0);
});

test("import sur un appareil qui n'avait rien enregistré : « Annuler » ramène à une progression vierge", async () => {
  const { backupOf } = await import("../js/screens/transfer.js");
  assert.deepEqual(sanitize(JSON.parse(backupOf(null))), defaults());
  assert.deepEqual(sanitize(JSON.parse(backupOf(""))), defaults());
  const raw = JSON.stringify(yearOfUse());
  assert.equal(backupOf(raw), raw, "sinon la sauvegarde telle quelle");
});

test("pistes : code d'avant (notes en clair) toujours lu ; nombre ou total de notes aberrant : piste ignorée", async () => {
  const data = pick(defaults());
  data.progress = { ...data.progress, lessons: {
    "s-h": { best: [90, 70], run: [], done: 1 },          // forme d'avant le 2026-11-20
    "s-th": [2, [1], 3, 250],                             // forme compacte : 250 réparti en 84, 83, 83
    "s-r": [1, [], 9999, 10], "s-w": [1, [], 2, 201], "s-v": [1, [], -1, 0] } };
  const code = "1." + b64(zlib.deflateRawSync(Buffer.from(JSON.stringify(data))));
  const r = await unpack(code);
  assert.equal(r.ok, true);
  const got = receive(defaults(), r.data).progress.lessons;
  assert.deepEqual(got["s-h"], { best: [90, 70], run: [], done: 1 });
  assert.deepEqual(got["s-th"], { best: [84, 83, 83], run: [1], done: 2 });
  assert.deepEqual(Object.keys(got).sort(), ["s-h", "s-th"]);
});
