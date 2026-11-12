// Worker de conversation libre « IA locale » : reconnaissance vocale (Whisper) + petit modèle de langage (Gemma 3 1B).
// Tout tourne dans le navigateur avec WebGPU. Modèles et révisions épinglés.
import { env, pipeline, AutoTokenizer, AutoModelForCausalLM } from "../vendor/transformers.min.js";
import { installGuard } from "./integrity.js";

installGuard(env); // liste blanche + vérification SHA-256 de chaque fichier de modèle

export const ASR = { id: "onnx-community/whisper-base.en", rev: "51eefc0af78b103839eda9e7e4f4186acc6517fe" };
export const LLM = { id: "onnx-community/gemma-3-1b-it-ONNX", rev: "a58439f40017d3b99c7d378ff525e54e0ba08ebf" };

env.allowRemoteModels = true;
env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = new URL("../vendor/", import.meta.url).href;
env.backends.onnx.wasm.proxy = false;

let asr = null, tok = null, llm = null, loading = null;

async function load() {
  if (!navigator.gpu) throw new Error("no_webgpu");
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error("no_webgpu");
  const f16 = adapter.features.has("shader-f16");
  const files = {};
  const progress_callback = p => {
    if (p.status === "progress" && p.file) {
      files[p.file] = { loaded: p.loaded || 0, total: p.total || 0 };
      const loaded = Object.values(files).reduce((a, f) => a + f.loaded, 0), total = Object.values(files).reduce((a, f) => a + f.total, 0);
      postMessage({ type: "progress", loaded, total });
    }
  };
  asr = await pipeline("automatic-speech-recognition", ASR.id, { revision: ASR.rev, device: "webgpu", dtype: { encoder_model: "fp32", decoder_model_merged: "q4" }, progress_callback });
  tok = await AutoTokenizer.from_pretrained(LLM.id, { revision: LLM.rev, progress_callback });
  llm = await AutoModelForCausalLM.from_pretrained(LLM.id, { revision: LLM.rev, device: "webgpu", dtype: f16 ? "q4f16" : "q4", progress_callback });
  postMessage({ type: "ready" });
}

self.onmessage = async e => {
  const m = e.data || {};
  try {
    if (!loading) loading = load();
    await loading;
    if (m.type === "init") return;
    if (m.type === "transcribe") {
      const out = await asr(m.audio);
      postMessage({ type: "text", id: m.id, text: String(out.text || "").trim() });
    }
    if (m.type === "generate") {
      const inputs = tok.apply_chat_template(m.messages, { add_generation_prompt: true, return_dict: true });
      const out = await llm.generate({ ...inputs, max_new_tokens: 220, do_sample: false, repetition_penalty: 1.1 });
      const n = inputs.input_ids.dims[1];
      const text = tok.batch_decode(out.slice(null, [n, null]), { skip_special_tokens: true })[0];
      postMessage({ type: "text", id: m.id, text: String(text).trim() });
    }
  } catch (err) {
    if (m.type === "init") loading = null;
    postMessage({ type: "error", id: m.id, message: String(err && err.message || err) });
  }
};
