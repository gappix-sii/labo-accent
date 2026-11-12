# Sécurité et confidentialité

## Modèle de menace (ce qui est protégé, et contre quoi)

| Risque | Protection |
|---|---|
| Injection de code via un texte affiché (réponse d'IA, pseudo, sauvegarde importée, transcription) | Rendu **sûr par construction** (`js/core/dom.js`) + **Trusted Types** + CSP sans script inline |
| Fichier de modèle remplacé ou corrompu (CDN, dépôt modifié, téléchargement tronqué) | Liste blanche + **SHA-256 et taille exacte vérifiés pendant le téléchargement**, échec fermé (`js/integrity.js`) |
| Fichier de l'appli modifié sur l'hébergement ou en cache | **Pré-cache vérifié** : chaque fichier comparé à son empreinte SHA-256 avant installation (`sw.js`) |
| Sauvegarde importée piégée (types inattendus, `__proto__`, tailles énormes) | **Validation stricte** par schéma, bornes de taille, nettoyage des caractères de contrôle (`js/core/store.js`) |
| Vol de la clé Gemini dans le stockage | **Chiffrée au repos** (AES-GCM 256, clé WebCrypto non exportable, IndexedDB) ; jamais dans les sauvegardes |
| Affichage de l'appli dans un cadre par un autre site (clickjacking) | `frame-ancestors 'none'`, `X-Frame-Options: DENY` et vérification en JavaScript |
| Fuite de données vers d'autres sites | CSP `connect-src` minimale, séparée entre la page et les workers ; aucun traceur, aucun CDN |

## Données

- **Audio** : enregistré en mémoire, analysé dans un Web Worker local, jamais envoyé sur le réseau (sauf choix explicite de Gemini, voir plus bas). Le micro est coupé dès la fin de l'enregistrement.
- **Progression** : `localStorage` du navigateur uniquement. Pas de compte, pas de cookie, pas d'analytics.
- **Sauvegarde** : « Sauvegarder ma progression » télécharge un fichier JSON (sans la clé). « Restaurer » vérifie le fichier (2 Mo maximum), le nettoie champ par champ, affiche un résumé et demande confirmation.
- **Suppression** : progression, moteur, IA locale et clé se suppriment séparément, toujours avec confirmation.

## Rendu HTML sûr et Trusted Types

- Tout le HTML de l'interface passe par le gabarit `html\`…\`` : **chaque valeur interpolée est échappée**. Seuls les fragments créés par ce même gabarit sont insérés tels quels ; il n'existe aucune fonction pour marquer une chaîne quelconque comme « sûre ».
- Chaque gabarit est analysé une fois : interpoler dans un nom de balise, dans un attribut sans guillemets, ou dans un attribut dangereux (`on*`, `style`, `href`, `src`, `srcdoc`, `action`…) lève une erreur. Dans une balise, seuls des noms d'attributs simples (`checked`, `disabled`…) sont acceptés.
- La CSP impose `require-trusted-types-for 'script'; trusted-types labo` : le navigateur refuse toute écriture HTML ou URL de script qui ne passe pas par la politique `labo`, privée au module de rendu. Les URL de script autorisées se limitent à `sw.js` et `js/*.js` de la même origine.
- Les styles dynamiques (barres de progression…) passent par des variables CSS validées, jamais par un attribut `style`.
- Les réponses des IA sont traitées comme des données non fiables : chaînes uniquement, longueurs bornées, toujours affichées échappées.

Vérifié par les tests : aucune violation CSP ou Trusted Types sur l'ensemble des écrans, une écriture HTML brute est bien bloquée, et une sauvegarde contenant `<img onerror>`, `<script>` ou `__proto__` est neutralisée.

## Téléchargement des modèles : liste blanche et SHA-256

Dans les workers, `fetch` est remplacé par une version contrôlée (`js/integrity.js`) :

- seul `https://huggingface.co/<dépôt>/resolve/<révision>/<fichier>` est accepté, pour les 4 dépôts et révisions figés ci-dessous ; tout autre site ou révision est refusé (une vérification d'existence faite par la bibliothèque sur `main` est redirigée vers la révision figée, jamais vers `main`) ;
- un fichier qui n'est pas dans la liste reçoit une réponse 404 ;
- chaque gros fichier est **haché en flux** (SHA-256) et compté pendant le téléchargement : s'il dépasse la taille prévue, le flux s'arrête aussitôt ; s'il ne correspond pas à la fin, le flux échoue, **rien n'est mis en cache** et le moteur ne démarre pas ;
- les petits fichiers de configuration (JSON, gabarit de conversation) sont limités en taille et figés par la révision Git ;
- requêtes sans cookie ni référent.

| Dépôt (révision figée) | Fichiers vérifiés par SHA-256 |
|---|---|
| `robg/speako-phoneme-recognizer@ad0f63cd58fc1bb1e9c261a3b4135997a31c2e58` | `onnx/model_quantized.onnx` (355 Mo) |
| `onnx-community/whisper-base.en@51eefc0af78b103839eda9e7e4f4186acc6517fe` | `onnx/encoder_model.onnx`, `onnx/decoder_model_merged_q4.onnx` |
| `onnx-community/gemma-3-1b-it-ONNX@a58439f40017d3b99c7d378ff525e54e0ba08ebf` | `tokenizer.json`, `onnx/model_q4f16.onnx(+_data)`, `onnx/model_q4.onnx(+_data)` |
| `onnx-community/Kokoro-82M-v1.0-ONNX@1939ad2a8e416c0acfeecc08a694d14ef25f2231` | `onnx/model_quantized.onnx` (92 Mo, voix naturelle) |

Les empreintes sont les `oid sha256` des pointeurs Git LFS de ces révisions (liste complète dans `js/integrity.js`).

## Appli vérifiée fichier par fichier (service worker)

- `node tools/build-sw.mjs` calcule l'empreinte SHA-256 et la taille de chaque fichier de l'appli et les écrit dans `sw.js`. L'outil refuse de continuer si une bibliothèque de `vendor/` a changé ou si un module importé manque.
- À l'installation, le service worker télécharge chaque fichier (sans cache HTTP) et le compare à son empreinte. **Une seule différence et la nouvelle version n'est pas installée** ; l'ancienne reste en place, intacte.
- Ensuite l'appli est servie depuis ce cache vérifié (hors ligne, versions toujours cohérentes). Une mise à jour s'applique au lancement suivant, jamais au milieu d'un exercice.
- Le service worker ne modifie jamais les requêtes vers d'autres sites.

Testé : fichier modifié après calcul des empreintes → installation refusée ; nouvelle version valide → installée puis appliquée ; seules requêtes externes observées : Hugging Face à la révision figée.

## Politique de sécurité du contenu (CSP)

Document (balise `<meta>` dès le premier chargement, puis en-tête HTTP via le service worker) :

```
default-src 'self'; script-src 'self'; worker-src 'self';
connect-src 'self' https://generativelanguage.googleapis.com;
img-src 'self'; media-src 'self' blob:; style-src 'self'; font-src 'self'; manifest-src 'self';
object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';
require-trusted-types-for 'script'; trusted-types labo
```

Workers (en-tête HTTP) :

```
default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self';
connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co; object-src 'none'; base-uri 'none'
```

- Séparation des rôles : la page ne peut pas contacter Hugging Face, les workers ne peuvent pas contacter Google.
- Aucun script inline, aucun `eval` ; WebAssembly autorisé seulement dans les workers.
- Aucun CDN : bibliothèques et polices copiées dans `vendor/` et `fonts/`.

Autres en-têtes : `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp` (isolation, calcul multi-cœurs), `Cross-Origin-Resource-Policy: same-origin`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Permissions-Policy: microphone=(self), camera=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), display-capture=()`.

## Voix naturelle (optionnelle)

- Modèle **Kokoro-82M** (Apache 2.0) exécuté **sur l'appareil** dans un worker séparé : le texte à lire n'est jamais envoyé sur internet.
- Téléchargé **uniquement** quand l'utilisateur appuie sur « Activer la voix naturelle » (≈ 92 Mo, SHA-256 et taille exacte vérifiés). Aux visites suivantes, il n'est préparé que s'il est déjà dans le cache : jamais de retéléchargement silencieux.
- Les 3 voix (`data/voices/*.bin`, 510 Ko chacune) viennent du dépôt officiel `github.com/hexgrad/kokoro` (commit `dfb907a`), identiques octet pour octet aux fichiers `voices/*.bin` du dépôt Hugging Face `onnx-community/Kokoro-82M-v1.0-ONNX` (mêmes SHA-256 et tailles, vérifié le 12/11/2026), sont livrées avec l'appli et vérifiées par le service worker (empreintes figées dans `tools/build-sw.mjs`) ; taille exacte recontrôlée dans le worker.
- Le texte est converti en phonèmes avec le dictionnaire CMU déjà présent (`js/g2p.js`) : aucun moteur supplémentaire (pas d'espeak-ng) n'est ajouté.
- En cas d'échec (mémoire, navigateur), la voix de l'appareil prend le relais automatiquement. Bouton « Supprimer la voix naturelle » dans Réglages → Données.

## Conversation libre et coach (optionnels)

- **IA locale** (Whisper base.en + Gemma 3 1B, ≈ 1 Go vérifié par SHA-256) : audio et texte restent sur l'appareil.
- **Gemini** : uniquement si l'utilisateur choisit ce moteur et colle **sa propre clé**. Aucune clé dans le dépôt.
  - Clé **chiffrée** (AES-GCM 256) avec une clé WebCrypto **non exportable** gardée dans IndexedDB ; jamais en clair sur le disque, jamais dans les sauvegardes. Option « ne pas mémoriser » : clé gardée seulement en mémoire. L'ancienne copie en clair (versions précédentes) est chiffrée puis effacée automatiquement.
  - Envoyée seulement à `generativelanguage.googleapis.com`, dans l'en-tête `x-goog-api-key`, sans cookie, sans redirection, avec un référent réduit à l'origine du site (`strict-origin`) : cela permet de **restreindre la clé à ce site** dans Google Cloud (restriction « Sites Web » `https://<ton-site>/*` et API « Generative Language » uniquement).
  - Nom du modèle validé (lettres minuscules, chiffres, points, tirets), délai maximal de 45 s.
  - L'audio (WAV 16 kHz) et le texte de la conversation sont envoyés à Google ; avec l'offre gratuite, Google peut les utiliser pour améliorer ses produits.
- **Mémoire du coach** : notes courtes et mots appris, produits par l'IA, donc traités comme non fiables : texte nettoyé (caractères de contrôle et bidi retirés), longueur bornée (160 caractères, 30 notes, 60 mots), toujours affiché échappé. Une note qui ressemble à une donnée sensible (longue suite de chiffres, e-mail, lien, mot de passe, carte, IBAN) est refusée. Les notes sont réinjectées dans la consigne comme **données**, et le texte libre de l'utilisateur y est inséré en JSON. Tout est visible et effaçable (note par note ou « Tout oublier ») ; avec Gemini, les notes partent chez Google avec les messages, avec l'IA locale elles ne quittent pas l'appareil.
- **Mains libres** : le micro ne se relance qu'après la fin complète de la réponse parlée, et s'arrête si rien n'est entendu.

## Boîtes à butin (jeu responsable)

- Payées **uniquement avec les pièces du jeu**, gagnées en apprenant : il n'existe aucun achat avec de l'argent réel dans l'appli.
- Les probabilités affichées sont exactement celles du tirage (`BOXES` dans `js/meta.js`), vérifiées par un test sur 200 000 tirages.
- Garantie : au plus 10 boîtes pour un objet légendaire ou mythique ; doublons convertis en pièces.
- Tirage par `crypto.getRandomValues`, résultat enregistré avant l'animation (fermer la fenêtre ne fait rien perdre).

## Monnaie et Shop : anti-triche

Objectif : que les pièces récompensent la vraie progression, et qu'on ne puisse pas s'en donner à la main.

- **Une seule porte** : toutes les pièces passent par `credit()` / `debit()` (`js/core/economy.js`), qui tiennent un journal (gagné, dépensé, 60 dernières opérations). Le solde ne peut jamais dépasser « gagné − dépensé ».
- **Sceau de la sauvegarde** (`js/core/seal.js`) : chaque enregistrement est signé en HMAC-SHA-256 avec une clé WebCrypto **non exportable** gardée dans IndexedDB. Modifier `localStorage` à la main, supprimer le sceau ou importer un fichier trafiqué est détecté au démarrage ou à l'import.
- **Contrôle de cohérence** (`audit`) pour toute sauvegarde non scellée : jours d'activité ni futurs ni antérieurs à l'appli, XP et trophées bornés par jour d'activité, pièces bornées par ce que la progression peut rapporter, exclusivités limitées au nombre de boîtes ouvertes, objets de la boutique limités à ce qui a été payé ou gagné dans un coffre. Les bornes sont larges : un joueur honnête n'est jamais pénalisé (testé).
- **Export / import** : le fichier exporté porte le sceau de l'appareil ; réimporté sur le même appareil, il est repris tel quel, sinon il passe par le contrôle de cohérence.
- **Prix** : toujours recalculés par l'appli (catalogue, offre du jour), jamais lus dans la page ; niveau requis et possession vérifiés à l'achat ; tirages des coffres et boîtes avec `crypto.getRandomValues`.
- **Anti-farm** : la même activité rejouée le même jour rapporte 100 %, puis 60 %, 35 % et 20 % ; les pièces d'entraînement (XP, séances, chrono, boss) sont plafonnées à 220 par jour. Les **pièces de progrès** ne sont jamais réduites : nouvelle leçon (+20), nouvelle étoile (+15), record (+5), mot appris (+2), nouveau dialogue ou nouvelle règle (+20), record au chrono (+20), plus quêtes, niveaux et succès.
- **Horloge** : l'heure utilisée ne recule jamais (la plus tardive déjà vue), et elle est recalée sur l'en-tête `Date` du serveur quand l'appareil est décalé de plus de 5 minutes. Changer l'heure ne fait donc pas revenir quêtes, offres ou défi du jour.
- **Raccourcis de test** (`?test`, `&accept`, rareté forcée) : actifs uniquement sur `127.0.0.1` / `localhost`, jamais sur le site publié (testé dans `test/run-cheat.mjs`).

## Amis, classement et défis (sans serveur)

- **Aucun serveur, aucun compte** : les joueurs s'envoient eux-mêmes des liens (SMS, messagerie). Le code est dans le fragment `#c=…` de l'adresse, qui n'est jamais envoyé à GitHub ; l'appli le lit puis l'efface de la barre d'adresse.
- **Contenu d'une carte** : pseudo, compagnon et cosmétiques, niveau, XP, série, trophées et quelques compteurs. Jamais d'e-mail, de clé, d'historique ni de sauvegarde.
- **Signature** : chaque carte, défi et résultat est signé en ECDSA P-256 par une clé générée sur l'appareil (clé privée **non exportable**, dans IndexedDB). Un code modifié, même d'un caractère, est refusé.
- **Anti-usurpation** : la clé publique d'un ami est retenue à son premier ajout ; une carte à son nom signée par une autre clé déclenche un avertissement (autre appareil ou imposteur) et rien n'est remplacé sans accord.
- **Données reçues = données non fiables** : chaque champ est validé (identifiants, longueurs, caractères de contrôle retirés, espèce, couleur et objets existants et à la bonne place, nombres bornés) ; les champs inconnus sont ignorés ; l'affichage passe par l'échappement `html```.
- **Défis** : mêmes questions grâce à une graine partagée ; un défi reçu ne se joue qu'une fois ; les duels rapportent l'XP normale (avec les règles anti-farm), pas de bonus à farmer.
- Limite : sans serveur, un joueur qui maîtrise les outils du navigateur peut gonfler ses propres chiffres avant de partager sa carte. Les cartes de tes amis reflètent le jour où ils te les ont envoyées.

## Dépendances (vérifiées)

| Fichier | Origine | Version | SHA-256 |
|---|---|---|---|
| `vendor/transformers.min.js` | npm `@huggingface/transformers` (Apache-2.0) | 4.3.2 | `8b5a3171f8876bab2b1820a7d65eb87628e3d30bb5ea85b9dd398e76eb34decb` |
| `vendor/ort-wasm-simd-threaded.asyncify.mjs` | npm `onnxruntime-web` (MIT) | 1.31.0-dev.20260914 | `0966b6105cd936744498aa60df7a22cbd47af3374dbc64a9ab561c08a71e3611` |
| `vendor/ort-wasm-simd-threaded.asyncify.wasm` | npm `onnxruntime-web` (MIT) | 1.31.0-dev.20260914 | `49871f5a4409519797e127440868a6d1923339d9185907f301a5b2a1d90af082` |
| `data/cmudict.json` | npm `cmu-pronouncing-dictionary` (dictionnaire CMU, BSD) | 3.0.0 | `ca8e790ec08466b37153a35576e2ac3ede1dfe3b1a16ccdb7605deef4add654b` |
| `data/voices/af_heart.bin` | `github.com/hexgrad/kokoro` `kokoro.js/voices` (Apache-2.0) | commit `dfb907a` | `d583ccff3cdca2f7fae535cb998ac07e9fcb90f09737b9a41fa2734ec44a8f0b` |
| `data/voices/af_bella.bin` | idem | commit `dfb907a` | `f69d836209b78eb8c66e75e3cda491e26ea838a3674257e9d4e5703cbaf55c8b` |
| `data/voices/am_michael.bin` | idem | commit `dfb907a` | `1d1f21dd8da39c30705cd4c75d039d265e9bc4a2a93ed09bc9e1b1225eb95ba1` |
| `fonts/*.woff2` | npm `@fontsource/barlow-condensed`, `@fontsource/nunito` (OFL-1.1) | 5.3.0 | dans `sw.js` |

- Paquets installés avec `npm install --ignore-scripts` (aucun script d'installation exécuté) ; `npm audit` : 0 vulnérabilité au moment de la construction.
- Vérifier soi-même : `sha256sum vendor/* data/cmudict.json`, ou `node tools/build-sw.mjs` qui échoue si une empreinte a changé.

## Limites (honnêtes)

- GitHub Pages ne permet pas de définir d'en-têtes HTTP : au tout premier chargement, avant l'activation du service worker, seule la CSP en `<meta>` s'applique (Trusted Types compris) ; `frame-ancestors` est alors remplacé par la vérification JavaScript.
- Trusted Types n'est appliqué que par les navigateurs qui le gèrent ; ailleurs, l'échappement systématique reste la protection.
- Le chiffrement de la clé protège le stockage (lecture du disque, extension qui fouille `localStorage`, sauvegarde) ; il ne protégerait pas contre un script exécuté dans la page, cas que la CSP et Trusted Types empêchent.
- Les modèles déjà téléchargés avant cette version restent dans le cache du navigateur sans nouvelle vérification ; « Supprimer le moteur » puis le retélécharger applique la vérification.
- Anti-triche sans serveur : le sceau et le contrôle de cohérence arrêtent les triches faciles (modifier la sauvegarde, trafiquer un fichier, changer l'heure). Quelqu'un qui maîtrise les outils de développement peut encore exécuter du code dans la page ; seul un serveur de confiance (classements entre amis, par exemple) l'empêcherait. Et le contrôle laisse une marge : une sauvegarde gonflée est ramenée au maximum crédible pour sa progression, pas forcément à zéro.
