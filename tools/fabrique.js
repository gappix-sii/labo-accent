// Fabrique à l'avance le son de chaque phrase fixe (phase 2, tâche 2) : voix Kokoro → Opus (WebCodecs) → Ogg,
// écrit dans data/audio/ par le serveur lancé avec `npm run fabrique`, puis data/audio/index.json :
//   { version, model, revision, rate, clips: { voix: { texte: { file, ipa, ms, bytes } } } }
// Le nom d'un fichier dépend de la révision de la voix, de la voix et de la prononciation (IPA) :
// une prononciation corrigée donne un nouveau fichier, jamais un ancien son resservi.
import { chunks } from "../js/engine/g2p.js";
import { MODEL_ID, REVISION, VOICE_IDS, RATE, GAP } from "../js/engine/voice-model.js";
import { SENTENCES } from "../js/content/sentences.js";
import { muxOggOpus, readOgg } from "./ogg-opus.mjs";

const BITRATE = 32000; // Opus à 32 kbit/s : voix nette, ≈ 4 Ko par seconde

// Toutes les phrases fixes livrées avec l'appli (les leçons s'ajouteront ici, tâche 4).
export function fixedTexts() {
  return [...new Set(SENTENCES.map((s) => s.en))];
}

const $ = (id) => document.getElementById(id);
const status = (t) => { $("status").textContent = t; };

