// Worker d'analyse : charge le modèle de phonèmes et transforme l'audio en suite de sons.
// Tout se passe sur l'appareil : l'audio n'est jamais envoyé sur le réseau.
import { env, AutoFeatureExtractor, AutoModelForCTC } from "../vendor/transformers.min.js";
import { decodeCTC } from "./phonemes.js";

// Modèle et révision épinglés : un changement côté Hugging Face ne peut pas modifier l'appli.
export const MODEL_ID = "robg/speako-phoneme-recognizer";
export const REVISION = "ad0f63cd58fc1bb1e9c261a3b4135997a31c2e58";

let fe = null, model = null, loading = null;

function configure(local) {
  env.allowRemoteModels = !local;
  env.allowLocalModels = !!local;
  env.localModelPath = new URL("../test/model/", import.meta.url).href;
  env.useBrowserCache = true;
  env.backends.onnx.wasm.wasmPaths = new URL("../vendor/", import.meta.url).href;
  env.backends.onnx.wasm.proxy = false;
  const threads = self.crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)) : 1;
  env.backends.onnx.wasm.numThreads = threads;
  return threads;
}

async function load(local) {
  const threads = configure(local);
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
  postMessage({ type: "ready", threads });
}

self.onmessage = async (e) => {
  const msg = e.data || {};
  try {
    if (msg.type === "init") {
      if (!loading) loading = load(!!msg.local);
      await loading;
      return;
    }
    if (msg.type === "analyze") {
      if (!model) { if (!loading) loading = load(!!msg.local); await loading; }
      const audio = msg.audio;
      if (!(audio instanceof Float32Array) || audio.length < 1600) throw new Error("audio_trop_court");
      const t0 = performance.now();
      const inputs = await fe(audio);
      const out = await model(inputs);
      const logits = out.logits;
      const [, T, V] = logits.dims;
      const segs = decodeCTC(logits.data, T, V, audio.length / 16000 / T);
      postMessage({ type: "result", id: msg.id, segs, ms: Math.round(performance.now() - t0) });
    }
  } catch (err) {
    loading = msg.type === "init" ? null : loading;
    postMessage({ type: "error", id: msg.id, message: String(err && err.message || err) });
  }
};
