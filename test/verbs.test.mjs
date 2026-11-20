// Tests de la phase 10, tâche 3 : verbes irréguliers (js/content/verbs.js) et leurs règles (js/core/verbs.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { FAMILIES, VERBS, familyById, variants } from "../js/content/verbs.js";
import { STEPS, verbKey, familySize, itemOf, stepOf, formsText, textOf, recordVerb, familyState, familyDone,
  questionOf, familyQuestions, isRight, cloze, fakeRegular, ingOf, CHOICES, ALSO_CORRECT } from "../js/core/verbs.js";
import { newProgress, sanitizeProgress, PASS, XP_ITEM, XP_LESSON, MAX_ITEMS, todayXp } from "../js/core/progress.js";
import { defaults, sanitize } from "../js/core/store.js";
import { LESSONS } from "../js/content/lessons.js";

const now = new Date(2026, 10, 20, 12).getTime();
const seeded = (s) => () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);

test("67 verbes en 9 familles, chacun complet", () => {
  assert.deepEqual(FAMILIES.map((f) => [f.id, f.verbs.length]),
    [["stars", 11], ["aaa", 8], ["ought", 6], ["t", 9], ["abb", 10], ["iau", 5], ["aba", 3], ["ew", 6], ["en", 9]]);
  assert.equal(VERBS.length, 67);
  assert.equal(new Set(VERBS.map((v) => v.base)).size, 67, "aucun verbe en double");
  for (const f of FAMILIES) {
    assert.ok(f.title && f.short && f.tune && f.tip, f.id);
    assert.equal(familyById(f.id), f);
    for (const v of f.verbs) {
      for (const k of ["base", "past", "pp", "fr"]) assert.ok(typeof v[k] === "string" && v[k].trim(), `${v.base} : ${k}`);
      assert.ok(Array.isArray(v.pron) && v.pron.length === 3 && v.pron.every((p) => typeof p === "string" && p), `${v.base} : prononciation des 3 formes`);
      assert.equal(typeof v.note, "string");
      assert.deepEqual([v.ps.form, v.pps.form], ["past", "pp"], v.base);
      for (const s of [v.ps, v.pps]) assert.ok(s.en && s.fr, `${v.base} : phrase et traduction`);
    }
  }
  assert.equal(familyById("nope"), null);
});

test("formes et phrases : aucun chiffre à lire, chaque phrase contient sa forme", () => {
  for (const f of FAMILIES) for (const v of f.verbs) {
    assert.ok(!/\d/.test(formsText(v)), formsText(v));
    assert.match(formsText(v), /^[a-z]+(, [a-z]+)+$/, `${v.base} : « ${formsText(v)} »`);
    for (const s of [v.ps, v.pps]) {
      assert.ok(!/\d/.test(s.en), `« ${s.en} » contient un chiffre (le moteur ne lit pas les chiffres)`);
      assert.match(s.en, /^[A-Z].*[.?!]$/, `« ${s.en} » : majuscule et ponctuation`);
      const c = cloze(s, v);
      assert.ok(c, `« ${s.en} » ne contient pas la forme de ${v.base}`);
      assert.equal(c.before + c.answer + c.after, s.en);
      assert.ok(variants(s.form === "past" ? v.past : v.pp).includes(c.answer.toLowerCase()), `${v.base} : ${c.answer}`);
    }
  }
  assert.equal(formsText(familyById("stars").verbs[0]), "be, was, were, been");
  assert.equal(formsText(familyById("stars").verbs[3]), "go, went, gone");
});

