// Essai du direct (phase 5) avec le vrai code de l'appli : js/engine/live.js (connexion, corrections) et
// js/engine/live-audio.js (micro envoyé pendant qu'on parle, voix jouée au fil de l'eau). Hors de l'appli : rien n'est
// enregistré. La clé est celle des Réglages ; elle ne part que dans un en-tête, pour créer un jeton à usage unique.
import { loadKey } from "../js/core/keys.js";
import { instructions } from "../js/core/chat.js";
import { LiveChat } from "../js/engine/live.js";
import { MicStream, Player } from "../js/engine/live-audio.js";
import { errorText } from "../js/engine/gemini.js";

const $ = (id) => document.getElementById(id);
const t0 = performance.now(), ms = () => Math.round(performance.now() - t0);
window.__live = { events: [], corrections: [], said: [], heard: [], errors: [], audio: 0 }; // pour les essais automatiques
function log(msg) { window.__live.events.push(`${ms()} ${msg}`); $("log").textContent += `${ms()} ms · ${msg}\n`; }
const status = (msg) => { $("status").textContent = msg; };
function bubble(cls, text) {
  const d = document.createElement("div"); d.className = `bubble ${cls}`;
  const s = document.createElement("span"); s.textContent = text; d.append(s); $("chat").append(d); return s;
}

const player = new Player();
let chat = null, mic = null, aiSpan = null, meSpan = null, endAt = 0, firstAudio = false;

function on(type, data) {
  const L = window.__live;
  if (type === "status") { status(data); return; }
  if (type === "ready") { log(data.resumed ? "reconnecté" : "configuration acceptée"); status("Connecté."); $("talk").disabled = false; return; }
  if (type === "audio") { L.audio++; player.play(data); if (endAt && !firstAudio) { firstAudio = true; log(`1er son de la réponse ${Math.round(performance.now() - endAt)} ms après la fin de ta phrase`); } return; }
  if (type === "heard") { if (!meSpan) meSpan = bubble("me", ""); meSpan.textContent += data; L.heard.push(data); return; }
  if (type === "reply") { if (!aiSpan) aiSpan = bubble("ai", ""); aiSpan.textContent += data; L.said.push(data); return; }
  if (type === "correction") {
    L.corrections.push(data); log("correction reçue");
    const s = bubble("me", [`Tu as dit : ${data.heard}`, data.ok ? "✓ Correct" : `✗ Corrigé : ${data.corrected}`,
      data.explanation_fr && `💡 ${data.explanation_fr}`, data.natural && `🗣 Un natif dirait : ${data.natural}`].filter(Boolean).join("\n"));
    s.parentElement.classList.add("correction"); return;
  }
  if (type === "interrupted") { player.stop(); log("réponse interrompue"); return; }
  if (type === "turnDone") { log("fin de la réponse"); aiSpan = meSpan = null; endAt = 0; status("À toi : clique sur 🎤 Parler."); return; }
  if (type === "slow") { log("Google prend son temps"); status("Google prend son temps…"); return; }
  if (type === "error") { L.errors.push(data); log(`erreur : ${data}`); status(errorText(data)); $("retry").disabled = data !== "no_reply"; return; }
  if (type === "closed") { log("conversation terminée"); status("Conversation terminée."); }
}

async function connect() {
  const key = loadKey();
  if (!key) { status("Colle d'abord ta clé dans ⚙️ Réglages de l'appli (http://localhost:8000/#reglages)."); return; }
  $("connect").disabled = true; $("hangup").disabled = false;
  player.unlock(); // le son doit être autorisé par un clic
  chat = new LiveChat({ key, on, opening: "(The learner just walked in. Greet them in your role.)",
    instructions: instructions({ persona: "Sam, a friendly barista in a London café", situation: "The learner comes in to order a drink.", goal: "order a drink and pay", level: "A2" }) });
  window.__live.chat = chat;
  await chat.start();
}

async function talk() {
  if (mic) { finish(); return; }
  player.stop(); $("retry").disabled = true;
  if (!chat.beginTurn()) return;
  $("talk").textContent = "⏹ J'ai fini"; status("Je t'écoute…");
  mic = new MicStream({ onChunk: (c) => chat.audio(c), onEnd: () => finish() });
  try { await mic.start(); log("micro ouvert (son envoyé en direct)"); }
  catch (e) { mic = null; $("talk").textContent = "🎤 Parler"; status(errorText("mic")); log("micro : " + e.message); }
}
function finish() {
  const m = mic; mic = null;
  if (!m) return;
  m.stop(); $("talk").textContent = "🎤 Parler";
  chat.endTurn(); endAt = performance.now(); firstAudio = false;
  log(m.heard ? "fin de ta phrase" : "fin (rien entendu ?)"); status("Sam réfléchit…");
}

$("connect").addEventListener("click", connect);
$("talk").addEventListener("click", talk);
$("retry").addEventListener("click", () => { $("retry").disabled = true; status("Je renvoie ta phrase…"); endAt = performance.now(); firstAudio = false; chat.retry(); });
$("hangup").addEventListener("click", () => { if (mic) { mic.stop(); mic = null; } if (chat) chat.close(); player.stop(); $("connect").disabled = false; $("talk").disabled = true; $("hangup").disabled = true; });
