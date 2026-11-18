// Le direct (phase 5) : conversation vocale avec Gemini Live, qui répond avec sa voix et envoie la correction
// de chaque phrase par la fonction show_correction (js/core/chat.js). Mis au point sur une page d'essai (retirée en fin de phase).
// Sécurité : la clé ne part que dans l'en-tête x-goog-api-key, pour créer un jeton à usage unique (1 min pour
// ouvrir la connexion, 30 min de validité) ; seul ce jeton va dans l'adresse de la connexion.
// Réseau et minuteurs sont injectables (deps) : les tests Node utilisent un faux WebSocket (test/live.test.mjs).
import { request, MODELS } from "./gemini.js";
import { CORRECTION_TOOL, cleanCorrection, cleanText, cleanChunk, closeError } from "../core/chat.js";
import { f32ToPcm64 } from "./live-audio.js";

export const WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";
export { DEFAULT_LIVE_VOICE as DEFAULT_VOICE } from "../core/chat.js";
import { DEFAULT_LIVE_VOICE as DEFAULT_VOICE } from "../core/chat.js";
export const SLOW_MS = 8000, NO_REPLY_MS = 20000; // « Google prend son temps… », puis « Réessaie »
const TOKEN_MS = 30 * 60e3, OPEN_MS = 60e3, MAX_RECONNECT = 3;

// Jeton à usage unique, créé avec la clé (dans l'en-tête). Renvoie { ok, token, expires } ou { ok: false, error }.
export async function createToken(key, { now = Date.now(), ...opts } = {}) {
  const r = await request("auth_tokens", key, {
    method: "POST", ...opts,
    body: { uses: 1, expireTime: new Date(now + TOKEN_MS).toISOString(), newSessionExpireTime: new Date(now + OPEN_MS).toISOString() }
  });
  if (!r.ok) return r;
  const t = r.data && typeof r.data.name === "string" ? r.data.name : "";
  return /^[A-Za-z0-9_./-]{10,400}$/.test(t) ? { ok: true, token: t, expires: now + TOKEN_MS } : { ok: false, error: "unexpected" };
}

// Premier message : modèle, voix, consignes, fonction de correction, transcriptions, fin de phrase signalée par nous.
export function setupMessage({ instructions, voice = DEFAULT_VOICE, handle = null, correction = true }) {
  return { setup: {
    model: `models/${MODELS.live}`,
    generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
    systemInstruction: { parts: [{ text: instructions }] },
    tools: correction ? [CORRECTION_TOOL] : [],
    inputAudioTranscription: {}, outputAudioTranscription: {},
    realtimeInputConfig: { automaticActivityDetection: { disabled: true } },
    sessionResumption: handle ? { handle } : {}
  } };
}

export const audioMessage = (f32) => ({ realtimeInput: { audio: { mimeType: "audio/pcm;rate=16000", data: f32ToPcm64(f32) } } });
export const textMessage = (text) => ({ clientContent: { turns: [{ role: "user", parts: [{ text }] }], turnComplete: true } });

// Message de Google → liste d'évènements simples pour l'écran. Tout le reste est ignoré.
export function parseServer(m) {
  const ev = [];
  if (!m || typeof m !== "object") return ev;
  if (m.setupComplete) ev.push({ type: "ready" });
  const c = m.serverContent;
  if (c && typeof c === "object") {
    for (const p of (c.modelTurn && Array.isArray(c.modelTurn.parts) ? c.modelTurn.parts : [])) {
      if (p && p.inlineData && typeof p.inlineData.data === "string" && /^audio\/pcm/.test(p.inlineData.mimeType || "audio/pcm")) ev.push({ type: "audio", data: p.inlineData.data });
    }
    if (c.inputTranscription && typeof c.inputTranscription.text === "string") ev.push({ type: "heard", text: cleanChunk(c.inputTranscription.text, 400) });
    if (c.outputTranscription && typeof c.outputTranscription.text === "string") ev.push({ type: "reply", text: cleanChunk(c.outputTranscription.text, 800) });
    if (c.interrupted) ev.push({ type: "interrupted" });
    if (c.turnComplete) ev.push({ type: "turnDone" });
  }
  if (m.toolCall && Array.isArray(m.toolCall.functionCalls)) {
    for (const fc of m.toolCall.functionCalls) {
      if (!fc || typeof fc !== "object") continue;
      ev.push({ type: "call", id: typeof fc.id === "string" ? fc.id.slice(0, 200) : "", name: String(fc.name || "").slice(0, 60),
        correction: fc.name === "show_correction" ? cleanCorrection(fc.args) : null });
    }
  }
  if (m.voiceActivity && m.voiceActivity.type === "ACTIVITY_END") ev.push({ type: "heardEnd" });
  if (m.sessionResumptionUpdate && m.sessionResumptionUpdate.resumable && typeof m.sessionResumptionUpdate.newHandle === "string") ev.push({ type: "handle", handle: m.sessionResumptionUpdate.newHandle.slice(0, 400) });
  if (m.goAway) ev.push({ type: "goAway" });
  return ev;
}

