// Tests de la phase 9, tâche 2 : les 9 boss du parcours (dessins, états, répliques).
import { test } from "node:test";
import assert from "node:assert/strict";
import { BOSSES, STATES, bossOf, bossSvg } from "../js/content/bosses.js";
import { REGIONS } from "../js/content/regions.js";
import { isSafe, toHTMLString } from "../js/core/dom.js";

test("un boss par région, avec un nom unique et toutes ses répliques", () => {
  assert.deepEqual(Object.keys(BOSSES).sort(), REGIONS.map((r) => r.id).sort());
  assert.equal(new Set(Object.values(BOSSES).map((b) => b.name)).size, REGIONS.length);
  for (const r of REGIONS) {
    const b = bossOf(r.id);
    assert.match(b.fur, /^#[0-9a-f]{6}$/i, r.id);
    for (const k of ["line", "taunt", "hurt", "ko", "win"]) assert.ok(typeof b[k] === "string" && b[k].length > 5, `${r.id} : réplique ${k}`);
  }
  assert.equal(bossOf("inconnu"), null);
  assert.equal(bossOf("__proto__"), null);
});

test("chaque boss se dessine dans chaque état, avec le modèle sûr", () => {
  for (const r of REGIONS) for (const st of STATES) {
    const svg = bossSvg(r.id, st);
    assert.ok(isSafe(svg), `${r.id} ${st}`);
    const s = toHTMLString(svg);
    assert.ok(s.includes(`class="boss ${st}"`), `${r.id} ${st} : classe d'état`);
    assert.ok(s.includes(bossOf(r.id).name), `${r.id} : nom lu par les lecteurs d'écran`);
  }
  const ko = toHTMLString(bossSvg("couple", "ko"));
  assert.ok(ko.includes("vaincu") && !ko.includes("av-aura"), "vaincu : yeux en croix, plus d'aura");
  assert.ok(toHTMLString(bossSvg("couple", "bizarre")).includes('class="boss idle"'), "état inconnu : au repos");
  assert.ok(toHTMLString(bossSvg("couple", "idle", { label: "" })).includes('aria-hidden="true"'), "dessin décoratif caché");
});
