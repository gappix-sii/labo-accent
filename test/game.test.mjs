// Tests de la phase 6, tâche 2 : l'économie du jeu (js/core/game.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, syncGame, openChest, buyBox, buy, deals, priceOf, dealPrice, setSpecies, setSkin, equip, rename, sanitizeGame,
  chestPool, boxPool, mulberry32, cryptoRng, CHESTS, BOXES, PITY, XP_PER_COIN, MAX_CHESTS, DEAL_COUNT } from "../js/core/game.js";
import { newProgress, levelOf, levelCost } from "../js/core/progress.js";
import { SPECIES, CATALOG, basePrice, levelFor, skinKey, DEFAULT_AVATAR } from "../js/content/avatar.js";
import { defaults, sanitize, save } from "../js/core/store.js";

const day = Date.UTC(2026, 10, 18, 12);
const xpForLevel = (n) => { let x = 0; for (let l = 1; l < n; l++) x += levelCost(l); return x; };

test("pièces : 1 pour 4 XP, sans perte ni double compte", () => {
  const G = newGame(), P = newProgress();
  P.xp = 7; assert.equal(syncGame(G, P).coins, 1); assert.equal(G.xpPaid, 4);
  assert.equal(syncGame(G, P).coins, 0, "rien de nouveau : rien de plus");
  P.xp = 8; assert.equal(syncGame(G, P).coins, 1, "le reste de 3 XP compte pour la suite");
  P.xp = 1000; syncGame(G, P);
  assert.equal(G.coins, 1000 / XP_PER_COIN);
});

test("coffres : un par niveau gagné, d'or tous les 5 niveaux", () => {
  const G = newGame(), P = newProgress();
  P.xp = xpForLevel(4); const g = syncGame(G, P);
  assert.deepEqual(g.levels, [2, 3, 4]);
  assert.deepEqual(G.chests, ["silver", "silver", "silver"]);
  P.xp = xpForLevel(6); syncGame(G, P);
  assert.deepEqual(G.chests.slice(3), ["gold", "silver"]);
  assert.deepEqual(syncGame(G, P).chests, [], "pas deux fois le même niveau");
  P.xp = xpForLevel(80); syncGame(G, P);
  assert.equal(G.chests.length, MAX_CHESTS, "coffres en attente plafonnés");
});

test("ouvrir un coffre : pièces dans la fourchette, objet nouveau, puis pièces quand tout est gagné", () => {
  const G = newGame(); G.chests = ["gold", "silver"];
  const r = openChest(G, mulberry32(1));
  assert.equal(r.tier, "gold");
  assert.ok(r.coins >= CHESTS.gold.coins[0] && r.coins <= CHESTS.gold.coins[1] + 250);
  assert.ok(r.item && G.owned.includes(r.item), "le coffre d'or donne toujours un objet");
  assert.equal(G.chests.length, 1);
  openChest(G, mulberry32(2)); assert.equal(openChest(G), null, "plus de coffre");
  // tout gagné : des pièces à la place
  const H = newGame(); H.owned.push(...chestPool(H).map((p) => p.id)); H.chests = ["gold"];
  const c0 = H.coins, r2 = openChest(H, mulberry32(3));
  assert.equal(r2.item, null); assert.ok(r2.bonus > 0); assert.equal(H.coins - c0, r2.coins);
});

test("boîtes à butin : tirages conformes aux probabilités affichées (100 000 essais, ± 1 %)", () => {
  const rng = mulberry32(42);
  for (const [id, B] of Object.entries(BOXES)) {
    const N = 100000, G = newGame();
    // sans garantie : compteur remis à 0 à chaque essai
    const real = {}; for (let i = 0; i < N; i++) { G.coins = B.price; G.pity = 0; const r = buyBox(G, id, rng); real[r.rarity] = (real[r.rarity] || 0) + 1; }
    for (const [rar, p] of Object.entries(B.odds)) assert.ok(Math.abs((real[rar] || 0) / N - p) < 0.01, `${id} ${rar} : ${(real[rar] || 0) / N} au lieu de ${p}`);
    assert.ok(Object.keys(real).every((r) => r in B.odds), `${id} : aucune rareté hors liste`);
  }
});

test("boîtes : garantie d'un légendaire ou mythique en 10 boîtes au plus, doublon → pièces, pièces suffisantes", () => {
  const rng = mulberry32(7);
  for (let run = 0; run < 300; run++) {
    const G = newGame(); G.coins = 1e6;
    let n = 0, top = false;
    while (!top) { const r = buyBox(G, "classic", rng); n++; top = r.rarity === "legendary" || r.rarity === "mythic"; }
    assert.ok(n <= PITY, `${n} boîtes`);
  }
  const G = newGame();
  assert.deepEqual(buyBox(G, "classic"), { ok: false, error: "coins" });
  assert.deepEqual(buyBox(G, "toString"), { ok: false, error: "unknown" });
  G.coins = 1e6; G.owned.push(...boxPool(G).map((p) => p.id));
  const r = buyBox(G, "epic", rng);
  assert.equal(r.dup, true); assert.ok(r.coins > 0);
});

