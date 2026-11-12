// Tests des modules de sécurité et du méta-jeu (Node, sans navigateur).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { html, toHTMLString } from "../js/core/dom.js";
import { sanitize, defaults, parseImport, exportText, cleanText } from "../js/core/store.js";
import * as M from "../js/meta.js";
import * as E from "../js/core/economy.js";
import { levelOf } from "../js/game.js";
import { BASICS, basicsItems, numberWords, yearWords, ordinalWords, ordinalSuffix, pronOf } from "../js/basics.js";
import { buildReference } from "../js/phonemes.js";
import { readFileSync } from "node:fs";
import { MODELS, guardedFetch, lookup } from "../js/integrity.js";
import { SPECIES, ITEMS, THEMES, SLOTS, CATALOG, avatarSvg, bossSvg, BOSSES, droppable, itemPreview, boxPool, EXCLUSIVES, basePrice, levelFor } from "../js/avatar.js";

// ---------- html`` ----------
{
  const s = toHTMLString(html`<p title="${'"><img src=x onerror=alert(1)>'}">${"<script>x</script>"} ${["a", html`<b>b</b>`]}</p>`);
  assert.ok(!s.includes("<img") && !s.includes("<script>"), s);
  assert.ok(s.includes("&lt;script&gt;") && s.includes("<b>b</b>") && s.includes("&quot;&gt;&lt;img"));
  const bad = [
    () => html`<a href="${"javascript:alert(1)"}">x</a>`,
    () => html`<div onclick="${"x"}"></div>`,
    () => html`<div style="${"color:red"}"></div>`,
    () => html`<div class=${"x"}></div>`,
    () => html`<${"script"}>`,
    () => html`<input ${"onfocus=alert(1)"}>`,
    () => html`<input ${html`<b>`}>`,
    () => html`<p title="${{}}"></p>`
  ];
  for (const [i, f] of bad.entries()) assert.throws(f, undefined, "cas dangereux " + i);
  assert.equal(toHTMLString(html`<input ${"checked disabled"}>`), "<input checked disabled>");
  assert.equal(toHTMLString(html`<p>${null}${undefined}${false}${0}</p>`), "<p>0</p>");
  console.log("html`` OK");
}

// ---------- Stockage ----------
{
  assert.deepEqual(sanitize({}), defaults());
  assert.deepEqual(sanitize("n'importe quoi"), defaults());
  const evil = JSON.parse('{"__proto__":{"polluted":1},"lessons":{"__proto__":{"x":1},"constructor":{"stars":3,"best":9,"d":"2026-11-01"},"daily-0":{"stars":3,"best":90,"d":"2026-11-01"}},"xp":"9999","coins":1e20,"history":[{"d":"2026-11-01","s":80,"t":"Hi"},{"d":"x","s":80,"t":"bad"},{"d":"2026-11-01","s":500,"t":"bad"}],"badges":["first","hack"],"avatar":{"species":"dragon","skin":"emerald","head":"crown","name":"Po\\u202euf\\u0000"},"owned":["crown","nope","skin.skunk.neon"],"theme":"prestige","title":"<b>","boostUntil":99999999999999,"chat":{"engine":"evil","model":"../x","level":"A2"}}');
  const S = sanitize(evil);
  assert.equal(({}).polluted, undefined); assert.equal(Object.getPrototypeOf(S), Object.prototype);
  assert.deepEqual(Object.keys(S.lessons), ["daily-0"]);
  assert.equal(S.xp, 0); assert.equal(S.coins, 0);
  assert.equal(S.history.length, 1);
  assert.deepEqual(S.badges, ["first"]);
  assert.equal(S.avatar.species, "skunk", "dragon verrouillé au niveau 1");
  assert.equal(S.avatar.head, "crown", "accessoire possédé : gardé (la triche locale ne touche que soi)");
  assert.equal(S.avatar.name, "Pouf");
  assert.ok(S.owned.includes("crown") && !S.owned.includes("nope") && S.owned.includes("skin.skunk.neon"));
  assert.equal(S.theme, "nuit"); assert.equal(S.title, ""); assert.equal(S.boostUntil, 0);
  assert.equal(S.chat.engine, ""); assert.equal(S.chat.model, "gemini-3.8-flash");
  assert.equal(cleanText("  Po‮uf​  ok ", 16), "Pouf ok");
  const big = { history: Array.from({ length: 900 }, (_, i) => ({ d: "2026-11-01", s: 50, t: "x" + i })) };
  assert.equal(sanitize(big).history.length, 500);
  // Import / export
  const st = sanitize({ xp: 1200, coins: 50, v: 2, lessons: { "daily-0": { stars: 2, best: 70, d: "2026-11-01" } } });
  const back = parseImport(exportText(st));
  assert.ok(back.ok); assert.equal(back.state.xp, 1200); assert.equal(back.summary.level, 5); assert.equal(back.state.coins, 50);
  assert.equal(parseImport("{").ok, false); assert.equal(parseImport('{"a":1}').ok, false);
  assert.equal(parseImport("x".repeat(3 * 1024 * 1024)).ok, false);
  const old = parseImport(JSON.stringify({ xp: 1000, history: [] }));
  assert.ok(old.ok && old.state.coins >= 200 && old.state.chests[0] === "gold" && old.state.levelSeen === 5, "migration v1");
  console.log("stockage OK");
}

