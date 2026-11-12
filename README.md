# Labo d'accent

Appli gratuite d'entraînement à la prononciation anglaise pour francophones, inspirée d'ELSA Speak.
Tu lis une phrase, l'appli reconnaît **chaque son** que tu prononces, le compare à la prononciation attendue
(dictionnaire CMU, anglais américain) et colore chaque mot : vert (bien), orange (presque), rouge (à corriger),
avec un conseil en français pour chaque son raté.

Tout se passe **dans ton navigateur** : aucun serveur, aucun abonnement, et ta voix n'est jamais envoyée sur internet.
Le tout façon jeu vidéo : compagnons à personnaliser, coffres, quêtes, boss et arène.

## Fonctions

- **Compagnons** : 9 animaux originaux à débloquer avec les niveaux (putois, renard, chat, lapin, panda, pingouin, hibou, axolotl, bébé dragon légendaire), 5 couleurs chacun en boutique, 84 accessoires sur 6 emplacements (tête, yeux, cou, main, dos, aura animée) de rareté commune à mythique, et un nom à choisir. Les objets tenus sont dans une patte, ceux du cou passent sous le menton ; `tools/sheet.html` affiche chaque accessoire sur chaque animal pour vérifier qu'ils vont bien ensemble.
- **Shop** (onglet dédié, ou le **+** à côté des pièces) : boîtes à butin en tête, 3 **offres du jour à −30 %** renouvelées à minuit, catalogue par catégorie (tenues, tête, yeux, cou, main, dos, aura, thèmes, bonus) et **essayage** sur ton compagnon avant d'acheter. Les pièces récompensent surtout la **progression** (nouvelle leçon, nouvelles étoiles, records, mots appris) ; rejouer la même chose le même jour rapporte de moins en moins, et les pièces d'entraînement sont plafonnées à 220 par jour. Sauvegarde scellée contre la triche (voir SECURITY.md). 11 thèmes d'appli dont un clair.
- **Profil** inspiré des meilleures applis : grand en-tête avec ton compagnon, puis 3 onglets. **Profil** (statistiques, calendrier d'activité sur 12 semaines, records personnels, étagère de succès, collection), **Amis** (ajouter un ami, tes amis avec leur compagnon, accès au classement) et **Réglages** (pseudo, sons, voix, sécurité, sauvegarde).
- **Amis, classement et défis** (Profil → Amis, ou Arène → Mes amis), sans serveur ni compte : partage ta carte joueur par un lien (ton compagnon avec ses cosmétiques et tes progrès), ajoute un ami en ouvrant ou collant son lien, classement entre amis (XP, série, trophées, défi du jour, verbes), profil de l'ami, et **duels** (défi chrono ou Verb Rush avec exactement les mêmes questions, résultat renvoyé par lien). Codes signés par l'appareil, voir SECURITY.md.
- **Boîtes à butin** (classique 100, épique 260, mythique 600 pièces) : 5 raretés de Commun à **Mythique**, probabilités affichées (ce sont les vraies), légendaire ou mieux garanti au moins toutes les 10 boîtes, doublons convertis en pièces. **25 exclusivités** introuvables ailleurs : 9 skins à effets animés (holographique, spectral, néon, lave, cristal…), 15 accessoires (sabre laser, couronne de feu, ailes de phénix, aurore boréale…) et le thème Galaxie. Ouverture animée : la boîte tremble et change de couleur palier par palier jusqu'à la rareté obtenue, puis une révélation différente pour chaque rareté (onde de choc, rayons, éclair blanc, confettis, son et vibration). Jamais d'argent réel.
- **Coffres** (bois, argent, or, légendaire) avec animation d'ouverture ; gagnés en montant de niveau, avec les quêtes, les boss et les rangs.
- **Quêtes du jour** : 3 défis différents chaque jour, un coffre si les trois sont faites.
- **Boss** : un boss garde la fin de chaque unité ; une phrase bien prononcée lui fait des dégâts (coup critique au-dessus de 95), une phrase ratée coûte une vie. Victoire : couronne, coffre d'or, trophées.
- **Arène** : défi chrono de 60 secondes (vocabulaire, grammaire, fautes à repérer) avec combos multiplicateurs et records ; **défi du jour** identique pour tout le monde, score à partager entre amis ; **rangs** de Bronze à Légende.
- **Animations** partout (transitions, pièces qui volent, confettis, niveau supérieur, compagnon qui cligne des yeux et remue la queue), désactivables ; vibrations sur téléphone ; un code secret pour les gamers.
- **Conversation libre avec l'IA** (onglet Pratique) : 11 situations réelles (se présenter, où sont les toilettes, restaurant, taxi, médecin…) ou ta propre situation ; tu réponds librement à l'oral ou à l'écrit, l'IA joue le rôle et corrige chaque phrase. Deux moteurs au choix : **IA locale** (Gemma 3 1B + Whisper dans le navigateur, gratuite et privée, PC avec WebGPU, ≈ 1 Go vérifié par SHA-256) ou **Gemini** (clé gratuite Google de chaque utilisateur, meilleure qualité, marche sur téléphone).
- **Verbes irréguliers** (onglet Apprendre → Verbes) : les 67 plus utiles, rangés en 9 familles de sons (stars du quotidien, rien ne change cut-cut-cut, -ought, -t, passé = participe, i-a-u sing-sang-sung, retour au début come-came-come, -ew/-own, participe en -en), comme le recommandent la plupart des méthodes. Pour chaque verbe : les 3 formes, le sens, la prononciation à la française, le piège, l'écoute normale et lente, et 2 phrases de contexte (prétérit et present perfect). Fiches avec colonne à cacher, et 4 jeux : **Trio** (memory : retrouver les 3 formes d'un verbe), **Verb Rush** (60 s de phrases à trous, la faute « goed » en piège), **Écris la forme** (compléter au clavier) et les phrases au micro. Répétition espacée par verbe.
- **Thèmes** (onglet Apprendre) : **mots-questions** (what, who, where, when, why, how, which, whose, les questions avec how much/many/old/long/often/far, les questions de tous les jours), chacun avec un exemple à écouter et un jeu « remets la question dans l'ordre » ; jours de la semaine, mois et saisons, nombres de 0 à un million, ordinaux et dates (1st, 2nd, « the first of May », années). Chaque mot a sa prononciation écrite à la française (syllabe accentuée en majuscules), la phonétique, l'écoute normale et lente, et le piège à connaître (thirteen ≠ thirty, Wednesday, July…). Cartes à dire au micro, quiz d'écoute, **dictée de nombres** (on entend, on écrit en chiffres) et phrases à prononcer.
- **Grammaire** (onglet Apprendre) : 24 règles de A1 à B2, chacune avec la règle en français, des exemples à écouter, le piège typique des francophones, puis 4 à 5 exercices progressifs (choisir la bonne forme, corriger une phrase, remettre les mots dans l'ordre) et la phrase à prononcer.
- **Fautes à éviter** : 46 fautes typiques des Français (grammaire, faux amis, prépositions, expressions), en quiz avec répétition espacée.
- **Conversation** (onglet Pratique) : 10 jeux de rôle guidés (café, hôtel, dîner en amoureux, pharmacie, vol annulé, support informatique…) avec tâches à accomplir et indices ; Pouf joue le personnage, tu réponds au micro et chaque réponse est notée son par son. Exercice d'écoute : entends le dialogue et touche les mots reconnus.
- **Séances chronométrées** de 15, 30, 45 min ou 1 h : Pouf compose un programme (vocabulaire, leçon du parcours, son faible, paires minimales, révision) avec minuteur.
- **Vocabulaire par niveau du CECRL** (A1 à C1, environ 500 mots) : cartes français → anglais à dire au micro, répétition espacée.
- **Parcours façon jeu** : 9 unités (Se présenter, En couple, Voyager, Raconter, Au travail, Sortir, Santé et imprévus, Loisirs et opinions, Au téléphone), 49 leçons à débloquer, de 1 à 3 étoiles par leçon, révisions des phrases ratées.
- **Ton compagnon** (Pouf le putois au départ) : il t'encourage, réagit à chaque essai et parle à voix haute (désactivable).
- **XP, niveaux, combo, série de jours, objectif quotidien et 13 badges** ; sons et confettis (désactivables).
- Analyse **son par son** : chaque mot en vert, orange ou rouge, conseil en français pour chaque son raté, écoute du modèle (normal ou lent) et de ta propre voix, mot par mot.
- **Entraînement libre** : toutes les phrases, paires minimales (ship / sheep…), 12 sons difficiles, et ta propre phrase.
- **Mes sons** : ta réussite sur chaque son anglais.
- Installable sur l'écran d'accueil du téléphone, fonctionne hors ligne une fois le moteur téléchargé.

## Mise en ligne gratuite sur GitHub Pages (10 minutes)

> Le fichier `vendor/ort-wasm-simd-threaded.asyncify.wasm` fait 27 Mo : l'envoi par glisser-déposer sur le site
> GitHub est limité à 25 Mo par fichier. Utilise donc `git` (ou GitHub Desktop).

1. Crée un dépôt **public** vide sur GitHub, par exemple `labo-accent` (GitHub Pages gratuit exige un dépôt public).
2. Dans un terminal, dans le dossier décompressé :
   ```bash
   git init
   git add .
   git commit -m "Labo d'accent"
   git branch -M main
   git remote add origin https://github.com/TON-PSEUDO/labo-accent.git
   git push -u origin main
   ```
3. Sur GitHub : **Settings → Pages → Build and deployment → Source : Deploy from a branch**,
   branche `main`, dossier `/ (root)`, puis **Save**.
4. Après une à deux minutes, l'appli est en ligne sur `https://TON-PSEUDO.github.io/labo-accent/`.
5. Ouvre ce lien sur ton PC puis sur ton téléphone. Sur le téléphone : menu du navigateur → **Ajouter à l'écran d'accueil**.

Au premier lancement, appuie sur **Préparer le moteur** : le modèle (≈ 355 Mo) se télécharge une seule fois, en Wi-Fi de préférence, et chaque fichier est vérifié avant usage.

**Avant chaque publication**, lance `node tools/build-sw.mjs` : il calcule l'empreinte de chaque fichier pour le service worker (sans cela, la vérification hors ligne reste en mode développement).

## Utilisation en local (sans GitHub)

```bash
python3 -m http.server 8000
```
puis ouvre `http://localhost:8000` dans Chrome. (Le micro exige `https` ou `localhost`.)

## Limites honnêtes

- Le score mesure si chaque son ressemble à la prononciation de référence (anglais américain). Un accent
  britannique correct peut être un peu pénalisé sur certains mots.
- Le modèle ne mesure pas encore l'accent tonique ni l'intonation.
- Sur un téléphone ancien (moins de 4 Go de mémoire), l'analyse peut être lente ou échouer : utilise alors le PC.
- La voix « modèle » est celle de ton appareil (synthèse vocale du système) : sa qualité dépend du téléphone ou du PC.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html`, `css/app.css`, `js/app.js` | Interface et écrans principaux |
| `js/core/dom.js` | Rendu HTML sûr (échappement automatique, Trusted Types) |
| `js/core/store.js` | Progression : validation stricte, sauvegarde et restauration |
| `js/core/secret.js` | Clé Gemini chiffrée (AES-GCM, clé non exportable) |
| `js/integrity.js`, `js/sha256.js` | Liste blanche et vérification SHA-256 des modèles téléchargés |
| `js/avatar.js`, `js/art.js` | Compagnons, accessoires, thèmes, boss, coffres, emblèmes (SVG originaux) |
| `js/meta.js` | Pièces, quêtes, coffres, rangs, gel de série, boss, défi chrono |
| `js/views/locker.js`, `js/views/lootbox.js`, `js/views/arena.js`, `js/chrono.js` | Mon compagnon et Shop (offres, essayage), boîtes à butin, arène et défi chrono |
| `js/audio.js` | Micro, détection de fin de parole, conversion 16 kHz, synthèse vocale |
| `js/worker.js` | Moteur de prononciation, dans un thread séparé |
| `js/phonemes.js` | Dictionnaire → sons, décodage CTC, alignement, score, conseils |
| `js/content.js`, `js/vocab.js`, `js/dialogues.js`, `js/grammar.js`, `js/mistakes.js`, `js/scenes.js` | Contenus |
| `js/game.js` | Parcours, XP, niveaux, étoiles, badges, séances, répétition espacée |
| `js/chat-worker.js` | IA locale : Whisper + Gemma 3 1B (WebGPU) |
| `js/mascot.js`, `js/fx.js` | Répliques du compagnon, sons synthétisés et effets |
| `fonts/` | Polices auto-hébergées (Barlow Condensed, Nunito) |
| `sw.js` | Hors ligne vérifié par empreintes et en-têtes de sécurité |
| `vendor/` | Bibliothèques auto-hébergées (aucun CDN) |
| `data/cmudict.json` | Dictionnaire de prononciation CMU |
| `test/`, `tools/` | Tests et scripts de construction |

Voir `SECURITY.md` pour les choix de sécurité et `NOTICE.md` pour les licences.
