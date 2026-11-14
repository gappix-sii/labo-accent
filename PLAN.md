# Plan — Labo d'accent (refonte V1)
_Source : PROJET.md · mis à jour le 2026-11-14_

Organisation :
- Travail sur la branche `refonte/v1`. GitHub Pages sert cette branche pendant la refonte (l'ancienne appli n'est plus en ligne) ; à la fin de la V1, fusion dans `main` et Pages remis sur `main`.
- L'ancien code est rangé dans `ancien/` : on y recycle module par module, on n'y modifie rien, et le dossier est supprimé à la fin de la V1.
- Tests : lanceur intégré de Node (`node --test`), sans aucune dépendance à installer. Lancement local : `npm start` (petit serveur `tools/serve.mjs`, sans dépendance).
- Structure cible : `index.html`, `js/core/` (stockage, dom, économie), `js/engine/` (moteur, score, g2p, voix), `js/screens/` (un fichier par écran), `js/content/` (données), `test/`.
- Chaque test sur Android = un push vers GitHub, toujours avec l'accord de l'utilisateur.

## Phase 1 — Socle et test du moteur réel (en cours)
Objectif : un écran qui écoute une phrase, la note son par son avec le **vrai modèle**, enregistre le résultat et le réaffiche après rechargement, sur PC et sur Android.
Livrable : la page « Dis cette phrase », en ligne sur GitHub Pages.
Fichiers : `ancien/` (ancien code), `package.json`, `tools/serve.mjs`, `index.html`, `js/engine/` (repris de `phonemes.js`, `g2p.js`, `integrity.js`, `sha256.js`, `worker.js`, `audio.js`, `tts.js`, `tts-worker.js`), `js/core/store.js` (neuf, clé `labo.v2`), `js/screens/say.js`, `test/`.
Critère de fin : `npm test` passe sur le PC de l'utilisateur ; le protocole de la tâche 7 est réussi sur PC et sur Android ; résultats consignés dans PROJET.md.
Risque principal : le moteur note mal, ou le téléphone ne tient pas ≈ 450 Mo (moteur + voix) → retour au cadrage (modèles espeak multilingues) avant toute autre phase.
- [x] Tâche 1 — Installer Node.js LTS et vérifier `node --version` (fait le 2026-11-14 : Node 26.13.1, npm 11.20.0, via winget, binaire signé OpenJS Foundation).
- [x] Tâche 2 — Déplacer l'ancien code dans `ancien/` ; créer `package.json` (scripts `start` et `test`) et `tools/serve.mjs` ; `npm start` affiche une page vide. (Fait le 2026-11-14 : 3 tests du serveur passent, page vérifiée dans le navigateur.)
- [x] Tâche 3 — Reprendre `phonemes.js`, `g2p.js`, `integrity.js`, `sha256.js` dans `js/engine/` avec leurs tests Node (score, alignement, liste blanche, SHA-256) ; `npm test` passe. (Fait le 2026-11-14 : 26 tests passent ; nombres en lettres isolés dans `js/engine/numbers.js` ; Whisper et Gemma retirés de la liste blanche ; dictionnaire CMU copié dans `data/`, empreinte inchangée.)
- [ ] Tâche 4 — Reprendre `worker.js` et `audio.js` ; écran unique : phrase affichée → enregistrer → résultat son par son + conseils ; dernier résultat sauvegardé et réaffiché au rechargement. Test sur PC en local.
  - Fait le 2026-11-14 : code écrit, 33 tests verts ; vrai modèle chargé et analyse de bout en bout vérifiée dans le navigateur intégré (4 cœurs, 0,3 s par analyse) ; résultat relu après rechargement.
  - **Reste (utilisateur)** : essai au vrai micro dans Chrome (`npm start`, http://localhost:8000), et vérifier qu'au 2e lancement le moteur ne se retélécharge pas (le navigateur intégré n'a pas pu le mettre en cache).
- [ ] Tâche 5 — Reprendre la voix Kokoro (bouton « écouter le modèle ») ; noter le temps de chargement.
- [ ] Tâche 6 — Basculer GitHub Pages sur `refonte/v1` (l'utilisateur), push avec accord, test sur Android : chargement, mémoire, note. Avant le push : (a) un `sw.js` à la racine qui efface le cache et se désinscrit, sinon les navigateurs qui ont déjà ouvert l'ancienne appli continuent de l'afficher ; (b) empêcher l'ancienne appli de tourner depuis `/ancien/` (sinon elle reste en ligne à cette adresse).
- [ ] Tâche 7 — Protocole du moteur : ~10 phrases, chacune dite (a) au mieux, (b) avec des fautes françaises volontaires (« ze » pour *the*, même son pour *ship/sheep*, h muet…). Réussi si les fautes volontaires sont repérées sur le bon son dans la plupart des cas et si la diction soignée obtient nettement mieux. Consigner les résultats dans PROJET.md et fermer ses questions ouvertes.

## Phase 2 — Parcours et progression
Objectif : un parcours de leçons de prononciation (contenus recyclés de `content.js` et `basics.js`), avec XP, niveaux, série de jours et objectif quotidien.
Livrable : écran d'accueil avec le parcours, la série et l'objectif du jour.
Critère de fin : finir une leçon fait gagner de l'XP et avance la série, visible après rechargement ; tests Node de la progression.
Risque principal : un format de sauvegarde mal pensé, à refaire plus tard → le fixer ici, avec un numéro de version.

## Phase 3 — Vocabulaire et écoute
Objectif : vocabulaire A1-C1 avec répétition espacée (`vocab.js`) et exercice d'écoute (voix Kokoro).
Livrable : écrans « Vocabulaire » et « Écoute ».
Critère de fin : un mot raté revient plus tôt qu'un mot réussi (test Node) ; l'écoute fonctionne sans connexion après le premier chargement.
Risque principal : algorithme de répétition trop compliqué → une version simple « à boîtes ».

## Phase 4 — Grammaire, fautes typiques, jeux de rôle
Objectif : écrans grammaire (`grammar.js`), fautes des Français (`mistakes.js`) et jeux de rôle guidés (`dialogues.js`) notés à l'oral.
Livrable : les trois écrans, reliés au parcours.
Critère de fin : chaque écran jouable de bout en bout sur PC et Android.
Risque principal : des écrans qui grossissent → un fichier par écran, environ 300 lignes au maximum.

## Phase 5 — Le jeu : compagnons, cosmétiques, boutique, coffres
Objectif : compagnons et cosmétiques (dessins de `avatar.js`), boutique avec essayage et offres du jour, coffres et boîtes à butin aux probabilités affichées, gagnés uniquement en pratiquant.
Livrable : écrans « Compagnon », « Boutique », « Coffres ».
Critère de fin : tests Node de l'économie (gains, prix, tirages conformes aux probabilités affichées) ; parcours complet joué sur PC et Android.
Risque principal : économie déséquilibrée → plafonds simples, réglables à un seul endroit.

## Phase 6 — Transfert par QR code et coach Gemini
Objectif : exporter et importer la progression (QR code ou lien) ; coach Gemini avec la clé de chacun, et avertissement sur l'usage des données par Google.
Livrable : écran « Réglages » avec transfert et coach.
Critère de fin : progression transférée du PC au téléphone ; une conversation réussie avec le coach.
Risque principal : lecture de QR code absente de Chrome sur Windows → le lien sert de solution de repli ; bibliothèque QR copiée dans `vendor/` avec empreinte vérifiée.

## Phase 7 — Hors ligne, sécurité et publication V1
Objectif : service worker (cache hors ligne), CSP stricte, `tools/build-sw.mjs`, README et SECURITY à jour ; suppression de `ancien/` ; fusion dans `main` et Pages remis sur `main`.
Livrable : la V1 installable, publiée.
Critère de fin : l'appli s'installe et fonctionne en mode avion sur Android ; relecture complète par une session neuve (`/code-review`).
Risque principal : un fichier oublié dans le cache hors ligne → `build-sw.mjs` vérifie que chaque module importé est listé.

**Phase la plus risquée : la phase 1.** Le moteur réel n'a jamais été testé ; s'il échoue, la solution de prononciation change. Elle passe donc en premier.

## Hors périmètre (V2+)
- Quêtes, boss, arène et rangs.
- Défis entre amis et classement (une fois la V1 stable).
- Séances chronométrées, verbes irréguliers, dates et nombres.
- Supprimés : IA locale Whisper + Gemma, anti-triche scellé, code secret.
