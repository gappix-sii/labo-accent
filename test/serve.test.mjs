// Tests du serveur local : il doit servir l'appli et refuser tout le reste.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { ROOT, resolvePath, makeServer } from "../tools/serve.mjs";

test("sert les fichiers de l'appli", () => {
  assert.equal(resolvePath(ROOT, "/"), join(ROOT, "index.html"));
  assert.equal(resolvePath(ROOT, "/index.html?v=2"), join(ROOT, "index.html"));
  assert.equal(resolvePath(ROOT, "/js/app.js"), join(ROOT, "js", "app.js"));
});

test("refuse ce qui sort du dossier ou n'est pas de l'appli", () => {
  for (const bad of [
    "/../secret.html", "/%2e%2e/secret.html", "/js/..%2f..%2fsecret.html", "/..\\secret.html",
    "/.git/config", "/.claude/x.json", "/js/.cache.js",
    "/conversation-anglais.md", "/PLAN.md", "/package", "/x.exe",
    "/%00.html", "/%E0%A4%A.html"
  ]) assert.equal(resolvePath(ROOT, bad), null, bad);
});

test("répond avec les bons en-têtes, et 404 pour une note perso", async () => {
  const server = makeServer().listen(0, "127.0.0.1");
  await new Promise((ok) => server.once("listening", ok));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const ok = await fetch(base + "/");
    assert.equal(ok.status, 200);
    assert.match(ok.headers.get("content-type"), /text\/html/);
    assert.equal(ok.headers.get("cross-origin-embedder-policy"), "require-corp");
    assert.equal(ok.headers.get("x-frame-options"), "DENY");
    assert.match(await ok.text(), /Labo d'accent/);
    const note = await fetch(base + "/conversation-anglais.md");
    assert.equal(note.status, 404);
    await note.arrayBuffer();
    const post = await fetch(base + "/", { method: "POST" });
    assert.equal(post.status, 405);
    await post.arrayBuffer();
    const put = await fetch(base + "/data/audio/index.json", { method: "PUT", body: "{}" });
    assert.equal(put.status, 405, "sans le mode fabrique, aucune écriture");
    await put.arrayBuffer();
  } finally {
    server.close();
  }
});

test("mode fabrique : n'écrit que des sons et leur liste, dans data/audio/", async () => {
  const root = await mkdtemp(join(tmpdir(), "labo-"));
  const server = makeServer(root, { fabrique: true, port: 0 }).listen(0, "127.0.0.1");
  await new Promise((ok) => server.once("listening", ok));
  const port = server.address().port, base = `http://127.0.0.1:${port}`;
  // le contrôle d'origine attend le port réel : on recrée le serveur sur ce port
  server.close();
  const srv = makeServer(root, { fabrique: true, port }).listen(port, "127.0.0.1");
  await new Promise((ok) => srv.once("listening", ok));
  const origin = `http://localhost:${port}`;
  const put = async (path, body, type, headers = { origin }) => {
    const r = await fetch(base + path, { method: "PUT", body, headers: { "content-type": type, ...headers } });
    await r.arrayBuffer();
    return r.status;
  };
  const ogg = Buffer.concat([Buffer.from("OggS"), Buffer.alloc(40)]);
  const name = "/data/audio/af_heart-0123456789abcdef.ogg";
  try {
    assert.equal(await put(name, ogg, "audio/ogg"), 201);
    assert.deepEqual(await readFile(join(root, "data", "audio", "af_heart-0123456789abcdef.ogg")), ogg);
    assert.equal(await put("/data/audio/index.json", '{"version":1}', "application/json"), 201);
    for (const bad of ["/index.html", "/js/main.js", "/data/audio/../x.ogg", "/data/audio/%2e%2e/x.ogg",
      "/data/audio/x.ogg", "/data/audio/af_heart-0123.ogg", "/data/audio/af_heart-0123456789abcdef.ogg.js", "/data/cmudict.json"]) {
      assert.equal(await put(bad, ogg, "audio/ogg"), 403, bad);
    }
    assert.equal(await put(name, ogg, "audio/ogg", { origin: "https://evil.example" }), 403, "autre site");
    assert.equal(await put(name, ogg, "audio/ogg", {}), 403, "sans origine");
    assert.equal(await put(name, ogg, "audio/ogg", { origin, "sec-fetch-site": "cross-site" }), 403);
    assert.equal(await put(name, ogg, "text/plain"), 415, "mauvais type");
    assert.equal(await put(name, Buffer.from("MZ......"), "audio/ogg"), 400, "pas un Ogg");
    assert.equal(await put("/data/audio/index.json", "[1]", "application/json"), 400);
    assert.equal(await put(name, Buffer.concat([Buffer.from("OggS"), Buffer.alloc(300 * 1024)]), "audio/ogg"), 413, "trop gros");
    assert.deepEqual((await readdir(join(root, "data", "audio"))).sort(), ["af_heart-0123456789abcdef.ogg", "index.json"]);
  } finally {
    srv.close();
    await rm(root, { recursive: true, force: true });
  }
});
