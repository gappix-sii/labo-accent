// Tests de la phase 9, tâche 3 : règles des combats de boss, sauvegarde et transfert.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAttacks, newFight, attack, currentAttack, finishFight, newBosses, sanitizeBosses, wonSet, wins, canFight,
  PATTERN, BOSS_HP, HEARTS, HIT_MIN, CRIT, CRIT_MULT, LISTEN_DMG, XP_FIRST_WIN, XP_WIN_AGAIN } from "../js/core/boss.js";
import { REGIONS, lessonOpen } from "../js/content/regions.js";
import { PAIRS } from "../js/content/pairs.js";
import { mulberry32 } from "../js/core/game.js";
import { defaults, sanitize } from "../js/core/store.js";
import { recordItem } from "../js/core/progress.js";
import { pick, receive } from "../js/core/transfer.js";

const now = new Date(2026, 10, 19, 12).getTime();
// Joue tout un combat : say(i) donne la note de la i-ème phrase, listen(i) la réponse de la i-ème écoute.
function play(F, say, listen = () => true) {
  let s = 0, l = 0;
  while (currentAttack(F)) attack(F, currentAttack(F).kind === "listen" ? listen(l++) : say(s++));
  return F.over;
}

test("attaques tirées de la région : phrases de ses leçons, écoute de ses sons, « dis-le en anglais » de ses thèmes", () => {
  for (const r of REGIONS) for (let seed = 1; seed <= 20; seed++) {
    const A = buildAttacks(r, mulberry32(seed));
    assert.deepEqual(A.map((a) => a.kind), PATTERN);
    const texts = new Set(r.lessons.flatMap((l) => l.items.map((it) => it.en)));
    const sounds = r.lessons.filter((l) => l.kind === "sound").map((l) => l.p);
    for (const a of A) {
      assert.ok(typeof a.en === "string" && a.en.length > 0, `${r.id} : texte à dire ou à entendre`);
      if (a.kind === "say") assert.ok(texts.has(a.en), `${r.id} : « ${a.en} » vient de la région`);
      if (a.kind === "translate") assert.ok(texts.has(a.en) && a.fr, `${r.id} : traduction d'une phrase de thème`);
      if (a.kind === "listen") {
        const p = PAIRS.find((x) => x.id === a.pair);
        assert.ok(p && p.sounds.split("|").some((s) => sounds.includes(s)), `${r.id} : paire sur un son de la région`);
        assert.equal(a.en, p[a.answer].en);
      }
    }
    const said = A.filter((a) => a.kind === "say").map((a) => a.en);
    assert.equal(new Set(said).size, said.length, `${r.id} : pas deux fois la même phrase`);
  }
  assert.deepEqual(buildAttacks(REGIONS[0], mulberry32(7)), buildAttacks(REGIONS[0], mulberry32(7)), "même tirage → même combat");
  assert.equal(newFight("inconnue"), null);
});

test("dégâts : la note, coup critique dès 85, raté sous 45 (un cœur perdu), écoute juste ou fausse", () => {
  const F = newFight("couple", mulberry32(1));
  assert.equal(F.hp, BOSS_HP); assert.equal(F.hearts, HEARTS);
  let r = attack(F, 70); assert.deepEqual([r.dmg, r.crit, r.lost], [70, false, false]);
  r = attack(F, CRIT); assert.deepEqual([r.dmg, r.crit], [Math.round(CRIT * CRIT_MULT), true]);
  r = attack(F, true); assert.equal(r.kind, "listen"); assert.equal(r.dmg, LISTEN_DMG);
  r = attack(F, HIT_MIN - 1); assert.deepEqual([r.dmg, r.lost], [0, true]); assert.equal(F.hearts, HEARTS - 1);
  assert.equal(F.hp, BOSS_HP - 70 - Math.round(CRIT * CRIT_MULT) - LISTEN_DMG);
  assert.equal(attack(F, "n'importe quoi").lost, true, "note illisible : raté");
});