test("une famille = une piste : 3 étapes de n éléments, texte à dire de chacun", () => {
  for (const f of FAMILIES) {
    const n = f.verbs.length, key = verbKey(f);
    assert.equal(familySize(f), 3 * n);
    assert.ok(familySize(f) <= MAX_ITEMS, `${f.id} : ${familySize(f)} éléments, la sauvegarde en garde ${MAX_ITEMS}`);
    assert.match(key, /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/); assert.ok(key.length <= 24);
    assert.ok(!LESSONS.some((l) => l.id === key), "pas de conflit avec une leçon");
    for (let item = 0; item < familySize(f); item++) {
      const { step, k } = stepOf(f, item);
      assert.equal(itemOf(f, step, k), item);
      const v = f.verbs[k];
      assert.equal(textOf(f, item), [formsText(v), v.ps.en, v.pps.en][step]);
    }
  }
  assert.deepEqual(STEPS.map((s) => s.id), ["forms", "past", "pp"]);
});

test("XP comme en grammaire : 10 par élément réussi à 65, une fois par passage, + 20 à la fin de la famille", () => {
  const P = newProgress(), f = familyById("aba"), size = familySize(f);
  assert.deepEqual(recordVerb(P, f, 0, PASS - 1, now), { passed: false, xp: 0, lessonDone: false });
  assert.equal(recordVerb(P, f, 0, PASS, now).xp, XP_ITEM);
  assert.equal(recordVerb(P, f, 0, 100, now).xp, 0, "même élément réussi deux fois : une seule fois");
  assert.equal(recordVerb(P, f, size, 100, now).xp, 0, "élément hors de la famille");
  assert.equal(recordVerb(P, f, -1, 100, now).xp, 0);
  recordVerb(P, f, itemOf(f, 1, 2), 90, now);
  let st = familyState(P, f);
  assert.deepEqual(st.steps.map((s) => [s.id, s.got, s.size]), [["forms", 1, 3], ["past", 1, 3], ["pp", 0, 3]]);
  assert.equal(st.done, 0); assert.equal(familyDone(P, f), false);
  let last;
  for (let i = 0; i < size; i++) if (!st.run.includes(i)) last = recordVerb(P, f, i, 80, now);
  assert.deepEqual(last, { passed: true, xp: XP_ITEM + XP_LESSON, lessonDone: true });
  assert.equal(P.xp, size * XP_ITEM + XP_LESSON);
  assert.equal(todayXp(P, now), P.xp, "compte pour l'objectif du jour");
  st = familyState(P, f);
  assert.equal(st.done, 1); assert.deepEqual(st.run, []); assert.equal(familyDone(P, f), true);
  assert.equal(recordVerb(P, f, 0, 100, now).xp, XP_ITEM, "nouveau passage : les XP reviennent");
  // la plus grande famille tient entière dans la sauvegarde
  const big = familyById("stars"), Q = newProgress();
  for (let i = 0; i < familySize(big); i++) recordVerb(Q, big, i, 70 + (i % 30), now);
  assert.equal(Q.xp, familySize(big) * XP_ITEM + XP_LESSON);
  assert.equal(Q.lessons[verbKey(big)].best.length, 33);
});

