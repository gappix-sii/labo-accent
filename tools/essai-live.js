// Essai du direct (phase 5) : Gemini Live répond à voix haute (voix de Gemini) et envoie, à côté, la correction
// de ta phrase par un appel de fonction « show_correction ». Page d'essai, hors de l'appli : rien n'est enregistré.
// Sécurité : la clé (entrée « labo.gemini » des Réglages) ne part que dans l'en-tête x-goog-api-key, pour créer un
// jeton à usage unique ; c'est ce jeton, pas la clé, qui va dans l'adresse de la connexion en direct.
import { loadKey } from "../js/core/keys.js";
import { Recorder } from "../js/engine/recorder.js";

const HOST = "https://generativelanguage.googleapis.com";
const WS = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";
const MODEL = "gemini-3.8-live", VOICE = "Kore";

const SYS = `You are Sam, a friendly barista in a London café. The learner is French, level A2, and practises English by ordering a drink.
Speak only English, short sentences (one or two), natural and warm. Keep the conversation going with a simple question.
After EACH thing the learner says: FIRST answer them out loud in your role (never mention their mistakes aloud),
THEN call the function show_correction with: what they said, whether it was correct, the corrected sentence
(numbers written in words), a short explanation in French of each error, and how a native would say it.`;

const TOOLS = [{ functionDeclarations: [{
  name: "show_correction",
  description: "Shows the learner, on screen, the correction of what they just said. Call it after every learner message.",
  behavior: "NON_BLOCKING",
  parameters: { type: "OBJECT", properties: {
    heard: { type: "STRING", description: "Exact transcription of what the learner said" },
    ok: { type: "BOOLEAN", description: "true if the learner's sentence was correct English" },
    corrected: { type: "STRING", description: "The learner's sentence corrected (same as heard if ok); numbers in words" },
    explanation_fr: { type: "STRING", description: "Short friendly explanation in French of each error, empty if ok" },
    natural: { type: "STRING", description: "How a native speaker would say it" }
  }, required: ["heard", "ok", "corrected", "explanation_fr", "natural"] }
}] }];

const $ = (id) => document.getElementById(id);
const t0 = performance.now(), ms = () => Math.round(performance.now() - t0);
window.__live = { events: [], corrections: [], said: [], heard: [], errors: [], send: (m) => ws && ws.send(JSON.stringify(m)) }; // pour les essais automatiques
function log(msg) { window.__live.events.push(`${ms()} ${msg}`); $("log").textContent += `${ms()} ms · ${msg}\n`; }
function status(msg) { $("status").textContent = msg; }
function bubble(cls, text) {
  const d = document.createElement("div"); d.className = `bubble ${cls}`;
  const s = document.createElement("span"); s.textContent = text; d.append(s); $("chat").append(d); return s;
}

// ---- son : Float32 16 kHz → PCM 16 bits base64 ; PCM 24 kHz reçu → lecture enchaînée ----
function pcm16Base64(f32) {
  const b = new Uint8Array(f32.length * 2), v = new DataView(b.buffer);
  for (let i = 0; i < f32.length; i++) { const s = Math.max(-1, Math.min(1, f32[i])); v.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  let bin = ""; for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(bin);
}
let out = null, playAt = 0, firstAudioAt = 0, sentAt = 0;
function play(b64) {
  if (!out) out = new AudioContext({ sampleRate: 24000 });
  const bin = atob(b64), n = bin.length >> 1, buf = out.createBuffer(1, n, 24000), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) { let x = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); if (x >= 0x8000) x -= 0x10000; ch[i] = x / 0x8000; }
  const src = out.createBufferSource(); src.buffer = buf; src.connect(out.destination);
  playAt = Math.max(playAt, out.currentTime + 0.05); src.start(playAt); playAt += buf.duration;
  if (sentAt && !firstAudioAt) { firstAudioAt = performance.now(); log(`1er son de la réponse ${Math.round(firstAudioAt - sentAt)} ms après la fin de ta phrase`); }
}

