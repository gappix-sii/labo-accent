// Point d'entrée de l'appli.
import { $ } from "./core/dom.js";
import { load } from "./core/store.js";
import { mountSay } from "./screens/say.js";

// Anti-iframe : un autre site ne peut pas afficher l'appli dans un cadre pour faire cliquer
// l'utilisateur à son insu (« clickjacking »). GitHub Pages ne permet pas d'envoyer l'en-tête
// qui l'interdit (frame-ancestors est ignoré dans une CSP en <meta>), d'où ce contrôle.
if (window.top !== window.self) {
  const p = document.createElement("p");
  p.className = "card";
  p.textContent = "Pour ta sécurité, le Labo d'accent ne s'ouvre pas dans un cadre. Ouvre-le directement dans un onglet.";
  $("#view").replaceChildren(p);
} else {
  mountSay($("#view"), load());
}
