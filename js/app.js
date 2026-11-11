// Labo d'accent : interface façon jeu. Aucune donnée ne quitte l'appareil (progression dans localStorage).
import * as P from "./phonemes.js";
import { CATEGORIES, SOUND_LESSONS, MINIMAL_PAIRS } from "./content.js";
import { Recorder, speak, englishVoices } from "./audio.js";
import * as G from "./game.js";
import { poufSvg, poufSay, pick } from "./mascot.js";
import { sfx, confetti } from "./fx.js";

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
  bestCombo: 0, xpDays: {}, goalXp: 50, sfx: true, poufVoice: true, onboarded: false };
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
  $$("nav.bottom button").forEach(b => { if (b.dataset.go === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  document.body.classList.toggle("in-lesson", v === "lesson" || v === "finish");
  document.body.dataset.view = v;
  closeSheet();
  stopRecording(true);
  ({ path: renderPath, train: renderTrain, sounds: renderSounds, profile: renderProfile, lesson: renderLesson, finish: () => renderFinish(opts) })[v]();
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

let rec = null, lastAudioUrl = null, lastOffset = 0, lastResult = null, busy = false, autoStopping = false, ref = null;
function renderLesson() {
  const it = L.items[L.i];
  lastResult = null; ref = null;
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
  $("#quit").onclick = async () => { if ((L.i === 0 && !L.best.length) || await confirmDlg("Quitter la leçon ?", "Tu perdras l'XP de cette leçon en cours.", "Quitter")) go(L.lesson.id ? "path" : "train"); };
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
  if (discard || view !== "lesson") return;
  if (!out || !out.heardSpeech || !out.pcm || out.pcm.samples.length < 8000) { $("#status").textContent = "Je n'ai rien entendu. Rapproche-toi du micro et parle plus fort."; return; }
  if (lastAudioUrl) URL.revokeObjectURL(lastAudioUrl);
  lastAudioUrl = URL.createObjectURL(out.blob); lastOffset = out.pcm.offsetSec;
  busy = true; btn.disabled = true;
  try {
    if (engineState !== "ready") { $("#status").textContent = "Pouf prépare ses oreilles, ton essai sera analysé juste après…"; if (!worker) startEngine(); await whenReady(); }
    $("#status").textContent = "Pouf écoute ta prononciation…";
    await loadDict();
    if (!ref) ref = P.buildReference(dict, L.items[L.i].en);
    const res = await analyze(out.pcm.samples);
    showResult(P.evaluate(ref, res.segs));
  } catch (e) { toast(errorText(String(e && e.message || e))); $("#status").textContent = "Réessaie."; }
  finally { busy = false; const b = $("#rec"); if (b) b.disabled = false; }
}

function closeSheet() { const s = $("#sheet"); if (s) s.remove(); const sp = $("#spacer"); if (sp) sp.style.height = "0"; }
function syncSpacer() { const sh = $("#sheet"), sp = $("#spacer"); if (sh && sp) sp.style.height = sh.offsetHeight + "px"; }
function showResult(result) {
  lastResult = result;
  const it = L.items[L.i];
  $$(".word").forEach(b => { const w = result.words[+b.dataset.wi]; b.className = "word " + (w ? w.level : ""); });
  $("#status").textContent = "";
  L.best[L.i] = Math.max(L.best[L.i] ?? 0, result.score);
  S.history.push({ d: today(), s: result.score, t: it.en.slice(0, 120) });
  if (S.history.length > 500) S.history = S.history.slice(-500);
  if (!S.days.includes(today())) S.days.push(today());
  S.sounds = P.updateSoundStats(S.sounds, result);
  save(); renderHud();
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
  const before = xpToday();
  S.xp += total; S.xpDays[today()] = before + total;
  S.bestCombo = Math.max(S.bestCombo || 0, L.maxCombo);
  if (L.lesson.id) { const prev = S.lessons[L.lesson.id] || { stars: 0, best: 0 }; S.lessons[L.lesson.id] = { stars: Math.max(prev.stars, st), best: Math.max(prev.best, avg), d: today() }; }
  const lv = G.levelOf(S.xp).level;
  const earned = G.newBadges(S, { streak: streak() });
  S.badges.push(...earned);
  save();
  go("finish", { avg, st, total, combo: L.maxCombo, levelUp: lv > L.startLevel ? lv : 0, earned, goalReached: before < S.goalXp && xpToday() >= S.goalXp });
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
  $("#redo").onclick = () => startLesson(L.lesson);
  $("#cont").onclick = async () => {
    if (o.goalReached) { fx(); await celebrate("Objectif du jour atteint !", `${xpToday()} XP aujourd'hui. Ta série continue !`); }
    if (o.levelUp) { play("level"); fx(); await celebrate(`Niveau ${o.levelUp} !`, `Tu es maintenant « ${G.levelTitle(o.levelUp)} ».`); }
    for (const id of o.earned) { const b = G.BADGES.find(x => x.id === id); fx(); await celebrate("Nouveau badge !", b.desc, `<div class="bdg got"><div class="md">${esc(b.sym)}</div>${esc(b.title)}</div>`); }
    go(L.lesson.id ? "path" : "train");
  };
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
    <h2>Entraînement libre</h2>
    <p class="small muted">Tout est ouvert ici, sans déblocage. L'XP compte quand même.</p>
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

// ---------------- Raccourcis clavier (mode ordinateur) ----------------
document.addEventListener("keydown", e => {
  if (view !== "lesson" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.querySelector("dialog[open]") || /INPUT|SELECT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName)) return;
  if (e.code === "Space") { e.preventDefault(); toggleRecording(); }
  else if (e.code === "KeyL") { const b = $("#listen"); if (b) b.click(); }
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
