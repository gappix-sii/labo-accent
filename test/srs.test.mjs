// Tests de la répétition espacée du vocabulaire (phase 3, tâche 2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSrs, answer, session, dueToday, freshLeft, addDays, setLevel, setPerDay, boxes, sanitizeSrs, CARD_ID, DELAYS, REVIEW_MAX } from "../js/core/srs.js";
import { defaults, sanitize, save, load } from "../js/core/store.js";
import { VOCAB, ALL_WORDS } from "../js/content/vocab.js";

const at = (d, h = 12) => new Date(2026, 10, d, h).getTime(); // novembre 2026, heure locale
const A1 = VOCAB.A1;

test("un mot raté revient plus tôt qu'un mot réussi", () => {
  const R = newSrs();
  const good = answer(R, A1[0].id, true, at(17)), bad = answer(R, A1[1].id, false, at(17));
  assert.ok(bad.due < good.due, `raté : ${bad.due}, réussi : ${good.due}`);
  assert.equal(bad.due, "2026-11-17", "raté : revu le jour même");
  assert.equal(good.due, "2026-11-18", "réussi une fois : revu le lendemain");
  assert.deepEqual(dueToday(R, at(17)), [A1[1].id]);
  assert.deepEqual(dueToday(R, at(18)).sort(), [A1[0].id, A1[1].id].sort());
});

test("les boîtes : délais de 0, 1, 3, 7 puis 16 jours ; une erreur renvoie en boîte 1", () => {
  const R = newSrs(), id = A1[0].id;
  const noon = (key) => { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d, 12).getTime(); };
  let now = at(17);
  const got = [];
  for (let k = 0; k < 5; k++) { const c = answer(R, id, true, now); got.push([c.box, c.due]); now = noon(c.due); }
  assert.deepEqual(got, [[2, "2026-11-18"], [3, "2026-11-21"], [4, "2026-11-28"], [5, "2026-12-14"], [5, "2026-12-30"]], "la boîte 5 est la dernière");
  assert.equal(R.cards[id].ok, 5);
  const c = answer(R, id, false, now);
  assert.equal(c.box, 1);
  assert.equal(c.seen, 6);
  assert.deepEqual(DELAYS, [0, 1, 3, 7, 16]);
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
  assert.equal(addDays("2026-03-28", 2), "2026-03-30", "passage à l'heure d'été");
});

test("séance du jour : mots à revoir d'abord (les plus en retard), puis nouveaux mots jusqu'au quota", () => {
  const R = newSrs();
  assert.equal(R.perDay, 10);
  let s = session(R, A1, at(17));
  assert.deepEqual(s.review, []);
  assert.deepEqual(s.fresh, A1.slice(0, 10).map((w) => w.id));
  for (const id of s.fresh.slice(0, 4)) answer(R, id, true, at(17));
  assert.equal(freshLeft(R, at(17)), 6);
  s = session(R, A1, at(17));
  assert.deepEqual(s.fresh, A1.slice(4, 10).map((w) => w.id), "pas de mot déjà vu parmi les nouveaux");
  for (const id of s.fresh) answer(R, id, false, at(17));
  assert.equal(freshLeft(R, at(17)), 0, "quota atteint");
  assert.equal(session(R, A1, at(17)).fresh.length, 0);
  assert.equal(session(R, A1, at(17)).review.length, 6, "les 6 mots ratés reviennent le jour même");
  // le lendemain : le quota repart, les mots en retard passent avant
  assert.equal(freshLeft(R, at(18)), 10);
  R.cards[A1[0].id].due = "2026-11-10";
  assert.equal(session(R, A1, at(18)).review[0], A1[0].id, "le plus en retard d'abord");
  assert.equal(session(R, A1, at(18)).all.length, 10 + 10);
});

test("séance limitée à 30 mots à revoir ; niveau et quota réglables", () => {
  const R = newSrs();
  for (const w of ALL_WORDS.slice(0, 50)) answer(R, w.id, false, at(17));
  assert.equal(session(R, A1, at(17)).review.length, REVIEW_MAX);
  assert.equal(setLevel(R, "B2"), true);
  assert.equal(setLevel(R, "Z9"), false);
  assert.equal(R.level, "B2");
  assert.equal(setPerDay(R, 7), false);
  assert.equal(setPerDay(R, 20), true);
  assert.deepEqual(boxes(R), [50, 0, 0, 0, 0]);
});

test("sauvegarde : relue à l'identique, et nettoyée si abîmée ou trafiquée", () => {
  const mem = new Map(), storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const S = defaults();
  answer(S.srs, A1[0].id, true, at(17));
  answer(S.srs, A1[1].id, false, at(17));
  save(S, storage);
  assert.deepEqual(load(storage).srs, S.srs);
  for (const w of ALL_WORDS) assert.match(w.id, CARD_ID, "chaque mot peut être sauvegardé");
  const R = sanitizeSrs({
    v: 1, level: "Z9", perDay: 1000, fresh: { day: "hier", n: 5 },
    cards: { "A1:hello": { box: 9, due: "2026-11-18", seen: 2, ok: 7 }, "<script>": { box: 1, due: "2026-11-18" }, "A1:yes": { box: 2, due: "demain" }, "__proto__": {} }
  });
  assert.equal(R.level, "A1");
  assert.equal(R.perDay, 10);
  assert.deepEqual(R.fresh, { day: "", n: 0 });
  assert.deepEqual(R.cards, { "A1:hello": { box: 1, due: "2026-11-18", seen: 2, ok: 2 } });
  assert.deepEqual(sanitizeSrs({ v: 2 }), newSrs(), "version inconnue");
  assert.deepEqual(sanitize({ version: 1 }).srs, newSrs(), "sauvegarde sans révision");
});