test("une moyenne de 60 suffit pour gagner ; une moyenne de 40 perd", () => {
  for (const r of REGIONS) for (let seed = 1; seed <= 10; seed++) {
    assert.equal(play(newFight(r.id, mulberry32(seed)), () => 60), "won", `${r.id} : 60 partout`);
    assert.equal(play(newFight(r.id, mulberry32(seed)), (i) => (i % 2 ? 70 : 50)), "won", `${r.id} : 50 et 70 en alternance`);
    assert.equal(play(newFight(r.id, mulberry32(seed)), () => 60, (i) => i > 0), "won", `${r.id} : 60 et une écoute ratée`);
    assert.equal(play(newFight(r.id, mulberry32(seed)), () => 40), "lost", `${r.id} : 40 partout`);
    assert.equal(play(newFight(r.id, mulberry32(seed)), (i) => (i % 2 ? 50 : 30)), "lost", `${r.id} : 30 et 50 en alternance`);
  }
  const F = newFight("travel", mulberry32(3));
  play(F, () => 30);
  assert.equal(F.over, "lost"); assert.equal(F.hearts, 0); assert.equal(attack(F, 100), null, "combat fini : plus d'attaque");
});

test("fin de combat : couronne, XP et coffre d'or à la première victoire seulement ; l'essai perdu compte", () => {
  const S = defaults(), xp0 = S.progress.xp;
  const lost = newFight("couple", mulberry32(1)); play(lost, () => 20);
  assert.deepEqual(finishFight(S, lost, now), { won: false, first: false, xp: 0, chest: null });
  assert.deepEqual(S.bosses.regions.couple, { wins: 0, tries: 1 });
  const won = newFight("couple", mulberry32(2)); play(won, () => 90);
  assert.deepEqual(finishFight(S, won, now), { won: true, first: true, xp: XP_FIRST_WIN, chest: "gold" });
  assert.equal(finishFight(S, won, now), null, "un combat ne se termine qu'une fois");
  assert.equal(S.progress.xp, xp0 + XP_FIRST_WIN); assert.deepEqual(S.game.chests, ["gold"]);
  const again = newFight("couple", mulberry32(3)); play(again, () => 90);
  assert.deepEqual(finishFight(S, again, now), { won: true, first: false, xp: XP_WIN_AGAIN, chest: null });
  assert.deepEqual(S.game.chests, ["gold"], "pas de second coffre");
  assert.deepEqual(S.bosses.regions.couple, { wins: 2, tries: 3 });
  assert.equal(wins(S.bosses, "couple"), 2); assert.deepEqual([...wonSet(S.bosses)], ["couple"]);
  assert.equal(finishFight(S, newFight("couple"), now), null, "combat pas fini : rien");
});

test("boss et carte : le boss s'affronte quand la région est finie ; vaincu, il ouvre la région suivante", () => {
  const S = defaults(), [first, second] = REGIONS;
  assert.equal(canFight(S.progress, "couple"), false);
  for (const l of first.lessons) for (let k = 0; k < l.items.length; k++) recordItem(S.progress, l.id, k, l.items.length, 90, now);
  assert.equal(canFight(S.progress, "couple"), true);
  assert.equal(lessonOpen(S.progress, second.from, wonSet(S.bosses)), false);
  const F = newFight("couple", mulberry32(5)); play(F, () => 80); finishFight(S, F, now);
  assert.equal(lessonOpen(S.progress, second.from, wonSet(S.bosses)), true);
});

test("sauvegarde : section bosses nettoyée au chargement, et transférée d'un appareil à l'autre", () => {
  assert.deepEqual(sanitizeBosses(null), newBosses());
  assert.deepEqual(sanitizeBosses({ v: 2, regions: { couple: { wins: 1, tries: 1 } } }), newBosses(), "version inconnue");
  assert.deepEqual(sanitizeBosses({ v: 1, regions: { couple: { wins: 2, tries: 1 }, nulle: { wins: 1, tries: 1 }, __proto__: { wins: 1 }, travel: { wins: -3, tries: "x" }, past: null } }),
    { v: 1, regions: { couple: { wins: 2, tries: 2 } } });
  const S = defaults(); S.bosses.regions.travel = { wins: 1, tries: 4 };
  const back = sanitize(JSON.parse(JSON.stringify(S)));
  assert.deepEqual(back.bosses, S.bosses);
  assert.deepEqual(sanitize({ ...JSON.parse(JSON.stringify(S)), bosses: "abîmé" }).bosses, newBosses());
  const got = receive(defaults(), JSON.parse(JSON.stringify(pick(S))));
  assert.deepEqual(got.bosses, S.bosses, "transfert : les boss vaincus arrivent");
  const { bosses, ...older } = JSON.parse(JSON.stringify(pick(S)));
  assert.deepEqual(receive(defaults(), older).bosses, newBosses(), "code d'avant les boss : rien de cassé");
});
