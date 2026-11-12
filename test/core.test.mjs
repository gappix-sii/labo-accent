// Tests des modules de sécurité et du méta-jeu (Node, sans navigateur).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { html, toHTMLString } from "../js/core/dom.js";
import { sanitize, defaults, parseImport, exportText, cleanText } from "../js/core/store.js";
import * as M from "../js/meta.js";
import { MODELS, guardedFetch, lookup } from "../js/integrity.js";
import { SPECIES, ITEMS, THEMES, avatarSvg, bossSvg, BOSSES, droppable, itemPreview, boxPool, EXCLUSIVES } from "../js/avatar.js";

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
  assert.equal(EXCLUSIVES.length, 16);
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
console.log("TOUS LES TESTS CŒUR OK");
