// Point d'entrée de l'appli : choisit l'écran selon l'adresse.
//   #accueil (par défaut, onglet Parcours) · #entrainement · #profil · #lecon/<id> · #vocab · #ecoute · #grammaire[/<id>] · #fautes · #role[/<id>] · #compagnon · #boutique · #coffres · #transfert[/<code>] · #style (page d'exemple du thème) · #banc (banc de test du moteur)
import { $ } from "./core/dom.js";
import { load, onSaveError, onStoreNotice, takeNotices, markStale, STORE_KEY, DAMAGED_KEY } from "./core/store.js";
import { mountHome } from "./screens/home.js";
import { mountLesson } from "./screens/lesson.js";
import { mountSay } from "./screens/say.js";
import { mountVocab } from "./screens/vocab.js";
import { mountListening } from "./screens/listening.js";
import { mountGrammarList, mountGrammar } from "./screens/grammar.js";
import { mountMistakes } from "./screens/mistakes.js";
import { mountRoleList, mountRole } from "./screens/roleplay.js";
import { mountSettings } from "./screens/settings.js";
import { mountChat, mountRoleFree } from "./screens/chat.js";
import { mountCompanion } from "./screens/companion.js";
import { mountShop } from "./screens/shop.js";
import { mountChests } from "./screens/chests.js";
import { watchGains } from "./screens/effects.js";
import { mountTransfer } from "./screens/transfer.js";
import { mountStyle } from "./screens/styleguide.js";
import { mountShell } from "./screens/shell.js";
import { mountTraining } from "./screens/training.js";
import { mountProfile } from "./screens/profile.js";

