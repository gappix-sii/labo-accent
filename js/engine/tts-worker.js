// Worker de la voix naturelle : Kokoro-82M (Apache 2.0), exécuté sur l'appareil.
// Texte -> phonèmes (dictionnaire CMU, g2p.js) -> modèle -> audio 24 kHz, morceau par morceau.
// Repris de l'ancienne appli (ancien/js/tts-worker.js), sans le mode « modèle de test local ».
import { env, AutoTokenizer, StyleTextToSpeech2Model, Tensor } from "../../vendor/transformers.min.js";
import { installGuard } from "./integrity.js";
import { chunks } from "./g2p.js";
import { MODEL_ID, REVISION, VOICE_IDS } from "./voice-model.js";

// Tout téléchargement passe par la liste blanche et la vérification SHA-256 (voir integrity.js).
installGuard(env);

const VOICES = new Set(VOICE_IDS);
const STYLE = 256, ROWS = 510, VOICE_BYTES = ROWS * STYLE * 4;

let tok = null, model = null, dict = null, loading = null, gen = 0, chain = Promise.resolve();
const voices = new Map();

function configure() {
  env.allowRemoteModels = true;
  env.allowLocalModels = false;
  env.useBrowserCache = true;
  env.backends.onnx.wasm.wasmPaths = new URL("../../vendor/", import.meta.url).href;
  env.backends.onnx.wasm.proxy = false;
  // Un seul cœur : avec plusieurs, le modèle Kokoro se bloque sans erreur à son initialisation
  // (constaté le 2026-11-14). Sur un cœur il est prêt en ~2,5 s et laisse les autres au moteur de prononciation.
  env.backends.onnx.wasm.numThreads = 1;
  return 1;
}

async function voice(id) {
  if (!VOICES.has(id)) id = "af_heart";
  if (voices.has(id)) return voices.get(id);
  const r = await fetch(new URL("../../data/voices/" + id + ".bin", import.meta.url));
  if (!r.ok) throw new Error("voix introuvable");
  const buf = await r.arrayBuffer();
  if (buf.byteLength !== VOICE_BYTES) throw new Error("voix invalide"); // taille exacte contrôlée
  const v = new Float32Array(buf);
  voices.set(id, v);
  return v;
}

async function synth(ph, v, speed) {
  const { input_ids } = tok(ph, { truncation: true });
  const n = Math.min(Math.max(input_ids.dims.at(-1) - 2, 0), ROWS - 1);
  const style = v.slice(n * STYLE, n * STYLE + STYLE); // style choisi selon la longueur, comme kokoro.js
  const { waveform } = await model({
    input_ids,
    style: new Tensor("float32", style, [1, STYLE]),
    speed: new Tensor("float32", [speed], [1])
  });
  return new Float32Array(waveform.data);
}

async function load() {
  const threads = configure();
  const t0 = performance.now();
  const files = {};
  const progress_callback = (p) => {
    if (p.status === "progress" && p.file) {
      files[p.file] = { loaded: p.loaded || 0, total: p.total || 0 };
      const loaded = Object.values(files).reduce((a, f) => a + f.loaded, 0);
      const total = Object.values(files).reduce((a, f) => a + f.total, 0);
      postMessage({ type: "progress", loaded, total });
    }
  };
  const opts = { revision: REVISION, progress_callback };
  const dictP = fetch(new URL("../../data/cmudict.json", import.meta.url)).then((r) => { if (!r.ok) throw new Error("dictionnaire"); return r.json(); });
  [tok, model, dict] = await Promise.all([
    AutoTokenizer.from_pretrained(MODEL_ID, opts),
    StyleTextToSpeech2Model.from_pretrained(MODEL_ID, { ...opts, dtype: "q8", device: "wasm" }),
    dictP
  ]);
  await synth("hˈaɪ.", await voice("af_heart"), 1); // premier calcul à vide : la première vraie phrase part plus vite
  postMessage({ type: "ready", threads, ms: Math.round(performance.now() - t0) });
}

async function say(msg, my) {
  const v = await voice(String(msg.voice || ""));
  const speed = Math.min(1.25, Math.max(0.6, Number(msg.speed) || 1));
  let seq = 0;
  // msg.ipa : sons donnés directement (banc de test : prononciations fautives injectées), sinon le texte.
  const parts = typeof msg.ipa === "string" ? [msg.ipa.slice(0, 500)] : chunks(dict, String(msg.text || "").slice(0, 4000));
  for (const ph of parts) {
    if (my !== gen) return postMessage({ type: "end", id: msg.id, cancelled: true });
    const audio = await synth(ph, v, speed);
    if (my !== gen) return postMessage({ type: "end", id: msg.id, cancelled: true });
    postMessage({ type: "chunk", id: msg.id, seq: seq++, audio }, [audio.buffer]);
  }
  postMessage({ type: "end", id: msg.id, cancelled: false });
}

self.onmessage = (e) => {
  const msg = e.data || {};
  if (msg.type === "init") {
    if (!loading) loading = load().catch((err) => { loading = null; postMessage({ type: "error", message: String((err && err.message) || err) }); });
    return;
  }
  if (msg.type === "cancel") { gen++; return; }
  if (msg.type === "say") {
    const my = ++gen; // une seule phrase à la fois : la nouvelle annule la précédente
    chain = chain.then(async () => {
      try {
        if (!loading) loading = load();
        await loading;
        if (!model) throw new Error("modèle absent");
        await say(msg, my);
      } catch (err) {
        postMessage({ type: "error", id: msg.id, message: String((err && err.message) || err) });
      }
    });
  }
};
