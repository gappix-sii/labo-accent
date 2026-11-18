// Tests de la phase 5, tâche 2 : le direct (Gemini Live) avec un faux WebSocket et de faux minuteurs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LiveChat, createToken, setupMessage, parseServer, WS_URL, SLOW_MS, NO_REPLY_MS } from "../js/engine/live.js";
import { f32ToPcm64, pcm64ToF32, Resampler, SilenceDetector, rms } from "../js/engine/live-audio.js";
import { cleanCorrection, cleanText, instructions, closeError, CORRECTION_TOOL } from "../js/core/chat.js";
import { MODELS, errorText } from "../js/engine/gemini.js";

const FAKE = "test-key-not-real-0123456789abcdefXYZ", TOKEN = "auth_tokens/faux-jeton-0123456789";
const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

// Faux WebSocket : garde les messages envoyés ; le test « reçoit » avec srv().
class FakeWS {
  static all = [];
  constructor(url) { this.url = url; this.sent = []; FakeWS.all.push(this); queueMicrotask(() => this.onopen && this.onopen()); }
  send(s) { this.sent.push(JSON.parse(s)); }
  close(code = 1000, reason = "") { this.closedWith = code; queueMicrotask(() => this.onclose && this.onclose({ code, reason })); }
  srv(m) { return this.onmessage({ data: JSON.stringify(m) }); }
}
// Faux minuteurs : avance(ms) déclenche ceux qui sont dus.
function clock() {
  let t = 0, id = 0; const timers = new Map();
  return {
    now: () => 1.7e12 + t,
    setTimeout: (fn, ms) => { timers.set(++id, { fn, at: t + ms }); return id; },
    clearTimeout: (i) => timers.delete(i),
    advance(ms) { t += ms; for (const [i, x] of [...timers]) if (x.at <= t) { timers.delete(i); x.fn(); } }
  };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

async function connected(extra = {}) {
  FakeWS.all = [];
  const events = [], c = clock();
  const fetchFn = async (url, opts) => { fetchFn.url = url; fetchFn.opts = opts; return json(200, { name: TOKEN }); };
  const chat = new LiveChat({ key: FAKE, instructions: "Be Sam.", opening: "(Greet the learner.)", on: (type, data) => events.push([type, data]),
    deps: { fetchFn, WS: FakeWS, setTimeout: c.setTimeout, clearTimeout: c.clearTimeout, now: c.now }, ...extra });
  await chat.start(); await tick();
  const ws = FakeWS.all[0];
  await ws.srv({ setupComplete: {} });
  return { chat, ws, events, c, fetchFn };
}

test("jeton : la clé part dans l'en-tête, seul le jeton va dans l'adresse de la connexion", async () => {
  const { ws, fetchFn } = await connected();
  assert.equal(fetchFn.url, "https://generativelanguage.googleapis.com/v1beta/auth_tokens");
  assert.equal(fetchFn.opts.method, "POST");
  assert.equal(fetchFn.opts.headers["x-goog-api-key"], FAKE);
  const body = JSON.parse(fetchFn.opts.body);
  assert.equal(body.uses, 1);
  assert.ok(Date.parse(body.newSessionExpireTime) - Date.parse(body.expireTime) < 0);
  assert.equal(ws.url, `${WS_URL}?access_token=${encodeURIComponent(TOKEN)}`);
  assert.ok(!ws.url.includes(FAKE), "jamais la clé dans l'adresse");
  for (const [status, code] of [[403, "key"], [429, "quota"], [503, "server"]])
    assert.deepEqual(await createToken(FAKE, { fetchFn: async () => json(status, {}) }), { ok: false, error: code });
  assert.deepEqual(await createToken(FAKE, { fetchFn: async () => json(200, { name: "<script>" }) }), { ok: false, error: "unexpected" });
  assert.deepEqual(await createToken(null), { ok: false, error: "no_key" });
});

test("configuration : modèle du direct, voix, consignes, correction, fin de phrase signalée par nous", async () => {
  const { ws } = await connected();
  const s = ws.sent[0].setup;
  assert.equal(s.model, `models/${MODELS.live}`);
  assert.deepEqual(s.generationConfig.responseModalities, ["AUDIO"]);
  assert.equal(s.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, "Kore");
  assert.equal(s.systemInstruction.parts[0].text, "Be Sam.");
  assert.deepEqual(s.tools, [CORRECTION_TOOL]);
  assert.equal(s.realtimeInputConfig.automaticActivityDetection.disabled, true);
  assert.deepEqual(ws.sent[1], { clientContent: { turns: [{ role: "user", parts: [{ text: "(Greet the learner.)" }] }], turnComplete: true } }, "le personnage ouvre la conversation");
  assert.deepEqual(setupMessage({ instructions: "x", handle: "h1" }).setup.sessionResumption, { handle: "h1" });
});

test("ta phrase au micro, puis la réponse : son, texte, ce que Google a entendu, correction nettoyée", async () => {
  const { chat, ws, events } = await connected();
  chat.beginTurn();
  chat.audio(new Float32Array(1600).fill(0.1));
  chat.endTurn();
  assert.deepEqual(ws.sent.slice(2).map((m) => Object.keys(m.realtimeInput)[0]), ["activityStart", "audio", "activityEnd"]);
  assert.equal(ws.sent[3].realtimeInput.audio.mimeType, "audio/pcm;rate=16000");
  await ws.srv({ serverContent: { inputTranscription: { text: "Hi, a coffee please" } } });
  await ws.srv({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: "AAAA" } }] }, outputTranscription: { text: "Sure!" } } });
  await ws.srv({ toolCall: { functionCalls: [{ id: "f1", name: "show_correction", args: { heard: "I want also <b>tea</b>\u0007", ok: false, corrected: "I also want tea.", explanation_fr: "« also » avant le verbe.", natural: "I'd like some tea too." } }] } });
  await ws.srv({ serverContent: { turnComplete: true } });
  const types = events.map((e) => e[0]);
  assert.deepEqual(types.filter((t) => t !== "status"), ["ready", "heard", "audio", "reply", "correction", "turnDone"]);
  const corr = events.find((e) => e[0] === "correction")[1];
  assert.equal(corr.heard, "I want also <b>tea</b>", "caractère de contrôle retiré ; le texte sera affiché comme texte");
  assert.equal(corr.corrected, "I also want tea.");
  assert.deepEqual(ws.sent.at(-1), { toolResponse: { functionResponses: [{ id: "f1", name: "show_correction", response: { result: "shown" }, scheduling: "SILENT" }] } }, "réponse silencieuse à la fonction");
});