// Une conversation. on(type, data) reçoit : status (texte), ready, audio, heard, reply, correction, turnDone,
// interrupted, slow, error (code), closed. Méthodes : start, text, beginTurn, audio, endTurn, retry, close.
export class LiveChat {
  constructor({ key, instructions, voice = DEFAULT_VOICE, opening, on, correction = true, deps = {} }) {
    Object.assign(this, { key, instructions, voice, opening, on, correction });
    this.d = { fetchFn: globalThis.fetch, WS: globalThis.WebSocket, setTimeout: globalThis.setTimeout.bind(globalThis), clearTimeout: globalThis.clearTimeout.bind(globalThis), now: Date.now, ...deps };
    this.ws = null; this.token = null; this.handle = null; this.ready = false; this.closed = false;
    this.turn = []; this.lastTurn = null; this.timers = []; this.reconnects = 0; this.waiting = false;
  }

  async start() {
    this.on("status", "Connexion à Gemini…");
    const t = await createToken(this.key, { fetchFn: this.d.fetchFn, now: this.d.now() });
    if (this.closed) return;
    if (!t.ok) { this.fail(t.error); return; }
    this.token = t;
    this.open();
  }

  open() {
    const ws = new this.d.WS(`${WS_URL}?access_token=${encodeURIComponent(this.token.token)}`);
    this.ws = ws; this.ready = false;
    ws.onopen = () => ws.send(JSON.stringify(setupMessage({ instructions: this.instructions, voice: this.voice, handle: this.handle, correction: this.correction })));
    ws.onmessage = async (e) => {
      let m;
      try { m = JSON.parse(typeof e.data === "string" ? e.data : await e.data.text()); } catch { return; }
      if (ws === this.ws) for (const ev of parseServer(m)) this.handleEvent(ev);
    };
    ws.onclose = (e) => { if (ws === this.ws) this.onClose(e.code, e.reason); };
    ws.onerror = () => {};
  }

  handleEvent(ev) {
    if (ev.type === "ready") {
      const first = !this.everReady;
      this.ready = true; this.everReady = true; this.reconnects = 0;
      this.on("ready", { resumed: !first });
      if (first && this.opening) this.send(textMessage(this.opening), true);
      return;
    }
    if (ev.type === "handle") { this.handle = ev.handle; return; }
    if (ev.type === "goAway") { this.reconnect(); return; }
    if (["audio", "reply", "heardEnd", "call", "turnDone"].includes(ev.type)) this.clearWait(); // Google a répondu
    if (ev.type === "call") {
      this.ws.send(JSON.stringify({ toolResponse: { functionResponses: [{ id: ev.id, name: ev.name, response: { result: "shown" }, scheduling: "SILENT" }] } }));
      if (ev.correction) this.on("correction", ev.correction);
      return;
    }
    if (ev.type !== "heardEnd") this.on(ev.type, ev.text ?? ev.data);
  }

  send(msg, expectReply = false) {
    if (!this.ws || !this.ready) return false;
    this.ws.send(JSON.stringify(msg));
    if (expectReply) this.wait();
    return true;
  }

  // Réponse attendue : au bout de SLOW_MS « Google prend son temps », au bout de NO_REPLY_MS erreur « no_reply ».
  wait() {
    this.clearWait(); this.waiting = true;
    this.timers = [this.d.setTimeout(() => this.on("slow"), SLOW_MS), this.d.setTimeout(() => { this.waiting = false; this.on("error", "no_reply"); }, NO_REPLY_MS)];
  }
  clearWait() { for (const t of this.timers) this.d.clearTimeout(t); this.timers = []; this.waiting = false; }

