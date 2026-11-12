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
  "onnx-community/whisper-base.en": {
    rev: "51eefc0af78b103839eda9e7e4f4186acc6517fe",
    files: {
      "config.json": small(), "generation_config.json": small(), "preprocessor_config.json": small(),
      "tokenizer.json": small(8), "tokenizer_config.json": small(2),
      "onnx/encoder_model.onnx": { sha256: "1cc86302d480b061452d348638064383ab41b6f3333ddd0e423532d14edaf535", size: 82468078 },
      "onnx/decoder_model_merged_q4.onnx": { sha256: "7770ac574b71a704191ec52becac42b4a4126af26f54ed653f31c8f16af31f99", size: 123600371 }
    }
  },
  "onnx-community/gemma-3-1b-it-ONNX": {
    rev: "a58439f40017d3b99c7d378ff525e54e0ba08ebf",
    files: {
      "config.json": small(), "generation_config.json": small(), "tokenizer_config.json": small(4), "chat_template.jinja": small(), "special_tokens_map.json": small(),
      "tokenizer.json": { sha256: "55da1312bdf1d7d8fe8d9d1b3eed04086261149e6034e0ac3f8c633b67f5aac8", size: 20323013 },
      "onnx/model_q4f16.onnx": { sha256: "522d1f0e1d1fd0065ca02d61a0bf17a43701c1835b4ebf0c4628b73f1a6fb796", size: 461341 },
      "onnx/model_q4f16.onnx_data": { sha256: "6fb9bc8dd4b93a040bcea60c953c2e24f60f9d52e708befec077f6ab60baa007", size: 763067904 },
      "onnx/model_q4.onnx": { sha256: "69686023e5892376e38fcbcdd0c77af432c55b3bcd03aee6d561bd1f04507da0", size: 347363 },
      "onnx/model_q4.onnx_data": { sha256: "c2370070be257a98d50e17d81be13e18304c39e7e6d9d1416f8f883681d2a17b", size: 859106816 }
    }
  }
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
  const m = url.pathname.match(/^\/([\w.-]+\/[\w.-]+)\/resolve\/([0-9a-f]{40})\/([\w./-]+)$/);
  if (!m || url.search || url.hash) return { deny: true };
  const repo = MODELS[m[1]];
  if (!repo || repo.rev !== m[2]) return { deny: true };
  const file = m[3];
  if (file.split("/").some(p => p === ".." || p === ".")) return { deny: true };
  const entry = Object.prototype.hasOwnProperty.call(repo.files, file) ? repo.files[file] : null;
  return { repo: m[1], file, entry, href: url.href };
}

// Remplace fetch dans les workers. base = fetch d'origine ; origin = origine de l'appli.
export function guardedFetch(base, origin = self.location.origin) {
  return async function labFetch(input, init) {
    const req = typeof Request !== "undefined" && input instanceof Request ? input : null;
    const href = new URL(req ? req.url : String(input), origin + "/").href;
    if (new URL(href).origin === origin) return base(input, init); // fichiers de l'appli : vérifiés par le service worker
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
