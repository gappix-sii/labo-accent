// Écran « Transfert » (#transfert, phase 7) : envoyer ta progression (QR code, lien à copier) et la recevoir
// (#transfert/<code>, ouvert par l'appareil photo ou collé), avec aperçu, confirmation et « Annuler l'import ».
// Le code est retiré de l'adresse et de l'historique dès qu'il est lu. Format : js/core/transfer.js.
import { html, render } from "../core/dom.js";
import { save, defaults, sanitize, STORE_KEY } from "../core/store.js";
import { levelOf } from "../core/progress.js";
import { pack, unpack, receive, linkFor, codeFrom, transferError } from "../core/transfer.js";
import { qrSvg } from "../engine/qr.js";

export const BACKUP_KEY = "labo.v2.avant-import"; // progression remplacée par le dernier import, pour « Annuler l'import »
// Ce qui est gardé de côté : la sauvegarde actuelle, ou une progression vierge si l'appareil n'avait encore rien enregistré
// (sinon « Annuler l'import » n'était pas proposé : essai du 2026-11-18).
export const backupOf = (raw) => (typeof raw === "string" && raw ? raw : JSON.stringify(defaults()));

// Résumé d'une sauvegarde, pour comparer avant d'importer.
export function summary(S) {
  const lv = levelOf(S.progress.xp);
  return { level: lv.level, xp: S.progress.xp, lessons: Object.values(S.progress.lessons).filter((l) => l.done > 0).length,
    words: Object.keys(S.srs.cards).length, bosses: Object.values(S.bosses.regions).filter((r) => r.wins > 0).length, coins: S.game.coins, items: S.game.owned.length, name: S.game.avatar.name };
}
// « Annuler l'import » ÉCHANGE les deux sauvegardes au lieu d'effacer la copie (relecture complète, n° 2) : la progression
// actuelle devient la copie de côté, donc on peut encore revenir. La révision remise passe au-dessus de celle enregistrée,
// pour que les autres onglets ne l'écrasent pas.
const revOf = (raw) => { try { const r = JSON.parse(raw).rev; return Number.isInteger(r) ? r : 0; } catch { return 0; } };
export function swapForUndo(currentRaw, backupRaw) {
  const restored = JSON.parse(backupRaw);
  restored.rev = Math.max(revOf(currentRaw), revOf(backupRaw)) + 1;
  return { store: JSON.stringify(restored), backup: currentRaw || JSON.stringify(defaults()) };
}
// La progression reçue est-elle en retard sur celle de cet appareil ? (relecture complète, n° 10)
export const isOlder = (from, here) => from.xp < here.xp || from.words < here.words || from.lessons < here.lessons || (from.bosses || 0) < (here.bosses || 0);
const parseSave = (raw) => { try { return sanitize(JSON.parse(raw)); } catch { return null; } };

const ROWS = [["level", "Niveau"], ["xp", "XP"], ["lessons", "Leçons finies"], ["words", "Mots de vocabulaire vus"], ["bosses", "Boss vaincus"], ["coins", "Pièces"], ["items", "Objets du compagnon"], ["name", "Compagnon"]];

const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const del = (k) => { try { localStorage.removeItem(k); } catch { /* rien */ } };

