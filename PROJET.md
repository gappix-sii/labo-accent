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
_Mises à jour le 2026-11-14_

| Sujet | Choix | Pourquoi | Alternatives écartées |
|---|---|---|---|
| Voie | Reconstruire dans le même dépôt en recyclant contenus, dessins, vérification des modèles et score | Code jamais testé en réel, monolithique, tests inutilisables | Continuer tel quel (fragile) ; assainir seulement (dette gardée) |
| Plateforme | PWA hébergée sur GitHub Pages | Gratuit, PC + Android, installable, hors ligne | Appli native (inutile, plus lourde) |
| Interface | JavaScript sans framework, découpé par écran | Aucune dépendance à surveiller, déjà en place | Svelte/React (outillage en plus) |
| Prononciation | Moteur actuel, à valider en phase 1 | Accent américain, déjà intégré | Modèles espeak multilingues (à envisager si le test échoue) |
| Dictionnaire et voix | CMU + Kokoro (voix américaines) | Cohérents avec l'accent américain | Britfone + voix britanniques (accent abandonné) |
| Conversation libre | Gemini, clé optionnelle | Léger et de bonne qualité | IA locale (≈ 1 Go, lente) |
| Sauvegarde | Navigateur + transfert par QR code | Pas de serveur, rien hébergé ailleurs | Synchro en ligne (Supabase…) |
| Amis | Partage par lien, moins de 10 | Pas de serveur | Classement en ligne (V2 au mieux) |
| Tests | package.json + lanceur intégré de Node (`node --test`), sans dépendance, lançables d'une commande | Pouvoir vérifier chez moi, rien à surveiller | Tests dans l'espace de Claude seulement ; Vitest/Playwright (dépendances) |
| Test sur Android | GitHub Pages sert la branche `refonte/v1` pendant la refonte (push avec accord à chaque test) | Le micro exige https ; le plus simple au quotidien | Câble USB (débogage à activer) |
| Ancienne appli | Retirée du site pendant la refonte ; code rangé dans `ancien/` puis supprimé en fin de V1 | Éviter que les amis utilisent une version fragile | La laisser en ligne sur `main` |
| Ancienne progression | Repartir de zéro (nouvelle clé de sauvegarde) | L'ancienne appli a surtout servi d'essai | Importer l'ancienne sauvegarde |

### Questions ouvertes
- Le moteur actuel note-t-il correctement avec le vrai modèle, sur PC et sur Android ? → test au début de la phase 1.
- Un Android de milieu de gamme tient-il ≈ 350 Mo de moteur + 90 Mo de voix ? → même test.
