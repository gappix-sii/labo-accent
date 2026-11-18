# Labo d'accent

## Résumé
- Problème : apprendre à **parler** anglais (niveau A1-A2 aujourd'hui) pour discuter avec ma copine et voyager, sans payer d'abonnement.
- Pour qui : moi, et moins de 10 amis avec qui je partage l'appli.
- Fonctionnalités : prononciation notée son par son, parcours de leçons, vocabulaire, grammaire, fautes typiques des Français, jeux de rôle, coach IA ; le tout dans un vrai jeu (compagnons, nombreux cosmétiques, boutique, boîtes à butin).
- Pistes techniques : appli web installable (PWA), tout dans le navigateur, hébergée sur GitHub Pages.

## État actuel
_Audit du 2026-11-14 — dépôt gappix-sii/labo-accent_
- Stack en place : HTML/CSS/JavaScript sans framework, Transformers.js (moteur `robg/speako-phoneme-recognizer`, ≈ 355 Mo), dictionnaire CMU, voix Kokoro, Whisper + Gemma 3 1B en local, Gemini en option.
- Santé : 20 commits en 3 jours (dernier le 2026-11-12), écrits par Claude ; ≈ 11 000 lignes, dont `js/app.js` de 2 300 lignes ; tests nombreux mais impossibles à lancer en local (chemins de l'espace de travail de Claude, pas de package.json) ; **jamais testé avec le vrai moteur**.
- Forces : sécurité soignée (CSP stricte, modèles vérifiés par SHA-256, aucun CDN, voix jamais envoyée), contenus riches, dessins originaux des compagnons.
- Dette et risques : périmètre qui a beaucoup grossi (arène, boss, amis, anti-triche…), code monolithique, moteur peu réputé (0 « j'aime », entraîné sur TIMIT).

## Contexte
- Utilisateurs : moi + moins de 10 amis, sans comptes.
- Appareils : PC Windows (Chrome) et téléphone Android.
- Budget : 0 € ; pas de serveur.
- Accent de référence : américain.
- Code : Claude code tout, je teste dans l'appli.
- Échéance : aucune ; une base propre passe avant la vitesse.
- Objectif : m'amuser et progresser vraiment à l'oral.
- Priorités de jeu : compagnons + cosmétiques, coffres et boîtes à butin.
- Synchronisation : chaque appareil garde sa progression, transfert par QR code ou lien.

## Périmètre V1
- Dans la V1 :
  - moteur de prononciation vérifié avec le vrai modèle (PC et Android) ;
  - parcours de leçons, vocabulaire A1-C1 avec répétition espacée, grammaire, fautes typiques, jeux de rôle guidés et exercice d'écoute ;
  - compagnons, cosmétiques, boutique (essayage, offres du jour), coffres et boîtes à butin (probabilités affichées, gagnées uniquement en pratiquant) ;
  - XP, niveaux, série de jours, objectif quotidien ;
  - transfert de progression par QR code ;
  - coach Gemini avec la clé de chacun (optionnel, avertissement sur l'usage des données par Google).
- Plus tard (V2+) :
  - quêtes, boss, arène et rangs (non prioritaires pour moi) ;
  - défis entre amis et classement (à faire une fois la V1 stable) ;
  - séances chronométrées, verbes irréguliers, dates et nombres (contenus secondaires).
- Supprimé : IA locale Whisper + Gemma (≈ 1 Go, remplacée par Gemini), anti-triche scellé (inutile entre amis), code secret.

## Décisions
_Mises à jour le 2026-11-17_

| Sujet | Choix | Pourquoi | Alternatives écartées |
|---|---|---|---|
| Voie | Reconstruire dans le même dépôt en recyclant contenus, dessins, vérification des modèles et score | Code jamais testé en réel, monolithique, tests inutilisables | Continuer tel quel (fragile) ; assainir seulement (dette gardée) |
| Plateforme | PWA hébergée sur GitHub Pages | Gratuit, PC + Android, installable, hors ligne | Appli native (inutile, plus lourde) |
| Interface | JavaScript sans framework, découpé par écran | Aucune dépendance à surveiller, déjà en place | Svelte/React (outillage en plus) |
| Prononciation | Moteur actuel, à valider en phase 1 | Accent américain, déjà intégré | Modèles espeak multilingues (à envisager si le test échoue) |
| Dictionnaire et voix | CMU + Kokoro (voix américaines) | Cohérents avec l'accent américain | Britfone + voix britanniques (accent abandonné) |
| Sons des phrases fixes (leçons, vocabulaire, jeux de rôle) | Fabriqués à l'avance sur PC avec Kokoro, livrés avec l'appli en petits fichiers audio compressés (≈ 10-15 Ko par phrase) ; version lente = même fichier ralenti sans changer la hauteur. Voix Kokoro sur l'appareil gardée seulement pour les textes libres (coach), en option. _Décidé le 2026-11-14._ | Son immédiat dès le 1er lancement, même sur un téléphone modeste ; pas 90 Mo de voix à télécharger ni de calcul sur l'appareil | Fabriquer sur l'appareil (≈ 2 s par phrase sur PC, bien plus sur Android, intenable avec des centaines de phrases) ; voix sur plusieurs cœurs (se bloque) |
| Conversation libre | Gemini, clé optionnelle | Léger et de bonne qualité | IA locale (≈ 1 Go, lente) |
| Conversation libre : place et forme (2026-11-18) | Avancée en phase 5, juste après la phase 4 (le jeu passe en phase 6, le transfert en phase 7, la publication en phase 8) ; dans chaque jeu de rôle (l'IA joue le personnage) + une discussion libre avec un coach ; correction à chaque phrase (phrase corrigée, explication en français, tournure d'un natif) puis phrase corrigée redite et notée par le moteur ; réponses lues par la voix Kokoro sur l'appareil (le texte s'affiche tout de suite, la voix suit) | C'est ce qui fait le plus progresser à l'oral ; corriger puis faire redire travaille à la fois la grammaire et la prononciation | Garder l'ordre prévu (coach en fin de projet) ; bilan des corrections en fin de conversation ; voix du navigateur ou texte seul |
| Sauvegarde | Navigateur + transfert par QR code | Pas de serveur, rien hébergé ailleurs | Synchro en ligne (Supabase…) |
| Amis | Partage par lien, moins de 10 | Pas de serveur | Classement en ligne (V2 au mieux) |
| Tests | package.json + lanceur intégré de Node (`node --test`), sans dépendance, lançables d'une commande | Pouvoir vérifier chez moi, rien à surveiller | Tests dans l'espace de Claude seulement ; Vitest/Playwright (dépendances) |
| Test sur Android | GitHub Pages sert la branche `refonte/v1` pendant la refonte (push avec accord à chaque test) | Le micro exige https ; le plus simple au quotidien | Câble USB (débogage à activer) |
| Ancienne appli | Retirée du site pendant la refonte ; code rangé dans `ancien/` puis supprimé en fin de V1 | Éviter que les amis utilisent une version fragile | La laisser en ligne sur `main` |
| Ancienne progression | Repartir de zéro (nouvelle clé de sauvegarde) | L'ancienne appli a surtout servi d'essai | Importer l'ancienne sauvegarde |
| Parcours (2026-11-17) | Leçons de sons et thèmes de phrases alternés (son → thème qui le réutilise) | On travaille un son puis on l'emploie dans des phrases utiles | Tous les sons d'abord ; tous les thèmes d'abord |
| Réussite d'une leçon (2026-11-17) | Chaque élément noté 65 ou plus (70 au départ, abaissé à 65 le 2026-11-17 à la demande de l'utilisateur : trop difficile), réessais libres ; 10 XP par élément réussi + 20 XP en fin de leçon | Oblige à travailler chaque son sans bloquer | Tout dire une fois (trop facile) ; moyenne ≥ 80 (trop dur au début) |
| Objectif quotidien (2026-11-17) | 50 XP par jour (≈ une leçon), réglable 20 / 50 / 100 ; la série compte les jours où il est atteint | Rythme tenable de 10-15 min | 20 XP ; 100 XP |
| Révision du vocabulaire (2026-11-17) | Mot affiché en français, dit en anglais au micro et noté (réussi à 65) ; « Je ne sais pas » montre et fait écouter le mot ; répétition espacée à 5 boîtes ; 10 nouveaux mots par jour (5 / 10 / 20), niveau A1 au départ ; bonus de fin de séance (10 XP) seulement pour 5 mots ou plus dits au micro, « Je ne sais pas » ne compte pas (précisé le 2026-11-17 après relecture) | Travaille à la fois le mot et sa prononciation ; une version simple, réglable à un seul endroit | Choisir la traduction parmi 4 (pas de prononciation) ; les deux alternés (plus de code) |
| Grammaire, fautes, jeux de rôle (2026-11-17) | Trois boutons sur l'accueil, tout ouvert, niveau affiché ; grammaire : réponse à l'écran puis phrase correcte dite au micro ; fautes : phrase fausse affichée, la bonne dite au micro (comme le vocabulaire) ; jeu de rôle : on choisit sa réponse (en français) puis on la dit en anglais, 65 pour passer ; on peut passer un tour (sans XP ni objectif) dès qu'une réponse est choisie, même sans micro (modifié le 2026-11-18 après relecture : avant, il fallait un essai noté) | Ne touche pas au parcours qui marche ; chaque exercice fait travailler la prononciation ; l'appli sait toujours quelle phrase est visée | Intercalés dans le parcours (ordre et verrous à refaire) ; grammaire à l'écran seulement ; parole libre dans les jeux de rôle (2 à 3 fois plus lent, erreurs) ; fiches à retourner |
| Exercice d'écoute (2026-11-17) | Paires de mots (ship / sheep) : un mot joué, choisir lequel | Entraîne l'oreille aux sons que les Français confondent | Phrase à reconnaître parmi 3 ; les deux |
| Hors ligne (2026-11-17) | Tout le hors-ligne en phase 8, avec le service worker | Un seul chantier, au moment de la publication | Service worker dès la phase 3 (à retoucher ensuite) |
| Voix des sons fabriqués (2026-11-17) | Les deux voix (Heart et Michael), ≈ 5 Mo livrés | Garder le choix de la voix | Heart seule (≈ 2,5 Mo) |

### Questions ouvertes
- ~~Le moteur actuel note-t-il correctement avec le vrai modèle ?~~ **Oui sur PC (2026-11-14)** : avec la voix Kokoro comme élève-témoin, prononciation correcte notée 95 en moyenne et fautes de Français injectées repérées sur le bon son 37 fois sur 40 ; l'essai de l'utilisateur au micro repère 15 fautes volontaires sur 16. Moteur gardé. Limite : voix de synthèse plus « propre » qu'une vraie voix ; quelques signalements peu plausibles sur la voix réelle de l'utilisateur, à surveiller.
- Un Android de milieu de gamme tient-il ≈ 350 Mo de moteur (la voix sera fabriquée à l'avance, voir Décisions) ? → **reporté** : test Android avant la publication (phase 8), à la demande de l'utilisateur.
- Moteur et voix tournent sur 1 cœur : en multi-cœurs, leur initialisation se bloquait parfois sans erreur (2026-11-14).