// Écran à afficher pour une adresse donnée. Exportée pour les tests.
export function route(hash) {
  const h = String(hash || "").replace(/^#/, "");
  const m = /^lecon\/([a-z0-9-]{1,24})$/.exec(h);
  if (m) return { screen: "lesson", id: m[1] };
  const g = /^grammaire\/([a-z0-9-]{1,24})$/.exec(h);
  if (g) return { screen: "grammar", id: g[1] };
  if (h === "grammaire") return { screen: "grammarList" };
  if (h === "fautes") return { screen: "mistakes" };
  const rf = /^role\/([a-z0-9-]{1,24})\/libre$/.exec(h);
  if (rf) return { screen: "roleFree", id: rf[1] };
  const rp = /^role\/([a-z0-9-]{1,24})$/.exec(h);
  if (rp) return { screen: "role", id: rp[1] };
  if (h === "role") return { screen: "roleList" };
  if (h === "banc") return { screen: "bench" };
  if (h === "reglages") return { screen: "settings" };
  if (h === "discussion") return { screen: "chat" };
  if (h === "compagnon") return { screen: "companion" };
  if (h === "boutique") return { screen: "shop" };
  if (h === "coffres") return { screen: "chests" };
  if (h === "transfert") return { screen: "transfer", code: null };
  if (h === "style") return { screen: "style" };
  if (h === "entrainement") return { screen: "training" };
  if (h === "profil") return { screen: "profile" };
  const tr = /^transfert\/(\d{1,3}\.[A-Za-z0-9_-]{8,12000})$/.exec(h);
  if (tr) return { screen: "transfer", code: tr[1] };
  if (h === "vocab") return { screen: "vocab" };
  if (h === "ecoute") return { screen: "listening" };
  return { screen: "home" };
}

function start() {
  const view = $("#view");
  // L'appli gère elle-même le défilement (haut de page à chaque écran, étape en cours sur la carte) :
  // sinon le navigateur remet l'ancienne position après un rechargement.
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const S = load();
  // Un autre onglet a enregistré : cette copie en mémoire est périmée (relecture complète, n° 1).
  window.addEventListener("storage", (e) => { if (e.key === STORE_KEY || e.key === null) markStale(S); });
  const banner = (id, text, withReload) => {
    if ($("#" + id)) return;
    const p = document.createElement("div");
    p.id = id; p.className = "card error banner"; p.setAttribute("role", "alert");
    p.append(document.createTextNode(text));
    if (withReload) { const b = document.createElement("button"); b.type = "button"; b.className = "btn"; b.textContent = "Recharger la page"; b.addEventListener("click", () => location.reload()); p.append(" ", b); }
    view.before(p);
  };
  const NOTICES = {
    "other-tab": ["store-other-tab", "Ta progression a été modifiée dans un autre onglet (ou par un import). Recharge cette page pour continuer ici : d'ici là, rien n'y est enregistré, pour ne pas effacer l'autre.", true],
    newer: ["store-newer", "Cette page est une ancienne version de l'appli et ta sauvegarde vient d'une version plus récente. Recharge la page pour la mettre à jour : rien n'est enregistré d'ici là.", true],
    damaged: ["store-damaged", `Ta sauvegarde était illisible : l'appli repart de zéro. Une copie de l'ancienne est gardée de côté dans ce navigateur (« ${DAMAGED_KEY} »).`, false]
  };
  const showNotice = (kind) => { const n = NOTICES[kind]; if (n) banner(...n); };
  onStoreNotice(showNotice);
  watchGains(S); // effets de jeu sur tous les écrans
  const shell = mountShell(S, $("#hud"), $("#tabs")); // barre du haut et onglets
  let cleanup = () => {};
  const show = () => {
    cleanup();
    const r = route(location.hash), root = document.createElement("div");
    root.className = "screen";
    view.replaceChildren(root); // nouvel élément : les écouteurs de l'écran précédent partent avec lui
    const screens = { lesson: () => mountLesson(root, S, r.id), bench: () => mountSay(root, S), vocab: () => mountVocab(root, S), listening: () => mountListening(root, S),
      grammarList: () => mountGrammarList(root, S), grammar: () => mountGrammar(root, S, r.id),
      mistakes: () => mountMistakes(root, S),
      roleList: () => mountRoleList(root, S), role: () => mountRole(root, S, r.id), settings: () => mountSettings(root, S), chat: () => mountChat(root, S), roleFree: () => mountRoleFree(root, S, r.id), companion: () => mountCompanion(root, S), shop: () => mountShop(root, S), chests: () => mountChests(root, S), transfer: () => mountTransfer(root, S, r.code), style: () => mountStyle(root), training: () => mountTraining(root, S), profile: () => mountProfile(root, S), home: () => mountHome(root, S) };
    cleanup = screens[r.screen]();
    shell.show(r.screen);
    window.scrollTo(0, 0);
  };
  window.addEventListener("hashchange", show);
  // Sauvegarde impossible : un bandeau reste affiché au-dessus de tous les écrans.
  onSaveError(() => {
    if ($("#save-error")) return;
    const p = document.createElement("p");
    p.id = "save-error"; p.className = "card error"; p.setAttribute("role", "alert");
    p.textContent = "Ta progression ne peut pas être enregistrée (navigation privée, ou stockage du navigateur plein ou bloqué). Elle sera perdue en fermant la page.";
    view.before(p);
  });
  takeNotices().forEach(showNotice);
  show();
}

// Anti-iframe : un autre site ne peut pas afficher l'appli dans un cadre pour faire cliquer
// l'utilisateur à son insu (« clickjacking »). GitHub Pages ne permet pas d'envoyer l'en-tête
// qui l'interdit (frame-ancestors est ignoré dans une CSP en <meta>), d'où ce contrôle.
if (typeof window !== "undefined") {
  if (window.top !== window.self) {
    const p = document.createElement("p");
    p.className = "card";
    p.textContent = "Pour ta sécurité, le Labo d'accent ne s'ouvre pas dans un cadre. Ouvre-le directement dans un onglet.";
    $("#view").replaceChildren(p);
  } else {
    start();
  }
}
