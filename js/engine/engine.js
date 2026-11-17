// Côté page : dictionnaire + worker d'analyse. Les écrans n'utilisent que ce module.
import { makeWorker } from "../core/dom.js";
import { buildReference, evaluate, tipsFor } from "./phonemes.js";

export const MODEL_MB = 355; // taille du moteur à télécharger la première fois

let dict = null, dictLoading = null;
export function loadDict() {
  if (dict) return Promise.resolve(dict);
  if (!dictLoading) {
    dictLoading = fetch(new URL("../../data/cmudict.json", import.meta.url))
      .then((r) => { if (!r.ok) throw new Error("dictionnaire introuvable"); return r.json(); })
      .then((d) => (dict = d))
      .catch((e) => { dictLoading = null; throw e; });
  }
  return dictLoading;
}

let worker = null, ready = null, nextId = 1;
const pending = new Map();
const listeners = new Set();
export const onEngine = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (ev) => listeners.forEach((fn) => fn(ev));

function spawn() {
  worker = makeWorker(new URL("./worker.js", import.meta.url));
  worker.onmessage = (e) => {
    const m = e.data || {};
    if (m.type === "progress" || m.type === "ready") emit(m);
    if (m.type === "result" && pending.has(m.id)) { pending.get(m.id).res(m); pending.delete(m.id); }
    if (m.type === "error") {
      if (m.id && pending.has(m.id)) { pending.get(m.id).rej(new Error(m.message)); pending.delete(m.id); }
      else emit({ type: "error", message: m.message });
    }
  };
  worker.onerror = (e) => crash(e.message || "le moteur s'est arrêté");
}

// Le worker a planté (mémoire pleine…) : on rejette les analyses en attente et on l'abandonne.
// Le prochain appel à prepare() en relance un neuf (le modèle revient du cache du navigateur).
function crash(message) {
  for (const p of pending.values()) p.rej(new Error(message));
  pending.clear();
  if (worker) { worker.terminate(); worker = null; }
  ready = null;
  emit({ type: "error", message });
}

// Charge le moteur (télécharge le modèle la première fois). Se résout quand il est prêt.
export function prepare() {
  if (!worker) spawn();
  if (!ready) {
    ready = new Promise((res, rej) => {
      const off = onEngine((ev) => {
        if (ev.type === "ready") { off(); res(ev); }
        if (ev.type === "error") { off(); ready = null; rej(new Error(ev.message)); }
      });
    });
    worker.postMessage({ type: "init" });
  }
  return ready;
}

// Analyse un enregistrement (16 kHz mono) et le note par rapport à la phrase attendue.
// focus : sons travaillés, qui comptent plus dans la note (voir FOCUS_WEIGHT dans phonemes.js).
export async function score(sentence, samples, { focus = [] } = {}) {
  const [d] = await Promise.all([loadDict(), prepare()]);
  const id = nextId++;
  const res = await new Promise((resolve, reject) => {
    pending.set(id, { res: resolve, rej: reject });
    worker.postMessage({ type: "analyze", id, audio: samples }, [samples.buffer]);
  });
  const result = evaluate(buildReference(d, sentence), res.segs, { focus });
  return { result, tips: tipsFor(result), ms: res.ms };
}
