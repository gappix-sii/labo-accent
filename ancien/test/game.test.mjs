import * as G from "../js/game.js";
import assert from "node:assert/strict";
console.log("leçons:", G.ALL_LESSONS.length, G.ALL_LESSONS.map(l => `${l.id}(${l.items.length})`).join(" "));
assert.ok(G.ALL_LESSONS.every(l => l.kind === "review" || l.items.length >= 4));
assert.equal(new Set(G.ALL_LESSONS.map(l => l.id)).size, G.ALL_LESSONS.length, "ids uniques");
assert.equal(G.lessonState({}, 0), "open"); assert.equal(G.lessonState({}, 1), "locked");
assert.equal(G.lessonState({ [G.ALL_LESSONS[0].id]: { stars: 2 } }, 1), "open");
assert.equal(G.currentLessonIndex({ [G.ALL_LESSONS[0].id]: {} }), 1);
for (const [xp, lv] of [[0,1],[99,1],[100,2],[299,2],[300,3],[1000,5]]) assert.equal(G.levelOf(xp).level, lv, "xp "+xp);
const rv = G.reviewItems(G.ALL_LESSONS.find(l => l.id === "review-1"), [{ t: "Sorry", s: 40 }]);
assert.equal(rv[0].en, "Sorry"); assert.equal(rv.length, 6);
const s = { lessons: { x: 1 }, history: [{ s: 100 }], badges: [], sounds: {}, xp: 0, bestCombo: 0 };
assert.deepEqual(G.newBadges(s, { streak: 3 }), ["first", "perfect", "streak3"]);
console.log("TESTS JEU OK");
// vocabulaire et séances
{
  const words = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  const st = { a: { box: 1, due: "2026-11-10" }, b: { box: 2, due: "2026-12-01" } };
  const pk = G.pickVocab(words, st, 3, 5, "2026-11-11");
  assert.deepEqual(pk.map(w => w.id), ["a", "c", "d"]);
  let r = G.gradeVocab(undefined, true, "2026-11-11"); assert.equal(r.box, 1); assert.equal(r.due, "2026-11-12");
  r = G.gradeVocab({ box: 3, seen: 4, ok: 3 }, false, "2026-11-11"); assert.equal(r.box, 0); assert.equal(r.due, "2026-11-11");
  for (const m of G.DURATIONS) { const tot = G.planSession(m).reduce((a, b) => a + G.estMinutes(b), 0); console.log(`séance ${m} min ≈ ${tot} min`); assert.ok(Math.abs(tot - m) <= 6); }
  assert.ok(G.ALL_LESSONS.every(l => l.kind === "review" || l.items.length >= 4));
  assert.equal(new Set(G.ALL_LESSONS.map(l => l.id)).size, G.ALL_LESSONS.length);
  console.log("TESTS VOCAB/SÉANCE OK, leçons :", G.ALL_LESSONS.length);
}