  text(t) { const s = cleanText(t, 500); if (!s) return false; this.lastTurn = { text: s }; return this.send(textMessage(s), true); }

  // Ta phrase au micro : beginTurn, puis audio() à chaque morceau de 100 ms, puis endTurn().
  beginTurn() { if (this.replaying) return false; this.clearWait(); this.turn = []; return this.send({ realtimeInput: { activityStart: {} } }); }
  // Phrase abandonnée (micro refusé…) : on referme sans attendre de réponse, la phrase précédente reste à renvoyer.
  cancelTurn() { this.turn = []; return this.send({ realtimeInput: { activityEnd: {} } }); }
  audio(f32) { const m = audioMessage(f32); this.turn.push(m); return this.send(m); }
  endTurn() { this.lastTurn = { audio: this.turn }; this.turn = []; return this.send({ realtimeInput: { activityEnd: {} } }, true); }

  // Renvoie ta dernière phrase (au rythme réel, comme au micro).
  async retry() {
    const last = this.lastTurn;
    if (!last || !this.ready) return false;
    if (last.text) return this.send(textMessage(last.text), true);
    if (this.replaying) return false;
    this.replaying = true;
    try {
      this.send({ realtimeInput: { activityStart: {} } });
      for (const m of last.audio) { if (!this.send(m)) return false; await new Promise((r) => this.d.setTimeout(r, 100)); }
      return this.send({ realtimeInput: { activityEnd: {} } }, true);
    } finally { this.replaying = false; }
  }

  // Google coupe une conversation au bout de 15 min (il prévient par goAway) : on se reconnecte en reprenant le fil.
  async reconnect() {
    if (this.closed || this.reconnects >= MAX_RECONNECT) return false;
    this.reconnects++;
    const old = this.ws; this.ws = null; this.ready = false;
    try { if (old) old.close(1000, "reconnexion"); } catch { /* rien */ }
    this.on("reconnecting");
    // Toujours un jeton neuf : le premier ne sert qu'une fois, et seulement pendant 1 minute pour ouvrir.
    const t = await createToken(this.key, { fetchFn: this.d.fetchFn, now: this.d.now() });
    if (!t.ok) { this.fail(t.error); return false; }
    this.token = t;
    if (this.closed) return false;
    this.open();
    return true;
  }

  onClose(code, reason) {
    this.ready = false;
    if (this.closed) return;
    if (this.everReady && this.handle && (code === 1000 || code === 1001 || code === 1006 || code === 1011) && this.reconnects < MAX_RECONNECT) { this.reconnect(); return; }
    this.fail(this.everReady ? closeError(code, reason) : closeError(code, reason) === "closed" ? "setup" : closeError(code, reason));
  }

  fail(code) { this.clearWait(); this.on("error", code); }

  close() {
    this.closed = true; this.clearWait();
    if (this.ws) { try { this.ws.close(1000, "fin"); } catch { /* rien */ } }
    this.ws = null; this.ready = false;
    this.on("closed");
  }
}

// Écoute d'une voix (réglages) : courte conversation en direct où la voix dit `text`, puis on raccroche.
// play(b64) joue le son reçu. Renvoie une promesse : { ok: true } ou { ok: false, error }.
// La promesse a une méthode cancel() (écran quitté) : on raccroche sans attendre.
export function sayOnce({ key, voice, text, play, deps }) {
  let cancel = () => {};
  const p = new Promise((resolve) => {
    let done = false;
    const end = (r) => { if (done) return; done = true; chat.close(); resolve(r); };
    const chat = new LiveChat({
      key, voice, deps, correction: false,
      instructions: "You are a voice sample. Say exactly the sentence you are given, in a warm and natural tone, and nothing else.",
      opening: `Say exactly: "${cleanText(text, 200)}"`,
      on: (type, data) => {
        if (type === "audio") play(data);
        else if (type === "turnDone") end({ ok: true });
        else if (type === "error") end({ ok: false, error: data });
      }
    });
    cancel = () => end({ ok: false, error: "closed" });
    chat.start();
  });
  p.cancel = () => cancel();
  return p;
}