// ---- connexion ----
let ws = null, aiSpan = null, meSpan = null;
async function token(key) {
  const now = Date.now();
  const r = await fetch(`${HOST}/v1beta/auth_tokens`, {
    method: "POST", mode: "cors", credentials: "omit", cache: "no-store", redirect: "error", referrerPolicy: "strict-origin",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ uses: 1, expireTime: new Date(now + 30 * 60e3).toISOString(), newSessionExpireTime: new Date(now + 60e3).toISOString() })
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`jeton refusé (HTTP ${r.status}) : ${text.slice(0, 300)}`);
  const j = JSON.parse(text);
  if (typeof j.name !== "string") throw new Error("jeton : réponse inattendue " + text.slice(0, 200));
  return j.name;
}

async function connect() {
  const key = loadKey();
  if (!key) { status("Colle d'abord ta clé dans ⚙️ Réglages de l'appli (http://localhost:8000/#reglages)."); return; }
  $("connect").disabled = true; status("Création du jeton…");
  let tk;
  try { tk = await token(key); log("jeton à usage unique reçu"); }
  catch (e) { window.__live.errors.push(String(e.message)); log(e.message); status("Échec : " + e.message); $("connect").disabled = false; return; }
  status("Connexion en direct…");
  ws = new WebSocket(`${WS}?access_token=${encodeURIComponent(tk)}`);
  ws.onopen = () => {
    log("connexion ouverte, envoi de la configuration");
    ws.send(JSON.stringify({ setup: {
      model: `models/${MODEL}`,
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
      systemInstruction: { parts: [{ text: SYS }] },
      tools: TOOLS,
      inputAudioTranscription: {}, outputAudioTranscription: {},
      ...(window.__vad !== "auto" ? { realtimeInputConfig: { automaticActivityDetection: { disabled: true } } } : {})
    } }));
    log(`détection de fin de phrase : ${window.__vad !== "auto" ? "manuelle" : "automatique (Google)"}`);
  };
  ws.onmessage = async (ev) => {
    const raw = typeof ev.data === "string" ? ev.data : await ev.data.text();
    let m; try { m = JSON.parse(raw); } catch { log("message illisible"); return; }
    onServer(m);
  };
  ws.onerror = () => { log("erreur de connexion"); window.__live.errors.push("ws error"); };
  ws.onclose = (ev) => { log(`connexion fermée (code ${ev.code}${ev.reason ? ", " + ev.reason : ""})`); if (ev.code !== 1000) window.__live.errors.push(`close ${ev.code} ${ev.reason}`); status(`Déconnecté (${ev.code}${ev.reason ? " : " + ev.reason : ""}).`); $("talk").disabled = true; $("hangup").disabled = true; $("connect").disabled = false; };
  $("hangup").disabled = false;
}