test("questions « choisis la bonne forme » : 3 choix différents, la bonne forme une seule fois", () => {
  const rng = seeded(3);
  for (const f of FAMILIES) for (const form of ["past", "pp"]) {
    const qs = familyQuestions(f, form, rng);
    assert.equal(qs.length, f.verbs.length);
    qs.forEach((q, k) => {
      const v = f.verbs[k];
      assert.ok(q, `${v.base} ${form}`);
      assert.equal(q.verb, v.base); assert.equal(q.form, form);
      assert.equal(q.options.length, CHOICES, `${v.base} : ${q.options}`);
      assert.equal(new Set(q.options).size, CHOICES, `${v.base} : choix en double ${q.options}`);
      assert.equal(q.options.filter((o) => isRight(q, o)).length, 1, `${v.base} : ${q.options}`);
      assert.ok(q.options.every((o) => /^[a-z]+$/.test(o)), `${v.base} : ${q.options}`);
      assert.ok(!q.options.some((o) => ALSO_CORRECT.has(o)), `${v.base} : un piège qui serait juste`);
      assert.equal(q.before + q.answer + q.after, q.en);
      assert.equal(q.en, form === "past" ? v.ps.en : v.pps.en);
      assert.ok(q.fr);
    });
  }
  const go = VERBS.find((v) => v.base === "go"), be = VERBS.find((v) => v.base === "be"), cut = VERBS.find((v) => v.base === "cut");
  assert.deepEqual(questionOf(go, "past", seeded(1)).options.sort(), ["goed", "gone", "went"]);
  assert.deepEqual(questionOf(be, "past", seeded(1)).options.sort(), ["been", "was", "were"], "was / were : l'autre variante est le piège");
  assert.deepEqual(questionOf(cut, "pp", seeded(1)).options.sort(), ["cut", "cutted", "cutting"], "3 formes identiques : pièges en -ed et -ing");
  assert.deepEqual(questionOf(go, "past", seeded(9)), questionOf(go, "past", seeded(9)), "même tirage, même question");
  assert.equal(isRight(questionOf(go, "pp"), "GONE"), true); assert.equal(isRight(questionOf(go, "pp"), null), false);
  assert.deepEqual(["go", "buy", "cut", "make", "fly"].map(fakeRegular), ["goed", "buyed", "cutted", "maked", "flied"]);
  assert.deepEqual(["cut", "make", "read", "be"].map(ingOf), ["cutting", "making", "reading", "being"]);
});

test("ancienne sauvegarde valable ; avancement des verbes gardé au rechargement", () => {
  const f = familyById("stars");
  // sauvegarde d'avant la phase 10 : aucune piste de verbes
  const old = sanitize(JSON.parse(JSON.stringify(defaults())));
  assert.deepEqual(familyState(old.progress, f), { done: 0, run: [], steps: familyState(newProgress(), f).steps });
  assert.ok(familyState(old.progress, f).steps.every((s) => s.got === 0));
  // une famille bien avancée revient à l'identique après rechargement (33 notes gardées, plus seulement 20)
  const S = defaults();
  for (let i = 0; i < 25; i++) recordVerb(S.progress, f, i, 66 + i, now);
  const back = sanitize(JSON.parse(JSON.stringify(S)));
  assert.deepEqual(back.progress.lessons[verbKey(f)], S.progress.lessons[verbKey(f)]);
  assert.deepEqual(familyState(back.progress, f), familyState(S.progress, f));
  // numéros hors de la famille (sauvegarde abîmée) : ignorés
  const P = sanitizeProgress({ v: 1, lessons: { [verbKey(familyById("aba"))]: { best: [90], run: [0, 8, 9, 39], done: 0 } } });
  assert.deepEqual(familyState(P, familyById("aba")).run, [0, 8]);
});

test("écran des verbes (tâche 4) : adresses, onglet, exercice « c » bien formé, avancement affiché", async () => {
  const { route } = await import("../js/main.js");
  const { tabFor, inExercise } = await import("../js/screens/shell.js");
  const { verbExercise, familyStatus } = await import("../js/screens/verbs.js");
  const { isRight: exRight } = await import("../js/screens/exercises.js");
  const { answerOf } = await import("../js/content/grammar.js");
  assert.deepEqual(route("#verbes"), { screen: "verbList" });
  assert.deepEqual(route("#verbes/stars"), { screen: "verbs", id: "stars" });
  assert.notEqual(route("#verbes/<b>").screen, "verbs");
  assert.equal(tabFor("verbs"), "training"); assert.equal(tabFor("verbList"), "training");
  assert.equal(inExercise("verbs"), true, "onglets cachés pendant les étapes"); assert.equal(inExercise("verbList"), false);
  for (const v of VERBS) for (const form of ["past", "pp"]) {
    const e = verbExercise(v, form, seeded(2));
    assert.equal(e[0], "c"); assert.equal(e[1].split("___").length, 2, e[1]);
    assert.ok(e[3] >= 0 && exRight(e, e[2][e[3]]));
    assert.equal(answerOf(e), form === "past" ? v.ps.en : v.pps.en, "la phrase à dire est la phrase d'exemple, qui a son son");
  }
  const P = newProgress(), f = familyById("aba");
  assert.equal(familyStatus(P, f), "");
  recordVerb(P, f, 0, 90, now); assert.equal(familyStatus(P, f), "1 / 9");
  for (let i = 1; i < 9; i++) recordVerb(P, f, i, 90, now);
  assert.equal(familyStatus(P, f), "✓");
});

