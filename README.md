# Labo d'accent

Appli gratuite d'entraînement à la prononciation anglaise pour francophones, inspirée d'ELSA Speak.
Tu lis une phrase, l'appli reconnaît **chaque son** que tu prononces, le compare à la prononciation attendue
(dictionnaire CMU, anglais américain) et colore chaque mot : vert (bien), orange (presque), rouge (à corriger),
avec un conseil en français pour chaque son raté.

Tout se passe **dans ton navigateur** : aucun serveur, aucun abonnement, et ta voix n'est jamais envoyée sur internet.

## Fonctions

- **Séances chronométrées** de 15, 30, 45 min ou 1 h : Pouf compose un programme (vocabulaire, leçon du parcours, son faible, paires minimales, révision) avec minuteur.
- **Vocabulaire par niveau du CECRL** (A1 à C1, environ 500 mots) : cartes français → anglais à dire au micro, répétition espacée.
- **Parcours façon jeu** : 9 unités (Se présenter, En couple, Voyager, Raconter, Au travail, Sortir, Santé et imprévus, Loisirs et opinions, Au téléphone), 49 leçons à débloquer, de 1 à 3 étoiles par leçon, révisions des phrases ratées.
- **Pouf**, le putois coach au casque orange : il t'encourage, réagit à chaque essai et parle à voix haute (désactivable).
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

Au premier lancement, appuie sur **Préparer l'analyse** : le modèle (≈ 360 Mo) se télécharge une seule fois, en Wi-Fi de préférence.

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
| `index.html`, `css/app.css`, `js/app.js` | Interface |
| `js/audio.js` | Micro, détection de fin de parole, conversion 16 kHz, synthèse vocale |
| `js/worker.js` | Chargement du modèle et inférence, dans un thread séparé |
| `js/phonemes.js` | Dictionnaire → sons, décodage CTC, alignement, score, conseils |
| `js/content.js` | Phrases et leçons |
| `js/game.js` | Parcours, XP, niveaux, étoiles, badges, séances, répétition espacée |
| `js/vocab.js` | Vocabulaire A1 à C1 |
| `js/mascot.js` | Pouf (dessin, humeurs, répliques) |
| `js/fx.js` | Sons synthétisés et confettis |
| `fonts/` | Polices auto-hébergées (Barlow Condensed, Nunito) |
| `sw.js` | Hors ligne et en-têtes de sécurité |
| `vendor/` | Bibliothèques auto-hébergées (aucun CDN) |
| `data/cmudict.json` | Dictionnaire de prononciation CMU |
| `test/`, `tools/` | Tests et scripts de construction |

Voir `SECURITY.md` pour les choix de sécurité et `NOTICE.md` pour les licences.