async function hex(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- Voix (worker Kokoro de l'appli) ----
function voiceClient() {
  const w = new Worker(new URL("../js/engine/tts-worker.js", import.meta.url), { type: "module" });
  const pend = new Map();
  let id = 0, onReady = null;
  const failAll = (msg) => { for (const p of pend.values()) p.rej(new Error(msg)); pend.clear(); onReady?.rej(new Error(msg)); };
  w.onerror = (e) => failAll(e.message || "la voix s'est arrêtée");
  w.onmessage = (e) => {
    const m = e.data || {};
    if (m.type === "progress" && m.total) status(`Chargement de la voix… ${Math.round((m.loaded / m.total) * 100)} %`);
    if (m.type === "ready") return onReady?.res();
    if (m.type === "error" && m.id === undefined) return failAll(m.message);
    const p = pend.get(m.id);
    if (!p) return;
    if (m.type === "chunk") p.parts.push(m.audio);
    if (m.type === "end") { pend.delete(m.id); m.cancelled ? p.rej(new Error("annulé")) : p.res(p.parts); }
    if (m.type === "error") { pend.delete(m.id); p.rej(new Error(m.message)); }
  };
  return {
    ready: () => new Promise((res, rej) => { onReady = { res, rej }; w.postMessage({ type: "init" }); }),
    say: (text, voice) => new Promise((res, rej) => { const k = ++id; pend.set(k, { parts: [], res, rej }); w.postMessage({ type: "say", id: k, text, voice, speed: 1 }); }),
    close: () => w.terminate()
  };
}

// Morceaux d'une phrase mis bout à bout, séparés par le même silence que la lecture sur l'appareil.
function join(parts) {
  const gap = Math.round(GAP * RATE);
  const n = parts.reduce((a, p) => a + p.length, 0) + gap * Math.max(0, parts.length - 1);
  const out = new Float32Array(n);
  let o = 0;
  parts.forEach((p, i) => { if (i) o += gap; out.set(p, o); o += p.length; });
  return out;
}

// ---- Compression Opus (encodeur intégré à Chrome) ----
async function encodeOpus(samples) {
  const config = { codec: "opus", sampleRate: RATE, numberOfChannels: 1, bitrate: BITRATE };
  if (!(await AudioEncoder.isConfigSupported(config)).supported) throw new Error("Opus 24 kHz non pris en charge par ce navigateur");
  const packets = [];
  let preSkip = 312, failure = null;
  const enc = new AudioEncoder({
    output: (chunk, meta) => {
      const d = meta && meta.decoderConfig && meta.decoderConfig.description;
      if (d && d.byteLength >= 12) preSkip = new DataView(d instanceof ArrayBuffer ? d : d.buffer, d.byteOffset || 0).getUint16(10, true);
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      packets.push({ data, samples: Math.round((chunk.duration * 48000) / 1e6) });
    },
    error: (e) => { failure = e; }
  });
  enc.configure(config);
  enc.encode(new AudioData({ format: "f32", sampleRate: RATE, numberOfFrames: samples.length, numberOfChannels: 1, timestamp: 0, data: samples }));
  await enc.flush();
  enc.close();
  if (failure) throw failure;
  const file = muxOggOpus(packets, { length48: Math.round((samples.length * 48000) / RATE), preSkip, inputRate: RATE });
  readOgg(file); // contrôle : chaque page relue, CRC vérifié
  return file;
}

async function put(name, body, type) {
  const r = await fetch("../data/audio/" + name, { method: "PUT", body, headers: { "Content-Type": type } });
  if (r.status !== 201) throw new Error(`écriture de ${name} refusée (${r.status} ${await r.text()}). Le serveur est-il lancé avec « npm run fabrique » ?`);
}

async function loadIndex() {
  const r = await fetch("../data/audio/index.json", { cache: "no-store" });
  if (!r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

function row(text, voice) {
  const li = document.createElement("li");
  li.textContent = `${voice} · ${text} · …`;
  $("list").append(li);
  return (info, file) => {
    li.textContent = `${voice} · ${text} · ${info} `;
    if (file) { const a = document.createElement("audio"); a.controls = true; a.preload = "none"; a.src = "../data/audio/" + file; li.append(a); }
  };
}

async function run() {
  $("go").disabled = true;
  $("list").replaceChildren();
  const redo = $("all").checked;
  const voice = voiceClient();
  try {
    status("Dictionnaire…");
    const dict = await (await fetch("../data/cmudict.json")).json();
    const old = await loadIndex();
    const prev = old && old.revision === REVISION ? old.clips || {} : {};
    const texts = fixedTexts(), jobs = VOICE_IDS.flatMap((v) => texts.map((t) => [v, t]));
    const clips = Object.fromEntries(VOICE_IDS.map((v) => [v, {}]));
    let loaded = false, made = 0, kept = 0, bytes = 0;
    for (let i = 0; i < jobs.length; i++) {
      const [v, text] = jobs[i];
      $("bar").value = Math.round((i / jobs.length) * 100);
      const ipa = chunks(dict, text).join(" | ");
      const file = `${v}-${(await hex(`${REVISION}|${v}|${ipa}`)).slice(0, 16)}.ogg`;
      const show = row(text, v), before = prev[v] && prev[v][text];
      if (!redo && before && before.file === file) {
        clips[v][text] = before; kept++; bytes += before.bytes;
        show("déjà fait", file);
        continue;
      }
      if (!loaded) { status("Chargement de la voix…"); await voice.ready(); loaded = true; }
      status(`Fabrication ${i + 1} / ${jobs.length}…`);
      const samples = join(await voice.say(text, v));
      const ogg = await encodeOpus(samples);
      await put(file, ogg, "audio/ogg");
      clips[v][text] = { file, ipa, ms: Math.round((samples.length / RATE) * 1000), bytes: ogg.length };
      made++; bytes += ogg.length;
      show(`${(ogg.length / 1024).toFixed(1)} Ko, ${(samples.length / RATE).toFixed(1)} s`, file);
    }
    const index = { version: 1, model: MODEL_ID, revision: REVISION, rate: RATE, clips };
    await put("index.json", JSON.stringify(index, null, 1), "application/json");
    $("bar").value = 100;
    status(`Terminé : ${made} fabriqués, ${kept} gardés · ${jobs.length} sons, ${(bytes / 1024).toFixed(0)} Ko au total.`);
  } catch (e) {
    status("Erreur : " + (e && e.message ? e.message : e));
  } finally {
    voice.close();
    $("go").disabled = false;
  }
}

$("go").addEventListener("click", run);
