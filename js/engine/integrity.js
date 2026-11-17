// Téléchargements de modèles vérifiés (utilisé dans les workers, à la place de fetch) :
// - seuls les fichiers listés ici, aux révisions Git figées, peuvent être téléchargés, et seulement depuis huggingface.co ;
// - chaque gros fichier (poids des modèles, tokenizer) est vérifié par SHA-256 et taille exacte PENDANT le téléchargement :
//   s'il ne correspond pas, le flux échoue, rien n'est mis en cache et le modèle ne se charge pas (échec fermé) ;
// - les petits fichiers de configuration sont limités en taille (ils sont figés par la révision Git).
// Empreintes : identifiants « oid sha256 » des pointeurs Git LFS des dépôts, à ces révisions.
import { Sha256 } from "./sha256.js";

const MB = 1024 * 1024, small = (n = 1) => ({ max: n * MB });
export const MODELS = {
  "robg/speako-phoneme-recognizer": {
    rev: "ad0f63cd58fc1bb1e9c261a3b4135997a31c2e58",
    files: {
      "config.json": small(), "preprocessor_config.json": small(),
      "onnx/model_quantized.onnx": { sha256: "1e03fc69aa5be1f365a94ffa17c060feafdadb626b8a662b7ba6b36cb9f0577e", size: 355216594 }
    }
  },
  // Voix naturelle (anglais américain).
  "onnx-community/Kokoro-82M-v1.0-ONNX": {
    rev: "1939ad2a8e416c0acfeecc08a694d14ef25f2231",
    files: {
      "config.json": small(), "tokenizer.json": small(), "tokenizer_config.json": small(),
      "onnx/model_quantized.onnx": { sha256: "fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478", size: 92361116 }
    }
  }
  // Whisper et Gemma (IA locale) ont été retirés de la V1 : ils ne peuvent plus être téléchargés.
};

export class IntegrityError extends Error { constructor(kind, file) { super(`integrity:${kind}:${file}`); this.name = "IntegrityError"; } }

// Flux qui laisse passer les octets tout en les comptant et en les hachant ; erreur à la fin si ça ne correspond pas.
export function verifier(entry, file) {
  const hash = entry.sha256 ? new Sha256() : null, limit = entry.size || entry.max;
  let n = 0;
  return new TransformStream({
    transform(chunk, ctl) {
      n += chunk.byteLength;
      if (n > limit) throw new IntegrityError("size", file);
      if (hash) hash.update(chunk);
      ctl.enqueue(chunk);
    },
    flush() {
      if (entry.size && n !== entry.size) throw new IntegrityError("size", file);
      if (hash && hash.hex() !== entry.sha256) throw new IntegrityError("hash", file);
    }
  });
}

// Analyse une URL Hugging Face « /<dépôt>/resolve/<révision>/<fichier> ».
export function lookup(href) {
  const url = new URL(href);
  if (url.protocol !== "https:" || url.hostname !== "huggingface.co" || url.username || url.password || url.port) return { deny: true };
  const m = url.pathname.match(/^\/([\w.-]+\/[\w.-]+)\/resolve\/([0-9a-f]{40}|main)\/([\w./-]+)$/);
  if (!m || url.search || url.hash) return { deny: true };
  const repo = Object.prototype.hasOwnProperty.call(MODELS, m[1]) ? MODELS[m[1]] : null;
  if (!repo || (repo.rev !== m[2] && m[2] !== "main")) return { deny: true };
  const file = m[3];
  if (file.split("/").some(p => p === ".." || p === ".")) return { deny: true };
  const entry = Object.prototype.hasOwnProperty.call(repo.files, file) ? repo.files[file] : null;
  // La bibliothèque teste parfois l'existence d'un fichier sur « main » (sans la révision demandée) :
  // on redirige toujours vers la révision figée, et le contenu reste vérifié comme d'habitude.
  return { repo: m[1], file, entry, href: `https://huggingface.co/${m[1]}/resolve/${repo.rev}/${file}` };
}

// Remplace fetch dans les workers. base = fetch d'origine ; origin = origine de l'appli.
export function guardedFetch(base, origin = self.location.origin) {
  return async function labFetch(input, init) {
    const req = typeof Request !== "undefined" && input instanceof Request ? input : null;
    const href = new URL(req ? req.url : String(input), origin + "/").href;
    // Fichiers de l'appli (même origine) : pas vérifiés ici. Ils viennent du même serveur que le code
    // lui-même ; le service worker de la phase 7 les mettra en cache. Seuls les modèles externes sont contrôlés.
    if (new URL(href).origin === origin) return base(input, init);
    const m = lookup(href);
    if (m.deny) throw new TypeError(`Accès réseau refusé par l'appli : ${new URL(href).hostname}`);
    if (!m.entry) return new Response(null, { status: 404, statusText: "Not Found" });
    const hdr = new Headers((init && init.headers) || (req && req.headers) || undefined);
    const range = hdr.get("Range");
    const opts = { method: "GET", credentials: "omit", referrerPolicy: "no-referrer", redirect: "follow", mode: "cors" };
    if (range) {
      // Seule sonde autorisée : 1 octet pour connaître la taille (jamais utilisé comme donnée).
      if (range !== "bytes=0-0") throw new TypeError("Requête partielle refusée");
      return base(m.href, { ...opts, cache: "no-store", headers: { Range: range } });
    }
    const res = await base(m.href, opts);
    if (!res.ok || !res.body) return res;
    const h = new Headers();
    const type = res.headers.get("content-type");
    if (type) h.set("content-type", type);
    if (m.entry.size) h.set("content-length", String(m.entry.size));
    return new Response(res.body.pipeThrough(verifier(m.entry, m.file)), { status: 200, statusText: "OK", headers: h });
  };
}

// Installe la protection dans un worker : la bibliothèque et ONNX Runtime passent par elle.
export function installGuard(env) {
  const base = self.fetch.bind(self), gf = guardedFetch(base);
  env.fetch = gf;
  self.fetch = gf;
  return gf;
}
