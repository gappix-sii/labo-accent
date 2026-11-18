// Tests de la phase 7, tâche 2 : QR code du transfert (vendor/qrcode-generator + js/engine/qr.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { qrMatrix, qrSvg, qrPath, QUIET } from "../js/engine/qr.js";
import { isSafe, toHTMLString } from "../js/core/dom.js";

const FILE = new URL("../vendor/qrcode-generator/qrcode.mjs", import.meta.url);
const PINNED = "18ae399f81182bc9de916e9c77b195df20cc58d6f2d55a62b085a299f1bf1780"; // qrcode.js 1.4.4, téléchargé le 2026-11-18
const ADDED = "\nexport default qrcode;";

test("bibliothèque copiée intacte : empreinte SHA-256, une seule ligne ajoutée", () => {
  const text = readFileSync(FILE, "utf8"), at = text.lastIndexOf(ADDED);
  assert.ok(at > 0, "ligne d'export présente");
  const original = text.slice(0, at), extra = text.slice(at);
  assert.equal(createHash("sha256").update(original, "utf8").digest("hex"), PINNED);
  assert.equal(extra.split("\n").filter(Boolean).length, 1, "rien d'autre d'ajouté");
  assert.ok(!/fetch\(|XMLHttpRequest|import\(|eval\(|new Function|document\.|localStorage/.test(original), "aucun accès au réseau, à la page ni au stockage");
});

// Les trois carrés de repérage (7 × 7) aux coins : la grille a bien la forme d'un QR code.
function finderOk(m, r0, c0) {
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
    const ring = r === 0 || r === 6 || c === 0 || c === 6, core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
    if (m.dark(r0 + r, c0 + c) !== (ring || core)) return false;
  }
  return true;
}

test("QR code d'un lien de transfert : forme correcte, version selon la longueur", () => {
  const short = qrMatrix("https://gappix-sii.github.io/labo-accent/#transfert/1.abcdefgh");
  const long = qrMatrix("https://gappix-sii.github.io/labo-accent/#transfert/1." + "A".repeat(1840)); // un an d'usage (mesuré en tâche 1)
  for (const m of [short, long]) {
    assert.ok(m && (m.size - 17) % 4 === 0, "taille = 4 × version + 17");
    assert.ok(finderOk(m, 0, 0) && finderOk(m, 0, m.size - 7) && finderOk(m, m.size - 7, 0));
  }
  assert.ok(short.size < long.size);
  console.log(`QR code : lien court ${short.size}×${short.size} modules, lien d'un an d'usage ${long.size}×${long.size}`);
});

test("trop long ou pas en ASCII : signalé (null), jamais d'erreur", () => {
  assert.equal(qrMatrix("x".repeat(3000)), null, "au-delà de la version 40");
  assert.equal(qrSvg("x".repeat(3000)), null);
  assert.equal(qrMatrix("é"), null); assert.equal(qrMatrix(""), null); assert.equal(qrMatrix(42), null);
});

test("dessin SVG sûr, noir sur blanc, avec la marge blanche", () => {
  const t = qrSvg("https://x.test/#transfert/1.abcdefgh", { label: '"><script>alert(1)</script>' });
  assert.ok(isSafe(t));
  const s = toHTMLString(t), m = qrMatrix("https://x.test/#transfert/1.abcdefgh"), n = m.size + 2 * QUIET;
  assert.match(s, new RegExp(`^<svg class="qr" viewBox="0 0 ${n} ${n}"`));
  assert.ok(!s.includes("<script>"), "étiquette échappée");
  assert.ok(s.includes('fill="#ffffff"') && s.includes('fill="#000000"'));
  assert.match(qrPath(m), /^(M\d+ \d+h1v1h-1z)+$/);
});
