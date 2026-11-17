// Point d'entrée de l'appli : choisit l'écran selon l'adresse.
//   #accueil (par défaut) · #lecon/<id> · #vocab · #ecoute · #grammaire[/<id>] · #banc (banc de test du moteur)
import { $ } from "./core/dom.js";
import { load, onSaveError } from "./core/store.js";
import { mountHome } from "./screens/home.js";
import { mountLesson } from "./screens/lesson.js";
import { mountSay } from "./screens/say.js";
import { mountVocab } from "./screens/vocab.js";
import { mountListening } from "./screens/listening.js";
import { mountGrammarList, mountGrammar } from "./screens/grammar.js";

// Écran à afficher pour une adresse donnée. Exportée pour les tests.
export function route(hash) {
  const h = String(hash || "").replace(/^#/, "");
  const m = /^lecon\/([a-z0-9-]{1,24})$/.exec(h);
  if (m) return { screen: "lesson", id: m[1] };
  const g = /^grammaire\/([a-z0-9-]{1,24})$/.exec(h);
  if (g) return { screen: "grammar", id: g[1] };
  if (h === "grammaire") return { screen: "grammarList" };
  if (h === "banc") return { screen: "bench" };
  if (h === "vocab") return { screen: "vocab" };
  if (h === "ecoute") return { screen: "listening" };
  return { screen: "home" };
}

function start() {
  const view = $("#view");
  const S = load();
  let cleanup = () => {};
  const show = () => {
    cleanup();
    const r = route(location.hash), root = document.createElement("div");
    root.className = "screen";
    view.replaceChildren(root); // nouvel élément : les écouteurs de l'écran précédent partent avec lui
    const screens = { lesson: () => mountLesson(root, S, r.id), bench: () => mountSay(root, S), vocab: () => mountVocab(root, S), listening: () => mountListening(root, S),
      grammarList: () => mountGrammarList(root, S), grammar: () => mountGrammar(root, S, r.id), home: () => mountHome(root, S) };
    cleanup = screens[r.screen]();
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