test("mini-boss « Le Grimoire » (tâche 5) : combat tiré de la famille, ouvert une fois la famille finie", async () => {
  const { buildVerbAttacks, newVerbFight, attack, canFightFamily, VERB_PATTERN, LISTEN_DMG, HEARTS, BOSS_HP } = await import("../js/core/boss.js");
  const { verbTexts } = await import("../js/content/verbs.js");
  const { fixedTexts } = await import("../js/content/fixed.js");
  const clips = new Set(fixedTexts());
  for (const f of FAMILIES) for (let seed = 1; seed < 6; seed++) {
    const A = buildVerbAttacks(f, seeded(seed));
    assert.deepEqual(A.map((a) => a.kind), VERB_PATTERN);
    const mine = new Set(f.verbs.flatMap(verbTexts));
    for (const a of A) {
      assert.ok(mine.has(a.en), `${f.id} : « ${a.en} » n'est pas de la famille`);
      assert.ok(clips.has(a.en), `« ${a.en} » sans son fabriqué`);
      if (a.kind === "translate" || a.kind === "choose") assert.ok(a.fr);
      if (a.kind === "choose") {
        assert.equal(a.options.length, CHOICES); assert.ok(a.options.includes(a.answer));
        assert.equal((a.before + a.answer + a.after).toLowerCase(), a.en.toLowerCase());
      }
    }
    if (f.verbs.length <= 3) assert.equal(new Set(A.filter((a) => a.kind === "forms").map((a) => a.verb)).size, f.verbs.length, `${f.id} : chaque verbe a ses 3 formes à dire`);
  }
  // « choisis la bonne forme » : bonne réponse = dégâts d'une écoute, mauvaise = un cœur perdu
  const F = newVerbFight("aba", seeded(4));
  assert.equal(F.family, "aba"); assert.equal(F.hp, BOSS_HP); assert.equal(F.hearts, HEARTS);
  attack(F, 70);
  assert.equal(F.attacks[F.i].kind, "choose");
  assert.deepEqual([attack(F, true).dmg, F.hp], [LISTEN_DMG, BOSS_HP - 70 - LISTEN_DMG]);
  assert.equal(newVerbFight("nope"), null);
  // difficulté comme les boss (règles du 2026-11-20) : 70 au micro et les bons choix gagnent ; 60 perd ; 40 et un mauvais choix perdent
  const run = (score, right) => { const G = newVerbFight("stars", seeded(2)); while (!G.over) attack(G, G.attacks[G.i].kind === "choose" ? right(G.i) : score); return G.over; };
  assert.equal(run(70, () => true), "won");
  assert.equal(run(60, () => true), "lost", "de 50 à 64 : le Grimoire n'est pas touché");
  assert.equal(run(40, (i) => i !== 5), "lost");
  // ouvert une fois la famille finie (pas d'ordre entre les familles)
  const P = newProgress(), aba = familyById("aba");
  assert.equal(canFightFamily(P, "aba"), false);
  for (let i = 0; i < familySize(aba); i++) recordVerb(P, aba, i, 90, now);
  assert.equal(canFightFamily(P, "aba"), true); assert.equal(canFightFamily(P, "stars"), false); assert.equal(canFightFamily(P, "nope"), false);
});

