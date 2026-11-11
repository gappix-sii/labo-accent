// Labo d'accent : interface façon jeu. Aucune donnée ne quitte l'appareil (progression dans localStorage).
import * as P from "./phonemes.js";
import { CATEGORIES, SOUND_LESSONS, MINIMAL_PAIRS } from "./content.js";
import { Recorder, speak, englishVoices } from "./audio.js";
import * as G from "./game.js";
import { poufSvg, poufSay, pick } from "./mascot.js";
import { sfx, confetti } from "./fx.js";
import { VOCAB, LEVELS, sayText } from "./vocab.js";
import { DIALOGUES, STOP } from "./dialogues.js";

const COACH_URL = "https://claude.ai/artifact/NpBH4v48K7L87LiDVvxiFt";
const STORE = "labo.v1";
const TEST_LOCAL = ["127.0.0.1", "localhost"].includes(location.hostname) && new URLSearchParams(location.search).has("test");

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => dayKey(new Date());
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const ICON = {
  mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V22h2v-3.08A7 7 0 0 0 19 12z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor"/></svg>',
  spk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4zm12 .4 1.4-1.4L19.4 10l2-2 1.4 1.4-2 2 2 2-1.4 1.4-2-2-2 2-1.4-1.4 2-2z"/></svg>',
  slow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6zm-1 3v6l5 3 1-1.7-4-2.3V7z"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6 10.6 12 5 6.4z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>',
  pairs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 7h10l-3-3 1.4-1.4L21 8l-5.6 5.4L14 12l3-3H7zm10 10H7l3 3-1.4 1.4L3 16l5.6-5.4L10 12l-3 3h10z"/></svg>',
  review: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zm-7-2a2 2 0 0 1 4 0v2h-4z"/></svg>',
  star: on => `<svg viewBox="0 0 24 24" class="${on ? "on" : ""}" aria-hidden="true"><path fill="${on ? "#ffd23f" : "#3b2f80"}" stroke="${on ? "#c99a00" : "#1d1450"}" stroke-width="1.5" d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.6L12 17.1l-5.9 3.3 1.3-6.6-4.9-4.5 6.6-.8z"/></svg>`
};

// ---------------- Stockage local ----------------
const DEFAULTS = { history: [], sounds: {}, days: [], voice: "", slow: 0.7, modelReady: false, xp: 0, lessons: {}, badges: [],
  bestCombo: 0, xpDays: {}, goalXp: 50, sfx: true, poufVoice: true, onboarded: false, vocab: {}, vocabLevel: "A1", sessions: [], sessMin: 15, dialogues: {} };
let S = { ...DEFAULTS };
try { S = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE) || "{}") }; } catch (e) {}
function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { toast("Impossible d'enregistrer ta progression sur cet appareil."); } }
function streak() {
  const set = new Set(S.days); let n = 0; const d = new Date();
  if (!set.has(today())) d.setDate(d.getDate() - 1);
  while (set.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
const xpToday = () => S.xpDays[today()] || 0;
function avgScore(n = 30) { const h = S.history.slice(-n); return h.length ? Math.round(h.reduce((a, x) => a + x.s, 0) / h.length) : null; }
function play(name) { if (S.sfx) { try { sfx[name](); } catch (e) {} } }
function renderHud() {
  const st = $("#hStreak"); st.querySelector("span").textContent = streak(); st.classList.toggle("off", !S.days.includes(today()));
  $("#hXp span").textContent = S.xp;
  const v = $("#hVoice"); v.innerHTML = S.poufVoice ? ICON.spk : ICON.mute; v.setAttribute("aria-pressed", String(S.poufVoice));
  v.setAttribute("aria-label", S.poufVoice ? "Couper la voix de Pouf" : "Activer la voix de Pouf");
}
$("#hVoice").addEventListener("click", () => { S.poufVoice = !S.poufVoice; save(); renderHud(); if (!S.poufVoice && "speechSynthesis" in window) speechSynthesis.cancel(); });

// ---------------- Toast, dialogues, fête ----------------
let toastT;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3200); }
function confirmDlg(title, text, okLabel = "Confirmer") {
  const d = $("#dlg"); $("#dlgTitle").textContent = title; $("#dlgText").textContent = text; $("#dlgOk").textContent = okLabel;
  return new Promise(res => {
    const done = v => { d.close(); res(v); };
    $("#dlgOk").onclick = () => done(true); $("#dlgCancel").onclick = () => done(false); d.oncancel = () => res(false);
    d.showModal();
  });
}
function celebrate(title, text, inner = "") {
  const d = $("#cel");
  $("#celBody").innerHTML = `<div class="av">${poufSvg("happy")}</div><h2>${esc(title)}</h2><p>${esc(text)}</p>${inner}<button class="btn yellow block" id="celOk">Super !</button>`;
  return new Promise(res => { $("#celOk").onclick = () => { d.close(); res(); }; d.oncancel = () => res(); d.showModal(); });
}
const fx = () => confetti($("#fx"));

// ---------------- Dictionnaire ----------------
let dict = null, dictLoading = null;
function loadDict() {
  if (dict) return Promise.resolve(dict);
  if (!dictLoading) dictLoading = fetch("data/cmudict.json").then(r => { if (!r.ok) throw new Error("dict"); return r.json(); }).then(d => (dict = d)).catch(e => { dictLoading = null; throw e; });
  return dictLoading;
}

// ---------------- Moteur (worker) ----------------
let worker = null, engineState = "off", pending = new Map(), reqId = 0, readyWaiters = [];
function setEngine(state, label) {
  engineState = state;
  const el = $("#engine"); el.dataset.state = state; el.title = label;
  document.dispatchEvent(new CustomEvent("engine", { detail: label }));
}
function startEngine() {
  if (worker) return;
  worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
  setEngine("loading", "Moteur : préparation…");
  worker.onmessage = e => {
    const m = e.data;
    if (m.type === "progress") {
      const pct = m.total ? Math.round(m.loaded / m.total * 100) : 0;
      setEngine("loading", `Moteur : ${pct} %`);
      const bar = $("#dlBar > i"); if (bar) bar.style.width = pct + "%";
      const txt = $("#dlTxt"); if (txt && m.total) txt.textContent = `${(m.loaded / 1e6).toFixed(0)} / ${(m.total / 1e6).toFixed(0)} Mo`;
    } else if (m.type === "ready") {
      S.modelReady = true; save();
      setEngine("ready", m.threads > 1 ? `Moteur prêt (${m.threads} cœurs)` : "Moteur prêt");
      readyWaiters.splice(0).forEach(w => w.res());
    } else if (m.type === "result" || m.type === "error") {
      const p = pending.get(m.id);
      if (m.type === "error" && !p) {
        setEngine("error", "Moteur : erreur"); toast(errorText(m.message)); worker.terminate(); worker = null;
        readyWaiters.splice(0).forEach(w => w.rej(new Error(m.message))); return;
      }
      if (p) { pending.delete(m.id); m.type === "result" ? p.res(m) : p.rej(new Error(m.message)); }
    }
  };
  worker.onerror = () => {
    setEngine("error", "Moteur : erreur"); worker = null;
    readyWaiters.splice(0).forEach(w => w.rej(new Error("worker")));
    pending.forEach(p => p.rej(new Error("worker"))); pending.clear();
  };
  worker.postMessage({ type: "init", local: TEST_LOCAL });
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
}
function whenReady() { return engineState === "ready" ? Promise.resolve() : new Promise((res, rej) => readyWaiters.push({ res, rej })); }
function analyze(samples) {
  const id = ++reqId;
  return new Promise((res, rej) => { pending.set(id, { res, rej }); worker.postMessage({ type: "analyze", id, audio: samples, local: TEST_LOCAL }, [samples.buffer]); });
}
function errorText(m) {
  if (/audio_trop_court/.test(m)) return "Enregistrement trop court. Parle un peu plus longtemps.";
  if (/fetch|network|Failed/i.test(m)) return "Le téléchargement du moteur a échoué. Vérifie ta connexion et réessaie.";
  if (/memory|Memory|allocation/i.test(m)) return "Pas assez de mémoire sur cet appareil. Ferme d'autres applis et réessaie.";
  return "Le moteur a rencontré une erreur. Recharge la page et réessaie.";
}

