// Banc de test du moteur avec la voix Kokoro comme élève-témoin (tâche 7 de la phase 1).
// La voix lit chaque phrase correctement, puis avec des fautes de Français injectées directement en sons ;
// le moteur doit noter haut la première, et repérer les fautes de la seconde sur le bon son.
// Usage : `npm start`, ouvrir http://localhost:8000, attendre « Moteur prêt », puis dans la console du navigateur :
//   const B = await import("/tools/bench-voice.mjs"); const r = await B.run(); console.table(r.rows); r.summary
import { phonemize } from "../js/engine/g2p.js";
import { loadDict, prepare, score } from "../js/engine/engine.js";
import { SENTENCES } from "../js/content/sentences.js";
import { makeWorker } from "../js/core/dom.js";

// Mêmes phrases que SENTENCES, prononcées avec les fautes de leur consigne (« fault »).
export const FAULTY = [
  "aɪ sˈɪŋk zˈɪs ɪz zə sˈɜːd wˈʌn.",
  "iː ɪz ˈæpi ɪn ɪz ˈaʊs.",
  "sˈiːt ɑːn zə sˈiːt.",
  "aɪ lˈiːv ˈiːɹ, aɪ dˈoʊnt lˈiːv.",
  "viː vˈɑːnt vˈɔːɹm vˈɔːɾɚ.",
  "zə ʁˈɛd kˈɑːʁ ɪz vˈɛʁi fˈɑːʁ.",
  "ʃiː wˈɑːtʃ zə ˈoʊl kˈæ.",
  "kæn aɪ æv ə ɹɪsˈiː?",
  "ˈaɪm ˈʌŋɡɹi, nˈɑːt ˈæŋɡɹi.",
  "ɡˈuːd fˈuːd ɪz ɡˈuːd fɔːɹ juː."
];

async function to16k(parts) {
  const n = parts.reduce((a, p) => a + p.length, 0), all = new Float32Array(n);
  let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
  const off = new OfflineAudioContext(1, Math.ceil((n * 16000) / 24000), 16000);
  const b = off.createBuffer(1, n, 24000); b.getChannelData(0).set(all);
  const src = off.createBufferSource(); src.buffer = b; src.connect(off.destination); src.start();
  const out = (await off.startRendering()).getChannelData(0);
  let pk = 0; for (const x of out) pk = Math.max(pk, Math.abs(x));
  return out.map((x) => (x * 0.9) / (pk || 1));
}

const flags = (res) => res.result.words.flatMap((w) => w.phones.filter((ph) => ph.status === "bad").map((ph) => ph.p + (ph.heard ? "→" + ph.heard : " absent")));

export async function run(voices = ["af_heart", "am_michael"]) {
  const dict = await loadDict(); await prepare();
  const w = makeWorker(new URL("../js/engine/tts-worker.js", import.meta.url));
  const pend = new Map(); let id = 0;
  w.onmessage = (e) => {
    const m = e.data; if (m.type === "ready") pend.get("ready")?.();
    const p = pend.get(m.id); if (!p) return;
    if (m.type === "chunk") p.parts.push(m.audio);
    if (m.type === "end") p.res(p.parts);
    if (m.type === "error") p.rej(new Error(m.message));
  };
  await new Promise((r) => { pend.set("ready", r); w.postMessage({ type: "init" }); });
  const synth = (ipa, voice) => new Promise((res, rej) => { const k = ++id; pend.set(k, { parts: [], res, rej }); w.postMessage({ type: "say", id: k, ipa, voice, speed: 1 }); });
  const rows = [];
  try {
    for (const voice of voices) for (let i = 0; i < SENTENCES.length; i++) {
      const s = SENTENCES[i];
      const good = await score(s.en, await to16k(await synth(phonemize(dict, s.en), voice)));
      const bad = await score(s.en, await to16k(await synth(FAULTY[i], voice)));
      const badSet = new Set(bad.result.words.flatMap((x) => x.phones.filter((ph) => ph.status === "bad").map((ph) => ph.p)));
      rows.push({ voice, phrase: i + 1, correct: good.result.score, signalésCorrect: flags(good).join(" "),
        fautes: bad.result.score, signalésFautes: flags(bad).join(" "), attendus: s.expect.map((p) => `${p} ${badSet.has(p) ? "oui" : "NON"}`).join(", ") });
    }
  } finally { w.terminate(); }
  const avg = Math.round(rows.reduce((a, r) => a + r.correct, 0) / rows.length);
  const hits = rows.reduce((a, r) => a + (r.attendus.match(/oui/g) || []).length, 0);
  const wanted = rows.reduce((a, r) => a + r.attendus.split(",").length, 0);
  const gap = rows.filter((r) => r.correct - r.fautes >= 15).length;
  return { rows, summary: `correct : moyenne ${avg} · fautes repérées ${hits}/${wanted} · écart ≥ 15 : ${gap}/${rows.length}` };
}