test("mini-boss : récompense de première victoire une seule fois, victoires gardées dans la sauvegarde et le transfert", async () => {
  const { newVerbFight, attack, finishFight, familyWins, newBosses, sanitizeBosses, XP_MINI_FIRST, XP_MINI_AGAIN, MINI_CHEST } = await import("../js/core/boss.js");
  const { pick, receive } = await import("../js/core/transfer.js");
  const S = defaults(), win = () => { const F = newVerbFight("aba", seeded(1)); while (!F.over) attack(F, F.attacks[F.i].kind === "choose" ? true : 100); return finishFight(S, F, now); };
  const lose = newVerbFight("aba", seeded(1)); while (!lose.over) attack(lose, lose.attacks[lose.i].kind === "choose" ? false : 10);
  assert.deepEqual(finishFight(S, lose, now), { won: false, first: false, xp: 0, chest: null });
  assert.deepEqual(win(), { won: true, first: true, xp: XP_MINI_FIRST, chest: MINI_CHEST });
  assert.deepEqual(win(), { won: true, first: false, xp: XP_MINI_AGAIN, chest: null });
  assert.equal(S.progress.xp, XP_MINI_FIRST + XP_MINI_AGAIN);
  assert.deepEqual(S.game.chests, [MINI_CHEST]);
  assert.deepEqual(S.bosses.families, { aba: { wins: 2, tries: 3 } });
  assert.deepEqual(S.bosses.regions, {}, "les boss du parcours ne bougent pas");
  assert.equal(familyWins(S.bosses, "aba"), 2); assert.equal(familyWins(S.bosses, "stars"), 0);
  // rechargement, transfert, sauvegarde abîmée ou d'avant les mini-boss
  assert.deepEqual(sanitize(JSON.parse(JSON.stringify(S))).bosses, S.bosses);
  assert.deepEqual(receive(defaults(), JSON.parse(JSON.stringify(pick(S)))).bosses, S.bosses);
  assert.deepEqual(sanitizeBosses({ v: 1, regions: {}, families: { aba: { wins: 1, tries: 1 }, nope: { wins: 1, tries: 1 }, t: { wins: "x" } } }), { v: 1, regions: {}, families: { aba: { wins: 1, tries: 1 } } });
  assert.deepEqual(sanitizeBosses({ v: 1, regions: { couple: { wins: 1, tries: 1 } } }).families, {}, "sauvegarde d'avant les mini-boss");
  assert.equal(familyWins({ v: 1, regions: {} }, "aba"), 0);
  assert.deepEqual(newBosses(), { v: 1, regions: {}, families: {} });
  // adresse et onglet
  const { route } = await import("../js/main.js");
  const { tabFor, inExercise } = await import("../js/screens/shell.js");
  assert.deepEqual(route("#grimoire/aba"), { screen: "grimoire", id: "aba" });
  assert.equal(tabFor("grimoire"), "training"); assert.equal(inExercise("grimoire"), true);
});

test("Le Grimoire : une couleur par famille, dessin sûr dans les 3 états", async () => {
  const { GRIMOIRE_COLORS, grimoireSvg, STATES } = await import("../js/content/bosses.js");
  assert.deepEqual(Object.keys(GRIMOIRE_COLORS).sort(), FAMILIES.map((f) => f.id).sort());
  assert.equal(new Set(Object.values(GRIMOIRE_COLORS).map((g) => g[1])).size, FAMILIES.length, "couleurs toutes différentes");
  for (const id of Object.keys(GRIMOIRE_COLORS)) for (const st of STATES) {
    const { toHTMLString } = await import("../js/core/dom.js");
    const svg = toHTMLString(grimoireSvg(id, st));
    assert.match(svg, new RegExp(`id="kg-${id}"`)); assert.match(svg, new RegExp(`class="boss ${st}"`));
    assert.ok(!/<script|on\w+=/i.test(svg));
  }
});