function onServer(m) {
  const keys = Object.keys(m).filter((k) => k !== "usageMetadata");
  if (m.setupComplete) {
    log("configuration acceptée"); status("Connecté : Sam va te saluer.");
    $("talk").disabled = false;
    ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: "(The learner just walked in. Greet them in your role.)" }] }], turnComplete: true } }));
    return;
  }
  if (m.serverContent) {
    const c = m.serverContent;
    for (const p of (c.modelTurn && c.modelTurn.parts) || []) {
      if (p.inlineData && p.inlineData.data) { window.__live.audio = (window.__live.audio || 0) + 1; play(p.inlineData.data); }
      else if (p.text) log(`texte du modèle : ${p.text.slice(0, 120)}`);
    }
    if (c.inputTranscription && c.inputTranscription.text) { if (!meSpan) meSpan = bubble("me", ""); meSpan.textContent += c.inputTranscription.text; window.__live.heard.push(c.inputTranscription.text); }
    if (c.outputTranscription && c.outputTranscription.text) { if (!aiSpan) aiSpan = bubble("ai", ""); aiSpan.textContent += c.outputTranscription.text; window.__live.said.push(c.outputTranscription.text); }
    if (c.interrupted) log("réponse interrompue");
    if (c.turnComplete) { log("fin de la réponse"); aiSpan = null; meSpan = null; status("À toi : clique sur 🎤 Parler."); }
    return;
  }
  if (m.toolCall) {
    for (const fc of m.toolCall.functionCalls || []) {
      log(`correction reçue (${fc.name})`);
      if (fc.name === "show_correction") {
        const a = fc.args || {}; window.__live.corrections.push(a);
        const box = bubble("me", ""), lines = [
          `Tu as dit : ${a.heard || ""}`, a.ok ? "✓ Correct" : `✗ Corrigé : ${a.corrected || ""}`,
          a.explanation_fr ? `💡 ${a.explanation_fr}` : "", a.natural ? `🗣 Un natif dirait : ${a.natural}` : ""];
        box.textContent = lines.filter(Boolean).join("\n"); box.parentElement.classList.add("correction");
      }
      ws.send(JSON.stringify({ toolResponse: { functionResponses: [{ id: fc.id, name: fc.name, response: { result: "shown" }, scheduling: window.__sched || "SILENT" }] } }));
    }
    return;
  }
  if (m.goAway) { log(`Google va couper la connexion dans ${m.goAway.timeLeft || "?"}`); return; }
  if (!keys.length) return; // seulement le décompte des jetons (usageMetadata)
  log(`autre message : ${keys.join(", ")} ${JSON.stringify(m).slice(0, 200)}`);
}

// ---- ton tour : enregistrement (arrêt auto en fin de phrase), puis envoi d'un bloc ----
let rec = null;
async function talk() {
  if (rec) { $("talk").textContent = "Analyse…"; const r = rec; rec = null; await r.stop(); return; }
  $("talk").textContent = "⏹ J'ai fini"; status("Je t'écoute…");
  rec = new Recorder({ onAutoStop: () => { if (rec) talk(); } });
  const mine = rec;
  try { await mine.start(); } catch (e) { rec = null; status("Micro indisponible : " + e.message); $("talk").textContent = "🎤 Parler"; return; }
  const origStop = mine.stop.bind(mine);
  mine.stop = async () => {
    const res = await origStop();
    $("talk").textContent = "🎤 Parler";
    if (!res || !res.pcm || !res.heardSpeech) { status("Je n'ai rien entendu, réessaie."); return res; }
    const s = res.pcm.samples;
    log(`envoi de ta phrase (${(s.length / 16000).toFixed(1)} s)`);
    const manual = window.__vad !== "auto";
    if (manual) ws.send(JSON.stringify({ realtimeInput: { activityStart: {} } }));
    // détection automatique : 1 s de silence après la phrase, pour que Google entende qu'elle est finie
    const all = manual ? s : (() => { const x = new Float32Array(s.length + 16000); x.set(s); return x; })();
    // tout d'un bloc (window.__pace = 100 : au rythme réel) ; fin de phrase signalée à la main (activityEnd), plus fiable à l'essai
    const pace = window.__pace ?? 0;
    for (let i = 0; i < all.length; i += 1600) {
      ws.send(JSON.stringify({ realtimeInput: { audio: { mimeType: "audio/pcm;rate=16000", data: pcm16Base64(all.subarray(i, i + 1600)) } } }));
      if (pace) await new Promise((r) => setTimeout(r, pace));
    }
    ws.send(JSON.stringify({ realtimeInput: manual ? { activityEnd: {} } : { audioStreamEnd: true } }));
    sentAt = performance.now(); firstAudioAt = 0; status("Sam réfléchit…");
    return res;
  };
}

$("connect").addEventListener("click", connect);
$("talk").addEventListener("click", talk);
$("hangup").addEventListener("click", () => { if (ws) ws.close(1000, "fin"); });