export function mountTransfer(root, S, code = null) {
  const ui = { link: "", qr: null, msg: "", bad: false, incoming: null, pasted: "", copied: false, undoAsk: null, sendError: "" };
  let alive = true;
  const appUrl = () => location.origin + location.pathname;

  // Code reçu par l'adresse : on le retire tout de suite de l'adresse et de l'historique.
  if (code && typeof history !== "undefined") history.replaceState(null, "", appUrl() + "#transfert");

  async function prepareSend() {
    try {
      ui.link = linkFor(await pack(S), appUrl());
      ui.qr = qrSvg(ui.link, { label: "QR code de transfert : vise-le avec l'appareil photo de l'autre appareil" });
    } catch { ui.sendError = transferError("old-browser"); }
    if (alive) draw();
  }

  async function read(text) {
    const c = codeFrom(text);
    if (!c) { ui.msg = transferError("format"); ui.bad = true; return draw(); }
    const r = await unpack(c);
    if (!alive) return;
    if (!r.ok) { ui.msg = transferError(r.error); ui.bad = true; ui.incoming = null; return draw(); }
    const next = receive(S, r.data), from = summary(next), here = summary(S);
    ui.incoming = { next, from, here, older: isOlder(from, here) }; ui.msg = ""; ui.bad = false; ui.undoAsk = null;
    draw(); root.querySelector(ui.incoming.older ? '[data-act="cancel"]' : '[data-act="import"]')?.focus({ preventScroll: true });
  }

  function doImport() {
    try { localStorage.setItem(BACKUP_KEY, backupOf(get(STORE_KEY))); } catch { ui.msg = "Impossible de garder ta progression actuelle de côté (stockage bloqué ou plein) : import annulé."; ui.bad = true; return draw(); }
    if (!save(ui.incoming.next)) { ui.msg = "Impossible d'enregistrer la progression reçue (stockage bloqué ou plein)."; ui.bad = true; return draw(); }
    location.reload(); // repartir de la sauvegarde importée sur tous les écrans
  }

  // 1er toucher : comparer « Maintenant » et « Avant l'import » ; 2e toucher : échanger.
  function askUndo() {
    const before = parseSave(get(BACKUP_KEY));
    if (!before) { ui.msg = "La copie d'avant l'import est illisible : rien n'a changé."; ui.bad = true; return draw(); }
    ui.undoAsk = { now: summary(S), before: summary(before) }; ui.incoming = null; ui.msg = "";
    draw(); root.querySelector('[data-act="undo-no"]')?.focus({ preventScroll: true });
  }
  function undo() {
    const b = get(BACKUP_KEY);
    if (!b) return;
    try { const sw = swapForUndo(get(STORE_KEY), b); localStorage.setItem(BACKUP_KEY, sw.backup); localStorage.setItem(STORE_KEY, sw.store); }
    catch { ui.msg = "Impossible de remettre l'ancienne progression (stockage bloqué)."; ui.bad = true; return draw(); }
    location.reload();
  }

  function draw() {
    if (!alive) return;
    const inc = ui.incoming, backup = !!get(BACKUP_KEY), ua = ui.undoAsk;
    render(root, html`
      <p class="row"><button class="btn ghost" data-act="home" type="button">← Profil</button></p>
      <section class="card quest"><span class="quest-title">Profil</span><h1 class="sentence">📲 Transfert</h1>
        <p class="muted small">Pour retrouver ta progression sur un autre appareil (du PC au téléphone, ou l'inverse). Rien ne passe par un serveur ; ta clé Gemini ne part jamais.</p></section>

      ${ua ? html`<section class="card" aria-live="polite"><h2>↩️ Revenir à avant l'import ?</h2>
        <table class="odds compare"><thead><tr><th></th><th scope="col">Maintenant</th><th scope="col">Avant l'import</th></tr></thead>
          <tbody>${ROWS.map(([k, label]) => html`<tr><th scope="row" class="small">${label}</th><td>${ua.now[k]}</td><td><b>${ua.before[k]}</b></td></tr>`)}</tbody></table>
        <p class="feedback error">Ce que tu as fait depuis l'import sera remplacé. Il reste gardé de côté : tu pourras encore revenir.</p>
        <p class="row start"><button class="btn" data-act="undo-yes" type="button">Revenir à avant l'import</button>
          <button class="btn ghost" data-act="undo-no" type="button">Ne rien changer</button></p></section>` : ""}

      ${backup && !inc && !ua ? html`<section class="card"><h2>↩️ Dernier import</h2>
        <p>Ta progression d'avant le dernier import est gardée de côté.</p>
        <p class="row start"><button class="btn soft" data-act="undo" type="button">Annuler l'import…</button>
          <button class="btn ghost" data-act="keep" type="button">C'est bon, oublier l'ancienne</button></p></section>` : ""}

      ${inc ? html`<section class="card" aria-live="polite"><h2>📥 Progression reçue</h2>
        <table class="odds compare"><thead><tr><th></th><th scope="col">Sur cet appareil</th><th scope="col">Reçue</th></tr></thead>
          <tbody>${ROWS.map(([k, label]) => html`<tr><th scope="row" class="small">${label}</th><td>${inc.here[k]}</td><td><b>${inc.from[k]}</b></td></tr>`)}</tbody></table>
        ${inc.older ? html`<p class="feedback error"><b>Attention :</b> la progression reçue est <b>moins avancée</b> que celle de cet appareil. C'est sans doute un ancien lien.</p>` : ""}
        <p class="feedback">La progression de cet appareil sera <b>remplacée</b> par celle reçue. Elle est gardée de côté : « Annuler l'import » la remet.</p>
        <p class="row start"><button class="btn" data-act="import" type="button">Remplacer par la progression reçue</button>
          <button class="btn ghost" data-act="cancel" type="button">Ne rien changer</button></p></section>` : ""}

      ${ui.msg ? html`<p class="feedback${ui.bad ? " error" : ""}" role="status">${ui.msg}</p>` : ""}

      <section class="card"><h2>📤 Envoyer vers un autre appareil</h2>
        <ol class="steps"><li>Sur l'autre appareil, ouvre l'appareil photo et vise ce QR code.</li>
          <li>Touche le lien qui apparaît : le Labo d'accent s'ouvre et te propose l'import.</li></ol>
        ${ui.sendError ? html`<p class="feedback error">${ui.sendError}</p>` : ui.link ? (ui.qr || html`<p class="feedback error">Ta progression est trop grande pour un QR code : envoie le lien ci-dessous.</p>`) : html`<p class="muted">Préparation…</p>`}
        ${ui.link ? html`<p class="row start"><button class="btn soft" data-act="copy" type="button">${ui.copied ? "✓ Lien copié" : "Copier le lien"}</button>
          <span class="muted small">si le QR code ne passe pas : envoie-toi ce lien (mail, message) et ouvre-le sur l'autre appareil.</span></p>
          <p class="muted small">Ce lien contient ta progression (pas ta clé) : ne le publie pas. C'est une photo de ta progression d'aujourd'hui : ce que tu fais ensuite n'y est pas.</p>` : ""}
      </section>

      <section class="card"><h2>📥 Recevoir</h2>
        <label class="field">Colle ici le lien (ou le code) reçu
          <input id="tr-input" type="text" autocomplete="off" spellcheck="false" autocapitalize="off" maxlength="13000"></label>
        <button class="btn soft" data-act="read" type="button">Lire</button>
      </section>`);
  }

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (act === "home") location.hash = "#profil";
    if (act === "read") read(root.querySelector("#tr-input")?.value || "");
    if (act === "cancel") { ui.incoming = null; ui.msg = "Rien n'a changé."; ui.bad = false; draw(); }
    if (act === "import" && ui.incoming) doImport();
    if (act === "undo") askUndo();
    if (act === "undo-yes" && ui.undoAsk) undo();
    if (act === "undo-no") { ui.undoAsk = null; ui.msg = "Rien n'a changé."; ui.bad = false; draw(); }
    if (act === "keep") { del(BACKUP_KEY); ui.msg = "Ancienne progression oubliée."; ui.bad = false; draw(); }
    if (act === "copy" && ui.link) {
      const ok = () => { ui.copied = true; draw(); };
      (navigator.clipboard ? navigator.clipboard.writeText(ui.link) : Promise.reject()).then(ok, () => { ui.msg = "Copie impossible ici : sélectionne le lien dans le champ « Recevoir » et copie-le à la main."; ui.bad = true; draw(); const i = root.querySelector("#tr-input"); if (i) { i.value = ui.link; i.select(); } });
    }
  });
  root.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "tr-input") read(e.target.value); });

  draw();
  prepareSend();
  if (code) read(code);
  return () => { alive = false; };
}
