// Worker d'analyse : charge le modèle de phonèmes et transforme l'audio en suite de sons.
// Tout se passe sur l'appareil : l'audio n'est jamais envoyé sur le réseau.
// Repris de l'ancienne appli (ancien/js/worker.js), sans le mode « modèle de test local ».
import { env, AutoFeatureExtractor, AutoModelForCTC } from "../../vendor/transformers.min.js";
import { decodeCTC } from "./phonemes.js";
import { installGuard } from "./integrity.js";

// Tout téléchargement passe par la liste blanche et la vérification SHA-256 (voir integrity.js).
installGuard(env);

// Modèle et révision épinglés : un changement côté Hugging Face ne peut pas modifier l'appli.
export const MODEL_ID = "robg/speako-phoneme-recognizer";
export const REVISION = "ad0f63cd58fc1bb1e9c261a3b4135997a31c2e58";

let fe = null, model = null, loading = null;

function configure() {
  env.allowRemoteModels = true;
  env.allowLocalModels = false;
  env.useBrowserCache = true; // téléchargé une seule fois, puis gardé par le navigateur
  env.backends.onnx.wasm.wasmPaths = new URL("../../vendor/", import.meta.url).href;
  env.backends.onnx.wasm.proxy = false;
  // Un seul cœur : en multi-cœurs, l'initialisation se bloque parfois sans erreur (constaté le 2026-11-14,
  // surtout quand la voix se charge en même temps). Sur un cœur, c'est fiable et assez rapide.
  env.backends.onnx.wasm.numThreads = 1;
  return 1;
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
  fe = await AutoFeatureExtractor.from_pretrained(MODEL_ID, opts);
  model = await AutoModelForCTC.from_pretrained(MODEL_ID, { ...opts, dtype: "q8", device: "wasm" });
  postMessage({ type: "ready", threads, ms: Math.round(performance.now() - t0) });
}

self.onmessage = async (e) => {
  const msg = e.data || {};
  try {
    if (msg.type === "init") {
      if (!loading) loading = load();
      await loading;
      return;
    }
    if (msg.type === "analyze") {
      if (!model) { if (!loading) loading = load(); await loading; }
      const audio = msg.audio;
      if (!(audio instanceof Float32Array) || audio.length < 1600) throw new Error("audio_trop_court");
      const t0 = performance.now();
      const inputs = await fe(audio);
      const out = await model(inputs);
      const [, T, V] = out.logits.dims;
      const segs = decodeCTC(out.logits.data, T, V, audio.length / 16000 / T);
      postMessage({ type: "result", id: msg.id, segs, ms: Math.round(performance.now() - t0) });
    }
  } catch (err) {
    if (!model) loading = null; // un échec de chargement peut être retenté
    postMessage({ type: "error", id: msg.id, message: String((err && err.message) || err) });
  }
};