test("boutique : prix, niveau requis, 3 offres du jour à −30 % stables dans la journée", () => {
  const G = newGame(), lv = 10;
  const d = deals(G, lv, day);
  assert.equal(d.length, DEAL_COUNT);
  assert.deepEqual(deals(G, lv, day + 3 * 3600e3), d, "mêmes offres dans la journée");
  assert.notDeepEqual(deals(G, lv, day + 86400e3 * 3), d, "autres offres un autre jour");
  assert.ok(d.every((id) => levelFor(id) <= lv && !G.owned.includes(id)));
  const H = newGame(); H.coins = 1e4; buy(H, d[0], lv, day);
  assert.deepEqual(deals(H, lv, day).slice(0, 2), d.slice(1), "acheter une offre ne change pas les deux autres");
  assert.ok(!deals(H, lv, day).includes(d[0]));
  assert.equal(priceOf(G, d[0], lv, day), dealPrice(basePrice(d[0])));
  assert.ok(dealPrice(100) === 70 && dealPrice(60) === 40);
  const id = CATALOG.find((x) => levelFor(x) === 1 && !deals(G, 1, day).includes(x));
  assert.deepEqual(buy(G, id, 1, day), { ok: false, error: "coins" });
  G.coins = 1000;
  assert.deepEqual(buy(G, id, 1, day), { ok: true, price: basePrice(id) });
  assert.equal(G.coins, 1000 - basePrice(id), "payé une seule fois");
  assert.deepEqual(buy(G, id, 1, day), { ok: false, error: "owned" });
  const high = CATALOG.find((x) => levelFor(x) > 3);
  assert.deepEqual(buy(G, high, 1, day), { ok: false, error: "level" });
  assert.deepEqual(buy(G, "crown", 99, day), { ok: false, error: "unknown" }, "récompense spéciale : pas en vente");
});

test("compagnon : animal selon le niveau, couleur et accessoires à toi, nom nettoyé", () => {
  const G = newGame(), late = SPECIES.find((s) => s.lvl > 1);
  assert.equal(setSpecies(G, late.id, late.lvl - 1), false);
  assert.equal(setSpecies(G, late.id, late.lvl), true);
  assert.equal(G.avatar.skin, late.skins[0].id);
  assert.equal(setSkin(G, late.skins[1].id), false, "couleur pas encore à toi");
  G.owned.push(skinKey(late.id, late.skins[1].id));
  assert.equal(setSkin(G, late.skins[1].id), true);
  assert.equal(equip(G, "cap"), false, "accessoire pas à toi");
  G.owned.push("cap"); assert.equal(equip(G, "cap"), true); assert.equal(G.avatar.head, "cap");
  assert.equal(equip(G, "", "head"), true); assert.equal(G.avatar.head, "");
  assert.equal(equip(G, "", "name"), false);
  assert.equal(rename(G, "  <b>Biscotte</b> qui a un nom très très long  "), true);
  assert.equal(G.avatar.name, "bBiscotte/b qui a un");
  assert.equal(rename(G, "   "), false);
});

test("sauvegarde du jeu : nettoyée si abîmée ou trafiquée, et gains calculés à l'enregistrement", () => {
  const G = sanitizeGame({ v: 1, coins: -5, xpPaid: "x", levelPaid: 3, owned: ["cap", "inconnu", 42, "skin.fox.<x>"], chests: ["gold", "diamant", "silver"], pity: 99,
    avatar: { species: "dragon", skin: "pas-a-moi", head: "cap", eyes: "cap", hand: "<script>", name: "<Pouf>" } });
  assert.equal(G.coins, 0); assert.equal(G.xpPaid, 0); assert.equal(G.levelPaid, 3);
  assert.deepEqual(G.owned, ["phones", "cap"]);
  assert.deepEqual(G.chests, ["gold", "silver"]);
  assert.equal(G.pity, 0);
  assert.equal(G.avatar.species, "dragon"); assert.equal(G.avatar.skin, SPECIES.find((s) => s.id === "dragon").skins[0].id);
  assert.equal(G.avatar.head, "cap"); assert.equal(G.avatar.eyes, DEFAULT_AVATAR.eyes); assert.equal(G.avatar.hand, "");
  assert.equal(G.avatar.name, "Pouf");
  assert.deepEqual(sanitizeGame(null), newGame());
  assert.deepEqual(defaults().game, newGame());
  assert.deepEqual(sanitize({ version: 1 }).game, newGame());
  // enregistrement : les XP déjà gagnés deviennent pièces et coffres
  const S = defaults(); S.progress.xp = xpForLevel(3) + 2;
  const mem = { v: null, setItem(k, v) { this.v = v; } };
  save(S, mem);
  assert.equal(S.game.coins, Math.floor(S.progress.xp / 4));
  assert.deepEqual(S.game.chests, ["silver", "silver"]);
  assert.equal(JSON.parse(mem.v).game.coins, S.game.coins);
  assert.ok(typeof cryptoRng()() === "number");
});

