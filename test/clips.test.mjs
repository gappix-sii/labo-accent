// Tests des sons livrés avec l'appli (phase 2, tâche 3) : chaque phrase fixe a son fichier, dans les deux voix.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { SENTENCES } from "../js/content/sentences.js";
import { fixedTexts } from "../js/content/fixed.js";
import { fileFor, VOICES } from "../js/engine/clips.js";
import { REVISION, VOICE_IDS } from "../js/engine/voice-model.js";
import { readOgg } from "../tools/ogg-opus.mjs";

const dir = new URL("../data/audio/", import.meta.url);
const index = JSON.parse(readFileSync(new URL("index.json", dir), "utf8"));

test("la liste des sons correspond à la voix actuelle", () => {
  assert.equal(index.revision, REVISION, "sons fabriqués avec une autre révision : relancer npm run fabrique");
  assert.deepEqual(VOICES.map((v) => v.id), VOICE_IDS);
});

test("chaque phrase fixe a un fichier Ogg valide, dans chaque voix", () => {
  const texts = fixedTexts();
  assert.ok(texts.length > SENTENCES.length);
  for (const v of VOICE_IDS) for (const text of texts) {
    const file = fileFor(index, text, v);
    assert.ok(file, `son manquant : ${v} · ${text} (relancer npm run fabrique)`);
    assert.ok(existsSync(new URL(file, dir)), `fichier absent : ${file}`);
    const pages = readOgg(new Uint8Array(readFileSync(new URL(file, dir)))); // CRC vérifiés
    assert.equal(pages.at(-1).type, 4, file);
  }
});

test("un nom de fichier inattendu dans la liste est ignoré", () => {
  const idx = { clips: { af_heart: { a: { file: "../../index.html" }, b: { file: "af_heart-0123456789abcdef.ogg" } } } };
  assert.equal(fileFor(idx, "a", "af_heart"), null);
  assert.equal(fileFor(idx, "b", "af_heart"), "af_heart-0123456789abcdef.ogg");
  assert.equal(fileFor(idx, "b", "__proto__"), null);
  assert.equal(fileFor(idx, "toString", "af_heart"), null);
  assert.equal(fileFor(null, "b", "af_heart"), null);
});

test("files.json (liste allégée lue par l'appli) donne les mêmes fichiers qu'index.json (relecture du 2026-11-20)", () => {
  const files = JSON.parse(readFileSync(new URL("files.json", dir), "utf8"));
  assert.equal(files.revision, index.revision, "files.json périmée : relancer npm run fabrique");
  for (const v of VOICE_IDS) {
    assert.deepEqual(Object.keys(files.clips[v]).sort(), Object.keys(index.clips[v]).sort(), v);
    for (const text of Object.keys(index.clips[v])) assert.equal(fileFor(files, text, v), fileFor(index, text, v), `${v} · ${text}`);
  }
  assert.equal(fileFor({ clips: { af_heart: { x: "../../index.html" } } }, "x", "af_heart"), null, "nom de fichier inattendu ignoré");
  assert.ok(readFileSync(new URL("files.json", dir)).length < readFileSync(new URL("index.json", dir)).length / 2);
});
