// Tests du serveur local : il doit servir l'appli et refuser tout le reste.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
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
  } finally {
    server.close();
  }
});
