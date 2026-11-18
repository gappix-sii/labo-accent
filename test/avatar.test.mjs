// Tests de la phase 6, tâche 1 : dessins du compagnon repris de l'ancienne appli, avec le nouveau modèle html``.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SPECIES, ITEMS, SLOTS, RARITY, SKIN_PRICE, DEFAULT_AVATAR, DEFAULT_OWNED, CATALOG, avatarSvg, itemPreview,
  skinKey, describeOwned, basePrice, levelFor, ownsSkin } from "../js/content/avatar.js";
import { isSafe, toHTMLString } from "../js/core/dom.js";

const svgOk = (tpl, what) => {
  assert.ok(isSafe(tpl), `${what} : passe par html\`\``);
  const s = toHTMLString(tpl);
  assert.match(s, /^<svg [^>]*viewBox="0 0 200 200"/, what);
  assert.ok(!/<script|on[a-z]+=|javascript:|href=/i.test(s), `${what} : rien d'actif`);
  assert.ok(s.length < 60000, `${what} : ${s.length} caractères`);
  return s;
};

test("chaque animal dans chaque couleur se dessine (modèle sûr)", () => {
  assert.equal(SPECIES.length, 9);
  for (const sp of SPECIES) {
    assert.equal(sp.skins.length, 6, sp.id);
    for (const sk of sp.skins) svgOk(avatarSvg({ ...DEFAULT_AVATAR, species: sp.id, skin: sk.id, name: "Test" }), `${sp.id}/${sk.id}`);
  }
});

test("chaque accessoire se dessine porté et en aperçu", () => {
  assert.equal(ITEMS.length, 84);
  const slots = new Set(SLOTS.map((s) => s[0]));
  for (const it of ITEMS) {
    assert.ok(slots.has(it.slot), it.id);
    const s = svgOk(avatarSvg({ ...DEFAULT_AVATAR, head: "", [it.slot]: it.id }), `porté : ${it.id}`);
    assert.ok(s.length > toHTMLString(avatarSvg({ ...DEFAULT_AVATAR, head: "" })).length, `${it.id} visible sur le compagnon`);
    assert.match(toHTMLString(itemPreview(it.id)), /^<svg class="item-ico"/, it.id);
  }
  // accessoire placé au mauvais endroit, ou inconnu : ignoré
  assert.equal(toHTMLString(avatarSvg({ ...DEFAULT_AVATAR, head: "inconnu<script>" })), toHTMLString(avatarSvg({ ...DEFAULT_AVATAR, head: "" })));
  assert.equal(toHTMLString(itemPreview("inconnu")), "");
});

test("le nom du compagnon est affiché comme texte, jamais comme du code", () => {
  const s = toHTMLString(avatarSvg({ ...DEFAULT_AVATAR, name: '"><script>alert(1)</script>' }));
  assert.ok(!s.includes("<script>"));
  assert.match(s, /&quot;&gt;&lt;script&gt;/);
});

test("catalogue : identifiants uniques, raretés, prix et niveaux valides", () => {
  const ids = [...ITEMS.map((i) => i.id), ...SPECIES.flatMap((s) => s.skins.map((k) => skinKey(s.id, k.id)))];
  assert.equal(new Set(ids).size, ids.length, "identifiants uniques");
  assert.ok(ids.every((id) => /^[a-z0-9.-]{2,40}$/i.test(id)), "identifiants sans caractères spéciaux");
  for (const id of ids) {
    const d = describeOwned(id);
    assert.ok(d && RARITY[d.rarity], id);
    const p = basePrice(id);
    assert.ok(p === null || (Number.isInteger(p) && p > 0 && p <= 2000), `${id} : prix ${p}`);
    assert.ok(Number.isInteger(levelFor(id)) && levelFor(id) >= 1, id);
  }
  assert.ok(CATALOG.length > 50 && CATALOG.every((id) => basePrice(id) > 0));
  assert.ok(Object.values(SKIN_PRICE).every((p) => p > 0));
  assert.deepEqual(DEFAULT_OWNED, ["phones"]);
  assert.equal(ownsSkin([], "skunk", SPECIES[0].skins[0].id), true, "1re couleur offerte");
  assert.equal(ownsSkin([], "skunk", SPECIES[0].skins[1].id), false);
  assert.equal(describeOwned("theme.nuit"), null, "thèmes : plus tard");
  assert.equal(describeOwned(42), null);
});