test("simulation d'un mois de pratique (à relire avec l'utilisateur)", () => {
  const out = [];
  for (const perDay of [50, 100]) {
    const G = newGame(), P = newProgress(), rng = mulberry32(perDay);
    let items = 0;
    for (let d = 0; d < 30; d++) {
      P.xp += perDay; syncGame(G, P);
      while (G.chests.length) if (openChest(G, rng).item) items++;
    }
    const lv = levelOf(P.xp).level;
    const affordable = CATALOG.filter((id) => basePrice(id) <= G.coins && levelFor(id) <= lv).length;
    const avgCommon = Math.round(CATALOG.filter((id) => basePrice(id) && levelFor(id) <= lv).map(basePrice).sort((a, b) => a - b)[0]);
    out.push({ perDay, xp: P.xp, level: lv, coins: G.coins, chestItems: items, affordable, cheapest: avgCommon });
  }
  console.log("Simulation d'un mois :", JSON.stringify(out));
  const [a, b] = out;
  assert.ok(a.level >= 5 && a.level <= 9, `50 XP/jour → niveau ${a.level}`);
  assert.ok(a.coins >= 300 && b.coins >= 2 * a.coins * 0.9, `pièces ${a.coins} / ${b.coins}`);
  assert.ok(a.chestItems >= 3, `objets des coffres : ${a.chestItems}`);
  assert.ok(a.affordable >= 10, "à 50 XP/jour, une dizaine d'objets achetables à la fin du mois");
});

test("écran Compagnon : adresse #compagnon", async () => {
  const { route } = await import("../js/main.js");
  assert.deepEqual(route("#compagnon"), { screen: "companion" });
  assert.deepEqual(route("#compagnon/x"), { screen: "home" });
});

test("écran Boutique : adresse, catégories et essayage", async () => {
  const { route } = await import("../js/main.js");
  const { CATEGORIES, categoryOf, tryOn } = await import("../js/screens/shop.js");
  assert.deepEqual(route("#boutique"), { screen: "shop" });
  const cats = new Set(CATEGORIES.map(([c]) => c));
  assert.ok(CATALOG.every((id) => cats.has(categoryOf(id))), "chaque objet en vente a sa catégorie");
  const av = { ...DEFAULT_AVATAR };
  assert.equal(tryOn(av, "cap").head, "cap");
  const fox = SPECIES.find((s) => s.id === "fox"), t = tryOn(av, skinKey("fox", fox.skins[1].id));
  assert.equal(t.species, "fox"); assert.equal(t.skin, fox.skins[1].id);
  assert.equal(tryOn(av, "inconnu"), av);
  assert.deepEqual(av, DEFAULT_AVATAR, "l'essayage ne touche pas au compagnon");
});

test("écran Coffres : adresse, probabilités affichées telles que tirées, dessins sûrs", async () => {
  const { route } = await import("../js/main.js");
  const { pct, oddsRows, nextGold } = await import("../js/screens/chests.js");
  const { chestSvg, boxSvg } = await import("../js/content/chest-art.js");
  const { isSafe } = await import("../js/core/dom.js");
  assert.deepEqual(route("#coffres"), { screen: "chests" });
  assert.equal(pct(0.002), "0,2 %"); assert.equal(pct(0.62), "62 %"); assert.equal(pct(0.018), "1,8 %");
  for (const B of Object.values(BOXES)) {
    const rows = oddsRows(B.odds);
    assert.equal(rows.length, Object.keys(B.odds).length, "toutes les raretés affichées");
    assert.ok(Math.abs(rows.reduce((s, [, p]) => s + p, 0) - 1) < 1e-9, "total 100 %");
  }
  assert.equal(nextGold(1), 5); assert.equal(nextGold(5), 10); assert.equal(nextGold(7), 10);
  for (const t of Object.keys(CHESTS)) assert.ok(isSafe(chestSvg(t, "idle")));
  for (const b of Object.keys(BOXES)) assert.ok(isSafe(boxSvg(b, "idle")));
});
