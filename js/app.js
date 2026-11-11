// Labo d'accent : interface. Aucune donnée ne quitte l'appareil (progression dans localStorage).
import * as P from "./phonemes.js";
import { CATEGORIES, SOUND_LESSONS, MINIMAL_PAIRS } from "./content.js";
import { Recorder, speak, englishVoices } from "./audio.js";

const COACH_URL = "https://claude.ai/artifact/NpBH4v48K7L87LiDVvxiFt";
const STORE = "labo.v1";
const TEST_LOCAL = ["127.0.0.1", "localhost"].includes(location.hostname) && new URLSearchParams(location.search).has("test");

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------------- Stockage local ----------------
const DEFAULTS = { history: [], sounds: {}, days: [], goal: 10, voice: "", slow: 0.7, modelReady: false };
let S = { ...DEFAULTS };
try { S = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE) || "{}") }; } catch (e) {}
function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { toast("Impossible d'enregistrer ta progression sur cet appareil."); } }
function doneToday() { return S.history.filter(h => h.d === today()).length; }
function streak() {
  const set = new Set(S.days); let n = 0; const d = new Date();
  if (!set.has(today())) d.setDate(d.getDate() - 1);
  for (;;) { const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; if (set.has(k)) { n++; d.setDate(d.getDate() - 1); } else break; }
  return n;
}
function avgScore(n = 20) { const h = S.history.slice(-n); return h.length ? Math.round(h.reduce((a, x) => a + x.s, 0) / h.length) : null; }
function weakSounds(n = 3) {
  return Object.entries(S.sounds).filter(([, v]) => v.n >= 4).map(([p, v]) => ({ p, pct: Math.round(v.ok / v.n * 100), n: v.n }))
    .sort((a, b) => a.pct - b.pct).slice(0, n);
}

// ---------------- Toast & dialogue ----------------
let toastT;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3500); }
function confirmDlg(title, text, okLabel = "Confirmer") {
  const d = $("#dlg"); $("#dlgTitle").textContent = title; $("#dlgText").textContent = text; $("#dlgOk").textContent = okLabel;
  return new Promise(res => {
    const done = v => { d.close(); res(v); };
    $("#dlgOk").onclick = () => done(true);
    $("#dlgCancel").onclick = () => done(false);
    d.oncancel = () => res(false);
    d.showModal();
  });
}

// ---------------- Dictionnaire ----------------
let dict = null, dictLoading = null;
function loadDict() {
  if (dict) return Promise.resolve(dict);
  if (!dictLoading) dictLoading = fetch("data/cmudict.json").then(r => { if (!r.ok) throw new Error("dict"); return r.json(); }).then(d => (dict = d));
  return dictLoading;
}