test("pas de réponse : « Google prend son temps », puis « Réessaie » qui renvoie la phrase", async () => {
  const { chat, ws, events, c } = await connected();
  chat.beginTurn(); chat.audio(new Float32Array(1600)); chat.audio(new Float32Array(1600)); chat.endTurn();
  c.advance(SLOW_MS);
  assert.ok(events.some((e) => e[0] === "slow"));
  c.advance(NO_REPLY_MS - SLOW_MS);
  assert.deepEqual(events.at(-1), ["error", "no_reply"]);
  const n = ws.sent.length;
  const p = chat.retry();
  for (let i = 0; i < 3; i++) { await tick(); c.advance(100); }
  await p;
  assert.deepEqual(ws.sent.slice(n).map((m) => Object.keys(m.realtimeInput)[0]), ["activityStart", "audio", "audio", "activityEnd"]);
  // une réponse arrive : plus d'erreur
  const before = events.length;
  await ws.srv({ serverContent: { outputTranscription: { text: "Sorry!" } } });
  c.advance(NO_REPLY_MS);
  assert.ok(!events.slice(before).some((e) => e[0] === "error"));
  // texte tapé
  assert.equal(chat.text("  I am agree.  "), true);
  assert.deepEqual(ws.sent.at(-1), { clientContent: { turns: [{ role: "user", parts: [{ text: "I am agree." }] }], turnComplete: true } });
  assert.equal(chat.text("   "), false);
});

test("coupure de Google au bout de 15 min : reconnexion en reprenant le fil ; refus : message clair", async () => {
  const { chat, ws, events } = await connected();
  await ws.srv({ sessionResumptionUpdate: { newHandle: "reprise-1", resumable: true } });
  await ws.srv({ goAway: { timeLeft: "10s" } });
  await tick();
  assert.equal(FakeWS.all.length, 2);
  const ws2 = FakeWS.all[1];
  await tick();
  assert.equal(ws2.sent[0].setup.sessionResumption.handle, "reprise-1");
  await ws2.srv({ setupComplete: {} });
  assert.deepEqual(events.filter((e) => e[0] === "ready").map((e) => e[1]), [{ resumed: false }, { resumed: true }]);
  assert.equal(ws2.sent.length, 1, "pas de nouvelle salutation après la reprise");
  // fermeture inattendue sans reprise possible
  const b = await connected();
  b.ws.onclose({ code: 1008, reason: "API key not valid" });
  assert.deepEqual(b.events.at(-1), ["error", "key"]);
  const c2 = await connected();
  c2.chat.close();
  assert.equal(c2.events.at(-1)[0], "closed");
  assert.equal(c2.ws.closedWith, 1000);
});

test("messages de Google mal formés : ignorés sans planter", () => {
  for (const m of [null, 42, "x", {}, { serverContent: 1 }, { serverContent: { modelTurn: { parts: "x" } } }, { toolCall: { functionCalls: [null, 1, { name: "autre" }] } }, { sessionResumptionUpdate: { newHandle: 5, resumable: true } }])
    assert.doesNotThrow(() => parseServer(m));
  assert.deepEqual(parseServer({ toolCall: { functionCalls: [{ id: "x", name: "show_correction", args: "pas un objet" }] } }), [{ type: "call", id: "x", name: "show_correction", correction: null }]);
  assert.deepEqual(parseServer({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: "image/png", data: "x" } }] } } }), []);
});

