// Tests de la protection des téléchargements : liste blanche, révision figée, SHA-256 et taille exacte.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { Sha256 } from "../js/engine/sha256.js";
import { MODELS, guardedFetch, lookup } from "../js/engine/integrity.js";

const REAL_REPOS = Object.keys(MODELS).sort(); // avant l'ajout du faux dépôt de test plus bas

test("SHA-256 en JS pur identique à celui de Node", () => {
  for (const s of ["", "abc", "a".repeat(55), "a".repeat(56), "a".repeat(64), "a".repeat(1000)]) {
    assert.equal(new Sha256().update(Buffer.from(s)).hex(), createHash("sha256").update(s).digest("hex"), "longueur " + s.length);
  }
  // Morceaux de tailles aléatoires, comme un vrai téléchargement
  for (let t = 0; t < 30; t++) {
    const data = randomBytes(Math.floor(Math.random() * 20000));
    const h = new Sha256();
    for (let i = 0; i < data.length;) { const n = Math.floor(Math.random() * 200); h.update(data.subarray(i, i + n)); i += n; }
    assert.equal(h.hex(), createHash("sha256").update(data).digest("hex"));
  }
  const big = randomBytes(8 * 1024 * 1024), h = new Sha256();
  for (let i = 0; i < big.length; i += 65536) h.update(big.subarray(i, i + 65536));
  assert.equal(h.hex(), createHash("sha256").update(big).digest("hex"));
});

test("seuls le moteur de prononciation et la voix sont autorisés", () => {
  assert.deepEqual(REAL_REPOS, ["onnx-community/Kokoro-82M-v1.0-ONNX", "robg/speako-phoneme-recognizer"]);
  assert.equal(MODELS["robg/speako-phoneme-recognizer"].files["onnx/model_quantized.onnx"].size, 355216594);
  assert.equal(MODELS["onnx-community/Kokoro-82M-v1.0-ONNX"].files["onnx/model_quantized.onnx"].size, 92361116);
  for (const repo of REAL_REPOS.map((k) => MODELS[k])) {
    assert.match(repo.rev, /^[0-9a-f]{40}$/, "révision figée");
    for (const e of Object.values(repo.files)) assert.ok((e.sha256 && e.size) || e.max, "chaque fichier est limité");
  }
});

// Un faux dépôt, retiré à la fin, pour tester la vérification sans rien télécharger.
const REV = "a".repeat(40), base = `https://huggingface.co/test/repo/resolve/${REV}/`;
const data = new Uint8Array(300000).map((_, i) => (i * 7) & 255);
MODELS["test/repo"] = { rev: REV, files: { "w.bin": { sha256: createHash("sha256").update(data).digest("hex"), size: data.length }, "c.json": { max: 10 } } };
after(() => { delete MODELS["test/repo"]; });
const calls = [];
const fake = (body) => async (url, opts) => { calls.push({ url, opts }); return new Response(body, { status: 200 }); };
const read = (r) => new Response(r.body).arrayBuffer();
const APP = "https://app.test";

test("un fichier conforme passe, sans cookie ni référent", async () => {
  calls.length = 0;
  const r = await guardedFetch(fake(data), APP)(base + "w.bin");
  assert.equal(r.headers.get("content-length"), String(data.length));
  assert.equal((await read(r)).byteLength, data.length);
  assert.equal(calls[0].opts.credentials, "omit");
  assert.equal(calls[0].opts.referrerPolicy, "no-referrer");
});

test("un fichier modifié, tronqué ou trop gros est rejeté", async () => {
  const tampered = data.slice(); tampered[1234] ^= 1;
  await assert.rejects(read(await guardedFetch(fake(tampered), APP)(base + "w.bin")), /integrity:hash/);
  await assert.rejects(read(await guardedFetch(fake(data.slice(0, 1000)), APP)(base + "w.bin")), /integrity:size/);
  await assert.rejects(read(await guardedFetch(fake(new Uint8Array(data.length + 10)), APP)(base + "w.bin")), /integrity:size/);
  await assert.rejects(read(await guardedFetch(fake("01234567890123"), APP)(base + "c.json")), /integrity:size/);
  assert.equal(await new Response((await guardedFetch(fake("{}"), APP)(base + "c.json")).body).text(), "{}");
});

test("tout ce qui n'est pas dans la liste est refusé", async () => {
  const g = guardedFetch(fake("x"), APP);
  assert.equal((await g(base + "inconnu.json")).status, 404);
  await assert.rejects(g("https://evil.example/x"), /refusé/);
  await assert.rejects(g(`https://huggingface.co/test/repo/resolve/${"b".repeat(40)}/w.bin`), /refusé/);
  await assert.rejects(g(base + "w.bin?x=1"), /refusé/);
  await assert.rejects(g("https://huggingface.co/onnx-community/whisper-base.en/resolve/main/config.json"), /refusé/, "IA locale retirée");
  assert.equal(lookup(base + "onnx/../w.bin").file, "w.bin", "les .. sont résolus par l'analyseur d'URL");
  assert.ok(lookup(base + "../../x").deny, "sortie du dépôt refusée");
  assert.ok(lookup(`https://huggingface.co:444/test/repo/resolve/${REV}/w.bin`).deny, "port refusé");
  assert.ok(lookup(`http://huggingface.co/test/repo/resolve/${REV}/w.bin`).deny, "http refusé");
  assert.equal(lookup(base.replace(REV, "main") + "w.bin").href, base + "w.bin", "« main » redirigé vers la révision figée");
  assert.ok(lookup(base.replace(REV, "dev") + "w.bin").deny, "autre branche refusée");
  assert.ok(lookup("https://huggingface.co/__proto__/x/resolve/main/w.bin").deny, "dépôt hors liste refusé");
});

test("seule la sonde de taille (1 octet) est permise en requête partielle", async () => {
  const g = guardedFetch(fake("x"), APP);
  calls.length = 0;
  await g(base + "w.bin", { headers: { Range: "bytes=0-0" } });
  assert.equal(calls[0].opts.headers.Range, "bytes=0-0");
  await assert.rejects(g(base + "w.bin", { headers: { Range: "bytes=0-100" } }), /partielle/);
});

test("les fichiers de l'appli elle-même passent sans filtre", async () => {
  const same = await guardedFetch(async () => new Response("local"), APP)(APP + "/vendor/x.wasm");
  assert.equal(await same.text(), "local");
});
