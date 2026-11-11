# Sécurité et confidentialité

## Données

- **Audio** : enregistré en mémoire, analysé dans un Web Worker local, jamais envoyé sur le réseau.
  Le micro est coupé dès la fin de l'enregistrement (`track.stop()`).
- **Progression** : `localStorage` du navigateur uniquement. Pas de compte, pas de cookie, pas d'analytics.
- **Suppression** : « Effacer ma progression » et « Supprimer le modèle » demandent une confirmation.

## Réseau

Seule requête externe : le téléchargement du modèle depuis Hugging Face, **à une révision figée**
(`robg/speako-phoneme-recognizer@ad0f63cd58fc1bb1e9c261a3b4135997a31c2e58`, licence Apache-2.0).
Une modification du dépôt du modèle ne peut donc pas changer ce que l'appli exécute.
Vérifié : en test, les seules URL externes appelées sont `huggingface.co/robg/speako-phoneme-recognizer/resolve/<révision>/…`.

## Politique de sécurité du contenu (CSP)

Appliquée par balise `<meta>` et, une fois le service worker actif, par en-tête HTTP (y compris pour les workers) :

```
default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self';
connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co;
img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self'; font-src 'self';
manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
```

- Aucun script inline, aucun `eval` (seule la compilation WebAssembly est autorisée).
- Aucun CDN : les bibliothèques et les polices sont copiées dans `vendor/` et servies par le même domaine.
- Toutes les données affichées dynamiquement sont échappées avant insertion (protection XSS).

Autres en-têtes ajoutés par `sw.js` : `Cross-Origin-Opener-Policy: same-origin`,
`Cross-Origin-Embedder-Policy: require-corp` (isolation, permet le calcul multi-cœurs),
`X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
`Permissions-Policy: microphone=(self), camera=(), geolocation=(), payment=(), usb=()`.
Le service worker ne modifie jamais les requêtes vers d'autres domaines.

## Dépendances (vérifiées)

| Fichier | Origine | Version | SHA-256 |
|---|---|---|---|
| `vendor/transformers.min.js` | npm `@huggingface/transformers` (Apache-2.0) | 4.3.2 | `8b5a3171f8876bab2b1820a7d65eb87628e3d30bb5ea85b9dd398e76eb34decb` |
| `vendor/ort-wasm-simd-threaded.asyncify.mjs` | npm `onnxruntime-web` (MIT) | 1.31.0-dev.20260914 | `0966b6105cd936744498aa60df7a22cbd47af3374dbc64a9ab561c08a71e3611` |
| `vendor/ort-wasm-simd-threaded.asyncify.wasm` | npm `onnxruntime-web` (MIT) | 1.31.0-dev.20260914 | `49871f5a4409519797e127440868a6d1923339d9185907f301a5b2a1d90af082` |
| `data/cmudict.json` | npm `cmu-pronouncing-dictionary` 3.0.0 (dictionnaire CMU, BSD) | 3.0.0 | `ca8e790ec08466b37153a35576e2ac3ede1dfe3b1a16ccdb7605deef4add654b` |

| `fonts/*.woff2` | npm `@fontsource/barlow-condensed`, `@fontsource/nunito` (OFL-1.1) | 5.3.0 | voir `sha256sum fonts/*` |

- Paquets installés avec `npm install --ignore-scripts` (aucun script d'installation exécuté).
- `npm audit` : 0 vulnérabilité au moment de la construction.
- Vérifier soi-même : `sha256sum vendor/* data/cmudict.json`.

## Limites

- GitHub Pages ne permet pas de définir des en-têtes HTTP : au tout premier chargement (avant l'activation
  du service worker), seule la CSP en `<meta>` s'applique. La page se recharge une fois pour activer l'isolation.
- Le modèle téléchargé n'a pas de somme de contrôle vérifiée par l'appli ; la protection repose sur la révision
  Git figée et sur HTTPS.