// ---------- Méta-jeu ----------
{
  const q1 = M.dailyQuests("2026-11-12"), q2 = M.dailyQuests("2026-11-12"), q3 = M.dailyQuests("2026-11-13");
  assert.deepEqual(q1, q2); assert.equal(new Set(q1.map(q => q.id)).size, 3); assert.notDeepEqual(q1, q3);
  const S = defaults();
  M.ensureQuests(S, "2026-11-12");
  for (const q of S.quests.list) {
    const def = M.QUEST_BY_ID[q.id];
    const r = M.questEvent(S, "2026-11-12", def.ev, q.goal);
    assert.ok(r.done.length === 1);
  }
  assert.ok(S.quests.bonus && S.chests.includes("silver") && S.coins === 20 + 30 + 45);
  const rng = M.mulberry32(42);
  const pool = droppable([]);
  assert.ok(pool.length > 40, "objets à gagner : " + pool.length);
  for (let i = 0; i < 200; i++) { const r = M.rollChest("legend", pool, rng); assert.ok(r.item && ["epic", "legendary"].includes(r.rarity)); }
  const r0 = M.rollChest("gold", [], rng); assert.ok(r0.item === null && r0.bonus > 0);
  assert.equal(M.rankOf(0).name, "Bronze"); assert.equal(M.rankOf(149).div, "I"); assert.equal(M.rankOf(150).name, "Argent"); assert.equal(M.rankOf(5000).name, "Légende");
  assert.equal(M.streakOf(["2026-11-10", "2026-11-11", "2026-11-12"], [], "2026-11-12"), 3);
  assert.equal(M.streakOf(["2026-11-09", "2026-11-11"], ["2026-11-10"], "2026-11-12"), 2);
  const F = { ...defaults(), days: ["2026-11-08", "2026-11-09"], freezes: 2 };
  assert.equal(M.applyFreezes(F, "2026-11-11"), 1); assert.deepEqual(F.frozenDays, ["2026-11-10"]); assert.equal(F.freezes, 1);
  const F2 = { ...defaults(), days: ["2026-11-01"], freezes: 2 };
  assert.equal(M.applyFreezes(F2, "2026-11-11"), 0, "trop de jours manqués");
  assert.equal(M.addDays("2026-12-31", 1), "2027-01-01"); assert.equal(M.addDays("2026-03-01", -1), "2026-02-28");
  assert.deepEqual([M.chronoPoints(true, 0, 1000).pts, M.chronoPoints(true, 2, 5000).pts, M.chronoPoints(true, 9, 2000).pts], [150, 150, 375]);
  assert.equal(M.bossHit(96).kind, "crit"); assert.equal(M.bossHit(30).kind, "miss");
  console.log("méta-jeu OK");
}

