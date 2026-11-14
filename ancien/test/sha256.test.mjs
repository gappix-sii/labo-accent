import { createHash, randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { Sha256 as Sha } from "../js/sha256.js";
for (const s of ["", "abc", "a".repeat(55), "a".repeat(56), "a".repeat(64), "a".repeat(1000)]) {
  assert.equal(new Sha().update(Buffer.from(s)).hex(), createHash("sha256").update(s).digest("hex"), "len " + s.length);
}
// Morceaux de tailles aléatoires
for (let t = 0; t < 30; t++) {
  const data = randomBytes(Math.floor(Math.random() * 20000));
  const h = new Sha(); let i = 0;
  while (i < data.length) { const n = Math.floor(Math.random() * 200); h.update(data.subarray(i, i + n)); i += n; }
  assert.equal(h.hex(), createHash("sha256").update(data).digest("hex"));
}
const big = randomBytes(256 * 1024 * 1024);
const t0 = performance.now(); const h = new Sha();
for (let i = 0; i < big.length; i += 65536) h.update(big.subarray(i, i + 65536));
const hex = h.hex(), ms = performance.now() - t0;
assert.equal(hex, createHash("sha256").update(big).digest("hex"));
console.log(`SHA-256 OK · ${(256 / (ms / 1000)).toFixed(0)} Mo/s en JS pur`);