// ---------------- Navigation ----------------
let view = "path";
function go(v, opts) {
  view = v;
  const tab = { sounds: "train", block: "session", send: "session", vcard: "vocab", vfinish: "vocab", dialog: "train", dlisten: "train", dfinish: "train" }[v] || v;
  $$("nav.bottom button").forEach(b => { if (b.dataset.go === tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  document.body.classList.toggle("in-lesson", ["lesson", "finish", "vcard", "vfinish", "block", "send", "dialog", "dlisten", "dfinish"].includes(v));
  document.body.dataset.view = v;
  if (v !== "dialog") document.body.classList.remove("hide-fr");
  closeSheet();
  stopRecording(true);
  ({ path: renderPath, train: renderTrain, sounds: renderSounds, profile: renderProfile, lesson: renderLesson, finish: () => renderFinish(opts),
     session: renderSession, block: renderBlock, send: () => renderSessionEnd(opts), vocab: renderVocabHome, vcard: renderVocabCard, vfinish: () => renderVocabFinish(opts),
     dialog: renderDialog, dlisten: renderListen, dfinish: () => renderDialogFinish(opts) })[v]();
  renderHud();
  window.scrollTo(0, 0);
}
$$("nav.bottom button").forEach(b => b.addEventListener("click", () => { play("tap"); go(b.dataset.go); }));
document.addEventListener("engine", () => { if (view === "path") { const c = $("#setup"); if (c) { c.outerHTML = setupCard(); bindSetup(); } } });

// ---------------- Parcours ----------------
function setupCard() {
  if (engineState === "ready") return `<div id="setup" hidden></div>`;
  if (engineState === "loading") return `<section class="card" id="setup"><h3>Pouf prépare ses oreilles…</h3>
    <p class="small">Téléchargement unique du moteur d'analyse des sons. Il reste ensuite sur ton appareil.</p>
    <div class="bar xp" id="dlBar"><i></i></div><p class="small muted" id="dlTxt">Démarrage…</p></section>`;
  return `<section class="card" id="setup"><h3>Avant de jouer</h3>
    <p class="small">Pour écouter ta prononciation, Pouf a besoin d'un moteur d'environ 360 Mo, téléchargé une seule fois. Utilise le Wi-Fi.</p>
    <p class="small muted">Ta voix est analysée sur ton appareil et n'est jamais envoyée sur internet.</p>
    <button class="btn yellow block" id="prep">${S.modelReady ? "Relancer le moteur" : "Préparer le moteur (≈ 360 Mo)"}</button></section>`;
}
function bindSetup() { const b = $("#prep"); if (b) b.onclick = () => { play("tap"); startEngine(); }; }

function nodeIcon(l) {
  if (l.kind === "sound") return esc(l.sound);
  if (l.kind === "pairs") return ICON.pairs;
  if (l.kind === "review") return ICON.review;
  return ICON.mic;
}
const LINE_HELLO = "Salut, moi c'est Pouf ! Je vais écouter ton accent.";
function renderPath() {
  const cur = G.currentLessonIndex(S.lessons);
  let gi = 0;
  const units = G.UNITS.map(u => {
    const done = u.lessons.filter(l => S.lessons[l.id]).length;
    const nodes = u.lessons.map((l, k) => {
      const idx = gi++, st = G.lessonState(S.lessons, idx), rec = S.lessons[l.id];
      const isCur = idx === cur && st === "open";
      return `<div class="node-wrap pos-${k % 8}">
        ${isCur ? `<span class="start-tag">${idx ? "Continuer" : "Commencer"}</span><div class="path-pouf">${poufSvg()}</div>` : ""}
        <button class="node ${st} ${st === "done" ? "tone-" + u.tone : ""}" data-idx="${idx}" aria-label="${esc(l.title)}${st === "locked" ? " (verrouillée)" : ""}">${st === "locked" ? ICON.lock : nodeIcon(l)}</button>
        <div class="node-stars">${st === "done" ? [1, 2, 3].map(n => ICON.star(n <= (rec.stars || 1))).join("") : ""}</div>
        <span class="node-label">${esc(l.title)}</span></div>`;
    }).join("");
    return `<div class="unit tone-${u.tone}"><div><div class="k">${esc(u.title)}</div><div class="t">${esc(u.sub)}</div></div><span class="cnt">${done}/${u.lessons.length}</span></div><div class="path">${nodes}</div>`;
  }).join("");
  const goalPct = Math.min(100, Math.round(xpToday() / S.goalXp * 100));
  const lv = G.levelOf(S.xp);
  $("#view").innerHTML = `<div class="cols">
    <aside class="side">
    ${!S.onboarded ? `<section class="card"><div class="coach" id="hello"><div class="av">${poufSvg()}</div><div class="bubble">${esc(LINE_HELLO)}</div></div>
      <p class="small">Je suis ton coach d'accent. Tu lis des phrases, j'écoute chaque son et je te dis quoi corriger. Gagne de l'XP, garde ta série et débloque les unités !</p></section>` : ""}
    ${setupCard()}
    <section class="card"><div class="row between"><h3>Objectif du jour</h3><span class="xpfloat">${xpToday()} / ${S.goalXp} XP</span></div><div class="bar xp"><i id="goalBar"></i></div></section>
    <section class="card desk-only"><div class="lvl"><div class="badge-lv">${lv.level}</div><div class="grow"><h3>${esc(G.levelTitle(lv.level))}</h3>
      <div class="bar xp"><i id="sideLv"></i></div><span class="small muted">${lv.into} / ${lv.need} XP · ${S.badges.length} badge${S.badges.length > 1 ? "s" : ""}</span></div></div></section>
    <section class="card desk-only"><div class="coach"><div class="av">${poufSvg()}</div><div class="bubble">${esc(pick("hello"))}</div></div>
      <p class="small muted">Raccourcis clavier en leçon : <b>Espace</b> enregistrer, <b>L</b> écouter, <b>Entrée</b> continuer.</p></section>
    <section class="card coach-link"><h3>Pour discuter</h3><p class="small">Conversation, vocabulaire et corrections avec ton coach Claude.</p>
      <a class="btn cyan block" href="${COACH_URL}" target="_blank" rel="noopener noreferrer">Ouvrir mon coach</a></section>
    </aside>
    <div class="colmain">${units}</div></div>`;
  const sl = $("#sideLv"); if (sl) sl.style.width = Math.round(lv.into / lv.need * 100) + "%";
  $("#goalBar").style.width = goalPct + "%";
  bindSetup();
  $$(".node").forEach(b => b.onclick = () => {
    const idx = +b.dataset.idx, st = G.lessonState(S.lessons, idx);
    if (st === "locked") { play("bad"); toast(pick("locked")); return; }
    play("tap"); startLesson(G.ALL_LESSONS[idx]);
  });
  if (!S.onboarded) { S.onboarded = true; save(); }
  const curNode = $(".node.open"); if (curNode && S.history.length) setTimeout(() => curNode.scrollIntoView({ block: "center", behavior: "smooth" }), 100);
}

// ---------------- Leçon ----------------
let L = null; // session de leçon en cours
function startLesson(lesson) {
  const items = lesson.kind === "review" ? G.reviewItems(lesson, S.history) : lesson.items;
  if (!items.length) { toast("Rien à réviser pour l'instant."); return; }
  L = { lesson, items, i: 0, best: [], combo: 0, maxCombo: 0, xp: 0, startLevel: G.levelOf(S.xp).level };
  if (engineState === "off") startEngine();
  go("lesson");
}

let rec = null, lastAudioUrl = null, lastOffset = 0, lastResult = null, busy = false, autoStopping = false, ref = null, TARGET = null;
function renderLesson() {
  const it = L.items[L.i];
  lastResult = null; ref = null; TARGET = { text: it.en, onResult: showResult };
  const intro = L.i === 0 && L.lesson.tip ? L.lesson.tip : pick("listen");
  $("#view").innerHTML = `
    <div class="ltop"><button class="iconbtn" id="quit" aria-label="Quitter la leçon">${ICON.close}</button><div class="bar"><i id="lBar"></i></div><span class="combo" id="combo">${L.combo > 1 ? "×" + L.combo : ""}</span></div>
    <div class="coach" id="coach"><div class="av">${poufSvg()}</div><div class="bubble">${esc(intro)}</div></div>
    <section class="card">
      <div class="sentence">${P.splitDisplayWords(it.en).map((w, i) => `<button class="word" data-wi="${i}">${esc(w)}</button>`).join("")}</div>
      <p class="ipa" id="ipa"></p>
      ${it.fr ? `<p class="fr">${esc(it.fr)}</p>` : ""}
      <div class="listen"><button class="btn cyan sm" id="listen">${ICON.spk}Écouter</button><button class="btn ghost sm" id="slow">${ICON.slow}Lentement</button></div>
    </section>
    <div class="mic-wrap"><button class="mic" id="rec" aria-label="Enregistrer">${ICON.mic}</button><p class="status" id="status">Appuie et lis la phrase à voix haute.</p><p class="kbd-hint"><b>Espace</b> enregistrer · <b>L</b> écouter · <b>R</b> réessayer · <b>Entrée</b> continuer</p></div>
    <div class="spacer" id="spacer"></div>`;
  $("#lBar").style.width = (L.i / L.items.length * 100) + "%";
  $("#quit").onclick = () => quitActivity(L.i === 0 && !L.best.length, L.lesson.id ? "path" : "train");
  $("#listen").onclick = () => speak(it.en, { voiceURI: S.voice, rate: 0.95 });
  $("#slow").onclick = () => speak(it.en, { voiceURI: S.voice, rate: S.slow });
  $("#rec").onclick = toggleRecording;
  $$(".word").forEach(b => b.onclick = () => wordDetail(+b.dataset.wi));
  poufSay($("#coach"), intro, { voice: S.poufVoice && L.i === 0 });
  loadDict().then(d => {
    ref = P.buildReference(d, it.en);
    $("#ipa").textContent = "/" + ref.map(w => w.prons ? P.ipaString(w.prons[0]) : "?").join(" ") + "/";
    const unknown = ref.filter(w => w.norm && !w.prons).map(w => w.display);
    if (unknown.length) $("#status").textContent = `Mots non notés (inconnus du dictionnaire) : ${unknown.join(", ")}`;
  }).catch(() => toast("Impossible de charger le dictionnaire. Vérifie ta connexion."));
}

async function toggleRecording() {
  if (busy) return;
  if (rec && rec.active) return stopRecording(false);
  if (!navigator.mediaDevices || !window.MediaRecorder) { toast("Ce navigateur ne permet pas d'enregistrer le micro. Essaie Chrome, Edge, Firefox ou Safari récent."); return; }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  closeSheet();
  const btn = $("#rec");
  rec = new Recorder({
    onLevel: lv => { if (btn) btn.style.boxShadow = `0 8px 0 #bdb3f0, 0 0 0 ${Math.round(lv * 22)}px rgba(255,84,112,.35)`; },
    onAutoStop: () => { if (!autoStopping) { autoStopping = true; stopRecording(false); } }
  });
  try { await rec.start(); }
  catch (e) { toast(e && e.name === "NotAllowedError" ? "Accès au micro refusé. Autorise le micro pour ce site dans ton navigateur." : "Micro introuvable ou déjà utilisé."); rec = null; return; }
  autoStopping = false;
  btn.classList.add("on"); btn.innerHTML = ICON.stop; btn.setAttribute("aria-label", "Arrêter");
  $$(".word").forEach(b => b.className = "word");
  $("#status").textContent = "Je t'écoute… (arrêt automatique)";
}

async function stopRecording(discard) {
  if (!rec || !rec.active) return;
  const r = rec; rec = null;
  const btn = $("#rec");
  if (btn) { btn.classList.remove("on"); btn.innerHTML = ICON.mic; btn.style.boxShadow = ""; btn.setAttribute("aria-label", "Enregistrer"); }
  let out;
  try { out = await r.stop(); } catch (e) { if (!discard) toast("Impossible de lire l'enregistrement. Réessaie."); return; }
  if (discard || !["lesson", "vcard", "dialog"].includes(view)) return;
  if (!out || !out.heardSpeech || !out.pcm || out.pcm.samples.length < 8000) { $("#status").textContent = "Je n'ai rien entendu. Rapproche-toi du micro et parle plus fort."; return; }
  if (lastAudioUrl) URL.revokeObjectURL(lastAudioUrl);
  lastAudioUrl = URL.createObjectURL(out.blob); lastOffset = out.pcm.offsetSec;
  busy = true; btn.disabled = true;
  try {
    if (engineState !== "ready") { $("#status").textContent = "Pouf prépare ses oreilles, ton essai sera analysé juste après…"; if (!worker) startEngine(); await whenReady(); }
    $("#status").textContent = "Pouf écoute ta prononciation…";
    await loadDict();
    if (!ref) ref = P.buildReference(dict, TARGET.text);
    const res = await analyze(out.pcm.samples);
    TARGET.onResult(P.evaluate(ref, res.segs), res.segs);
  } catch (e) { toast(errorText(String(e && e.message || e))); $("#status").textContent = "Réessaie."; }
  finally { busy = false; const b = $("#rec"); if (b) b.disabled = false; }
}

function recordAttempt(text, result) {
  S.history.push({ d: today(), s: result.score, t: text.slice(0, 120) });
  if (S.history.length > 500) S.history = S.history.slice(-500);
  if (!S.days.includes(today())) S.days.push(today());
  S.sounds = P.updateSoundStats(S.sounds, result);
  save(); renderHud();
}
function closeSheet() { const s = $("#sheet"); if (s) s.remove(); const sp = $("#spacer"); if (sp) sp.style.height = "0"; }
function syncSpacer() { const sh = $("#sheet"), sp = $("#spacer"); if (sh && sp) sp.style.height = sh.offsetHeight + "px"; }
function showResult(result) {
  lastResult = result;
  const it = L.items[L.i];
  $$(".word").forEach(b => { const w = result.words[+b.dataset.wi]; b.className = "word " + (w ? w.level : ""); });
  $("#status").textContent = "";
  L.best[L.i] = Math.max(L.best[L.i] ?? 0, result.score);
  recordAttempt(it.en, result);
  const sc = result.score, mood = sc >= 85 ? "great" : sc >= 55 ? "meh" : "bad";
  const line = pick(sc >= 95 ? "great" : sc >= 85 ? "good" : sc >= 55 ? "meh" : "bad");
  const title = sc >= 95 ? "Parfait !" : sc >= 85 ? "Bien joué !" : sc >= 55 ? "Presque !" : "On réessaie ?";
  const tips = P.tipsFor(result, 3);
  const gain = G.xpForScore(L.best[L.i], L.best[L.i] >= 85 ? L.combo + 1 : 0);
  const sheet = document.createElement("div");
  sheet.id = "sheet"; sheet.className = "sheet " + mood;
  sheet.innerHTML = `<div class="sheet-in">
    <div class="head"><div class="av" id="sheetPouf">${poufSvg(mood === "great" ? "happy" : mood === "bad" ? "sad" : "")}</div>
      <div><div class="title">${esc(title)}</div><p class="small">${esc(line)}</p></div><span class="score-big">${sc}</span></div>
    <div class="scroll">${tips.length ? `<ul class="tips">${tips.map(t => `<li><b>${esc(t.word)}</b> · ${esc(t.text)}</li>`).join("")}</ul>` : ""}
    <div id="detail"></div></div>
    <div class="row between actions">
      <div class="row"><button class="btn ghost sm" id="mine">${ICON.play}Ma voix</button><button class="btn ghost sm" id="again">${ICON.review}Réessayer</button></div>
      <button class="btn ${mood === "great" ? "green" : mood === "meh" ? "orange" : "red"}" id="next">Continuer <span class="small">+${gain} XP</span></button>
    </div></div>`;
  document.body.appendChild(sheet);
  play(mood === "great" ? "great" : mood === "meh" ? "good" : "bad");
  if (S.poufVoice) { const svg = $("#sheetPouf .pouf"); svg.classList.add("talk"); speak(line, { lang: "fr", rate: 1.05, pitch: 1.5 }).then(() => svg.classList.remove("talk")); }
  $("#mine").onclick = () => playMine();
  $("#again").onclick = () => { closeSheet(); toggleRecording(); };
  $("#next").onclick = nextItem;
  const worst = result.words.map((w, i) => ({ w, i })).filter(x => x.w.level === "bad" || x.w.level === "ok").sort((a, b) => a.w.score - b.w.score)[0];
  if (worst) wordDetail(worst.i);
  syncSpacer();
}

function nextItem() {
  const best = L.best[L.i] ?? 0;
  L.combo = best >= 85 ? L.combo + 1 : 0;
  L.maxCombo = Math.max(L.maxCombo, L.combo);
  L.xp += G.xpForScore(best, L.combo);
  if (L.combo >= 3) toast(pick("combo") + ` ×${L.combo}`);
  closeSheet();
  if (L.i + 1 < L.items.length) { L.i++; play("tap"); renderLesson(); const c = $("#combo"); if (c && L.combo > 1) c.classList.add("hot"); return; }
  finishLesson();
}

function finishLesson() {
  const scores = L.items.map((_, i) => L.best[i] ?? 0);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const st = G.stars(avg);
  const bonus = 20 + (scores.every(s => s >= 85) ? 10 : 0);
  const total = L.xp + bonus;
  S.bestCombo = Math.max(S.bestCombo || 0, L.maxCombo);
  if (L.lesson.id) { const prev = S.lessons[L.lesson.id] || { stars: 0, best: 0 }; S.lessons[L.lesson.id] = { stars: Math.max(prev.stars, st), best: Math.max(prev.best, avg), d: today() }; }
  go("finish", { avg, st, total, combo: L.maxCombo, ...gainXp(total, L.startLevel) });
}

function renderFinish(o) {
  $("#view").innerHTML = `<section class="card finish">
    <div class="coach" id="finCoach"><div class="av">${poufSvg("happy")}</div><div class="bubble"></div></div>
    <h2>Leçon terminée !</h2>
    <div class="bigstars">${[1, 2, 3].map(n => ICON.star(n <= o.st)).join("")}</div>
    <div class="tiles">
      <div class="tile y"><span class="l">XP gagnés</span><span class="v">+${o.total}</span></div>
      <div class="tile g"><span class="l">Précision</span><span class="v">${o.avg}%</span></div>
      <div class="tile o"><span class="l">Combo max</span><span class="v">×${o.combo}</span></div>
    </div>
    <p class="small muted">${esc(L.lesson.title)} · série de ${streak()} jour${streak() > 1 ? "s" : ""}</p>
    <div class="row center"><button class="btn ghost" id="redo">Rejouer</button><button class="btn green" id="cont">Continuer</button></div>
  </section>`;
  fx(); play("done");
  poufSay($("#finCoach"), pick("done"), { voice: S.poufVoice, mood: "happy" });
  const redo = $("#redo"); if (SESS) redo.remove(); else redo.onclick = () => startLesson(L.lesson);
  $("#cont").onclick = async () => { await rewards(o); if (SESS) sessionNext(); else go(L.lesson.id ? "path" : "train"); };
}
async function rewards(o) {
  if (o.goalReached) { fx(); await celebrate("Objectif du jour atteint !", `${xpToday()} XP aujourd'hui. Ta série continue !`); }
  if (o.levelUp) { play("level"); fx(); await celebrate(`Niveau ${o.levelUp} !`, `Tu es maintenant « ${G.levelTitle(o.levelUp)} ».`); }
  for (const id of o.earned || []) { const b = G.BADGES.find(x => x.id === id); fx(); await celebrate("Nouveau badge !", b.desc, `<div class="bdg got"><div class="md">${esc(b.sym)}</div>${esc(b.title)}</div>`); }
}
function gainXp(total, startLevel) {
  const before = xpToday();
  S.xp += total; S.xpDays[today()] = before + total;
  const lv = G.levelOf(S.xp).level;
  const earned = G.newBadges(S, { streak: streak() }); S.badges.push(...earned);
  save();
  return { levelUp: lv > startLevel ? lv : 0, earned, goalReached: before < S.goalXp && xpToday() >= S.goalXp };
}
async function quitActivity(noConfirm, back) {
  if (SESS) {
    if (!await confirmDlg("Arrêter la séance ?", "Tu garderas l'XP des blocs déjà terminés.", "Arrêter")) return;
    endSession(false); return;
  }
  if (noConfirm || await confirmDlg("Quitter ?", "Tu perdras l'XP de l'exercice en cours.", "Quitter")) go(back);
}

function wordDetail(wi) {
  const it = L.items[L.i];
  const word = P.splitDisplayWords(it.en)[wi];
  const clean = P.normWord(word);
  const w = lastResult && lastResult.words[wi];
  const box = $("#detail");
  if (!w || !box) { speak(clean || word, { voiceURI: S.voice, rate: 0.9 }); return; }
  box.innerHTML = `<div class="detail">
    <div class="row between"><h3>${esc(word)}</h3>${w.score !== null ? `<span class="pill ${w.level}">${w.score} %</span>` : `<span class="pill">non noté</span>`}</div>
    ${w.phones.length ? `<div class="phones">${w.phones.map(ph => `<span class="ph ${ph.status}" title="${esc(P.FR_HINT[ph.p] || "")}">${esc(ph.p)}<small>${ph.status === "bad" ? (ph.heard ? "entendu " + esc(ph.heard) : "absent") : ph.status === "ok" ? "presque" : "ok"}</small></span>`).join("")}</div>` : ""}
    <div class="row"><button class="btn cyan sm" id="wRef">${ICON.spk}Le mot</button>${w.start !== null ? `<button class="btn ghost sm" id="wMine">${ICON.play}Mon mot</button>` : ""}</div></div>`;
  $("#wRef").onclick = () => speak(clean, { voiceURI: S.voice, rate: 0.85 });
  const m = $("#wMine"); if (m) m.onclick = () => playMine(w.start, w.end);
  syncSpacer();
}

let player = null;
function playMine(start, end) {
  if (!lastAudioUrl) return;
  if (!player) player = new Audio();
  player.src = lastAudioUrl;
  const t0 = start !== undefined ? Math.max(0, lastOffset + start - 0.08) : 0;
  player.onloadedmetadata = () => {
    player.currentTime = t0; player.play().catch(() => {});
    if (end !== undefined) { const stopAt = lastOffset + end + 0.12; const chk = () => { if (player.currentTime >= stopAt) player.pause(); else if (!player.paused) requestAnimationFrame(chk); }; requestAnimationFrame(chk); }
  };
  player.load();
}

// ---------------- Entraînement libre ----------------
function renderTrain() {
  $("#view").innerHTML = `
    <h2>Conversation</h2>
    <p class="small muted">Jeux de rôle à l'oral, comme une vraie discussion : Pouf joue un personnage, tu réponds au micro. Ou écoute d'abord le dialogue.</p>
    <div class="dgrid">${DIALOGUES.map(d => { const r = S.dialogues[d.id]; return `<section class="card dcard"><div class="row between"><span class="pill ok">${esc(d.level)}</span>${r ? `<span class="pill good">${r.best} %</span>` : ""}</div>
      <h3>${esc(d.title)}</h3><p class="small muted">${esc(d.goal)}</p>
      <div class="row"><button class="btn green sm" data-role="${d.id}">${ICON.mic}Jeu de rôle</button><button class="btn ghost sm" data-listen="${d.id}">${ICON.spk}Écouter</button></div></section>`; }).join("")}</div>
    <h2>Entraînement libre</h2>
    <p class="small muted">Tout est ouvert ici, sans déblocage. L'XP compte quand même.</p>
    <section class="card"><div class="row between"><span><b>Mes sons</b><br><span class="small muted">Ta réussite sur chaque son anglais</span></span><button class="btn cyan sm" id="toSounds">Voir</button></div></section>
    <section class="card"><div class="list">
      ${CATEGORIES.map(c => `<button class="item" data-cat="${c.id}"><span><span class="t">${esc(c.title)}</span><br><span class="s">${esc(c.sub)} · ${c.items.length} phrases</span></span><span class="chev">›</span></button>`).join("")}
      <button class="item" data-cat="pairs"><span><span class="t">Paires minimales</span><br><span class="s">ship / sheep, think / sink… · 5 paires au hasard</span></span><span class="chev">›</span></button>
    </div></section>
    <section class="card"><h3>Sons difficiles</h3><div class="list">${SOUND_LESSONS.map(l => `<button class="sound" data-p="${esc(l.p)}"><span class="sym">${esc(l.p)}</span><span><b>${esc(l.title)}</b><br><span class="small muted">${esc(l.tip)}</span></span><span class="chev">›</span></button>`).join("")}</div></section>
    <section class="card"><h3>Ta propre phrase</h3>
      <label class="f" for="free">Une phrase en anglais (par exemple vue avec ton coach)</label>
      <input type="text" id="free" maxlength="140" autocomplete="off" placeholder="I would like a coffee, please.">
      <button class="btn yellow" id="freeGo">S'entraîner</button></section>`;
  $$("[data-cat]").forEach(b => b.onclick = () => {
    play("tap");
    if (b.dataset.cat === "pairs") return startLesson({ id: null, kind: "pairs", title: "Paires minimales", items: shuffle(MINIMAL_PAIRS).slice(0, 5).flatMap(([a, c]) => [{ en: a, fr: `${a} / ${c}` }, { en: c, fr: `${a} / ${c}` }]) });
    const c = CATEGORIES.find(x => x.id === b.dataset.cat);
    startLesson({ id: null, kind: "free", title: c.title, items: c.items.map(i => ({ en: i[0], fr: i[1] })) });
  });
  $$("[data-p]").forEach(b => b.onclick = () => { play("tap"); soundDrill(b.dataset.p); });
  $("#toSounds").onclick = () => go("sounds");
  $$("[data-role]").forEach(b => b.onclick = () => { play("tap"); startDialog(b.dataset.role); });
  $$("[data-listen]").forEach(b => b.onclick = () => { play("tap"); startListen(b.dataset.listen); });
  const free = () => { const t = $("#free").value.trim(); if (t) startLesson({ id: null, kind: "free", title: "Ta phrase", items: [{ en: t, fr: "" }] }); };
  $("#freeGo").onclick = free;
  $("#free").addEventListener("keydown", e => { if (e.key === "Enter") free(); });
}
function soundDrill(p) {
  const l = SOUND_LESSONS.find(x => x.p === p);
  if (!l) { toast("Ce son revient dans les phrases des leçons."); return; }
  startLesson({ id: null, kind: "sound", sound: p, title: l.title, tip: l.tip, items: l.items.map(en => ({ en, fr: "" })) });
}

// ---------------- Mes sons ----------------
function renderSounds() {
  const all = Object.keys(P.FR_HINT).filter(p => p !== "ɾ");
  const title = p => { const l = SOUND_LESSONS.find(x => x.p === p); return l ? l.title : `Le son « ${p} »`; };
  const rows = all.map(p => { const v = S.sounds[p]; return { p, pct: v && v.n ? Math.round(v.ok / v.n * 100) : null, n: v ? v.n : 0 }; })
    .sort((a, b) => (a.pct === null) - (b.pct === null) || (a.pct ?? 0) - (b.pct ?? 0));
  $("#view").innerHTML = `<h2>Mes sons</h2>
    <p class="small muted">Ta réussite sur chaque son anglais, sur tous tes essais. Les plus faibles sont en haut : touche-les pour t'entraîner.</p>
    <section class="card"><div class="list">${rows.map(r => `<button class="sound" data-p="${esc(r.p)}"><span class="sym">${esc(r.p)}</span>
      <span><b>${esc(title(r.p))}</b><br><span class="small muted">${esc(P.FR_HINT[r.p] || "")}${r.n ? ` · ${r.n} essais` : ""}</span><span class="bar"><i data-w="${r.pct ?? 0}"></i></span></span>
      <span class="pct">${r.pct === null ? "–" : r.pct + "%"}</span></button>`).join("")}</div></section>`;
  $$(".bar > i[data-w]").forEach(i => { const v = +i.dataset.w; i.style.width = v + "%"; if (v < 85) i.classList.add(v >= 60 ? "ok" : "bad"); });
  $$("[data-p]").forEach(b => b.onclick = () => { play("tap"); soundDrill(b.dataset.p); });
}

// ---------------- Profil & réglages ----------------
function renderProfile() {
  const lv = G.levelOf(S.xp), voices = englishVoices(), avg = avgScore();
  $("#view").innerHTML = `
    <section class="card"><div class="lvl"><div class="badge-lv">${lv.level}</div><div class="grow"><h3>${esc(G.levelTitle(lv.level))}</h3>
      <div class="bar xp"><i id="lvBar"></i></div><span class="small muted">${lv.into} / ${lv.need} XP vers le niveau ${lv.level + 1}</span></div></div>
      <div class="tiles"><div class="tile o"><span class="l">Série</span><span class="v">${streak()}j</span></div><div class="tile y"><span class="l">XP total</span><span class="v">${S.xp}</span></div><div class="tile c"><span class="l">Score moyen</span><span class="v">${avg === null ? "–" : avg}</span></div></div></section>
    <section class="card"><h3>Badges · ${S.badges.length}/${G.BADGES.length}</h3>
      <div class="badges">${G.BADGES.map(b => `<div class="bdg ${S.badges.includes(b.id) ? "got" : ""}"><div class="md">${esc(b.sym)}</div>${esc(b.title)}<span class="ds">${esc(b.desc)}</span></div>`).join("")}</div></section>
    <section class="card"><h3>Réglages</h3>
      <label class="switch" for="optVoice">Pouf parle à voix haute <input type="checkbox" id="optVoice" ${S.poufVoice ? "checked" : ""}></label>
      <label class="switch" for="optSfx">Effets sonores <input type="checkbox" id="optSfx" ${S.sfx ? "checked" : ""}></label>
      <label class="f" for="goal">Objectif quotidien
        <select id="goal">${[[20, "Tranquille · 20 XP"], [50, "Normal · 50 XP"], [100, "Sérieux · 100 XP"], [150, "Intense · 150 XP"]].map(([v, t]) => `<option value="${v}" ${v === S.goalXp ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <label class="f" for="voice">Voix anglaise des modèles
        <select id="voice">${voices.length ? voices.map(v => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === S.voice ? "selected" : ""}>${esc(v.name)} (${esc(v.lang)})</option>`).join("") : `<option value="">Voix par défaut</option>`}</select></label>
      <button class="btn ghost sm" id="tryVoice">${ICON.spk}Tester la voix</button>
      <label class="f" for="slowR">Vitesse « Lentement » : <span id="slowV">${Math.round(S.slow * 100)} %</span>
        <input type="range" id="slowR" min="0.5" max="0.9" step="0.05" value="${S.slow}"></label>
    </section>
    <section class="card"><h3>Confidentialité</h3>
      <ul class="plain"><li>Ta voix est analysée sur ton appareil, jamais envoyée sur internet.</li>
        <li>Seul échange réseau : le téléchargement du moteur depuis Hugging Face, à une version figée.</li>
        <li>Aucun compte, aucune pub, aucun traceur. Ta progression reste dans ce navigateur.</li></ul>
      <p class="small muted">${esc($("#engine").title)} · ${self.crossOriginIsolated ? "calcul multi-cœurs actif" : "calcul sur un cœur"}</p></section>
    <section class="card"><h3>Données</h3>
      <button class="btn ghost sm" id="export">Copier ma progression (sauvegarde)</button>
      <button class="btn ghost sm" id="delModel">Supprimer le moteur téléchargé</button>
      <button class="btn red sm" id="delData">Effacer ma progression</button></section>`;
  $("#lvBar").style.width = Math.round(lv.into / lv.need * 100) + "%";
  $("#optVoice").onchange = e => { S.poufVoice = e.target.checked; save(); renderHud(); };
  $("#optSfx").onchange = e => { S.sfx = e.target.checked; save(); play("tap"); };
  $("#goal").onchange = e => { S.goalXp = +e.target.value; save(); };
  $("#voice").onchange = e => { S.voice = e.target.value; save(); };
  $("#tryVoice").onclick = () => speak("Hello! How are you today?", { voiceURI: S.voice });
  $("#slowR").oninput = e => { S.slow = +e.target.value; $("#slowV").textContent = Math.round(S.slow * 100) + " %"; save(); };
  $("#export").onclick = async () => { try { await navigator.clipboard.writeText(JSON.stringify(S)); toast("Progression copiée dans le presse-papiers."); } catch (e) { toast("Copie impossible sur ce navigateur."); } };
  $("#delModel").onclick = async () => {
    if (!await confirmDlg("Supprimer le moteur ?", "Le moteur (≈ 360 Mo) sera retiré de ton appareil. Il faudra le retélécharger pour jouer. Ta progression est conservée.", "Supprimer")) return;
    try { await caches.delete("transformers-cache"); } catch (e) {}
    if (worker) { worker.terminate(); worker = null; }
    S.modelReady = false; save(); setEngine("off", "Moteur : non préparé"); toast("Moteur supprimé.");
  };
  $("#delData").onclick = async () => {
    if (!await confirmDlg("Effacer ta progression ?", "XP, niveaux, badges, leçons, historique et série seront effacés de cet appareil. C'est définitif.", "Tout effacer")) return;
    const keep = { voice: S.voice, slow: S.slow, goalXp: S.goalXp, modelReady: S.modelReady, sfx: S.sfx, poufVoice: S.poufVoice, onboarded: true };
    S = { ...DEFAULTS, ...keep }; save(); renderHud(); toast("Progression effacée."); renderProfile();
  };
}
if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = () => { if (view === "profile") renderProfile(); };

// ---------------- Séances chronométrées ----------------
let SESS = null, timerT = null;
const fmt = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
function weakSoundList() {
  return Object.entries(S.sounds).filter(([p, v]) => v.n >= 4 && SOUND_LESSONS.some(l => l.p === p))
    .map(([p, v]) => ({ p, pct: v.ok / v.n })).sort((a, b) => a.pct - b.pct).map(x => x.p);
}
function nextPathLesson() {
  const i = G.currentLessonIndex(S.lessons), l = G.ALL_LESSONS[i];
  if (!S.lessons[l.id]) return l;
  return [...G.ALL_LESSONS].sort((a, b) => (S.lessons[a.id]?.stars || 0) - (S.lessons[b.id]?.stars || 0))[0];
}
function blockLabel(b, k = 0) {
  if (b.type === "vocab") return { t: `Vocabulaire ${S.vocabLevel}`, s: `${b.count} mots (révisions puis nouveaux)` };
  if (b.type === "path") return { t: "Leçon du parcours", s: k ? "La leçon suivante" : `« ${nextPathLesson().title} »` };
  if (b.type === "sound") { const w = weakSoundList()[k] ; const l = SOUND_LESSONS.find(x => x.p === w); return { t: "Son à travailler", s: l ? l.title : "Un son difficile au hasard" }; }
  if (b.type === "pairs") return { t: "Paires minimales", s: `${b.count / 2} paires (ship / sheep…)` };
  if (b.type === "dialogue") return { t: "Conversation", s: `Jeu de rôle « ${pickDialogue().title} »` };
  return { t: "Révision", s: `${b.count} phrases que tu as ratées` };
}
function renderSession() {
  const sel = S.sessMin || 15, plan = G.planSession(sel);
  const counters = { path: 0, sound: 0 };
  const recent = (S.sessions || []).slice(-5).reverse();
  $("#view").innerHTML = `
    <h2>Séance chronométrée</h2>
    <section class="card"><div class="coach"><div class="av">${poufSvg()}</div><div class="bubble">Tu as combien de temps aujourd'hui ? Je prépare une séance sur mesure.</div></div>
      <div class="chips" role="radiogroup" aria-label="Durée">${G.DURATIONS.map(m => `<button class="chip ${m === sel ? "on" : ""}" role="radio" aria-checked="${m === sel}" data-min="${m}">${m === 60 ? "1 h" : m + " min"}</button>`).join("")}</div></section>
    <section class="card"><h3>Au programme · ${sel === 60 ? "1 h" : sel + " min"}</h3>
      <ol class="plan">${plan.map(b => { const k = b.type in counters ? counters[b.type]++ : 0; const lb = blockLabel(b, k); return `<li><span><b>${esc(lb.t)}</b><br><span class="small muted">${esc(lb.s)}</span></span><span class="small muted">≈ ${G.estMinutes(b)} min</span></li>`; }).join("")}</ol>
      <label class="f" for="sLevel">Niveau du vocabulaire
        <select id="sLevel">${LEVELS.map(l => `<option value="${l.id}" ${l.id === S.vocabLevel ? "selected" : ""}>${esc(l.title)}</option>`).join("")}</select></label>
      <button class="btn green block" id="sGo">Lancer la séance</button>
      <p class="small muted">Tu peux passer un bloc ou arrêter quand tu veux. Quand le temps est écoulé, la séance s'arrête après le bloc en cours.</p></section>
    ${recent.length ? `<section class="card"><h3>Dernières séances</h3><div class="list">${recent.map(x => `<div class="item"><span><span class="t">${x.planned === 60 ? "1 h" : x.planned + " min"}</span><br><span class="s">${esc(x.d)}</span></span><span class="xpfloat">${x.real} min · +${x.xp} XP</span></div>`).join("")}</div></section>` : ""}`;
  $$(".chip[data-min]").forEach(c => c.onclick = () => { play("tap"); S.sessMin = +c.dataset.min; save(); renderSession(); });
  $("#sLevel").onchange = e => { S.vocabLevel = e.target.value; save(); renderSession(); };
  $("#sGo").onclick = () => startSession(sel);
}
function startSession(min) {
  SESS = { min, blocks: G.planSession(min), bi: -1, start: Date.now(), xp0: S.xp, done: 0, sound: 0, warned: false };
  if (engineState === "off") startEngine();
  clearInterval(timerT); timerT = setInterval(tickTimer, 1000); tickTimer();
  sessionNext(false);
}
function tickTimer() {
  const t = $("#hTimer");
  if (!SESS) { t.hidden = true; return; }
  const el = Date.now() - SESS.start, left = SESS.min * 60000 - el;
  t.hidden = false; t.querySelector("span").textContent = left > 0 ? fmt(left) : "0:00";
  t.classList.toggle("over", left <= 0);
  if (left <= 0 && !SESS.warned) { SESS.warned = true; toast("Temps écoulé ! Termine ce bloc, puis la séance s'arrête."); }
}
function sessionNext(countDone = true) {
  if (!SESS) return;
  if (countDone) SESS.done++;
  SESS.bi++;
  if (SESS.bi >= SESS.blocks.length || Date.now() - SESS.start >= SESS.min * 60000) return endSession(true);
  go("block");
}
function renderBlock() {
  const b = SESS.blocks[SESS.bi];
  const lb = blockLabel(b, b.type === "sound" ? SESS.sound : 0);
  $("#view").innerHTML = `<section class="card finish">
    <span class="pill good">Bloc ${SESS.bi + 1} / ${SESS.blocks.length}</span>
    <div class="coach"><div class="av">${poufSvg(SESS.bi ? "happy" : "")}</div><div class="bubble">${esc(SESS.bi ? "Bien joué ! On enchaîne ?" : "C'est parti pour ta séance !")}</div></div>
    <h2>${esc(lb.t)}</h2><p class="muted">${esc(lb.s)} · ≈ ${G.estMinutes(b)} min</p>
    <div class="row center"><button class="btn ghost sm" id="bSkip">Passer ce bloc</button><button class="btn ghost sm" id="bStop">Terminer la séance</button></div>
    <button class="btn green block" id="bGo">C'est parti</button></section>`;
  $("#bGo").onclick = () => runBlock(b);
  $("#bSkip").onclick = () => sessionNext(false);
  $("#bStop").onclick = () => endSession(true);
}
function runBlock(b) {
  if (b.type === "vocab") return startVocab(S.vocabLevel, b.count);
  if (b.type === "dialogue") return startDialog(pickDialogue().id);
  if (b.type === "path") return startLesson(nextPathLesson());
  if (b.type === "sound") {
    const w = weakSoundList()[SESS.sound++];
    const l = SOUND_LESSONS.find(x => x.p === w) || shuffle(SOUND_LESSONS)[0];
    return startLesson({ id: null, kind: "sound", sound: l.p, title: l.title, tip: l.tip, items: l.items.map(en => ({ en, fr: "" })) });
  }
  if (b.type === "pairs") return startLesson({ id: null, kind: "pairs", title: "Paires minimales", items: shuffle(MINIMAL_PAIRS).slice(0, b.count / 2).flatMap(([a, c]) => [{ en: a, fr: `${a} / ${c}` }, { en: c, fr: `${a} / ${c}` }]) });
  const unit = G.ALL_LESSONS[G.currentLessonIndex(S.lessons)].unit;
  return startLesson({ id: null, kind: "free", title: "Révision", items: G.reviewItems({ unit }, S.history, b.count) });
}
function endSession(completed) {
  clearInterval(timerT); timerT = null;
  const s = SESS; SESS = null; tickTimer();
  if (!s) return;
  const real = Math.max(1, Math.round((Date.now() - s.start) / 60000)), xp = S.xp - s.xp0;
  if (completed && s.done > 0) {
    S.sessions = [...(S.sessions || []), { d: today(), planned: s.min, real, xp }].slice(-100);
    const earned = G.newBadges(S, { streak: streak() }); S.badges.push(...earned); save();
    go("send", { real, xp, done: s.done, total: s.blocks.length, planned: s.min, earned });
  } else go("session");
}
function renderSessionEnd(o) {
  $("#view").innerHTML = `<section class="card finish">
    <div class="coach" id="seCoach"><div class="av">${poufSvg("happy")}</div><div class="bubble"></div></div>
    <h2>Séance terminée !</h2>
    <div class="tiles">
      <div class="tile c"><span class="l">Durée</span><span class="v">${o.real} min</span></div>
      <div class="tile y"><span class="l">XP gagnés</span><span class="v">+${o.xp}</span></div>
      <div class="tile g"><span class="l">Blocs</span><span class="v">${o.done}/${o.total}</span></div>
    </div>
    <button class="btn green block" id="seOk">Continuer</button></section>`;
  fx(); play("done");
  poufSay($("#seCoach"), o.real >= o.planned ? "Séance complète, bravo ! Tu as tenu jusqu'au bout." : "Belle séance ! Chaque minute compte.", { voice: S.poufVoice, mood: "happy" });
  $("#seOk").onclick = async () => { await rewards({ earned: o.earned }); go("path"); };
}

// ---------------- Vocabulaire ----------------
let V = null;
function levelStats(lv) {
  const words = VOCAB[lv], d = today();
  let fresh = 0, learning = 0, mastered = 0, due = 0;
  for (const w of words) { const r = S.vocab[w.id], st = G.vocabStatus(r); if (st === "new") fresh++; else if (st === "mastered") mastered++; else learning++; if (r && r.due <= d) due++; }
  return { total: words.length, fresh, learning, mastered, due };
}
function renderVocabHome() {
  const lv = S.vocabLevel, info = LEVELS.find(l => l.id === lv), st = levelStats(lv);
  $("#view").innerHTML = `
    <h2>Vocabulaire</h2>
    <div class="chips" role="tablist" aria-label="Niveau">${LEVELS.map(l => { const x = levelStats(l.id); return `<button class="chip ${l.id === lv ? "on" : ""}" role="tab" aria-selected="${l.id === lv}" data-lv="${l.id}">${l.id} <span class="small">${x.mastered}/${x.total}</span></button>`; }).join("")}</div>
    <section class="card"><div class="row between"><h3>${esc(info.title)}</h3><span class="xpfloat">${st.mastered}/${st.total}</span></div>
      <p class="small muted">${esc(info.sub)}</p>
      <div class="bar"><i id="vBar"></i></div>
      <div class="tiles"><div class="tile c"><span class="l">Nouveaux</span><span class="v">${st.fresh}</span></div><div class="tile o"><span class="l">En cours</span><span class="v">${st.learning}</span></div><div class="tile g"><span class="l">Maîtrisés</span><span class="v">${st.mastered}</span></div></div>
      <button class="btn green block" id="vGo">${st.due ? `Réviser ${Math.min(st.due, 10)} mot${st.due > 1 ? "s" : ""}` : "Apprendre 10 mots"}</button>
      <p class="small muted">Pouf te montre le mot en français : dis-le en anglais au micro. Les mots ratés reviennent demain, les mots réussis de plus en plus tard (répétition espacée).</p></section>
    <section class="card"><h3>Liste ${lv} · ${st.total} mots</h3><div class="vlist">${VOCAB[lv].map(w => { const s2 = G.vocabStatus(S.vocab[w.id]); return `<div class="vrow">${`<button class="iconbtn" data-say="${esc(sayText(w))}" aria-label="Écouter ${esc(w.en)}">${ICON.spk}</button>`}<span><b>${esc(w.en)}</b><br><span class="small muted">${esc(w.fr)}</span></span><span class="pill ${s2 === "mastered" ? "good" : s2 === "learning" ? "ok" : ""}">${s2 === "mastered" ? "maîtrisé" : s2 === "learning" ? "en cours" : "nouveau"}</span></div>`; }).join("")}</div></section>`;
  $("#vBar").style.width = Math.round(st.mastered / st.total * 100) + "%";
  $$(".chip[data-lv]").forEach(c => c.onclick = () => { play("tap"); S.vocabLevel = c.dataset.lv; save(); renderVocabHome(); });
  $$("[data-say]").forEach(b => b.onclick = () => speak(b.dataset.say, { voiceURI: S.voice, rate: 0.9 }));
  $("#vGo").onclick = () => { play("tap"); startVocab(lv, 10); };
}
function startVocab(lv, n) {
  const words = VOCAB[lv];
  let cards = G.pickVocab(words, S.vocab, n, n, today());
  if (!cards.length) cards = shuffle(words).slice(0, n);
  V = { level: lv, cards, i: 0, correct: 0, newly: 0, xp: 0, requeued: new Set(), startLevel: G.levelOf(S.xp).level, revealed: false };
  if (engineState === "off") startEngine();
  go("vcard");
}
function renderVocabCard() {
  const c = V.cards[V.i];
  V.revealed = false; lastResult = null; ref = null; TARGET = { text: sayText(c), onResult: showVocabResult };
  $("#view").innerHTML = `
    <div class="ltop"><button class="iconbtn" id="quit" aria-label="Quitter">${ICON.close}</button><div class="bar"><i id="lBar"></i></div><span class="combo">${V.i + 1}/${V.cards.length}</span></div>
    <div class="coach" id="coach"><div class="av">${poufSvg()}</div><div class="bubble">Comment dit-on ça en anglais ?</div></div>
    <section class="card"><span class="pill ok">${esc(c.level)}${S.vocab[c.id] ? " · à revoir" : " · nouveau"}</span>
      <p class="vfr">${esc(c.fr)}</p>
      <div id="ans" hidden></div>
      <button class="btn ghost sm" id="reveal">Je ne sais pas, montre-moi</button></section>
    <div class="mic-wrap"><button class="mic" id="rec" aria-label="Enregistrer">${ICON.mic}</button><p class="status" id="status">Dis le mot en anglais.</p>
      <p class="kbd-hint"><b>Espace</b> enregistrer · <b>H</b> voir la réponse · <b>Entrée</b> continuer</p></div>
    <div class="spacer" id="spacer"></div>`;
  $("#lBar").style.width = (V.i / V.cards.length * 100) + "%";
  $("#quit").onclick = () => quitActivity(V.i === 0, "vocab");
  $("#reveal").onclick = revealVocab;
  $("#rec").onclick = toggleRecording;
  loadDict().then(d => { ref = P.buildReference(d, TARGET.text); }).catch(() => toast("Impossible de charger le dictionnaire."));
}
function revealVocab() {
  const c = V.cards[V.i];
  V.revealed = true;
  const ans = $("#ans"); ans.hidden = false;
  const ipa = ref ? "/" + ref.map(w => w.prons ? P.ipaString(w.prons[0]) : "?").join(" ") + "/" : "";
  ans.innerHTML = `<p class="sentence">${esc(c.en)}</p><p class="ipa">${esc(ipa)}</p>
    <div class="listen"><button class="btn cyan sm" id="listen">${ICON.spk}Écouter</button><button class="btn ghost sm" id="slow">${ICON.slow}Lentement</button></div>
    <div class="row"><button class="btn ghost sm" id="knew">Je le savais</button><button class="btn ghost sm" id="didnt">À revoir</button></div>`;
  const r = $("#reveal"); if (r) r.remove();
  $("#listen").onclick = () => speak(TARGET.text, { voiceURI: S.voice, rate: 0.9 });
  $("#slow").onclick = () => speak(TARGET.text, { voiceURI: S.voice, rate: S.slow });
  $("#knew").onclick = () => vocabNext(true);
  $("#didnt").onclick = () => vocabNext(false);
  $("#status").textContent = "Écoute, puis répète-le au micro.";
  const b = $("#coach .bubble"); if (b) b.textContent = "Écoute bien et répète !";
  speak(TARGET.text, { voiceURI: S.voice, rate: 0.9 });
}
function showVocabResult(result) {
  const c = V.cards[V.i];
  lastResult = result;
  recordAttempt(TARGET.text, result);
  const sc = result.score, wasRevealed = V.revealed;
  const correct = !wasRevealed && sc >= 60;
  V.lastCorrect = correct;
  if (!wasRevealed && !correct) revealVocab();
  const mood = correct || (wasRevealed && sc >= 75) ? "great" : sc >= 50 ? "meh" : "bad";
  const title = correct ? "Bonne réponse !" : wasRevealed ? (sc >= 75 ? "Bien répété !" : "Encore un effort") : "Ce n'est pas ça…";
  const line = correct ? pick(sc >= 85 ? "great" : "good") : wasRevealed ? pick(sc >= 75 ? "good" : "meh") : "Voilà le bon mot. Écoute-le et répète !";
  const tips = P.tipsFor(result, 2);
  const phones = result.words.filter(w => w.scored).flatMap(w => w.phones);
  const sheet = document.createElement("div");
  sheet.id = "sheet"; sheet.className = "sheet " + mood;
  sheet.innerHTML = `<div class="sheet-in">
    <div class="head"><div class="av" id="sheetPouf">${poufSvg(mood === "great" ? "happy" : mood === "bad" ? "sad" : "")}</div>
      <div><div class="title">${esc(title)}</div><p class="small"><b>${esc(c.en)}</b> = ${esc(c.fr)}</p></div><span class="score-big">${sc}</span></div>
    <div class="scroll">${tips.length ? `<ul class="tips">${tips.map(t => `<li><b>${esc(t.word)}</b> · ${esc(t.text)}</li>`).join("")}</ul>` : ""}
      ${phones.length ? `<div class="detail"><div class="phones">${phones.map(ph => `<span class="ph ${ph.status}">${esc(ph.p)}<small>${ph.status === "bad" ? (ph.heard ? "entendu " + esc(ph.heard) : "absent") : ph.status === "ok" ? "presque" : "ok"}</small></span>`).join("")}</div></div>` : ""}</div>
    <div class="row between actions">
      <div class="row"><button class="btn ghost sm" id="mine">${ICON.play}Ma voix</button><button class="btn ghost sm" id="again">${ICON.review}Réessayer</button></div>
      <button class="btn ${mood === "great" ? "green" : mood === "meh" ? "orange" : "red"}" id="next">Continuer</button>
    </div></div>`;
  document.body.appendChild(sheet);
  play(mood === "great" ? "great" : mood === "meh" ? "good" : "bad");
  if (S.poufVoice) { const svg = $("#sheetPouf .pouf"); svg.classList.add("talk"); speak(line, { lang: "fr", rate: 1.05, pitch: 1.5 }).then(() => svg.classList.remove("talk")); }
  $("#mine").onclick = () => playMine();
  $("#again").onclick = () => { closeSheet(); toggleRecording(); };
  $("#next").onclick = () => vocabNext(V.lastCorrect);
  syncSpacer();
}
function vocabNext(correct) {
  const c = V.cards[V.i], prev = S.vocab[c.id];
  closeSheet();
  if (!V.requeued.has(c.id) || correct) S.vocab[c.id] = G.gradeVocab(prev, correct, today());
  if (correct) { V.correct++; V.xp += 5; if (!prev) V.newly++; }
  else { V.xp += 2; if (!V.requeued.has(c.id)) { V.requeued.add(c.id); V.cards.push(c); } }
  if (!S.days.includes(today())) S.days.push(today());
  save();
  V.i++;
  if (V.i < V.cards.length) { play("tap"); renderVocabCard(); return; }
  const total = V.xp + 10;
  const uniq = new Set(V.cards.map(x => x.id)).size;
  go("vfinish", { total, correct: V.correct, count: uniq, newly: V.newly, ...gainXp(total, V.startLevel) });
}
function renderVocabFinish(o) {
  $("#view").innerHTML = `<section class="card finish">
    <div class="coach" id="vfCoach"><div class="av">${poufSvg("happy")}</div><div class="bubble"></div></div>
    <h2>Vocabulaire terminé !</h2>
    <div class="tiles">
      <div class="tile g"><span class="l">Réussis</span><span class="v">${o.correct}/${o.count}</span></div>
      <div class="tile c"><span class="l">Nouveaux mots</span><span class="v">${o.newly}</span></div>
      <div class="tile y"><span class="l">XP gagnés</span><span class="v">+${o.total}</span></div>
    </div>
    <p class="small muted">${G.masteredCount(S.vocab)} mots maîtrisés en tout</p>
    <button class="btn green block" id="vfOk">Continuer</button></section>`;
  fx(); play("done");
  poufSay($("#vfCoach"), o.correct >= o.count * 0.8 ? "Quelle mémoire ! Ces mots sont à toi." : "Les mots ratés reviendront demain, c'est comme ça qu'on retient.", { voice: S.poufVoice, mood: "happy" });
  $("#vfOk").onclick = async () => { await rewards(o); if (SESS) sessionNext(); else go("vocab"); };
}

// ---------------- Conversation : jeux de rôle guidés et écoute ----------------
let D = null;
const meTurns = d => d.turns.filter(t => t.me).length;
function pickDialogue() {
  const order = ["A1", "A2", "B1"];
  const list = [...DIALOGUES].sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
  return list.find(d => !S.dialogues[d.id]) || list.sort((a, b) => S.dialogues[a.id].best - S.dialogues[b.id].best)[0];
}
function startDialog(id) {
  const d = DIALOGUES.find(x => x.id === id);
  D = { d, t: 0, log: [], done: new Set(), scores: [], xp: 0, startLevel: G.levelOf(S.xp).level, busyAi: false };
  if (engineState === "off") startEngine();
  loadDict().catch(() => {});
  go("dialog");
}
function renderDialog() {
  const d = D.d;
  $("#view").innerHTML = `
    <div class="ltop"><button class="iconbtn" id="quit" aria-label="Quitter">${ICON.close}</button><div class="bar"><i id="lBar"></i></div><span class="pill ok">${esc(d.level)}</span></div>
    <section class="card"><div class="row between"><h3>${esc(d.title)}</h3><span class="small muted">${esc(d.role)}</span></div>
      <p class="small">${esc(d.goal)}</p>
      <ul class="tasks" id="tasks">${d.tasks.map((t, i) => `<li data-t="${i}">${esc(t)}</li>`).join("")}</ul>
      <label class="switch small" for="dFr">Afficher la traduction <input type="checkbox" id="dFr" checked></label></section>
    <div class="chat" id="chat"></div>
    <section class="card" id="turn"></section>
    <div class="spacer" id="spacer"></div>`;
  $("#quit").onclick = () => quitActivity(D.t === 0, "train");
  $("#dFr").onchange = e => document.body.classList.toggle("hide-fr", !e.target.checked);
  document.body.classList.remove("hide-fr");
  updateDialogBar();
  advance();
}
function updateDialogBar() { const b = $("#lBar"); if (b) b.style.width = Math.round(D.scores.length / meTurns(D.d) * 100) + "%"; }
function addBubble(who, en, fr, extra = "") {
  const chat = $("#chat"); if (!chat) return;
  const el = document.createElement("div");
  el.className = "msg " + who;
  el.innerHTML = `${who === "ai" ? `<div class="av">${poufSvg()}</div>` : ""}<div class="bub"><div class="en">${extra || esc(en)}</div>${fr ? `<div class="tr">${esc(fr)}</div>` : ""}
    ${who === "ai" ? `<button class="iconbtn sm" aria-label="Réécouter">${ICON.spk}</button>` : ""}</div>`;
  const rb = el.querySelector("button.iconbtn"); if (rb) rb.onclick = () => speak(en, { voiceURI: S.voice, rate: 0.95 });
  chat.appendChild(el);
  D.log.push({ who, en, fr });
  el.scrollIntoView({ block: "end", behavior: "smooth" });
  return el;
}
async function aiSpeak(el, text) {
  const svg = el && el.querySelector(".pouf");
  if (svg) svg.classList.add("talk");
  await speak(text, { voiceURI: S.voice, rate: 0.95 });
  if (svg) svg.classList.remove("talk");
}
async function advance() {
  const turns = D.d.turns;
  D.busyAi = true;
  while (D.t < turns.length && turns[D.t].ai && view === "dialog") {
    const tu = turns[D.t]; D.t++;
    const el = addBubble("ai", tu.ai, tu.fr);
    await aiSpeak(el, tu.ai);
  }
  D.busyAi = false;
  if (view !== "dialog") return;
  if (D.t >= turns.length) return finishDialog();
  showTurn();
}
function showTurn() {
  const tu = D.d.turns[D.t];
  TARGET = { text: tu.me[0][0], onResult: dialogResult }; ref = null; lastResult = null;
  $("#turn").innerHTML = `<p class="hintline"><b>À toi :</b> ${esc(tu.hint)}</p>
    <div id="opts" hidden><p class="small muted">Idées de réponse (tu peux aussi les adapter) :</p>${tu.me.map(o => `<div class="opt"><button class="iconbtn" data-say="${esc(o[0])}" aria-label="Écouter">${ICON.spk}</button><span><b>${esc(o[0])}</b><br><span class="small muted tr">${esc(o[1])}</span></span></div>`).join("")}</div>
    <button class="btn ghost sm" id="dHint">Indice : voir des réponses possibles</button>
    <div class="mic-wrap"><button class="mic" id="rec" aria-label="Répondre au micro">${ICON.mic}</button><p class="status" id="status">Réponds à voix haute.</p>
    <p class="kbd-hint"><b>Espace</b> parler · <b>H</b> indice · <b>L</b> réécouter</p></div>`;
  $("#dHint").onclick = () => { $("#opts").hidden = false; $("#dHint").remove(); };
  $$("#opts [data-say]").forEach(b => b.onclick = () => speak(b.dataset.say, { voiceURI: S.voice, rate: 0.9 }));
  $("#rec").onclick = () => { if (!D.busyAi) toggleRecording(); };
  syncSpacer();
}
function dialogResult(_first, segs) {
  const tu = D.d.turns[D.t];
  const res = tu.me.map(o => P.evaluate(P.buildReference(dict, o[0]), segs));
  let k = 0; res.forEach((r, i) => { if (r.score > res[k].score) k = i; });
  const best = res[k], opt = tu.me[k];
  if (TEST_LOCAL && new URLSearchParams(location.search).has("accept")) best.score = 90; // test local uniquement
  if (best.score < 40) {
    play("bad");
    $("#status").textContent = "Je n'ai pas bien compris. Essaie une des réponses proposées, ou articule un peu plus.";
    const o = $("#opts"); if (o) o.hidden = false; const h = $("#dHint"); if (h) h.remove();
    return;
  }
  lastResult = best;
  recordAttempt(opt[0], best);
  D.scores.push(best.score);
  D.xp += G.xpForScore(best.score, 0);
  if (tu.task !== undefined) { D.done.add(tu.task); const li = $(`#tasks li[data-t="${tu.task}"]`); if (li) li.classList.add("done"); }
  const words = P.splitDisplayWords(opt[0]).map((w, i) => `<span class="word ${best.words[i] ? best.words[i].level : ""}">${esc(w)}</span>`).join(" ");
  const el = addBubble("me", opt[0], opt[1], `${words} <span class="pill ${best.score >= 85 ? "good" : best.score >= 55 ? "ok" : "bad"}">${best.score}</span>`);
  const tips = P.tipsFor(best, 1);
  if (tips.length && best.score < 85) { const tip = document.createElement("div"); tip.className = "tr small"; tip.textContent = "Conseil : " + tips[0].word + " · " + tips[0].text; el.querySelector(".bub").appendChild(tip); }
  play(best.score >= 85 ? "great" : best.score >= 55 ? "good" : "bad");
  D.t++;
  updateDialogBar();
  $("#turn").innerHTML = `<p class="status">${esc(pick(best.score >= 85 ? "great" : best.score >= 55 ? "good" : "meh"))}</p>`;
  if (opt[2]) { const el2 = addBubble("ai", opt[2], ""); aiSpeak(el2, opt[2]).then(() => setTimeout(advance, 300)); }
  else setTimeout(advance, 700);
}
function finishDialog() {
  const avg = D.scores.length ? Math.round(D.scores.reduce((a, b) => a + b, 0) / D.scores.length) : 0;
  const prev = S.dialogues[D.d.id];
  S.dialogues[D.d.id] = { best: Math.max(prev ? prev.best : 0, avg), d: today() };
  const total = D.xp + 20;
  go("dfinish", { avg, total, tasks: D.done.size, ntasks: D.d.tasks.length, ...gainXp(total, D.startLevel) });
}
function renderDialogFinish(o) {
  $("#view").innerHTML = `<section class="card finish">
    <div class="coach" id="dfCoach"><div class="av">${poufSvg("happy")}</div><div class="bubble"></div></div>
    <h2>Conversation réussie !</h2>
    <div class="tiles">
      <div class="tile g"><span class="l">Tâches</span><span class="v">${o.tasks}/${o.ntasks}</span></div>
      <div class="tile c"><span class="l">Prononciation</span><span class="v">${o.avg}%</span></div>
      <div class="tile y"><span class="l">XP gagnés</span><span class="v">+${o.total}</span></div>
    </div>
    <details class="transcript"><summary>Revoir le dialogue</summary>${D.log.map(l => `<p><b>${l.who === "ai" ? esc(D.d.role) : "Toi"} :</b> ${esc(l.en)}${l.fr ? `<br><span class="small muted">${esc(l.fr)}</span>` : ""}</p>`).join("")}</details>
    <div class="row center">${SESS ? "" : `<button class="btn ghost" id="dRe">Rejouer</button>`}<button class="btn green" id="dOk">Continuer</button></div></section>`;
  fx(); play("done");
  poufSay($("#dfCoach"), o.avg >= 80 ? "Tu as géré cette conversation comme un pro !" : "Bien joué ! Rejoue-la pour améliorer ta prononciation.", { voice: S.poufVoice, mood: "happy" });
  const re = $("#dRe"); if (re) re.onclick = () => startDialog(D.d.id);
  $("#dOk").onclick = async () => { await rewards(o); if (SESS) sessionNext(); else go("train"); };
}

// Écoute : on entend le dialogue et on touche les mots reconnus (comme l'exercice d'écoute de Google Traduction).
let LS = null;
function dialogueLines(d) { return d.turns.map(t => t.ai ? { who: "ai", en: t.ai, fr: t.fr } : { who: "me", en: t.me[0][0], fr: t.me[0][1] }); }
function wordsOf(text) { return P.splitDisplayWords(text).map(P.normWord).filter(w => w.length >= 3 && !STOP.has(w)); }
function startListen(id) {
  const d = DIALOGUES.find(x => x.id === id), lines = dialogueLines(d);
  const present = [...new Set(lines.flatMap(l => wordsOf(l.en)))];
  const others = [...new Set(DIALOGUES.filter(x => x.id !== id).flatMap(x => dialogueLines(x).flatMap(l => wordsOf(l.en))))].filter(w => !present.includes(w));
  const pick7 = shuffle(present).slice(0, 7), dis = shuffle(others).slice(0, 5);
  LS = { d, lines, chips: shuffle([...pick7, ...dis]), present: new Set(present), sel: new Set(), checked: false, playing: false, startLevel: G.levelOf(S.xp).level };
  go("dlisten");
}
function renderListen() {
  const d = LS.d;
  $("#view").innerHTML = `
    <div class="ltop"><button class="iconbtn" id="quit" aria-label="Quitter">${ICON.close}</button><h3 class="grow">${esc(d.title)} · écoute</h3><span class="pill ok">${esc(d.level)}</span></div>
    <section class="card"><div class="coach"><div class="av">${poufSvg()}</div><div class="bubble">Écoute le dialogue, puis touche tous les mots que tu as entendus.</div></div>
      <div class="row"><button class="btn cyan" id="lPlay">${ICON.play}Écouter le dialogue</button><button class="btn ghost sm" id="lSlow">${ICON.slow}Plus lentement</button></div></section>
    <section class="card"><h3>Quels mots as-tu entendus ?</h3>
      <div class="wchips" id="chips">${LS.chips.map(w => `<button class="wchip" data-w="${esc(w)}" aria-pressed="false">${esc(w)}</button>`).join("")}</div>
      <button class="btn green block" id="lCheck">Vérifier</button><div id="lRes"></div></section>`;
  $("#quit").onclick = () => { speechSynthesis.cancel(); LS.playing = false; if (SESS) quitActivity(false, "train"); else go("train"); };
  $("#lPlay").onclick = () => playDialogue(0.95);
  $("#lSlow").onclick = () => playDialogue(0.75);
  $$(".wchip").forEach(c => c.onclick = () => {
    if (LS.checked) { speak(c.dataset.w, { voiceURI: S.voice, rate: 0.85 }); return; }
    const w = c.dataset.w; if (LS.sel.has(w)) LS.sel.delete(w); else LS.sel.add(w);
    c.setAttribute("aria-pressed", String(LS.sel.has(w))); play("tap");
  });
  $("#lCheck").onclick = checkListen;
}
async function playDialogue(rate) {
  if (LS.playing) { speechSynthesis.cancel(); LS.playing = false; return; }
  LS.playing = true;
  const voices = englishVoices(), vA = S.voice || (voices[0] && voices[0].voiceURI) || "", vB = (voices.find(v => v.voiceURI !== vA) || {}).voiceURI || vA;
  for (const l of LS.lines) { if (!LS.playing || view !== "dlisten") break; await speak(l.en, { voiceURI: l.who === "ai" ? vA : vB, rate }); await new Promise(r => setTimeout(r, 250)); }
  LS.playing = false;
}
function checkListen() {
  if (LS.checked) return;
  LS.checked = true; speechSynthesis.cancel(); LS.playing = false;
  let hit = 0, wrong = 0, missed = 0;
  $$(".wchip").forEach(c => {
    const w = c.dataset.w, sel = LS.sel.has(w), pres = LS.present.has(w);
    c.classList.add(sel && pres ? "hit" : sel && !pres ? "wrong" : pres ? "missed" : "neutral");
    if (sel && pres) hit++; else if (sel) wrong++; else if (pres) missed++;
  });
  const total = hit + missed, score = total ? Math.max(0, Math.round((hit - wrong) / total * 100)) : 0;
  const xp = 5 + hit * 2;
  const r = gainXp(xp, LS.startLevel);
  if (!S.days.includes(today())) { S.days.push(today()); save(); }
  play(score >= 80 ? "great" : score >= 50 ? "good" : "bad");
  $("#lRes").innerHTML = `<p class="hintline"><b>${score} %</b> · ${hit} trouvé${hit > 1 ? "s" : ""}, ${missed} manqué${missed > 1 ? "s" : ""}, ${wrong} en trop · <span class="xpfloat">+${xp} XP</span></p>
    <p class="small muted">Vert : bien entendu · orange : présent mais manqué · rouge : n'était pas dans le dialogue. Touche un mot pour l'écouter.</p>
    <details class="transcript" open><summary>Le dialogue</summary>${LS.lines.map(l => `<p><b>${l.who === "ai" ? esc(LS.d.role) : "Toi"} :</b> ${esc(l.en)}<br><span class="small muted">${esc(l.fr)}</span></p>`).join("")}</details>
    <div class="row center"><button class="btn green" id="lRole">${ICON.mic}Jouer ce dialogue</button><button class="btn ghost" id="lDone">${SESS ? "Continuer" : "Terminer"}</button></div>`;
  $("#lCheck").remove();
  $("#lRole").onclick = () => startDialog(LS.d.id);
  $("#lDone").onclick = async () => { await rewards(r); if (SESS) sessionNext(); else go("train"); };
}

// ---------------- Raccourcis clavier (mode ordinateur) ----------------
document.addEventListener("keydown", e => {
  if (!["lesson", "vcard", "dialog"].includes(view) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.querySelector("dialog[open]") || /INPUT|SELECT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName)) return;
  if (e.code === "Space") { e.preventDefault(); toggleRecording(); }
  else if (e.code === "KeyL") { const b = $("#listen"); if (b) b.click(); }
  else if (e.code === "KeyH" && $("#reveal")) { $("#reveal").click(); }
  else if (e.code === "KeyH" && $("#dHint")) { $("#dHint").click(); }
  else if (e.code === "KeyR" && $("#sheet")) { $("#again").click(); }
  else if (e.code === "Enter" && $("#sheet")) { e.preventDefault(); $("#next").click(); }
});

// ---------------- Service worker ----------------
if ("serviceWorker" in navigator && !TEST_LOCAL) {
  navigator.serviceWorker.register("sw.js").then(() => {
    if (!self.crossOriginIsolated && !sessionStorage.getItem("coiReload")) {
      navigator.serviceWorker.addEventListener("controllerchange", () => { sessionStorage.setItem("coiReload", "1"); location.reload(); }, { once: true });
    }
  }).catch(() => {});
}

// ---------------- Démarrage ----------------
if (S.modelReady) startEngine();
go("path");