// ---------- Avatars ----------
{
  let n = 0;
  for (const sp of SPECIES) for (const sk of sp.skins) for (const it of [null, ...ITEMS]) {
    const av = { species: sp.id, skin: sk.id, head: "", eyes: "", neck: "", hand: "", aura: "", name: "Test" };
    if (it) av[it.slot] = it.id;
    const s = toHTMLString(avatarSvg(av));
    assert.ok(!/undefined|NaN|\[object/.test(s), `${sp.id}/${sk.id}/${it && it.id}`);
    assert.equal((s.match(/<g[\s>]/g) || []).length, (s.match(/<\/g>/g) || []).length, "groupes équilibrés " + sp.id);
    n++;
  }
  for (const id of Object.keys(BOSSES)) assert.ok(!/undefined|NaN/.test(toHTMLString(bossSvg(id))));
  for (const it of ITEMS) assert.ok(!/undefined|NaN/.test(toHTMLString(itemPreview(it.id))));
  assert.equal(new Set(ITEMS.map(i => i.id)).size, ITEMS.length);
  console.log(`avatars OK (${n} combinaisons, ${SPECIES.length} animaux, ${ITEMS.length} accessoires, ${THEMES.length} thèmes)`);
}

// ---------- Intégrité des téléchargements ----------
{
  const data = new Uint8Array(300000).map((_, i) => (i * 7) & 255);
  const sha = createHash("sha256").update(data).digest("hex");
  MODELS["test/repo"] = { rev: "a".repeat(40), files: { "w.bin": { sha256: sha, size: data.length }, "c.json": { max: 10 } } };
  const base = "https://huggingface.co/test/repo/resolve/" + "a".repeat(40) + "/";
  const calls = [];
  const fake = body => async (url, opts) => { calls.push({ url, opts }); return new Response(body, { status: 200 }); };
  const read = r => new Response(r.body).arrayBuffer();
  let r = await guardedFetch(fake(data), "https://app.test")(base + "w.bin");
  assert.equal(r.headers.get("content-length"), String(data.length));
  assert.equal((await read(r)).byteLength, data.length);
  assert.equal(calls[0].opts.credentials, "omit"); assert.equal(calls[0].opts.referrerPolicy, "no-referrer");
  const tampered = data.slice(); tampered[1234] ^= 1;
  r = await guardedFetch(fake(tampered), "https://app.test")(base + "w.bin");
  await assert.rejects(read(r), /integrity:hash/);
  r = await guardedFetch(fake(data.slice(0, 1000)), "https://app.test")(base + "w.bin");
  await assert.rejects(read(r), /integrity:size/);
  const bigger = new Uint8Array(data.length + 10);
  r = await guardedFetch(fake(bigger), "https://app.test")(base + "w.bin");
  await assert.rejects(read(r), /integrity:size/);
  r = await guardedFetch(fake("01234567890123"), "https://app.test")(base + "c.json");
  await assert.rejects(read(r), /integrity:size/);
  r = await guardedFetch(fake("{}"), "https://app.test")(base + "c.json");
  assert.equal(await new Response(r.body).text(), "{}");
  r = await guardedFetch(fake("x"), "https://app.test")(base + "inconnu.json");
  assert.equal(r.status, 404);
  const g = guardedFetch(fake("x"), "https://app.test");
  await assert.rejects(g("https://evil.example/x"), /refusé/);
  await assert.rejects(g("https://huggingface.co/test/repo/resolve/" + "b".repeat(40) + "/w.bin"), /refusé/);
  await assert.rejects(g(base + "w.bin?x=1"), /refusé/);
  assert.equal(lookup(base + "onnx/../w.bin").file, "w.bin", "les segments .. sont résolus par l'analyseur d'URL");
  assert.ok(lookup(base + "../../x").deny, "sortie du dépôt refusée");
  assert.ok(lookup("https://huggingface.co:444/test/repo/resolve/" + "a".repeat(40) + "/w.bin").deny, "port refusé");
  calls.length = 0;
  r = await g(base + "w.bin", { headers: { Range: "bytes=0-0" } });
  assert.equal(calls[0].opts.headers.Range, "bytes=0-0");
  await assert.rejects(g(base + "w.bin", { headers: { Range: "bytes=0-100" } }), /partielle/);
  const same = await guardedFetch(async () => new Response("local"), "https://app.test")("https://app.test/vendor/x.wasm");
  assert.equal(await same.text(), "local");
  console.log("intégrité OK");
}
// ---------- Boîtes à butin ----------
{
  for (const [id, B] of Object.entries(M.BOXES)) assert.ok(Math.abs(Object.values(B.odds).reduce((a, b) => a + b, 0) - 1) < 1e-9, "probabilités = 100 % : " + id);
  const pool = boxPool([]);
  for (const r of ["common", "rare", "epic", "legendary", "mythic"]) assert.ok(pool.some(p => p.rarity === r), "rareté présente : " + r);
  assert.ok(!pool.some(p => ["crown", "halo", "medal", "trophy", "lightning", "phones"].includes(p.id)), "pas de récompense spéciale dans les boîtes");
  assert.ok(!droppable([]).some(p => EXCLUSIVES.includes(p.id)), "exclusivités absentes des coffres");
  assert.equal(EXCLUSIVES.length, 25);
  // Fréquences observées ≈ probabilités annoncées (boîte classique, sans garantie)
  const rng = M.mulberry32(7), N = 200000, count = {};
  for (let i = 0; i < N; i++) { const r = M.rollBox("classic", pool, 0, rng); count[r.rarity] = (count[r.rarity] || 0) + 1; }
  for (const [r, p] of Object.entries(M.BOXES.classic.odds)) assert.ok(Math.abs(count[r] / N - p) < Math.max(0.004, p * 0.15), `${r} : ${(count[r] / N * 100).toFixed(2)} % pour ${p * 100} %`);
  // Garantie : au plus 10 boîtes pour un légendaire ou mieux
  let pity = 0, worst = 0, run = 0;
  for (let i = 0; i < 20000; i++) { const r = M.rollBox("classic", pool, pity, rng); pity = r.pity; run++; if (["legendary", "mythic"].includes(r.rarity)) { worst = Math.max(worst, run); run = 0; } }
  assert.ok(worst <= M.PITY, "garantie respectée (pire série : " + worst + ")");
  // Doublon : tout possédé dans la rareté → pièces
  const owned = pool.filter(p => p.rarity === "mythic").map(p => p.id);
  const d = M.rollBox("mythic", boxPool(owned), 0, rng, "mythic");
  assert.ok(d.dup && d.coins === M.BOX_DUP.mythic && owned.includes(d.item));
  const n = M.rollBox("mythic", boxPool([]), 0, rng, "mythic");
  assert.ok(!n.dup && EXCLUSIVES.includes(n.item) && n.pity === 0);
  console.log(`boîtes OK (classique sur ${N} : ${Object.entries(count).map(([k, v]) => k + " " + (v / N * 100).toFixed(2) + "%").join(", ")} ; pire série ${worst})`);
}
// ---------- Shop ----------
{
  // Chaque emplacement a des objets, chaque objet a un emplacement connu ; ids courts et uniques
  const slots = new Set(SLOTS.map(([k]) => k)), ids = ITEMS.map(i => i.id);
  assert.ok(ITEMS.every(i => slots.has(i.slot)) && SLOTS.every(([k]) => ITEMS.some(i => i.slot === k)));
  assert.equal(new Set(ids).size, ids.length); assert.ok(ids.every(x => x.length <= 20 && /^[a-z0-9]+$/.test(x)));
  // Catalogue : tout a un prix, rien n'est une exclusivité des boîtes
  assert.ok(CATALOG.length > 90 && CATALOG.every(id => basePrice(id) > 0 && !EXCLUSIVES.includes(id)));
  assert.equal(basePrice("saber"), null); assert.equal(basePrice("skin.skunk.night"), null); assert.equal(basePrice("theme.galaxie"), null);
  // Offres : 3 par jour, mêmes offres toute la journée, différentes d'un jour à l'autre, −30 % arrondi
  const a = M.pickDeals("2026-11-12", CATALOG), b = M.pickDeals("2026-11-12", [...CATALOG].reverse()), c = M.pickDeals("2026-11-13", CATALOG);
  assert.deepEqual(a, b); assert.equal(a.length, M.DEAL_COUNT); assert.notDeepEqual(a, c);
  assert.equal(M.dealPrice(100), 70); assert.equal(M.dealPrice(60), 40); assert.ok(M.dealPrice(5) >= 5);
  // Sauvegarde : emplacement Dos conservé seulement si possédé ; offres invalides retirées
  const S1 = sanitize({ ...defaults(), xp: 99999, owned: ["phones", "theme.nuit", "theme.jour", "jetpack"], avatar: { species: "fox", skin: "red", head: "", eyes: "", neck: "", hand: "", back: "jetpack", aura: "", name: "A" }, deals: { day: "2026-11-12", ids: ["cap", "saber", "<x>"] } });
  assert.equal(S1.avatar.back, "jetpack"); assert.deepEqual(S1.deals.ids, ["cap"]);
  const S2 = sanitize({ ...defaults(), avatar: { ...defaults().avatar, back: "angel" } });
  assert.equal(S2.avatar.back, "");
  assert.ok(levelFor("angel") === 10 && levelFor("skin.dragon.ruby") === 15);
  console.log(`shop OK (${CATALOG.length} objets en vente, ${EXCLUSIVES.length} exclusivités des boîtes)`);
}
// ---------- Économie anti-triche ----------
{
  const day = "2026-11-12";
  // Plafond d'entraînement : les pièces issues de l'XP s'arrêtent à COIN_DAY_CAP ; les progrès ne sont pas plafonnés
  const S = sanitize({ ...defaults(), coins: 0 });
  let got = 0; for (let k = 0; k < 50; k++) got += E.credit(S, 30, "xp", day);
  assert.equal(got, E.COIN_DAY_CAP); assert.equal(E.credit(S, 30, "xp", day), 0);
  assert.equal(E.credit(S, 40, "progress", day), 40); assert.equal(E.credit(S, 45, "quest", day), 45);
  assert.equal(S.coins, E.COIN_DAY_CAP + 85); assert.equal(S.econ.earned, S.coins);
  assert.equal(E.credit(S, 30, "xp", "2026-11-13"), 30, "le plafond repart le lendemain");
  // Dépense : jamais en négatif, journalisée
  const c0 = S.coins; assert.ok(!E.debit(S, c0 + 1, "shop")); assert.ok(E.debit(S, 100, "shop")); assert.equal(S.coins, c0 - 100); assert.equal(S.econ.spent, 100);
  assert.ok(!E.debit(S, -50, "shop") && !E.debit(S, 0, "shop"));
  // Répétitions : 100 %, 60 %, 35 %, puis 20 % ; une autre activité repart à 100 %
  const R = E.emptyEcon(), mults = [];
  for (let k = 0; k < 5; k++) { mults.push(E.repeatMult(R, "lesson:a", day)); E.noteRun(R, "lesson:a", day); }
  assert.deepEqual(mults, [1, 0.6, 0.35, 0.2, 0.2]); assert.equal(E.repeatMult(R, "lesson:b", day), 1); assert.equal(E.repeatMult(R, "lesson:a", "2026-11-13"), 1);
  // Horloge : jamais en arrière
  assert.equal(E.trustedNow({ lastSeen: 5000 }, 1000), 5000); assert.equal(E.trustedNow({ lastSeen: 5000 }, 9000), 9000); assert.equal(E.trustedNow({ lastSeen: 0 }, 9000, -4000), 5000);
  // Le solde ne peut pas dépasser « gagné − dépensé » (modifier seulement les pièces ne sert à rien)
  const T = sanitize({ ...defaults(), coins: 999999, econ: { ...E.emptyEcon(), earned: 500, spent: 200 } });
  assert.equal(T.coins, 300);
  const deps = { levelOf, basePrice, isExclusive: id => EXCLUSIVES.includes(id), isDefault: id => ["phones", "theme.nuit", "theme.jour"].includes(id), isUnlock: id => ["crown", "halo", "medal", "trophy", "lightning", "theme.prestige"].includes(id) };
  const days = ["2026-11-10", "2026-11-11", "2026-11-12"];
  // Joueur honnête : rien ne change
  const H = sanitize({ ...defaults(), xp: 1500, days, coins: 260, owned: ["phones", "theme.nuit", "theme.jour", "cap", "sun"], stats: { chests: 1, perfect: 0, bosses: 0, quests: 4, boxes: 0 }, econ: { ...E.emptyEcon(), earned: 410, spent: 150 }, lessons: { a: { stars: 3, best: 90, d: day } } });
  const h = E.audit(H, day, deps); assert.ok(!h.changed, "honnête : " + h.notes.join(", ")); assert.equal(H.coins, 260);
  // Tricheur : tout gonflé à la main → ramené à ce que la progression justifie
  const X = sanitize({ ...defaults(), xp: 9e6, days: [...days, "2031-01-01", "2020-01-01"], coins: 999999, trophies: 99999, owned: ["phones", "theme.nuit", "theme.jour", ...EXCLUSIVES, ...CATALOG], stats: { chests: 9999, perfect: 0, bosses: 0, quests: 9999, boxes: 9999 }, econ: { ...E.emptyEcon(), earned: 999999, spent: 0 } });
  const x = E.audit(X, day, deps);
  assert.ok(x.changed); assert.equal(X.days.length, 3); assert.ok(X.xp <= 3 * E.XP_DAY_MAX && X.trophies <= 3 * E.TROPHY_DAY_MAX);
  assert.ok(X.coins < 20000, "pièces " + X.coins); assert.ok(X.stats.quests <= 9 && X.stats.chests < 100);
  assert.ok(X.owned.filter(id => EXCLUSIVES.includes(id)).length <= X.stats.boxes);
  const shopValue = X.owned.reduce((t, id) => t + (basePrice(id) || 0), 0);
  assert.ok(shopValue < 60000, "objets gardés : " + shopValue);
  // Ancienne sauvegarde (avant le journal) : les achats passés sont comptés comme des dépenses, rien n'est perdu
  const O = sanitize({ v: 2, xp: 1500, days, coins: 120, owned: ["phones", "theme.nuit", "theme.jour", "cap", "pirate"] });
  assert.equal(O.econ.spent, 70 + 160); assert.equal(O.econ.earned, 120 + 230);
  const OB = sanitize({ v: 2, xp: 900, days, coins: 50, owned: ["phones", "theme.nuit", "theme.jour", "saber"], stats: { chests: 0, perfect: 0, bosses: 0, quests: 0, boxes: 3 } });
  E.audit(OB, day, deps); assert.ok(OB.owned.includes("saber") && OB.coins === 50, "boîtes d'avant la mise à jour conservées"); assert.equal(O.coins, 120);
  const o = E.audit(O, day, deps); assert.ok(O.owned.includes("pirate") && O.coins === 120, o.notes.join(", "));
  console.log("anti-triche OK (plafond, répétitions, horloge, solde, contrôle de cohérence)");
}
// ---------- Dates & nombres ----------
{
  const cases = { 0: "zero", 13: "thirteen", 30: "thirty", 45: "forty-five", 100: "one hundred", 105: "one hundred and five", 250: "two hundred and fifty", 1000: "one thousand", 2345: "two thousand three hundred and forty-five", 1000000: "one million" };
  for (const [n, w] of Object.entries(cases)) assert.equal(numberWords(+n), w);
  assert.equal(yearWords(2026), "twenty twenty-six"); assert.equal(yearWords(1995), "nineteen ninety-five"); assert.equal(yearWords(2005), "two thousand and five"); assert.equal(yearWords(1900), "nineteen hundred"); assert.equal(yearWords(1905), "nineteen oh five");
  assert.deepEqual([1, 2, 3, 5, 8, 9, 12, 20, 21, 30, 31].map(ordinalWords), ["first", "second", "third", "fifth", "eighth", "ninth", "twelfth", "twentieth", "twenty-first", "thirtieth", "thirty-first"]);
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 111].map(ordinalSuffix), ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "111th"]);
  assert.equal(pronOf("forty-five"), "FOR-ti · FAÏV");
  // Chaque mot et chaque phrase est notable au micro (présent dans le dictionnaire de prononciation)
  const dict = JSON.parse(readFileSync(new URL("../data/cmudict.json", import.meta.url), "utf8"));
  let n = 0;
  for (const b of BASICS) {
    assert.equal(new Set(basicsItems(b).map(w => w.en)).size, basicsItems(b).length, "doublon dans " + b.id);
    for (const w of basicsItems(b)) { assert.ok(w.pron && w.fr, w.en); assert.ok(buildReference(dict, w.en).every(r => r.prons), "absent du dictionnaire : " + w.en); n++; }
    for (const [en] of b.sentences) assert.ok(buildReference(dict, en).every(r => r.prons), "phrase non notable : " + en);
  }
  for (let k = 0; k <= 9999; k++) assert.ok(buildReference(dict, numberWords(k)).every(r => r.prons), "dictée non prononçable : " + k);
  console.log(`dates & nombres OK (${n} mots, ${BASICS.reduce((t, b) => t + b.sentences.length, 0)} phrases, nombres 0–9999 prononçables)`);
}
console.log("TOUS LES TESTS CŒUR OK");