// ---------------- Moteur (worker) ----------------
let worker = null, engineState = "off", pending = new Map(), reqId = 0, readyWaiters = [];
function setEngine(state, label) {
  engineState = state;
  const el = $("#engine"); el.dataset.state = state; el.textContent = label;
  document.dispatchEvent(new CustomEvent("engine"));
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
      setEngine("ready", m.threads > 1 ? `Moteur prêt · ${m.threads} cœurs` : "Moteur prêt");
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
let view = "home", queue = null;
function go(v, opts) {
  view = v;
  document.querySelectorAll("nav.bottom button").forEach(b => b.toggleAttribute("aria-current", b.dataset.go === (v === "exercise" ? "practice" : v)));
  document.querySelectorAll("nav.bottom button[aria-current]").forEach(b => b.setAttribute("aria-current", "page"));
  stopRecording(true);
  ({ home: renderHome, practice: renderPractice, sounds: renderSounds, settings: renderSettings, exercise: () => renderExercise(opts), lesson: () => renderLesson(opts) })[v]();
  $("#view").scrollTop = 0; window.scrollTo(0, 0);
}
document.querySelectorAll("nav.bottom button").forEach(b => b.addEventListener("click", () => go(b.dataset.go)));
document.addEventListener("engine", () => { if (view === "home") renderHome(); });

// ---------------- Accueil ----------------
function setupCard() {
  if (engineState === "ready") return "";
  if (engineState === "loading") return `<section class="card accent"><h3>Préparation du moteur d'analyse</h3>
    <p class="small">Téléchargement unique du modèle de reconnaissance des sons. Il reste ensuite sur ton appareil.</p>
    <div class="bar signal" id="dlBar"><i></i></div><p class="small muted" id="dlTxt">Démarrage…</p></section>`;
  return `<section class="card accent"><h3>Avant de commencer</h3>
    <p class="small">L'analyse de ta prononciation se fait sur ton appareil, avec un modèle open source d'environ 360 Mo à télécharger une seule fois. Utilise le Wi-Fi.</p>
    <p class="small muted">Ta voix n'est jamais envoyée sur internet.</p>
    <button class="btn primary block" id="prep">${S.modelReady ? "Relancer le moteur" : "Préparer l'analyse (≈ 360 Mo)"}</button></section>`;
}
function renderHome() {
  const avg = avgScore(), weak = weakSounds();
  $("#view").innerHTML = `
    ${setupCard()}
    <div class="tiles">
      <div class="tile"><b>${doneToday()}/${S.goal}</b><span>aujourd'hui</span></div>
      <div class="tile"><b>${streak()}</b><span>jours de suite</span></div>
      <div class="tile"><b>${avg === null ? "–" : avg}</b><span>score moyen</span></div>
    </div>
    <div class="bar"><i id="goalBar"></i></div>
    <section class="card">
      <h2>Exercice du jour</h2>
      <p class="small muted">8 phrases variées${weak.length ? ", avec tes sons difficiles" : ""}.</p>
      <button class="btn primary block" id="daily">Commencer</button>
    </section>
    <section class="card">
      <h3>Tes sons à travailler</h3>
      ${weak.length ? `<div class="list">${weak.map(w => `<button class="sound" data-p="${esc(w.p)}"><span class="sym">${esc(w.p)}</span><span><b>${esc(lessonTitle(w.p))}</b><br><span class="small muted">${w.n} essais</span></span><span class="pct">${w.pct} %</span></button>`).join("")}</div>`
        : `<p class="small muted">Fais quelques exercices : l'appli repérera les sons qui te posent problème.</p>`}
    </section>
    <section class="card">
      <h3>Pour discuter</h3>
      <p class="small">La conversation se passe avec ton coach Claude (vocabulaire, corrections, jeux de rôle). Reviens ici pour travailler l'accent.</p>
      <a class="btn block" href="${COACH_URL}" target="_blank" rel="noopener noreferrer">Ouvrir mon coach d'anglais</a>
    </section>`;
  const gb = $("#goalBar"); if (gb) gb.style.width = Math.min(100, doneToday() / S.goal * 100) + "%";
  const prep = $("#prep"); if (prep) prep.onclick = () => { startEngine(); renderHome(); };
  $("#daily").onclick = () => go("exercise", { title: "Exercice du jour", items: dailyItems() });
  document.querySelectorAll("[data-p]").forEach(b => b.onclick = () => go("lesson", { p: b.dataset.p }));
}
function lessonTitle(p) { const l = SOUND_LESSONS.find(x => x.p === p); return l ? l.title : `Le son « ${p} »`; }
function dailyItems() {
  const all = CATEGORIES.flatMap(c => c.items.map(i => ({ en: i[0], fr: i[1] })));
  const weak = weakSounds(2).map(w => SOUND_LESSONS.find(l => l.p === w.p)).filter(Boolean);
  const extra = weak.flatMap(l => shuffle(l.items.filter(x => x.includes(" "))).slice(0, 2).map(en => ({ en, fr: "" })));
  return shuffle([...shuffle(all).slice(0, 8 - extra.length), ...extra]);
}

// ---------------- Exercices ----------------
function renderPractice() {
  $("#view").innerHTML = `
    <h2>Exercices</h2>
    <section class="card"><div class="list">
      ${CATEGORIES.map(c => `<button class="item" data-cat="${c.id}"><span><span class="t">${esc(c.title)}</span><br><span class="s">${esc(c.sub)} · ${c.items.length} phrases</span></span><span class="chev">›</span></button>`).join("")}
      <button class="item" data-cat="pairs"><span><span class="t">Paires minimales</span><br><span class="s">ship / sheep, think / sink… · ${MINIMAL_PAIRS.length} paires</span></span><span class="chev">›</span></button>
    </div></section>
    <section class="card">
      <h3>Sons difficiles</h3>
      <div class="list">${SOUND_LESSONS.map(l => `<button class="sound" data-p="${esc(l.p)}"><span class="sym">${esc(l.p)}</span><span><b>${esc(l.title)}</b><br><span class="small muted">${esc(l.tip)}</span></span><span class="chev">›</span></button>`).join("")}</div>
    </section>
    <section class="card">
      <h3>Ta propre phrase</h3>
      <label class="f" for="free">Écris une phrase en anglais (par exemple une phrase vue avec ton coach)</label>
      <input type="text" id="free" maxlength="140" autocomplete="off" placeholder="I would like a coffee, please.">
      <button class="btn primary" id="freeGo">S'entraîner</button>
    </section>`;
  document.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => {
    if (b.dataset.cat === "pairs") return go("exercise", { title: "Paires minimales", items: MINIMAL_PAIRS.flatMap(([a, c]) => [{ en: a, fr: `paire : ${a} / ${c}` }, { en: c, fr: `paire : ${a} / ${c}` }]) });
    const c = CATEGORIES.find(x => x.id === b.dataset.cat);
    go("exercise", { title: c.title, items: c.items.map(i => ({ en: i[0], fr: i[1] })) });
  });
  document.querySelectorAll("[data-p]").forEach(b => b.onclick = () => go("lesson", { p: b.dataset.p }));
  const free = () => { const t = $("#free").value.trim(); if (t) go("exercise", { title: "Ta phrase", items: [{ en: t, fr: "" }] }); };
  $("#freeGo").onclick = free;
  $("#free").addEventListener("keydown", e => { if (e.key === "Enter") free(); });
}

function renderLesson({ p }) {
  const l = SOUND_LESSONS.find(x => x.p === p);
  const st = S.sounds[p];
  const items = l ? l.items : [];
  $("#view").innerHTML = `
    <button class="btn ghost" id="back">‹ Retour</button>
    <section class="card">
      <div class="row between"><h2>${esc(l ? l.title : `Le son « ${p} »`)}</h2><span class="ipa">/${esc(p)}/</span></div>
      <p>${esc(l ? l.tip : (P.FR_HINT[p] || ""))}</p>
      <p class="small muted">En français : ${esc(P.FR_HINT[p] || "")}</p>
      ${st ? `<p class="small">Ta réussite sur ce son : <b>${Math.round(st.ok / st.n * 100)} %</b> sur ${st.n} essais</p>` : ""}
      ${items.length ? `<button class="btn primary block" id="go">S'entraîner sur ce son (${items.length})</button>` : `<p class="small muted">Pas encore d'exercice dédié à ce son. Il revient dans les phrases des autres exercices.</p>`}
    </section>`;
  $("#back").onclick = () => go("practice");
  const g = $("#go"); if (g) g.onclick = () => go("exercise", { title: l.title, items: items.map(en => ({ en, fr: "" })) });
}

// ---------------- Écran d'exercice ----------------
let rec = null, lastAudioUrl = null, lastOffset = 0, lastResult = null, busy = false, autoStopping = false;
const MIC_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V22h2v-3.08A7 7 0 0 0 19 12z"/></svg>';
const STOP_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>';

function renderExercise(opts) {
  if (opts) queue = { title: opts.title, items: opts.items, i: 0, scores: [] };
  const it = queue.items[queue.i];
  lastResult = null;
  $("#view").innerHTML = `
    <div class="ex-head"><button class="btn ghost" id="quit">‹ Quitter</button><span class="small muted">${esc(queue.title)} · ${queue.i + 1}/${queue.items.length}</span></div>
    <div class="bar signal"><i id="qBar"></i></div>
    <section class="card">
      <div class="sentence" id="sentence">${P.splitDisplayWords(it.en).map((w, i) => `<button class="word" data-wi="${i}">${esc(w)}</button>`).join("")}</div>
      <p class="ipa" id="ipa"></p>
      ${it.fr ? `<p class="fr">${esc(it.fr)}</p>` : ""}
      <div class="row">
        <button class="btn" id="listen">Écouter</button>
        <button class="btn" id="slow">Lentement</button>
      </div>
    </section>
    <section class="card">
      <div class="recwrap">
        <button class="rec" id="rec" aria-label="Enregistrer">${MIC_SVG}</button>
        <p class="status" id="status">Écoute le modèle, puis appuie et lis la phrase.</p>
      </div>
      <div id="result"></div>
    </section>`;
  $("#qBar").style.width = (queue.i / queue.items.length * 100) + "%";
  $("#quit").onclick = () => go(queue.title === "Exercice du jour" ? "home" : "practice");
  $("#listen").onclick = () => speak(it.en, { voiceURI: S.voice, rate: 0.95 });
  $("#slow").onclick = () => speak(it.en, { voiceURI: S.voice, rate: S.slow });
  $("#rec").onclick = toggleRecording;
  document.querySelectorAll(".word").forEach(b => b.onclick = () => wordDetail(+b.dataset.wi));
  loadDict().then(d => {
    const ref = P.buildReference(d, it.en);
    queue.ref = ref;
    $("#ipa").textContent = "/" + ref.map(w => w.prons ? P.ipaString(w.prons[0]) : "?").join(" ") + "/";
    const unknown = ref.filter(w => w.norm && !w.prons).map(w => w.display);
    if (unknown.length) $("#status").textContent = `Mots inconnus du dictionnaire, non notés : ${unknown.join(", ")}`;
  }).catch(() => toast("Impossible de charger le dictionnaire. Vérifie ta connexion."));
  if (engineState === "off") startEngine();
}

async function toggleRecording() {
  if (busy) return;
  if (rec && rec.active) return stopRecording(false);
  if (!navigator.mediaDevices || !window.MediaRecorder) { toast("Ce navigateur ne permet pas d'enregistrer le micro. Essaie Chrome, Edge, Firefox ou Safari récent."); return; }
  const btn = $("#rec");
  rec = new Recorder({
    onLevel: lv => { if (btn) btn.style.boxShadow = `0 0 0 ${Math.round(lv * 18)}px color-mix(in srgb, var(--bad) 35%, transparent)`; },
    onAutoStop: () => { if (!autoStopping) { autoStopping = true; stopRecording(false); } }
  });
  try {
    await rec.start();
  } catch (e) {
    toast(e && e.name === "NotAllowedError" ? "Accès au micro refusé. Autorise le micro pour ce site dans ton navigateur." : "Micro introuvable ou déjà utilisé.");
    rec = null; return;
  }
  autoStopping = false;
  btn.classList.add("on"); btn.innerHTML = STOP_SVG; btn.setAttribute("aria-label", "Arrêter");
  $("#status").textContent = "Je t'écoute… (arrêt automatique quand tu as fini)";
}

async function stopRecording(discard) {
  if (!rec || !rec.active) return;
  const r = rec; rec = null;
  const btn = $("#rec");
  if (btn) { btn.classList.remove("on"); btn.innerHTML = MIC_SVG; btn.style.boxShadow = ""; btn.setAttribute("aria-label", "Enregistrer"); }
  let out;
  try { out = await r.stop(); } catch (e) { if (!discard) toast("Impossible de lire l'enregistrement. Réessaie."); return; }
  if (discard || view !== "exercise") return;
  if (!out || !out.heardSpeech || !out.pcm || out.pcm.samples.length < 8000) { $("#status").textContent = "Je n'ai rien entendu. Rapproche-toi du micro et parle un peu plus fort."; return; }
  if (lastAudioUrl) URL.revokeObjectURL(lastAudioUrl);
  lastAudioUrl = URL.createObjectURL(out.blob); lastOffset = out.pcm.offsetSec;
  busy = true; btn.disabled = true;
  try {
    if (engineState !== "ready") { $("#status").textContent = "Le moteur se prépare, ton enregistrement sera analysé juste après…"; if (!worker) startEngine(); await whenReady(); }
    $("#status").textContent = "Analyse de ta prononciation…";
    await loadDict();
    if (!queue.ref) queue.ref = P.buildReference(dict, queue.items[queue.i].en);
    const res = await analyze(out.pcm.samples);
    const result = P.evaluate(queue.ref, res.segs);
    showResult(result, res.ms);
  } catch (e) {
    toast(errorText(String(e && e.message || e)));
    $("#status").textContent = "Réessaie.";
  } finally { busy = false; const b = $("#rec"); if (b) b.disabled = false; }
}

function ring(score) {
  const r = 34, c = 2 * Math.PI * r, col = score >= 85 ? "good" : score >= 60 ? "ok" : "bad";
  return `<svg class="ring" viewBox="0 0 84 84" role="img" aria-label="Score ${score} sur 100"><circle class="track" cx="42" cy="42" r="${r}" fill="none" stroke-width="8"/>
    <circle class="arc ${col}" cx="42" cy="42" r="${r}" fill="none" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(score / 100 * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 42 42)"/>
    <text x="42" y="50" text-anchor="middle">${score}</text></svg>`;
}

function showResult(result, ms) {
  lastResult = result;
  const it = queue.items[queue.i];
  // couleur des mots
  document.querySelectorAll(".word").forEach(b => { const w = result.words[+b.dataset.wi]; b.className = "word " + (w ? w.level : ""); });
  const tips = P.tipsFor(result);
  const label = result.score >= 90 ? "Excellent, très clair !" : result.score >= 75 ? "Bien ! Quelques sons à peaufiner." : result.score >= 50 ? "Compréhensible. Travaille les mots en rouge." : "Difficile à comprendre. Écoute lentement et réessaie.";
  $("#status").textContent = "";
  $("#result").innerHTML = `
    <div class="score">${ring(result.score)}<div><b>${esc(label)}</b><p class="small muted">Touche un mot pour voir chaque son.</p></div></div>
    <div class="legend"><span class="lg">bien prononcé</span><span class="lo">presque</span><span class="lb">à corriger</span></div>
    ${tips.length ? `<ul class="tips">${tips.map(t => `<li><b>${esc(t.word)}</b>${esc(t.text)}</li>`).join("")}</ul>` : ""}
    <div id="detail"></div>
    <div class="row">
      <button class="btn" id="mine">Écouter ma voix</button>
      <button class="btn" id="again">Réessayer</button>
      <button class="btn primary" id="next">${queue.i + 1 < queue.items.length ? "Suivant" : "Terminer"}</button>
    </div>
    <p class="small muted">Entendu : /${esc(result.heardIpa.replace(/ /g, ""))}/ · analysé en ${(ms / 1000).toFixed(1)} s</p>`;
  $("#mine").onclick = () => playMine();
  $("#again").onclick = () => { $("#result").innerHTML = ""; document.querySelectorAll(".word").forEach(b => b.className = "word"); toggleRecording(); };
  $("#next").onclick = nextItem;
  // progression
  queue.scores.push(result.score);
  S.history.push({ d: today(), s: result.score, t: it.en.slice(0, 80) });
  if (S.history.length > 500) S.history = S.history.slice(-500);
  if (!S.days.includes(today())) S.days.push(today());
  S.sounds = P.updateSoundStats(S.sounds, result);
  save();
  const worst = result.words.map((w, i) => ({ w, i })).filter(x => x.w.level === "bad" || x.w.level === "ok").sort((a, b) => a.w.score - b.w.score)[0];
  if (worst) wordDetail(worst.i);
}

function nextItem() {
  if (queue.i + 1 < queue.items.length) { queue.i++; queue.ref = null; renderExercise(); return; }
  const avg = Math.round(queue.scores.reduce((a, b) => a + b, 0) / Math.max(1, queue.scores.length));
  $("#view").innerHTML = `<section class="card"><h2>Série terminée</h2>
    <div class="score">${ring(avg)}<div><b>Score moyen : ${avg}/100</b><p class="small muted">${queue.scores.length} essai(s) · ${doneToday()} aujourd'hui</p></div></div>
    <div class="row"><button class="btn" id="redo">Recommencer</button><button class="btn primary" id="home">Accueil</button></div></section>`;
  $("#redo").onclick = () => go("exercise", { title: queue.title, items: queue.items });
  $("#home").onclick = () => go("home");
}

function wordDetail(wi) {
  const it = queue.items[queue.i];
  const word = P.splitDisplayWords(it.en)[wi];
  const box = $("#detail");
  const w = lastResult && lastResult.words[wi];
  const clean = P.normWord(word);
  if (!w) { speak(clean || word, { voiceURI: S.voice, rate: 0.9 }); return; }
  if (!box) return;
  box.innerHTML = `<div class="detail">
    <div class="row between"><h3>${esc(word)}</h3>${w.score !== null ? `<span class="pill ${w.level}">${w.score} %</span>` : `<span class="pill">non noté</span>`}</div>
    ${w.phones.length ? `<div class="phones">${w.phones.map(ph => `<span class="ph ${ph.status}" title="${esc(P.FR_HINT[ph.p] || "")}">${esc(ph.p)}<small>${ph.status === "bad" ? (ph.heard ? "entendu " + esc(ph.heard) : "absent") : ph.status === "ok" ? "presque" : "ok"}</small></span>`).join("")}</div>` : ""}
    <div class="row"><button class="btn" id="wRef">Écouter le mot</button>${w.start !== null ? `<button class="btn" id="wMine">Mon mot</button>` : ""}</div></div>`;
  $("#wRef").onclick = () => speak(clean, { voiceURI: S.voice, rate: 0.85 });
  const m = $("#wMine"); if (m) m.onclick = () => playMine(w.start, w.end);
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

// ---------------- Mes sons ----------------
function renderSounds() {
  const all = Object.keys(P.FR_HINT).filter(p => p !== "ɾ");
  const rows = all.map(p => { const v = S.sounds[p]; return { p, pct: v && v.n ? Math.round(v.ok / v.n * 100) : null, n: v ? v.n : 0 }; })
    .sort((a, b) => (a.pct === null) - (b.pct === null) || (a.pct ?? 0) - (b.pct ?? 0));
  $("#view").innerHTML = `<h2>Mes sons</h2>
    <p class="small muted">Ta réussite sur chaque son anglais, calculée sur tous tes essais. Touche un son pour le travailler.</p>
    <section class="card"><div class="list">${rows.map(r => `<button class="sound" data-p="${esc(r.p)}"><span class="sym">${esc(r.p)}</span>
      <span><b>${esc(lessonTitle(r.p))}</b><br><span class="small muted">${esc(P.FR_HINT[r.p] || "")}</span><span class="bar"><i data-w="${r.pct ?? 0}"></i></span></span>
      <span class="pct">${r.pct === null ? "–" : r.pct + " %"}</span></button>`).join("")}</div></section>`;
  document.querySelectorAll(".bar > i[data-w]").forEach(i => { i.style.width = i.dataset.w + "%"; const v = +i.dataset.w; i.style.background = v >= 85 ? "var(--good)" : v >= 60 ? "var(--ok)" : "var(--bad)"; });
  document.querySelectorAll("[data-p]").forEach(b => b.onclick = () => go("lesson", { p: b.dataset.p }));
}

// ---------------- Réglages ----------------
function renderSettings() {
  const voices = englishVoices();
  $("#view").innerHTML = `<h2>Réglages</h2>
    <section class="card">
      <label class="f" for="voice">Voix anglaise du modèle</label>
      <select id="voice">${voices.length ? voices.map(v => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === S.voice ? "selected" : ""}>${esc(v.name)} (${esc(v.lang)})</option>`).join("") : `<option value="">Voix par défaut</option>`}</select>
      <button class="btn" id="tryVoice">Tester la voix</button>
      <label class="f" for="slowR">Vitesse « Lentement » : <span id="slowV">${Math.round(S.slow * 100)} %</span></label>
      <input type="range" id="slowR" min="0.5" max="0.9" step="0.05" value="${S.slow}">
      <label class="f" for="goal">Objectif quotidien</label>
      <select id="goal">${[5, 10, 15, 20, 30].map(n => `<option ${n === S.goal ? "selected" : ""}>${n}</option>`).join("")}</select>
    </section>
    <section class="card">
      <h3>Confidentialité et sécurité</h3>
      <ul class="small">
        <li>Ta voix est analysée sur ton appareil. Elle n'est jamais envoyée sur internet.</li>
        <li>Seul échange réseau : le téléchargement du modèle depuis Hugging Face, à une version figée.</li>
        <li>Aucun compte, aucune publicité, aucun traceur. Ta progression reste dans ce navigateur.</li>
      </ul>
      <p class="small muted">Moteur : ${esc($("#engine").textContent)} · ${self.crossOriginIsolated ? "calcul multi-cœurs actif" : "calcul sur un cœur"}</p>
    </section>
    <section class="card">
      <h3>Données</h3>
      <button class="btn" id="export">Copier ma progression (sauvegarde)</button>
      <button class="btn" id="delModel">Supprimer le modèle téléchargé</button>
      <button class="btn danger" id="delData">Effacer ma progression</button>
    </section>`;
  $("#voice").onchange = e => { S.voice = e.target.value; save(); };
  $("#tryVoice").onclick = () => speak("Hello! How are you today?", { voiceURI: S.voice });
  $("#slowR").oninput = e => { S.slow = +e.target.value; $("#slowV").textContent = Math.round(S.slow * 100) + " %"; save(); };
  $("#goal").onchange = e => { S.goal = +e.target.value; save(); };
  $("#export").onclick = async () => { try { await navigator.clipboard.writeText(JSON.stringify(S)); toast("Progression copiée dans le presse-papiers."); } catch (e) { toast("Copie impossible sur ce navigateur."); } };
  $("#delModel").onclick = async () => {
    if (!await confirmDlg("Supprimer le modèle ?", "Le modèle (≈ 360 Mo) sera retiré de ton appareil. Il faudra le retélécharger pour analyser ta prononciation. Ta progression est conservée.", "Supprimer le modèle")) return;
    try { await caches.delete("transformers-cache"); } catch (e) {}
    if (worker) { worker.terminate(); worker = null; }
    S.modelReady = false; save(); setEngine("off", "Moteur : non préparé"); toast("Modèle supprimé.");
  };
  $("#delData").onclick = async () => {
    if (!await confirmDlg("Effacer ta progression ?", "Ton historique, tes scores et ta série de jours seront effacés de cet appareil. Cette action est définitive.", "Tout effacer")) return;
    const keep = { voice: S.voice, slow: S.slow, goal: S.goal, modelReady: S.modelReady };
    S = { ...DEFAULTS, ...keep }; save(); toast("Progression effacée.");
  };
}
if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = () => { if (view === "settings") renderSettings(); };

// ---------------- Service worker (hors-ligne + isolation pour le calcul multi-cœurs) ----------------
if ("serviceWorker" in navigator && !TEST_LOCAL) {
  navigator.serviceWorker.register("sw.js").then(() => {
    if (!self.crossOriginIsolated && !sessionStorage.getItem("coiReload")) {
      navigator.serviceWorker.addEventListener("controllerchange", () => { sessionStorage.setItem("coiReload", "1"); location.reload(); }, { once: true });
    }
  }).catch(() => {});
}

// ---------------- Démarrage ----------------
if (S.modelReady) startEngine();
go("home");