test("corrections et consignes", () => {
  assert.equal(cleanCorrection(null), null);
  assert.equal(cleanCorrection({ ok: true }), null);
  assert.deepEqual(cleanCorrection({ heard: "Hello.", ok: true, explanation_fr: "rien à dire" }), { heard: "Hello.", ok: true, corrected: "Hello.", explanation_fr: "", natural: "" });
  assert.equal(cleanCorrection({ heard: "x".repeat(900), ok: false }).heard.length, 400);
  assert.equal(cleanText("a\u202eb\u200bc", 10), "a b c");
  assert.deepEqual(parseServer({ serverContent: { outputTranscription: { text: " to the café." } } }), [{ type: "reply", text: " to the café." }], "espaces gardés entre les morceaux");
  const t = instructions({ persona: "Sam, a barista", situation: "A café in London.", goal: "order a drink", level: "B1" });
  assert.match(t, /You are Sam, a barista\./);
  assert.match(t, /level B1/);
  assert.match(t, /show_correction/);
  assert.match(instructions({ level: "Z9" }), /level A2/);
  assert.equal(closeError(1011, ""), "server");
  assert.equal(closeError(1008, "Quota exceeded"), "quota");
  for (const code of ["no_reply", "setup", "closed", "mic"]) assert.ok(errorText(code).length > 10);
});

test("son : conversions, rééchantillonnage 48 → 16 kHz, fin de phrase détectée", () => {
  const x = Float32Array.from({ length: 800 }, (_, i) => Math.sin(i / 10) * 0.5);
  const y = pcm64ToF32(f32ToPcm64(x));
  assert.equal(y.length, x.length);
  assert.ok(Math.max(...x.map((v, i) => Math.abs(v - y[i]))) < 1e-4);
  assert.equal(pcm64ToF32("pas du base64 !").length, 0);
  const rs = new Resampler(48000);
  let n = 0;
  for (let k = 0; k < 10; k++) n += rs.push(new Float32Array(128)).length; // 1280 échantillons à 48 kHz
  assert.ok(Math.abs(n - 1280 / 3) <= 1, `${n} échantillons à 16 kHz`);
  const d = new SilenceDetector();
  for (let i = 0; i < 5; i++) assert.equal(d.push(0.1, 100), false); // 0,5 s de parole
  for (let i = 0; i < 11; i++) assert.equal(d.push(0, 100), false);
  assert.equal(d.push(0, 100), true, "1,2 s de silence après la parole");
  assert.equal(d.heard, true);
  const quiet = new SilenceDetector();
  for (let i = 0; i < 50; i++) quiet.push(0, 100);
  assert.equal(quiet.heard, false, "silence seul : rien entendu");
  assert.equal(rms(new Float32Array(0)), 0);
});

test("voix du direct : 30 voix, réglage sauvegardé et nettoyé, écoute d'une voix", async () => {
  const { LIVE_VOICES, DEFAULT_LIVE_VOICE, liveVoiceOk, SAMPLE_TEXT } = await import("../js/core/chat.js");
  const { defaults, sanitize } = await import("../js/core/store.js");
  const { sayOnce } = await import("../js/engine/live.js");
  assert.equal(LIVE_VOICES.length, 30);
  assert.equal(new Set(LIVE_VOICES.map((v) => v.id)).size, 30);
  assert.ok(LIVE_VOICES.every((v) => /^[A-Z][a-z]{2,20}$/.test(v.id) && v.style));
  assert.equal(defaults().liveVoice, DEFAULT_LIVE_VOICE);
  assert.equal(sanitize({ ...defaults(), liveVoice: "Puck" }).liveVoice, "Puck");
  assert.equal(sanitize({ ...defaults(), liveVoice: "<img>" }).liveVoice, "Kore");
  assert.equal(liveVoiceOk("Sulafat"), true);
  assert.deepEqual(setupMessage({ instructions: "x", correction: false }).setup.tools, []);
  FakeWS.all = [];
  const played = [];
  const p = sayOnce({ key: FAKE, voice: "Puck", text: SAMPLE_TEXT, play: (b) => played.push(b), deps: { fetchFn: async () => json(200, { name: TOKEN }), WS: FakeWS } });
  await tick(); await tick();
  const ws = FakeWS.all[0];
  await tick();
  assert.equal(ws.sent[0].setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, "Puck");
  assert.deepEqual(ws.sent[0].setup.tools, [], "pas de correction pour un échantillon");
  await ws.srv({ setupComplete: {} });
  assert.match(ws.sent[1].clientContent.turns[0].parts[0].text, /Shall we have a little chat/);
  await ws.srv({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: "AAAA" } }] } } });
  await ws.srv({ serverContent: { turnComplete: true } });
  assert.deepEqual(await p, { ok: true });
  assert.deepEqual(played, ["AAAA"]);
  assert.equal(ws.closedWith, 1000, "on raccroche après l'échantillon");
});
