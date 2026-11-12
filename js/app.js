// Labo d'accent : entraînement à l'anglais façon jeu vidéo.
// Sécurité : tout le HTML passe par html`` (échappement automatique) et la politique Trusted Types « labo ».
// La voix est analysée sur l'appareil ; rien ne quitte le navigateur, sauf si l'utilisateur choisit Gemini.
import { html, render, append, replace, $, $$, setVar, makeWorker, scriptURL } from "./core/dom.js";
import { load, sanitize, defaults, exportText, parseImport, MAX_IMPORT, cleanText, STORE_KEY } from "./core/store.js";
import * as Econ from "./core/economy.js";
import * as Seal from "./core/seal.js";
import { saveSecret, loadSecret, deleteSecret, hasSecret, migrateLegacy, secretsAvailable } from "./core/secret.js";
import * as P from "./phonemes.js";
import { CATEGORIES, SOUND_LESSONS, MINIMAL_PAIRS } from "./content.js";
import { Recorder, speak, englishVoices, wavBase64 } from "./audio.js";
import * as G from "./game.js";
import * as M from "./meta.js";
import { SPECIES, ITEMS, THEMES, THEME_BY_ID, avatarSvg, bossSvg, BOSSES, droppable, describeOwned, themeKey, RARITY, EXCLUSIVES, DEFAULT_OWNED, ITEM_BY_ID, basePrice } from "./avatar.js";
import { COIN, TROPHY, CHEST_ICO, BOLT, SNOW, CROWN, HEART, chestSvg, emblemSvg, boxSvg } from "./art.js";
import { line, companionSay, pitchOf } from "./mascot.js";
import * as FX from "./fx.js";
import { VOCAB, LEVELS, sayText } from "./vocab.js";
import { BASICS, BASICS_BY_ID, basicsItems, basicsCardId, numberWords, yearWords, ordinalWords, pronOf } from "./basics.js";
import { DIALOGUES, STOP } from "./dialogues.js";
import { GRAMMAR, GLEVELS } from "./grammar.js";
import { MISTAKE_CATS, ALL_MISTAKES } from "./mistakes.js";
import { SCENES, systemPrompt } from "./scenes.js";
import { setupLocker } from "./views/locker.js";
import { setupArena } from "./views/arena.js";
import { createLootbox } from "./views/lootbox.js";
import { setupVerbs } from "./views/verbs.js";
import { setupFriends } from "./views/friends.js";

// ---------------- Anti-iframe ----------------
// Un autre site ne peut pas afficher l'appli dans un cadre (protection contre le « clickjacking »).
if (window.top !== window.self) {
  document.body.replaceChildren();
  const p = document.createElement("p"); p.className = "card";
  p.textContent = "Pour ta sécurité, le Labo d'accent ne s'ouvre pas dans un cadre. Ouvre-le directement dans un onglet.";
  document.body.appendChild(p);
  throw new Error("framed");
}

const params = new URLSearchParams(location.search);
const TEST_LOCAL = ["127.0.0.1", "localhost"].includes(location.hostname) && params.has("test");
const FORCE = TEST_LOCAL && params.has("accept"); // tests locaux uniquement : force un bon score
const shuffle = a => M.shuffleWith(a, Math.random);
// Heure de confiance : jamais en arrière, et recalée sur l'heure du serveur quand l'appareil est déréglé.
let clockOffset = 0;
const now = () => Econ.trustedNow(S.econ, Date.now(), clockOffset);
const today = () => M.dayKey(new Date(now()));

const ICON = {
  mic: html`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V22h2v-3.08A7 7 0 0 0 19 12z"/></svg>`,
  stop: html`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor"/></svg>`,
  spk: html`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>`,
  mute: html`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4zm12 .4 1.4-1.4L19.4 10l2-2 1.4 1.4-2 2 2 2-1.4 1.4-2-2-2 2-1.4-1.4 2-2z"/></svg>`,
  slow: html`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6zm-1 3v6l5 3 1-1.7-4-2.3V7z"/></svg>`,
  close: html`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6 10.6 12 5 6.4z"/></svg>`,
  play: html`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>`,
  pairs: html`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 7h10l-3-3 1.4-1.4L21 8l-5.6 5.4L14 12l3-3H7zm10 10H7l3 3-1.4 1.4L3 16l5.6-5.4L10 12l-3 3h10z"/></svg>`,
  review: html`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>`,
  lock: html`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zm-7-2a2 2 0 0 1 4 0v2h-4z"/></svg>`,
  shield: html`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5zm-1 14-4-4 1.4-1.4L11 13.2l4.6-4.6L17 10z"/></svg>`,
  star: on => html`<svg viewBox="0 0 24 24" class="${on ? "on" : ""}" aria-hidden="true"><path fill="${on ? "#ffd23f" : "#3b2f80"}" stroke="${on ? "#c99a00" : "#1d1450"}" stroke-width="1.5" d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.6L12 17.1l-5.9 3.3 1.3-6.6-4.9-4.5 6.6-.8z"/></svg>`
};
const COACH_LINK = html`<a class="btn cyan block" href="https://claude.ai/artifact/NpBH4v48K7L87LiDVvxiFt" target="_blank" rel="noopener noreferrer">Ouvrir mon coach</a>`;

// ---------------- État ----------------
let S = load();
const SIG_KEY = STORE_KEY + ".sig";
// Ce qui peut s'obtenir sans boutique : objets de départ, récompenses de défis (couronne, auréole…).
const isUnlockId = id => { const t = id.startsWith("theme.") ? THEME_BY_ID[id.slice(6)] : ITEM_BY_ID[id]; return !!(t && t.unlock); };
const AUDIT_DEPS = { levelOf: G.levelOf, basePrice, isExclusive: id => EXCLUSIVES.includes(id), isDefault: id => DEFAULT_OWNED.includes(id), isUnlock: isUnlockId };
// Vérification au démarrage : la sauvegarde doit porter le sceau de cet appareil.
let integrity = { status: "ok", notes: [] };
{
  let raw = null, sig = null;
  try { raw = localStorage.getItem(STORE_KEY); sig = localStorage.getItem(SIG_KEY); } catch (e) { /* stockage indisponible */ }
  if (raw && Seal.sealAvailable()) {
    const ok = !!sig && await Seal.verify(raw, sig);
    // Tests automatiques sur ce poste uniquement (127.0.0.1 + ?test) : un état injecté sans sceau est accepté.
    if (!ok && !(TEST_LOCAL && !sig)) {
      const status = !sig && !S.econ.sealed ? "legacy" : Seal.keyIsFresh() ? "unverified" : "tampered";
      const r = Econ.audit(S, today(), AUDIT_DEPS);
      S = sanitize(JSON.parse(JSON.stringify(S)));
      integrity = { status, notes: r.notes };
    }
  }
  S.econ.sealed = Seal.sealAvailable();
}
let saveSeq = 0;
function writeOut(json, sig) {
  try { localStorage.setItem(STORE_KEY, json); if (sig) localStorage.setItem(SIG_KEY, sig); else localStorage.removeItem(SIG_KEY); return true; }
  catch (e) { toast("Impossible d'enregistrer ta progression sur cet appareil."); return false; }
}
// Enregistre l'état et son sceau ensemble (le sceau est calculé avant l'écriture : jamais l'un sans l'autre).
function save() {
  S.econ.lastSeen = Math.max(S.econ.lastSeen || 0, now());
  const json = JSON.stringify(S), seq = ++saveSeq;
  if (!Seal.sealAvailable()) return writeOut(json, "");
  Seal.sign(json).then(sig => { if (seq === saveSeq) writeOut(json, sig); });
  return true;
}
const earn = (n, why) => Econ.credit(S, n, why, today(), now());
const streak = () => M.streakOf(S.days, S.frozenDays, today());
const xpToday = () => S.xpDays[today()] || 0;
const levelNow = () => G.levelOf(S.xp);
function markActive() { if (!S.days.includes(today())) S.days.push(today()); }
function avgScore(n = 30) { const h = S.history.slice(-n); return h.length ? Math.round(h.reduce((a, x) => a + x.s, 0) / h.length) : null; }
const reducedMotion = () => S.motion === "reduced" || (S.motion === "auto" && matchMedia("(prefers-reduced-motion: reduce)").matches);
FX.setReduced(reducedMotion);
function play(name) { if (S.sfx) { try { FX.sfx[name](); } catch (e) {} } }
const HAPTIC = { tap: 8, good: [14], great: [12, 30, 18], bad: [40, 40, 40], level: [30, 50, 30, 50, 90], chest: [20, 40, 80], hit: [25], crit: [15, 20, 60] };
function haptic(k) { if (S.haptics && navigator.vibrate) { try { navigator.vibrate(HAPTIC[k] || 10); } catch (e) {} } }
const boostActive = () => S.boostUntil > now();
const bossesWon = () => Object.values(S.bosses).filter(b => b.won).length;

function applyPrefs() {
  const root = document.documentElement;
  root.dataset.theme = S.theme;
  root.classList.toggle("reduce-motion", reducedMotion());
  root.classList.toggle("motion-full", S.motion === "full");
  const meta = $('meta[name="theme-color"]'), t = THEME_BY_ID[S.theme];
  if (meta && t) meta.setAttribute("content", t.sw[0]);
}

// ---------------- HUD ----------------
let pendingCoins = 0, avKey = "";
function renderHud() {
  const st = streak(), hs = $("#hStreak");
  hs.querySelector("span").textContent = st;
  hs.classList.toggle("off", !S.days.includes(today()));
  const lv = levelNow();
  $("#hLv").textContent = lv.level;
  setVar($("#hMe"), "--p", Math.round(lv.into / lv.need * 100));
  const k = JSON.stringify(S.avatar);
  if (k !== avKey) { avKey = k; render($("#hAv"), avatarSvg(S.avatar, { cls: "mini" })); }
  $("#hCoins span").textContent = Math.max(0, S.coins - pendingCoins);
  const hc = $("#hChest"); hc.hidden = !S.chests.length; hc.querySelector("span").textContent = S.chests.length;
  const hb = $("#hBoost"), left = S.boostUntil - now();
  hb.hidden = left <= 0;
  if (left > 0) { hb.querySelector("span").textContent = "×2"; hb.title = `Potion d'XP ×2 : encore ${Math.ceil(left / 60000)} min`; }
  const v = $("#hVoice"); render(v, S.poufVoice ? ICON.spk : ICON.mute); v.setAttribute("aria-pressed", String(S.poufVoice));
  v.setAttribute("aria-label", S.poufVoice ? `Couper la voix de ${S.avatar.name}` : `Activer la voix de ${S.avatar.name}`);
}
$("#hVoice").addEventListener("click", () => { S.poufVoice = !S.poufVoice; save(); renderHud(); if (!S.poufVoice && "speechSynthesis" in window) speechSynthesis.cancel(); });
$("#hMe").addEventListener("click", () => { play("tap"); go("profile"); });
$("#hCoins").addEventListener("click", () => { play("tap"); go("shop", { tab: "home" }); });
$("#hChest").addEventListener("click", () => openChestFlow());
setInterval(() => { if (S.boostUntil) renderHud(); }, 30000);
function collectCoins(fromEl, n) {
  if (!n) return;
  pendingCoins = n;
  requestAnimationFrame(() => FX.flyCoins(fromEl, $("#hCoins"), n, () => {
    const el = $("#hCoins span"), from = Math.max(0, S.coins - pendingCoins);
    pendingCoins = 0; play("coin"); FX.countUp(el, from, S.coins, 600);
  }));
}

// ---------------- Toasts, notifications, dialogues ----------------
let toastT;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3200);
}
// Notification façon « succès débloqué » (empilable, n'interrompt rien).
function notify(title, text, icon = COIN) {
  const box = $("#notif"); if (!box) return;
  const el = append(box, html`<div class="notif"><span class="ni">${icon}</span><span><b></b><br><span class="small"></span></span></div>`);
  el.querySelector("b").textContent = title; el.querySelector(".small").textContent = text;
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 400); }, 3600);
  while (box.children.length > 3) box.firstElementChild.remove();
}
function confirmDlg(title, text, okLabel = "Confirmer", { danger = true, noCancel = false } = {}) {
  const d = $("#dlg"); $("#dlgTitle").textContent = title; $("#dlgText").textContent = text; $("#dlgOk").textContent = okLabel;
  $("#dlgCancel").hidden = noCancel;
  $("#dlgOk").className = "btn sm " + (danger ? "red" : "green");
  return new Promise(res => {
    const done = v => { d.close(); res(v); };
    $("#dlgOk").onclick = () => done(true); $("#dlgCancel").onclick = () => done(false); d.oncancel = () => res(false);
    d.showModal();
  });
}
// Célébration plein écran (niveau, badge, rang, déblocage…). Toujours fermée par #celOk.
function celebrate({ kind = "goal", title, text = "", visual = null, extra = null, ok = "Super !" }) {
  const d = $("#cel");
  const vis = visual || html`<div class="av live">${avatarSvg(S.avatar, { cls: "happy" })}</div>`;
  render($("#celBody"), html`<div class="cel-vis cel-${kind}"><div class="rays"></div>${vis}</div>
    <h2 class="cel-title"></h2>${text ? html`<p class="cel-text"></p>` : ""}${extra || ""}
    <button class="btn yellow block shine" id="celOk">${ok}</button>`);
  $("#celBody .cel-title").textContent = title;
  if (text) $("#celBody .cel-text").textContent = text;
  FX.confetti($("#fx"), 2400); play(kind === "level" ? "level" : kind === "rank" ? "rank" : "done"); haptic(kind === "level" ? "level" : "great");
  return new Promise(res => { $("#celOk").onclick = () => { d.close(); res(); }; d.oncancel = () => res(); d.showModal(); });
}
const fx = () => FX.confetti($("#fx"));

// ---------------- Dictionnaire ----------------
let dict = null, dictLoading = null;
function loadDict() {
  if (dict) return Promise.resolve(dict);
  if (!dictLoading) dictLoading = fetch("data/cmudict.json").then(r => { if (!r.ok) throw new Error("dict"); return r.json(); }).then(d => (dict = d)).catch(e => { dictLoading = null; throw e; });
  return dictLoading;
}

// ---------------- Moteur de prononciation (worker) ----------------
let worker = null, engineState = "off", pending = new Map(), reqId = 0, readyWaiters = [];
function setEngine(state, label) {
  engineState = state;
  const el = $("#engine"); el.dataset.state = state; el.title = label;
  document.dispatchEvent(new CustomEvent("engine", { detail: label }));
}
function startEngine() {
  if (worker) return;
  worker = makeWorker(new URL("./worker.js", import.meta.url));
  setEngine("loading", "Moteur : préparation…");
  worker.onmessage = e => {
    const m = e.data;
    if (m.type === "progress") {
      const pct = m.total ? Math.round(m.loaded / m.total * 100) : 0;
      setEngine("loading", `Moteur : ${pct} %`);
      setVar($("#dlBar > i"), "--p", pct + "%");
      const txt = $("#dlTxt"); if (txt && m.total) txt.textContent = `${(m.loaded / 1e6).toFixed(0)} / ${(m.total / 1e6).toFixed(0)} Mo · vérification SHA-256 en cours`;
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
  if (/integrity/.test(m)) return "Téléchargement bloqué : le fichier reçu ne correspond pas à l'empreinte attendue. Rien n'a été installé (sécurité). Réessaie plus tard.";
  if (/refusé/.test(m)) return "Connexion bloquée par l'appli : seul Hugging Face, à une version figée, est autorisé.";
  if (/audio_trop_court/.test(m)) return "Enregistrement trop court. Parle un peu plus longtemps.";
  if (/fetch|network|Failed/i.test(m)) return "Le téléchargement du moteur a échoué. Vérifie ta connexion et réessaie.";
  if (/memory|Memory|allocation/i.test(m)) return "Pas assez de mémoire sur cet appareil. Ferme d'autres applis et réessaie.";
  return "Le moteur a rencontré une erreur. Recharge la page et réessaie.";
}

// ---------------- Navigation ----------------
const VIEWS = {};
function defView(name, renderFn, { tab = name, full = false } = {}) { VIEWS[name] = { render: renderFn, tab, full }; }
let view = "path", inActivity = false;
function go(v, opts) {
  const def = VIEWS[v]; if (!def) return;
  view = v;
  $$("nav.bottom button").forEach(b => { if (b.dataset.go === def.tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  document.body.classList.toggle("in-lesson", def.full);
  inActivity = def.full;
  document.body.dataset.view = v;
  if (v !== "dialog" && v !== "chat") document.body.classList.remove("hide-fr");
  if (v !== "chat" && chatRec && chatRec.active) { chatRec.stop().catch(() => {}); chatRec = null; }
  closeSheet();
  stopRecording(true);
  const main = $("#view");
  def.render(opts);
  main.classList.remove("enter"); void main.offsetWidth; main.classList.add("enter");
  renderHud();
  window.scrollTo(0, 0);
}
$$("nav.bottom button").forEach(b => b.addEventListener("click", () => { play("tap"); haptic("tap"); go(b.dataset.go); }));
document.addEventListener("engine", () => { if (view === "path") { const c = $("#setup"); if (c) { replace(c, setupCard()); bindSetup(); } } });

// ---------------- Récompenses ----------------
function quest(ev, n = 1) {
  const r = M.questEvent(S, today(), ev, n);
  for (const q of r.done) { notify("Quête terminée !", `${M.questText(q)} · +${q.coins} pièces`); play("coin"); }
  if (r.bonus) notify("Les 3 quêtes sont faites !", "Coffre d'argent gagné : ouvre-le en haut de l'écran.", CHEST_ICO);
  if (r.done.length) { save(); renderHud(); }
  return r;
}
function checkUnlocks() {
  const got = [], rank = M.rankOf(S.trophies).i, st = streak(), wins = bossesWon(), best = Math.max(0, ...S.chrono.best.map(b => b.score));
  for (const it of [...ITEMS, ...THEMES]) {
    if (!it.unlock) continue;
    const key = THEMES.includes(it) ? themeKey(it.id) : it.id;
    if (S.owned.includes(key)) continue;
    const u = it.unlock;
    if ((u.bosses && wins >= u.bosses) || (u.streak && st >= u.streak) || (u.rank !== undefined && rank >= u.rank) || (u.chrono && best >= u.chrono)) { S.owned.push(key); got.push(key); }
  }
  return got;
}
// Ajoute des trophées ; un nouveau rang rapporte un coffre (une seule fois par rang).
function addTrophies(n) {
  S.trophies += n;
  const r = M.rankOf(S.trophies);
  let rankUp = null;
  while (S.rankSeen < r.i) { S.rankSeen++; S.chests.push(M.rankChest(S.rankSeen)); rankUp = r; }
  return rankUp;
}
// extra.key : identifiant de l'activité (rejouer la même le même jour rapporte de moins en moins) ;
// extra.progress : pièces de progrès (nouvelle leçon, étoiles, records, mots appris), jamais réduites ni plafonnées.
function gainXp(total, startLevel, extra = {}) {
  const day = today(), mult = Econ.repeatMult(S.econ, extra.key, day);
  Econ.noteRun(S.econ, extra.key, day);
  const base = Math.round(total * mult), xp = boostActive() ? base * 2 : base;
  const before = xpToday();
  S.xp += xp; S.xpDays[day] = before + xp;
  const wasCapped = Econ.capReached(S);
  let coins = earn(M.coinsForXp(xp), "xp") + earn(Math.round((extra.coins || 0) * mult), extra.reason || "boss");
  const progress = earn(extra.progress || 0, "progress");
  coins += progress;
  markActive();
  const lv = levelNow().level, levels = [];
  while (S.levelSeen < lv) { S.levelSeen++; const r = M.levelReward(S.levelSeen); coins += earn(r.coins, "level"); S.chests.push(r.chest); levels.push(S.levelSeen); }
  const goalReached = before < S.goalXp && xpToday() >= S.goalXp;
  if (goalReached) coins += earn(15, "goal");
  const earned = G.newBadges(S, { streak: streak() }); S.badges.push(...earned);
  for (const id of earned) { coins += earn(25, "badge"); if (id === "streak7") S.chests.push("silver"); if (id === "streak30") S.chests.push("gold"); }
  const trophies = Math.round((extra.trophies || 0) * mult);
  const rankUp = trophies ? addTrophies(trophies) : null;
  const unlocks = checkUnlocks();
  const capNow = !wasCapped && Econ.capReached(S) && S.econ.capNoted !== day;
  if (capNow) S.econ.capNoted = day;
  save();
  quest("xp", xp);
  if (mult < 1) notify("Déjà fait aujourd'hui", `Récompense à ${Math.round(mult * 100)} % : une nouvelle leçon ou un meilleur score rapporte plus !`);
  if (progress) notify("Bravo pour tes progrès !", `${extra.why || "Nouveau progrès"} · +${progress} pièces`, COIN);
  if (capNow) notify("Plafond d'entraînement atteint", `${Econ.COIN_DAY_CAP} pièces d'entraînement aujourd'hui. L'XP compte toujours ; les pièces reviennent avec tes progrès, tes quêtes et demain.`);
  return { xpGained: xp, boosted: xp !== base, coins, progress, mult, levelUp: lv > startLevel ? lv : 0, levels, goalReached, earned, rankUp, unlocks, trophies };
}
async function rewards(o) {
  if (o.goalReached) await celebrate({ kind: "goal", title: "Objectif du jour atteint !", text: `${xpToday()} XP aujourd'hui · +15 pièces. Ta série continue !` });
  if (o.levelUp && o.levels && o.levels.length) {
    const lv = o.levelUp, newSp = SPECIES.filter(s => s.lvl > (o.levels[0] || lv) - 1 && s.lvl <= lv);
    await celebrate({ kind: "level", title: `Niveau ${lv} !`, text: `Tu es maintenant « ${G.levelTitle(lv)} ». +${40 * o.levels.length} pièces et ${o.levels.length > 1 ? o.levels.length + " coffres" : "un coffre"} à ouvrir.`,
      visual: html`<div class="lvl-burst"><span>${lv}</span></div>`,
      extra: newSp.length ? html`<div class="unlock-row">${newSp.map(s => html`<div class="unlock"><div class="av live">${avatarSvg({ ...S.avatar, species: s.id, skin: s.skins[0].id, head: "", eyes: "", neck: "", hand: "", aura: "" }, { cls: "happy" })}</div><b>Nouveau compagnon : ${s.name}</b></div>`)}</div>` : null });
  }
  for (const id of o.earned || []) {
    const b = G.BADGES.find(x => x.id === id);
    await celebrate({ kind: "badge", title: "Succès débloqué !", text: `${b.title} · ${b.desc} · +25 pièces`, visual: html`<div class="bdg got big"><div class="md">${b.sym}</div></div>` });
  }
  if (o.rankUp) await celebrate({ kind: "rank", title: `Rang ${o.rankUp.name} !`, text: "Nouveau rang dans l'arène. Un coffre t'attend en haut de l'écran.", visual: emblemSvg(o.rankUp, "big") });
  for (const id of o.unlocks || []) {
    const d = describeOwned(id);
    if (d) await celebrate({ kind: "unlock", title: "Récompense spéciale !", text: `${d.name} (${RARITY[d.rarity]}) est à toi. Équipe-le dans « Mon compagnon ».`,
      visual: d.kind === "item" ? html`<div class="unlock-ico av live">${avatarSvg({ ...S.avatar, [d.slot]: id }, { cls: "happy" })}</div>` : null });
  }
}
async function quitActivity(noConfirm, back) {
  if (SESS) {
    if (!await confirmDlg("Arrêter la séance ?", "Tu garderas l'XP des blocs déjà terminés.", "Arrêter")) return;
    endSession(false); return;
  }
  if (noConfirm || await confirmDlg("Quitter ?", "Tu perdras l'XP de l'exercice en cours.", "Quitter")) go(back);
}
function spend(n, why = "shop") { if (!Econ.debit(S, n, why, now())) return false; save(); renderHud(); return true; }

// ---------------- Coffres ----------------
async function openChestFlow() {
  if (!S.chests.length) return;
  const d = $("#chestDlg"), body = $("#chestBody");
  const tier = S.chests[0], C = M.CHESTS[tier];
  render(body, html`<p class="small muted">${S.chests.length > 1 ? `${S.chests.length} coffres à ouvrir` : "1 coffre à ouvrir"}</p>
    <h2 class="chest-name"></h2><button class="chest-btn" id="chestTap" aria-label="Ouvrir le coffre">${chestSvg(tier, "idle")}</button>
    <p class="small muted" id="chestHint">Touche le coffre pour l'ouvrir !</p><div id="chestLoot"></div>`);
  $(".chest-name", body).textContent = C.name;
  d.oncancel = () => {}; // fermer avant d'ouvrir : le coffre reste dans l'inventaire
  d.showModal();
  play("whoosh");
  await new Promise(res => { $("#chestTap").onclick = res; });
  if (!d.open) return;
  // Le tirage est appliqué tout de suite : fermer pendant l'animation ne fait rien perdre.
  const r = M.rollChest(tier, droppable(S.owned), M.cryptoRng());
  S.chests.shift(); earn(r.coins, "chest"); if (r.item) S.owned.push(r.item); S.stats.chests++; save();
  const svg = $("#chestTap .chest");
  svg.classList.remove("idle"); svg.classList.add("shake");
  haptic("chest");
  await new Promise(res => setTimeout(res, FX.reduced() ? 0 : 900));
  svg.classList.remove("shake"); svg.classList.add("open"); play("chest");
  $("#chestHint").hidden = true;
  FX.confetti($("#fx"), 1800, { y: 0.4 });
  const item = r.item ? describeOwned(r.item) : null;
  render($("#chestLoot"), html`<div class="loot">
      <div class="loot-coins">${COIN}<b>+${r.coins}</b> pièces${r.bonus ? html` <span class="small muted">(dont ${r.bonus} : déjà tout débloqué dans cette rareté)</span>` : ""}</div>
      ${item ? html`<div class="loot-item rar-${item.rarity}"><span class="rtag">${RARITY[item.rarity]}</span>
        <div class="loot-prev">${item.kind === "item" ? avatarSvg({ ...S.avatar, [item.slot]: r.item }, { cls: "happy" }) : item.kind === "skin" ? avatarSvg({ ...S.avatar, species: item.sp, skin: item.sk }, { cls: "happy" }) : html`<span class="swatch big">${THEME_BY_ID[item.theme].sw.map(c => html`<i data-css="--c:${c}"></i>`)}</span>`}</div>
        <b class="loot-name"></b></div>` : ""}
      <div class="row center">${item && item.kind !== "theme" ? html`<button class="btn cyan sm" id="chestEquip">Équiper</button>` : ""}${item && item.kind === "theme" ? html`<button class="btn cyan sm" id="chestEquip">Appliquer</button>` : ""}
        ${S.chests.length ? html`<button class="btn ghost sm" id="chestNext">Coffre suivant (${S.chests.length})</button>` : ""}<button class="btn yellow" id="chestOk">Super !</button></div></div>`);
  if (item) $(".loot-name").textContent = item.name;
  const close = () => { d.close(); renderHud(); if (view === "profile" || view === "locker" || view === "shop") go(view); };
  $("#chestOk").onclick = close;
  const eq = $("#chestEquip");
  if (eq) eq.onclick = () => {
    if (item.kind === "item") S.avatar[item.slot] = r.item;
    else if (item.kind === "skin") {
      const sp = SPECIES.find(x => x.id === item.sp);
      if (levelNow().level < sp.lvl) { toast(`${sp.name} se débloque au niveau ${sp.lvl} : la couleur t'attendra.`); close(); return; }
      S.avatar.species = item.sp; S.avatar.skin = item.sk;
    }
    else { S.theme = item.theme; applyPrefs(); }
    save(); play("buy"); close();
  };
  const nx = $("#chestNext"); if (nx) nx.onclick = () => { d.close(); renderHud(); openChestFlow(); };
  d.oncancel = () => { renderHud(); };
  renderHud();
}

// ---------------- Parcours ----------------
function setupCard() {
  if (engineState === "ready") return html`<div id="setup" hidden></div>`;
  if (engineState === "loading") return html`<section class="card" id="setup"><h3>${S.avatar.name} prépare ses oreilles…</h3>
    <p class="small">Téléchargement unique du moteur d'analyse des sons. Chaque fichier est vérifié (empreinte SHA-256) avant d'être utilisé.</p>
    <div class="bar xp" id="dlBar"><i></i></div><p class="small muted" id="dlTxt">Démarrage…</p></section>`;
  return html`<section class="card" id="setup"><h3>Avant de jouer</h3>
    <p class="small">Pour écouter ta prononciation, ${S.avatar.name} a besoin d'un moteur d'environ 355 Mo, téléchargé une seule fois. Utilise le Wi-Fi.</p>
    <p class="small muted">Ta voix est analysée sur ton appareil et n'est jamais envoyée sur internet.</p>
    <button class="btn yellow block shine" id="prep">${S.modelReady ? "Relancer le moteur" : "Préparer le moteur (≈ 355 Mo)"}</button></section>`;
}
function bindSetup() { const b = $("#prep"); if (b) b.onclick = () => { play("tap"); startEngine(); }; }
function nodeIcon(l) {
  if (l.kind === "sound") return html`${l.sound}`;
  if (l.kind === "pairs") return ICON.pairs;
  if (l.kind === "review") return ICON.review;
  return ICON.mic;
}
function untilMidnight() { const d = new Date(), m = new Date(d); m.setHours(24, 0, 0, 0); const h = Math.floor((m - d) / 3600e3), mn = Math.floor((m - d) / 60000) % 60; return h ? `${h} h ${mn} min` : `${mn} min`; }
// En haut de la colonne : tout ce qui compte aujourd'hui, et un bouton pour reprendre là où on s'est arrêté.
function todayCard(cur, lvl, goalPct) {
  const next = G.ALL_LESSONS[cur], st = streak(), q = S.quests.list.filter(x => x.done).length;
  return html`<section class="card today glow">
    <div class="today-top"><div class="ring" data-css="--p:${goalPct}"><span>${goalPct}%</span></div>
      <div class="grow"><div class="row between"><h3>Aujourd'hui</h3><span class="xpfloat">${xpToday()} / ${S.goalXp} XP</span></div>
        <div class="small muted">Niveau ${lvl.level} · ${G.levelTitle(lvl.level)}</div>
        <div class="bar xp"><i data-css="--p:${Math.round(lvl.into / lvl.need * 100)}%"></i></div></div></div>
    <div class="today-pills"><span class="pill">${st} jour${st > 1 ? "s" : ""} de série</span>
      <button class="pill pillbtn ${q === 3 ? "good" : ""}" id="toQuests">Quêtes ${q}/3</button>
      ${boostActive() ? html`<span class="pill ok">${BOLT} Potion ×2</span>` : ""}${S.freezes ? html`<span class="pill good">${SNOW} ${S.freezes} gel${S.freezes > 1 ? "s" : ""}</span>` : ""}</div>
    ${next && G.lessonState(S.lessons, cur) === "open" ? html`<button class="btn green block shine" id="resume">${Object.keys(S.lessons).length ? "Continuer" : "Commencer"} : ${next.title}</button>` : ""}
  </section>`;
}
function questsCard() {
  M.ensureQuests(S, today());
  return html`<section class="card quests side-late" id="quests"><div class="row between"><h3>Quêtes du jour</h3><span class="small muted">Nouvelles dans ${untilMidnight()}</span></div>
    ${S.quests.list.map(q => html`<div class="quest ${q.done ? "done" : ""}"><div class="grow"><b>${M.questText(q)}</b>
      <div class="bar sm"><i data-css="--p:${Math.round(q.prog / q.goal * 100)}%"></i></div><span class="small muted">${q.prog.toLocaleString("fr-FR")} / ${q.goal.toLocaleString("fr-FR")}</span></div>
      <span class="qreward">${q.done ? html`<b>✓</b>` : html`+${q.coins}`}${COIN}</span></div>`)}
    <div class="row between qbonus ${S.quests.bonus ? "got" : ""}"><span class="small">${S.quests.bonus ? "Bonus gagné : coffre d'argent" : "Bonus : coffre d'argent si les 3 sont faites"}</span>${CHEST_ICO}</div></section>`;
}
function renderPath() {
  const cur = G.currentLessonIndex(S.lessons), lvl = levelNow();
  let gi = 0;
  const units = G.UNITS.map(u => {
    const done = u.lessons.filter(l => S.lessons[l.id]).length, all = done === u.lessons.length;
    const b = S.bosses[u.id], boss = BOSSES[u.id];
    const nodes = u.lessons.map((l, k) => {
      const idx = gi++, st = G.lessonState(S.lessons, idx), rec = S.lessons[l.id];
      const isCur = idx === cur && st === "open";
      return html`<div class="node-wrap pos-${k % 8}" data-css="--i:${Math.min(k, 12)}">
        ${isCur ? html`<span class="start-tag">${idx ? "Continuer" : "Commencer"}</span><div class="path-pouf av live">${avatarSvg(S.avatar)}</div>` : ""}
        <button class="node ${st} ${st === "done" ? "tone-" + u.tone : ""}" data-idx="${idx}" aria-label="${l.title}${st === "locked" ? " (verrouillée)" : ""}">${st === "locked" ? ICON.lock : nodeIcon(l)}</button>
        <div class="node-stars">${st === "done" ? [1, 2, 3].map(n => ICON.star(n <= (rec.stars || 1))) : ""}</div>
        <span class="node-label">${l.title}</span></div>`;
    });
    const bst = b && b.won ? "won" : all ? "open" : "locked";
    const bossNode = html`<div class="node-wrap boss-wrap"><button class="bossnode ${bst}" data-boss="${u.id}" aria-label="Boss : ${boss.name}${bst === "locked" ? " (termine d'abord l'unité)" : ""}">
        ${bossSvg(u.id, bst === "won" ? "ko" : "")}${bst === "won" ? html`<span class="crown">${CROWN}</span>` : bst === "locked" ? html`<span class="lockb">${ICON.lock}</span>` : ""}</button>
        <span class="node-label boss-label">${bst === "won" ? "Boss vaincu" : "Boss"} · ${boss.name}</span></div>`;
    return html`<div class="unit tone-${u.tone}"><div><div class="k">${u.title}${b && b.won ? html` <span class="ucrown">${CROWN}</span>` : ""}</div><div class="t">${u.sub}</div></div><span class="cnt">${done}/${u.lessons.length}</span></div><div class="path">${nodes}${bossNode}</div>`;
  });
  const goalPct = Math.min(100, Math.round(xpToday() / S.goalXp * 100));
  render($("#view"), html`<div class="cols">
    <aside class="side">
    ${!S.onboarded ? html`<section class="card glow"><div class="coach" id="hello"><div class="av live">${avatarSvg(S.avatar)}</div><div class="bubble">${line("hello", S.avatar)}</div></div>
      <p class="small">Je suis ton coach d'accent. Tu lis des phrases, j'écoute chaque son et je te dis quoi corriger. Gagne de l'XP et des pièces, bats les boss et personnalise ton compagnon !</p></section>` : ""}
    ${S.news < 2 ? html`<section class="card news glow"><h3>Nouveau dans le Labo !</h3><ul class="plain"><li>9 compagnons à débloquer et plus de 40 accessoires</li><li>Boutique, coffres et quêtes du jour</li><li>Arène : défi chrono, défi du jour et rangs</li><li>Un boss à battre à la fin de chaque unité</li></ul>
      <p class="small">Cadeau de mise à jour : des pièces et un coffre d'or, selon ta progression.</p><div class="row"><button class="btn yellow sm" id="newsChest">Ouvrir mon cadeau</button><button class="btn ghost sm" id="newsOk">J'ai vu</button></div></section>` : ""}
    ${setupCard()}
    ${todayCard(cur, lvl, goalPct)}
    ${questsCard()}
    <section class="card loot-promo side-late"><div class="row"><span class="promo-box">${boxSvg("mythic", "idle")}</span><div class="grow"><h3>Boîtes à butin</h3><p class="small">Skins et accessoires exclusifs, du commun au mythique.</p></div></div>
      <button class="btn yellow block shine" id="toBoxes">Ouvrir le Shop · ${S.coins}${COIN}</button></section>
    <section class="card coach-link side-late"><h3>Pour discuter</h3><p class="small">Conversation, vocabulaire et corrections avec ton coach Claude.</p>${COACH_LINK}
      <p class="small muted kbd-tip">Raccourcis en leçon : <b>Espace</b> enregistrer, <b>L</b> écouter, <b>Entrée</b> continuer.</p></section>
    </aside>
    <div class="colmain">${units}</div></div>`);
  bindSetup();
  $$(".node").forEach(b => b.onclick = () => {
    const idx = +b.dataset.idx, st = G.lessonState(S.lessons, idx);
    if (st === "locked") { play("bad"); FX.shake(b); toast(line("locked", S.avatar)); return; }
    play("tap"); haptic("tap"); startLesson(G.ALL_LESSONS[idx]);
  });
  $$(".bossnode").forEach(b => b.onclick = () => {
    if (b.classList.contains("locked")) { play("bad"); FX.shake(b); toast("Termine toutes les leçons de l'unité pour affronter le boss."); return; }
    play("tap"); startBoss(b.dataset.boss);
  });
  $("#toBoxes").onclick = () => { play("tap"); go("shop", { tab: "home" }); };
  const rs = $("#resume"); if (rs) rs.onclick = () => { play("tap"); haptic("tap"); startLesson(G.ALL_LESSONS[cur]); };
  const tq = $("#toQuests"); if (tq) tq.onclick = () => { play("tap"); const q = $("#quests"); if (q) { q.scrollIntoView({ block: "nearest", behavior: FX.reduced() ? "auto" : "smooth" }); FX.pop(q); } };
  const nc = $("#newsChest"); if (nc) nc.onclick = () => { S.news = 2; save(); openChestFlow(); renderPath(); };
  const no = $("#newsOk"); if (no) no.onclick = () => { S.news = 2; save(); renderPath(); };
  if (!S.onboarded) { S.onboarded = true; save(); }
  const curNode = $(".node.open"); if (curNode && S.history.length) setTimeout(() => curNode.scrollIntoView({ block: "center", behavior: FX.reduced() ? "auto" : "smooth" }), 120);
}

// ---------------- Leçon (et combat de boss) ----------------
let L = null;
function startLesson(lesson) {
  const items = lesson.kind === "review" ? G.reviewItems(lesson, S.history) : lesson.items;
  if (!items.length) { toast("Rien à réviser pour l'instant."); return; }
  L = { lesson, items, i: 0, best: [], combo: 0, maxCombo: 0, xp: 0, startLevel: levelNow().level };
  if (engineState === "off") startEngine();
  go("lesson");
}
function startBoss(unitId) {
  const u = G.UNITS.find(x => x.id === unitId);
  const pool = u.lessons.filter(l => l.kind !== "review").flatMap(l => l.items);
  L = { lesson: { id: null, kind: "boss", title: `Boss · ${BOSSES[unitId].name}`, unit: unitId }, items: shuffle(pool).slice(0, M.BOSS_ITEMS), i: 0, best: [], combo: 0, maxCombo: 0, xp: 0, startLevel: levelNow().level,
    boss: { id: unitId, hp: M.BOSS_HP, hearts: M.BOSS_HEARTS, scores: [] } };
  if (engineState === "off") startEngine();
  go("lesson");
}
let rec = null, lastAudioUrl = null, lastOffset = 0, lastResult = null, busy = false, autoStopping = false, ref = null, TARGET = null;
function comboClass(c) { return c >= 8 ? "c4" : c >= 5 ? "c3" : c >= 3 ? "c2" : c >= 2 ? "c1" : ""; }
function bossPanel() {
  const B = L.boss, b = BOSSES[B.id];
  return html`<section class="boss-panel" id="bossPanel"><div class="boss-av" id="bossAv">${bossSvg(B.id)}</div>
    <div class="grow"><div class="row between"><b class="boss-name">${b.name}</b><span class="hearts" aria-label="${B.hearts} vies">${[1, 2, 3].map(n => HEART(n <= B.hearts))}</span></div>
    <div class="hp" aria-label="Points de vie du boss : ${B.hp}"><i data-css="--p:${Math.max(0, B.hp)}%"></i><span>${Math.max(0, B.hp)} PV</span></div>
    <p class="small boss-line">${L.i === 0 ? b.line : B.hp <= 34 ? "Grr… Je suis presque à terre !" : "C'est tout ce que tu as ?"}</p></div></section>`;
}
function renderLesson() {
  const it = L.items[L.i];
  lastResult = null; ref = null; TARGET = { text: it.en, onResult: showResult };
  const intro = L.i === 0 && L.lesson.tip ? L.lesson.tip : line("listen", S.avatar);
  render($("#view"), html`
    <div class="ltop"><button class="iconbtn" id="quit" aria-label="Quitter la leçon">${ICON.close}</button><div class="bar"><i data-css="--p:${L.i / L.items.length * 100}%"></i></div>
      <span class="combo ${comboClass(L.combo)}" id="combo">${L.combo > 1 ? html`<span class="cflame"></span>×${L.combo}` : ""}</span></div>
    ${L.boss ? bossPanel() : html`<div class="coach" id="coach"><div class="av live">${avatarSvg(S.avatar)}</div><div class="bubble">${intro}</div></div>`}
    <section class="card sentence-card" id="sCard">
      <div class="sentence">${P.splitDisplayWords(it.en).map((w, i) => html`<button class="word" data-wi="${i}">${w}</button>`)}</div>
      <p class="ipa" id="ipa"></p>
      ${it.fr ? html`<p class="fr">${it.fr}</p>` : ""}
      <div class="listen"><button class="btn cyan sm" id="listen">${ICON.spk}Écouter</button><button class="btn ghost sm" id="slow">${ICON.slow}Lentement</button></div>
    </section>
    <div class="mic-wrap"><button class="mic" id="rec" aria-label="Enregistrer">${ICON.mic}</button><p class="status" id="status">${L.boss ? "Une seule tentative par phrase : vise juste !" : "Appuie et lis la phrase à voix haute."}</p><p class="kbd-hint"><b>Espace</b> enregistrer · <b>L</b> écouter · <b>R</b> réessayer · <b>Entrée</b> continuer</p></div>
    <div class="spacer" id="spacer"></div>`);
  $("#quit").onclick = () => quitActivity(L.i === 0 && !L.best.length, L.lesson.id || L.boss ? "path" : "train");
  $("#listen").onclick = () => speak(it.en, { voiceURI: S.voice, rate: 0.95 });
  $("#slow").onclick = () => speak(it.en, { voiceURI: S.voice, rate: S.slow });
  $("#rec").onclick = toggleRecording;
  $$(".word").forEach(b => b.onclick = () => wordDetail(+b.dataset.wi));
  if (!L.boss) companionSay($("#coach"), intro, { voice: S.poufVoice && L.i === 0, av: S.avatar });
  loadDict().then(d => {
    ref = P.buildReference(d, it.en);
    $("#ipa").textContent = "/" + ref.map(w => w.prons ? P.ipaString(w.prons[0]) : "?").join(" ") + "/";
    const unknown = ref.filter(w => w.norm && !w.prons).map(w => w.display);
    if (unknown.length) $("#status").textContent = `Mots non notés (inconnus du dictionnaire) : ${unknown.join(", ")}`;
  }).catch(() => toast("Impossible de charger le dictionnaire. Vérifie ta connexion."));
}

function setStatus(t) { const el = $("#status") || $("#sayRes"); if (el) el.textContent = t; }
async function toggleRecording() {
  if (busy) return;
  if (rec && rec.active) return stopRecording(false);
  if (!navigator.mediaDevices || !window.MediaRecorder) { toast("Ce navigateur ne permet pas d'enregistrer le micro. Essaie Chrome, Edge, Firefox ou Safari récent."); return; }
  if (L && L.boss && L.best[L.i] !== undefined && view === "lesson") return;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if (!["gpoint", "mcard"].includes(view)) closeSheet();
  const btn = $("#rec");
  rec = new Recorder({
    onLevel: lv => setVar(btn, "--lv", Math.round(lv * 22)),
    onAutoStop: () => { if (!autoStopping) { autoStopping = true; stopRecording(false); } }
  });
  try { await rec.start(); }
  catch (e) { toast(e && e.name === "NotAllowedError" ? "Accès au micro refusé. Autorise le micro pour ce site dans ton navigateur." : "Micro introuvable ou déjà utilisé."); rec = null; return; }
  autoStopping = false;
  btn.classList.add("on"); render(btn, ICON.stop); btn.setAttribute("aria-label", "Arrêter");
  $$(".word").forEach(b => b.className = "word");
  setStatus("Je t'écoute… (arrêt automatique)");
}
async function stopRecording(discard) {
  if (!rec || !rec.active) return;
  const r = rec; rec = null;
  const btn = $("#rec");
  if (btn) { btn.classList.remove("on"); render(btn, ICON.mic); setVar(btn, "--lv", 0); btn.setAttribute("aria-label", "Enregistrer"); }
  let out;
  try { out = await r.stop(); } catch (e) { if (!discard) toast("Impossible de lire l'enregistrement. Réessaie."); return; }
  if (discard || !["lesson", "vcard", "dialog", "gpoint", "mcard"].includes(view)) return;
  if (!out || !out.heardSpeech || !out.pcm || out.pcm.samples.length < 8000) { setStatus("Je n'ai rien entendu. Rapproche-toi du micro et parle plus fort."); return; }
  if (lastAudioUrl) URL.revokeObjectURL(lastAudioUrl);
  lastAudioUrl = URL.createObjectURL(out.blob); lastOffset = out.pcm.offsetSec;
  busy = true; if (btn) btn.disabled = true;
  try {
    if (engineState !== "ready") { setStatus(`${S.avatar.name} prépare ses oreilles, ton essai sera analysé juste après…`); if (!worker) startEngine(); await whenReady(); }
    setStatus(`${S.avatar.name} écoute ta prononciation…`);
    await loadDict();
    if (!ref) ref = P.buildReference(dict, TARGET.text);
    const res = await analyze(out.pcm.samples);
    TARGET.onResult(P.evaluate(ref, res.segs), res.segs);
  } catch (e) { toast(errorText(String(e && e.message || e))); setStatus("Réessaie."); }
  finally { busy = false; const b = $("#rec"); if (b) b.disabled = false; }
}
function recordAttempt(text, result) {
  S.history.push({ d: today(), s: result.score, t: text.slice(0, 120) });
  if (S.history.length > 500) S.history = S.history.slice(-500);
  markActive();
  if (result.score >= 100) S.stats.perfect++;
  S.sounds = P.updateSoundStats(S.sounds, result);
  save(); renderHud();
  quest("attempt"); if (result.score >= 90) quest("great");
}
function closeSheet() { const s = $("#sheet"); if (s) s.remove(); setVar($("#spacer"), "--h", "0px"); }
function syncSpacer() { const sh = $("#sheet"), sp = $("#spacer"); if (sh && sp) setVar(sp, "--h", sh.offsetHeight + "px"); }
function sheetShell(mood, head, scroll, actions) {
  closeSheet();
  return append(document.body, html`<div id="sheet" class="sheet ${mood}"><div class="sheet-in">${head}<div class="scroll">${scroll}</div><div class="row between actions">${actions}</div></div></div>`);
}
function tipsList(tips) { return tips.length ? html`<ul class="tips">${tips.map(t => html`<li><b>${t.word}</b> · ${t.text}</li>`)}</ul>` : ""; }
function phonesRow(phones) {
  return html`<div class="phones">${phones.map(ph => html`<span class="ph ${ph.status}" title="${P.FR_HINT[ph.p] || ""}">${ph.p}<small>${ph.status === "bad" ? (ph.heard ? "entendu " + ph.heard : "absent") : ph.status === "ok" ? "presque" : "ok"}</small></span>`)}</div>`;
}
function sayLine(svgRoot, text) {
  if (!S.poufVoice) return;
  const svg = svgRoot && svgRoot.querySelector(".pouf");
  if (svg) svg.classList.add("talk");
  speak(text, { lang: "fr", rate: 1.05, pitch: pitchOf(S.avatar) }).then(() => { if (svg) svg.classList.remove("talk"); });
}
function showResult(result) {
  if (FORCE && L.boss) result.score = 90;
  lastResult = result;
  const it = L.items[L.i];
  $$(".word").forEach(b => { const w = result.words[+b.dataset.wi]; b.className = "word " + (w ? w.level : ""); });
  $("#status").textContent = "";
  L.best[L.i] = Math.max(L.best[L.i] ?? 0, result.score);
  recordAttempt(it.en, result);
  const sc = result.score, mood = sc >= 85 ? "great" : sc >= 55 ? "meh" : "bad";
  if (sc < 55) FX.shake($("#sCard"));
  if (L.boss) return bossResult(result, mood);
  const lineTxt = line(sc >= 95 ? "great" : sc >= 85 ? "good" : sc >= 55 ? "meh" : "bad", S.avatar);
  const title = sc >= 95 ? "Parfait !" : sc >= 85 ? "Bien joué !" : sc >= 55 ? "Presque !" : "On réessaie ?";
  const gain = G.xpForScore(L.best[L.i], L.best[L.i] >= 85 ? L.combo + 1 : 0);
  sheetShell(mood, html`<div class="head"><div class="av live" id="sheetPouf">${avatarSvg(S.avatar, { cls: mood === "great" ? "happy" : mood === "bad" ? "sad" : "" })}</div>
      <div><div class="title">${title}</div><p class="small">${lineTxt}</p></div><span class="score-big" id="scoreBig">${sc}</span></div>`,
    html`${tipsList(P.tipsFor(result, 3))}<div id="detail"></div>`,
    html`<div class="row"><button class="btn ghost sm" id="mine">${ICON.play}Ma voix</button><button class="btn ghost sm" id="again">${ICON.review}Réessayer</button></div>
      <button class="btn ${mood === "great" ? "green" : mood === "meh" ? "orange" : "red"}" id="next">Continuer <span class="small">+${gain} XP</span></button>`);
  FX.countUp($("#scoreBig"), 0, sc, 500);
  if (sc >= 95) { FX.floatText("PARFAIT !", $("#scoreBig"), "gold"); FX.confetti($("#fx"), 1200, { y: 0.8, count: 70 }); }
  else if (sc >= 85) FX.floatText("SUPER !", $("#scoreBig"), "green");
  play(mood === "great" ? "great" : mood === "meh" ? "good" : "bad"); haptic(mood === "great" ? "great" : mood === "bad" ? "bad" : "good");
  sayLine($("#sheetPouf"), lineTxt);
  $("#mine").onclick = () => playMine();
  $("#again").onclick = () => { closeSheet(); toggleRecording(); };
  $("#next").onclick = nextItem;
  const worst = result.words.map((w, i) => ({ w, i })).filter(x => x.w.level === "bad" || x.w.level === "ok").sort((a, b) => a.w.score - b.w.score)[0];
  if (worst) wordDetail(worst.i);
  syncSpacer();
}
function bossResult(result, mood) {
  const B = L.boss, sc = result.score, hit = M.bossHit(sc);
  B.hp -= hit.dmg; B.scores.push(sc);
  if (hit.kind === "miss") B.hearts--;
  const av = $("#bossAv");
  replace($("#bossPanel"), bossPanel());
  const av2 = $("#bossAv");
  if (hit.dmg) { FX.shake(av2); FX.flash(av2); FX.floatText(hit.kind === "crit" ? `CRITIQUE ! −${hit.dmg}` : `−${hit.dmg}`, av2, hit.kind === "crit" ? "gold" : "red"); play(hit.kind === "crit" ? "crit" : "hit"); haptic(hit.kind === "crit" ? "crit" : "hit"); }
  else { FX.floatText("RATÉ…", av2 || av, "red"); play("heart"); haptic("bad"); FX.shake($(".hearts")); }
  const over = B.hp <= 0 || B.hearts <= 0 || L.i + 1 >= L.items.length;
  const title = hit.kind === "crit" ? "Coup critique !" : hit.kind === "hit" ? "Touché !" : hit.kind === "graze" ? "Égratignure…" : "Raté, tu perds une vie";
  sheetShell(mood, html`<div class="head"><div class="av" id="sheetPouf">${avatarSvg(S.avatar, { cls: hit.dmg ? "happy" : "sad" })}</div>
      <div><div class="title">${title}</div><p class="small">${hit.dmg ? `${hit.dmg} dégâts · prononciation ${sc}` : "Moins de 45 : le boss esquive. Écoute le modèle et vise juste à la prochaine phrase."}</p></div><span class="score-big">${sc}</span></div>`,
    html`${tipsList(P.tipsFor(result, 2))}<div id="detail"></div>`,
    html`<div class="row"><button class="btn ghost sm" id="mine">${ICON.play}Ma voix</button></div>
      <button class="btn ${B.hp <= 0 ? "green" : mood === "bad" ? "red" : "orange"}" id="next">${over ? (B.hp <= 0 ? "Victoire !" : "Fin du combat") : "Phrase suivante"}</button>`);
  $("#mine").onclick = () => playMine();
  $("#next").onclick = () => { closeSheet(); if (B.hp <= 0) finishBoss(true); else if (over) finishBoss(false); else { L.i++; renderLesson(); } };
  syncSpacer();
}
function finishBoss(win) {
  const B = L.boss, prev = S.bosses[B.id] || { won: false, best: 0, tries: 0 };
  const avg = B.scores.length ? Math.round(B.scores.reduce((a, b) => a + b, 0) / B.scores.length) : 0;
  const first = win && !prev.won, R = M.bossRewards(win, first);
  S.bosses[B.id] = { won: prev.won || win, best: Math.max(prev.best, avg), tries: prev.tries + 1 };
  if (win) S.stats.bosses++;
  if (R.chest) S.chests.push(R.chest);
  const g = gainXp(R.xp, L.startLevel, { coins: R.coins, trophies: R.trophies, key: "boss:" + B.id, reason: "boss" });
  go("bfinish", { win, avg, first, R, ...g });
}
function renderBossFinish(o) {
  const b = BOSSES[L.boss.id];
  render($("#view"), html`<section class="card finish ${o.win ? "win" : "lose"}">
    <div class="boss-big">${bossSvg(L.boss.id, o.win ? "ko" : "taunt")}${o.win ? html`<span class="crown big">${CROWN}</span>` : ""}</div>
    <h2>${o.win ? "Boss vaincu !" : "Le boss s'en sort…"}</h2>
    <p class="muted">${o.win ? `${b.name} a perdu son accent. ${o.first ? "Une couronne brille sur l'unité !" : ""}` : "Il te reste des sons à travailler. Entraîne-toi et reviens !"}</p>
    <div class="tiles four">
      <div class="tile y"><span class="l">XP</span><span class="v">+${o.xpGained}</span></div>
      <div class="tile o" id="coinTile"><span class="l">Pièces</span><span class="v">+${o.coins}</span></div>
      <div class="tile c"><span class="l">Trophées</span><span class="v">+${o.trophies}</span></div>
      <div class="tile g"><span class="l">Précision</span><span class="v">${o.avg}%</span></div>
    </div>
    ${o.R.chest ? html`<p class="pill good">${CHEST_ICO} ${M.CHESTS[o.R.chest].name} gagné !</p>` : ""}
    <div class="row center">${o.win ? "" : html`<button class="btn ghost" id="bfRetry">Revanche</button>`}<button class="btn green shine" id="bfOk">Continuer</button></div></section>`);
  if (o.win) { fx(); play("done"); } else play("bad");
  collectCoins($("#coinTile"), o.coins);
  const rt = $("#bfRetry"); if (rt) rt.onclick = () => startBoss(L.boss.id);
  $("#bfOk").onclick = async () => { await rewards(o); go("path"); };
}

function nextItem() {
  const best = L.best[L.i] ?? 0;
  L.combo = best >= 85 ? L.combo + 1 : 0;
  L.maxCombo = Math.max(L.maxCombo, L.combo);
  L.xp += G.xpForScore(best, L.combo);
  if (L.combo >= 2) quest("combo", L.combo);
  if (L.combo >= 3) toast(line("combo", S.avatar) + ` ×${L.combo}`);
  closeSheet();
  if (L.i + 1 < L.items.length) { L.i++; play("tap"); renderLesson(); const c = $("#combo"); if (c && L.combo > 1) FX.pop(c); return; }
  finishLesson();
}
function finishLesson() {
  const scores = L.items.map((_, i) => L.best[i] ?? 0);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const st = G.stars(avg);
  const bonus = 20 + (scores.every(s => s >= 85) ? 10 : 0);
  const total = L.xp + bonus;
  S.bestCombo = Math.max(S.bestCombo || 0, L.maxCombo);
  const why = [];
  let progress = 0;
  if (L.lesson.id) {
    const had = S.lessons[L.lesson.id], prev = had || { stars: 0, best: 0 };
    if (!had) { progress += Econ.PROGRESS.firstLesson; why.push("nouvelle leçon"); }
    if (st > prev.stars) { progress += (st - prev.stars) * Econ.PROGRESS.newStar; why.push(st - prev.stars > 1 ? `${st - prev.stars} nouvelles étoiles` : "nouvelle étoile"); }
    if (had && avg >= prev.best + 5) { progress += Econ.PROGRESS.newBest; why.push(`record ${avg} %`); }
    S.lessons[L.lesson.id] = { stars: Math.max(prev.stars, st), best: Math.max(prev.best, avg), d: today() };
  }
  const g = gainXp(total, L.startLevel, { key: "lesson:" + (L.lesson.id || L.lesson.kind || "free"), progress, why: why.join(", ") });
  if (L.lesson.id) quest("lesson");
  go("finish", { avg, st, total, combo: L.maxCombo, ...g });
}
function renderFinish(o) {
  render($("#view"), html`<section class="card finish">
    <div class="coach" id="finCoach"><div class="av live">${avatarSvg(S.avatar, { cls: "happy" })}</div><div class="bubble"></div></div>
    <h2>Leçon terminée !</h2>
    <div class="bigstars">${[1, 2, 3].map(n => ICON.star(n <= o.st))}</div>
    <div class="tiles four">
      <div class="tile y"><span class="l">XP gagnés</span><span class="v" id="fXp">+${o.xpGained}</span></div>
      <div class="tile o" id="coinTile"><span class="l">Pièces</span><span class="v">+${o.coins}</span></div>
      <div class="tile g"><span class="l">Précision</span><span class="v">${o.avg}%</span></div>
      <div class="tile c"><span class="l">Combo max</span><span class="v">×${o.combo}</span></div>
    </div>
    ${o.boosted ? html`<p class="pill ok">${BOLT} Potion ×2 : XP doublée</p>` : ""}
    <p class="small muted">${L.lesson.title} · série de ${streak()} jour${streak() > 1 ? "s" : ""}</p>
    <div class="row center"><button class="btn ghost" id="redo">Rejouer</button><button class="btn green shine" id="cont">Continuer</button></div>
  </section>`);
  fx(); play("done");
  companionSay($("#finCoach"), line("done", S.avatar), { voice: S.poufVoice, mood: "happy", av: S.avatar });
  collectCoins($("#coinTile"), o.coins);
  const redo = $("#redo"); if (SESS) redo.remove(); else redo.onclick = () => startLesson(L.lesson);
  $("#cont").onclick = async () => { await rewards(o); if (SESS) sessionNext(); else go(L.lesson.id ? "path" : "train"); };
}

function wordDetail(wi) {
  const it = L.items[L.i];
  const word = P.splitDisplayWords(it.en)[wi];
  const clean = P.normWord(word);
  const w = lastResult && lastResult.words[wi];
  const box = $("#detail");
  if (!w || !box) { speak(clean || word, { voiceURI: S.voice, rate: 0.9 }); return; }
  render(box, html`<div class="detail">
    <div class="row between"><h3>${word}</h3>${w.score !== null ? html`<span class="pill ${w.level}">${w.score} %</span>` : html`<span class="pill">non noté</span>`}</div>
    ${w.phones.length ? phonesRow(w.phones) : ""}
    <div class="row"><button class="btn cyan sm" id="wRef">${ICON.spk}Le mot</button>${w.start !== null ? html`<button class="btn ghost sm" id="wMine">${ICON.play}Mon mot</button>` : ""}</div></div>`);
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

// ---------------- Pratique ----------------
// Pratique : deux onglets clairs. « Conversation » pour parler (IA libre, jeux de rôle par niveau),
// « Prononciation » pour travailler les sons, avec une suggestion basée sur ton point faible.
let TR = { tab: "talk", lv: "" };
const soundPct = p => { const v = S.sounds[p]; return v && v.n ? Math.round(v.ok / v.n * 100) : null; };
function renderTrain() {
  const tabs = html`<div class="seg" role="tablist" aria-label="Pratique">${[["talk", "Conversation"], ["pron", "Prononciation"]].map(([t, l]) => html`<button role="tab" aria-selected="${TR.tab === t}" class="${TR.tab === t ? "on" : ""}" data-trtab="${t}">${l}</button>`)}</div>`;
  let body;
  if (TR.tab === "talk") {
    const lvls = [...new Set(DIALOGUES.map(d => d.level))], list = DIALOGUES.filter(d => !TR.lv || d.level === TR.lv);
    body = html`
      <section class="card free-chat glow"><div class="coach"><div class="av live">${avatarSvg(S.avatar)}</div><div class="bubble">Envie de parler librement ? Dis ce que tu veux, l'IA te répond et corrige tes fautes.</div></div>
        <button class="btn yellow block shine" id="toChat">${ICON.mic}Conversation libre avec l'IA</button></section>
      <div class="row between tr-head"><h3>Jeux de rôle</h3><span class="small muted">${DIALOGUES.filter(d => S.dialogues[d.id]).length}/${DIALOGUES.length} faits</span></div>
      <p class="small muted">${S.avatar.name} joue un personnage, tu réponds au micro. Pas sûr ? Écoute d'abord le dialogue en entier.</p>
      <div class="chips" role="tablist" aria-label="Niveau">${[["", "Tous"], ...lvls.map(l => [l, l])].map(([v, t]) => html`<button class="chip ${TR.lv === v ? "on" : ""}" data-trlv="${v}">${t}</button>`)}</div>
      <div class="dgrid">${list.map((d, k) => { const r = S.dialogues[d.id]; return html`<section class="card dcard" data-css="--i:${k}"><div class="row between"><span class="pill ok">${d.level}</span>${r ? html`<span class="pill good">${r.best} %</span>` : html`<span class="pill">nouveau</span>`}</div>
        <h3>${d.title}</h3><p class="small muted">${d.goal}</p>
        <div class="row"><button class="btn green sm" data-role="${d.id}">${ICON.mic}Jouer</button><button class="btn ghost sm" data-listen="${d.id}">${ICON.spk}Écouter</button></div></section>`; })}</div>`;
  } else {
    // Point faible : le son le moins réussi (au moins 5 essais) qui a un exercice dédié
    const weak = SOUND_LESSONS.map(l => ({ l, pct: soundPct(l.p), n: (S.sounds[l.p] || {}).n || 0 })).filter(x => x.n >= 5).sort((a, b) => a.pct - b.pct)[0];
    body = html`
      <section class="card glow tr-hero">${weak
        ? html`<div class="row"><span class="sym big">${weak.l.p}</span><div class="grow"><span class="small muted">Ton point faible du moment</span><h3>${weak.l.title}</h3><p class="small">${weak.pct} % de réussite sur ${weak.n} essais. ${weak.l.tip}</p></div></div>
          <button class="btn green block shine" data-p="${weak.l.p}">S'entraîner sur ce son</button>`
        : html`<div class="coach"><div class="av live">${avatarSvg(S.avatar)}</div><div class="bubble">Fais quelques leçons : je repérerai les sons qui te posent problème et je te proposerai le bon exercice ici.</div></div>`}</section>
      <div class="tr-tiles">
        <button class="vgame trio" data-go2="snd"><b>Sons difficiles</b><span>${SOUND_LESSONS.length} sons anglais</span></button>
        <button class="vgame rush" data-cat="pairs"><b>Paires minimales</b><span>ship / sheep, think / sink…</span></button>
        <button class="vgame write" id="toSounds"><b>Mes sons</b><span>Ta réussite son par son</span></button>
        <button class="vgame say" data-go2="mine"><b>Ma phrase</b><span>Celle que tu veux</span></button>
      </div>
      <h3 class="tr-sec">Phrases par thème</h3>
      <div class="theme-grid">${CATEGORIES.map((c, k) => html`<button class="card tcat" data-cat="${c.id}" data-css="--i:${k}"><b>${c.title}</b><span class="small muted">${c.sub}</span><span class="pill">${c.items.length} phrases</span></button>`)}</div>
      <h3 class="tr-sec" id="snd">Sons difficiles</h3>
      <div class="snd-grid">${SOUND_LESSONS.map(l => { const pct = soundPct(l.p); return html`<button class="snd-tile" data-p="${l.p}"><span class="sym">${l.p}</span><b>${l.title}</b>${pct === null ? html`<span class="small muted">pas encore travaillé</span>` : html`<span class="bar sm"><i data-css="--p:${pct}%"></i></span><span class="small muted">${pct} % de réussite</span>`}</button>`; })}</div>
      <section class="card" id="mine"><h3>Ta propre phrase</h3>
        <label class="f" for="free">Une phrase en anglais (par exemple vue avec ton coach)</label>
        <div class="row"><input type="text" id="free" maxlength="140" autocomplete="off" placeholder="I would like a coffee, please."><button class="btn yellow" id="freeGo">S'entraîner</button></div></section>`;
  }
  render($("#view"), html`<h2>Pratique</h2>${tabs}${body}`);
  $$("[data-trtab]").forEach(b => b.onclick = () => { play("tap"); TR.tab = b.dataset.trtab; renderTrain(); });
  $$("[data-trlv]").forEach(b => b.onclick = () => { play("tap"); TR.lv = b.dataset.trlv; renderTrain(); });
  $$("[data-go2]").forEach(b => b.onclick = () => { play("tap"); const t = document.getElementById(b.dataset.go2); if (t) { t.scrollIntoView({ block: "start", behavior: FX.reduced() ? "auto" : "smooth" }); const i = $("#free"); if (b.dataset.go2 === "mine" && i) setTimeout(() => i.focus(), 400); } });
  $$("[data-cat]").forEach(b => b.onclick = () => {
    play("tap");
    if (b.dataset.cat === "pairs") return startLesson({ id: null, kind: "pairs", title: "Paires minimales", items: shuffle(MINIMAL_PAIRS).slice(0, 5).flatMap(([a, c]) => [{ en: a, fr: `${a} / ${c}` }, { en: c, fr: `${a} / ${c}` }]) });
    const c = CATEGORIES.find(x => x.id === b.dataset.cat);
    startLesson({ id: null, kind: "free", title: c.title, items: c.items.map(i => ({ en: i[0], fr: i[1] })) });
  });
  $$("[data-p]").forEach(b => b.onclick = () => { play("tap"); soundDrill(b.dataset.p); });
  const ts = $("#toSounds"); if (ts) ts.onclick = () => go("sounds");
  const tc = $("#toChat"); if (tc) tc.onclick = () => { play("tap"); go("chatsetup"); };
  $$("[data-role]").forEach(b => b.onclick = () => { play("tap"); startDialog(b.dataset.role); });
  $$("[data-listen]").forEach(b => b.onclick = () => { play("tap"); startListen(b.dataset.listen); });
  const fi = $("#free");
  if (fi) {
    const free = () => { const t = cleanText(fi.value, 140); if (t) startLesson({ id: null, kind: "free", title: "Ta phrase", items: [{ en: t, fr: "" }] }); };
    $("#freeGo").onclick = free;
    fi.addEventListener("keydown", e => { if (e.key === "Enter") free(); });
  }
}
function soundDrill(p) {
  const l = SOUND_LESSONS.find(x => x.p === p);
  if (!l) { toast("Ce son revient dans les phrases des leçons."); return; }
  startLesson({ id: null, kind: "sound", sound: p, title: l.title, tip: l.tip, items: l.items.map(en => ({ en, fr: "" })) });
}
function renderSounds() {
  const all = Object.keys(P.FR_HINT).filter(p => p !== "ɾ");
  const title = p => { const l = SOUND_LESSONS.find(x => x.p === p); return l ? l.title : `Le son « ${p} »`; };
  const rows = all.map(p => { const v = S.sounds[p]; return { p, pct: v && v.n ? Math.round(v.ok / v.n * 100) : null, n: v ? v.n : 0 }; })
    .sort((a, b) => (a.pct === null) - (b.pct === null) || (a.pct ?? 0) - (b.pct ?? 0));
  render($("#view"), html`<h2>Mes sons</h2>
    <p class="small muted">Ta réussite sur chaque son anglais, sur tous tes essais. Les plus faibles sont en haut : touche-les pour t'entraîner.</p>
    <section class="card"><div class="list">${rows.map(r => html`<button class="sound" data-p="${r.p}"><span class="sym">${r.p}</span>
      <span><b>${title(r.p)}</b><br><span class="small muted">${P.FR_HINT[r.p] || ""}${r.n ? ` · ${r.n} essais` : ""}</span><span class="bar"><i class="${r.pct === null || r.pct >= 85 ? "" : r.pct >= 60 ? "ok" : "bad"}" data-css="--p:${r.pct ?? 0}%"></i></span></span>
      <span class="pct">${r.pct === null ? "–" : r.pct + "%"}</span></button>`)}</div></section>`);
  $$("[data-p]").forEach(b => b.onclick = () => { play("tap"); soundDrill(b.dataset.p); });
}

// ---------------- Profil & réglages ----------------
let keySaved = false, sessionKey = "";
async function refreshKeyState() { try { keySaved = secretsAvailable() && await hasSecret("gemini"); } catch (e) { keySaved = false; } }
function titleOptions() {
  const lv = levelNow().level, rank = M.rankOf(S.trophies);
  return [["", `${G.levelTitle(lv)} (niveau)`], ["rank", `${rank.name} ${rank.div} (rang)`], ...S.badges.map(id => { const b = G.BADGES.find(x => x.id === id); return [id, b.title]; })];
}
function shownTitle() {
  if (S.title === "rank") { const r = M.rankOf(S.trophies); return `${r.name} ${r.div}`.trim(); }
  const b = S.title && G.BADGES.find(x => x.id === S.title);
  return b ? b.title : G.levelTitle(levelNow().level);
}
// Profil : en-tête avec le compagnon, puis 3 onglets (Profil · Amis · Réglages).
let PF = { tab: "me" };
function renderProfile() {
  const lv = levelNow(), voices = englishVoices(), avg = avgScore(), rank = M.rankOf(S.trophies);
  const bestChrono = S.chrono.best[0] ? S.chrono.best[0].score : 0;
  const fr = S.social.friends, today0 = today(), mastered = pre => Object.entries(S.vocab).filter(([k, v]) => (pre ? k.startsWith(pre) : !k.startsWith("IV:")) && G.vocabStatus(v) === "mastered").length;
  const since = S.days.length ? [...S.days].sort()[0] : today0, sinceTxt = new Date(since + "T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const rushBest = Math.max(0, ...Object.values(S.irr).map(x => x.rush || 0));
  const owned = S.owned.length, got = G.BADGES.filter(b => S.badges.includes(b.id)), notYet = G.BADGES.filter(b => !S.badges.includes(b.id));
  // Calendrier d'activité : les 12 dernières semaines, du lundi au dimanche
  const dow = (new Date(today0 + "T12:00:00").getDay() + 6) % 7, first = M.addDays(today0, -(7 * 11 + dow));
  const cells = Array.from({ length: 7 * 11 + dow + 1 }, (_, k) => { const d = M.addDays(first, k), xp = S.xpDays[d] || 0; return { d, xp, l: !xp ? 0 : xp < S.goalXp ? 1 : xp < 2 * S.goalXp ? 2 : 3 }; });
  const active12 = cells.filter(c => c.xp).length;
  const stat = (cls, label, v, sub = "") => html`<div class="pstat ${cls}"><span class="v">${v}</span><span class="l">${label}</span>${sub ? html`<span class="s">${sub}</span>` : ""}</div>`;
  const tabs = [["me", "Profil"], ["friends", `Amis${fr.length ? " · " + fr.length : ""}`], ["settings", "Réglages"]];
  render($("#view"), html`
    <section class="card pro-hero glow">
      <div class="pro-av av live">${avatarSvg(S.avatar, { cls: "happy" })}</div>
      <div class="pro-id">
        <h2 class="player-name"></h2>
        <span class="player-title small"></span>
        <span class="small muted">Membre depuis ${sinceTxt} · ${S.avatar.name} le ${SPECIES.find(x => x.id === S.avatar.species).name.toLowerCase()}</span>
        <div class="pro-lvl"><div class="badge-lv">${lv.level}</div><div class="grow"><b>${G.levelTitle(lv.level)}</b><div class="bar xp"><i data-css="--p:${Math.round(lv.into / lv.need * 100)}%"></i></div><span class="small muted">${lv.into} / ${lv.need} XP pour le niveau ${lv.level + 1}</span></div></div>
        <div class="pro-actions"><button class="btn yellow sm shine" id="toLocker">Personnaliser</button><button class="btn cyan sm" id="pShare">Partager ma carte</button>${S.chests.length ? html`<button class="btn ghost sm" id="openChest">${CHEST_ICO} ${S.chests.length} coffre${S.chests.length > 1 ? "s" : ""}</button>` : ""}</div>
      </div></section>
    <div class="seg pro-tabs" role="tablist" aria-label="Profil">${tabs.map(([t, l]) => html`<button role="tab" aria-selected="${PF.tab === t}" class="${PF.tab === t ? "on" : ""}" data-ptab="${t}">${l}</button>`)}</div>

    <div class="pro-panel" data-panel="me" ${PF.tab === "me" ? "" : "hidden"}>
      <section class="card"><h3>Statistiques</h3><div class="pstats">
        ${stat("o", "jours de série", streak())}${stat("y", "XP au total", S.xp.toLocaleString("fr-FR"))}
        <div class="pstat c rank"><span class="v">${emblemSvg(rank, "sm")}</span><span class="l">${rank.name} ${rank.div}</span><span class="s">${S.trophies} trophées</span></div>
        ${stat("g", "leçons", Object.keys(S.lessons).length, `${Object.values(S.lessons).reduce((t, l) => t + (l.stars || 0), 0)} étoiles`)}
        ${stat("c", "mots maîtrisés", mastered(""))}${stat("o", "verbes maîtrisés", mastered("IV:"), "sur 67")}
        ${stat("y", "boss battus", `${bossesWon()}/9`)}${stat("g", "score moyen", avg === null ? "–" : avg, "prononciation")}
      </div></section>
      <section class="card"><div class="row between"><h3>Activité</h3><span class="small muted">${active12} jour${active12 > 1 ? "s" : ""} actif${active12 > 1 ? "s" : ""} sur 12 semaines</span></div>
        <div class="heat" role="img" aria-label="Calendrier d'activité des 12 dernières semaines">${cells.map(c => html`<i class="h${c.l} ${c.d === today0 ? "now" : ""}" title="${c.d.slice(8)}/${c.d.slice(5, 7)} : ${c.xp} XP"></i>`)}</div>
        <div class="heat-key small muted">Moins <i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i> Plus · objectif ${S.goalXp} XP par jour</div></section>
      <section class="card"><h3>Records personnels</h3><div class="precs">
        <div><span class="l">Défi chrono</span><b>${bestChrono.toLocaleString("fr-FR")}</b></div><div><span class="l">Verb Rush</span><b>${rushBest.toLocaleString("fr-FR")}</b></div>
        <div><span class="l">Meilleur combo</span><b>×${S.bestCombo || 0}</b></div><div><span class="l">Défi du jour</span><b>${S.chrono.daily.day === today0 ? S.chrono.daily.score.toLocaleString("fr-FR") : "–"}</b></div></div></section>
      <section class="card"><div class="row between"><h3>Succès</h3><span class="pill good">${got.length}/${G.BADGES.length}</span></div>
        <div class="bar"><i data-css="--p:${Math.round(got.length / G.BADGES.length * 100)}%"></i></div>
        <div class="badges shelf">${[...got, ...notYet].map((b, k) => html`<div class="bdg ${S.badges.includes(b.id) ? "got" : ""} ${k >= got.length + 6 ? "more" : ""}" ${k >= got.length + 6 ? "hidden" : ""}><div class="md">${b.sym}</div>${b.title}<span class="ds">${b.desc}</span></div>`)}</div>
        ${notYet.length > 6 ? html`<button class="btn ghost sm" id="pMoreBadges">Voir les ${notYet.length - 6} autres succès</button>` : ""}</section>
      <section class="card"><div class="row between"><h3>Collection</h3><span class="small muted">${owned} objets</span></div>
        <p class="small muted">${EXCLUSIVES.filter(id => S.owned.includes(id)).length}/${EXCLUSIVES.length} exclusivités des boîtes · ${S.coins.toLocaleString("fr-FR")} pièces</p>
        <div class="row"><button class="btn ghost sm" id="pLocker">Ma tenue</button><button class="btn ghost sm" id="pShop">Le Shop</button></div></section>
    </div>

    <div class="pro-panel" data-panel="friends" ${PF.tab === "friends" ? "" : "hidden"}>
      <section class="card"><h3>Ajouter un ami</h3><p class="small muted">Envoie-lui ta carte avec « Partager ma carte », ou colle ici le lien qu'il t'a envoyé.</p>
        <form id="pfForm" class="row"><input id="pfIn" autocomplete="off" spellcheck="false" maxlength="6000" placeholder="Colle le lien ou le code" aria-label="Lien ou code d'ami"><button class="btn green" id="pfAdd">Ajouter</button></form></section>
      <section class="card"><div class="row between"><h3>Mes amis</h3><span class="small muted">${fr.length} ami${fr.length > 1 ? "s" : ""}</span></div>
        ${fr.length ? html`<div class="pfriends">${[...fr].sort((a, b) => b.xp - a.xp).map(f => html`<button class="pfriend" data-pf="${f.id}"><span class="pf-av">${avatarSvg(f.avatar, { cls: "still" })}</span><b>${f.name}</b><span class="small muted">niv. ${f.level} · série ${f.streak} j</span></button>`)}</div>`
          : html`<div class="coach"><div class="av live">${avatarSvg(S.avatar)}</div><div class="bubble">Pas encore d'amis ici. Partage ta carte : dès qu'un ami t'envoie la sienne, il apparaît ici avec son compagnon.</div></div>`}
        <button class="btn cyan block" id="pBoard">Classement et défis entre amis</button></section>
    </div>

    <div class="pro-panel" data-panel="settings" ${PF.tab === "settings" ? "" : "hidden"}>
    <section class="card"><h3>Mon profil et l'appli</h3>
      <label class="f" for="player">Ton pseudo (pour partager tes scores)<input type="text" id="player" maxlength="20" autocomplete="off" value="${S.player}" placeholder="Pseudo"></label>
      <label class="f" for="titleSel">Titre affiché<select id="titleSel">${titleOptions().map(([v, t]) => html`<option value="${v}" ${v === S.title ? "selected" : ""}>${t}</option>`)}</select></label>
      <label class="switch" for="optVoice">${S.avatar.name} parle à voix haute <input type="checkbox" id="optVoice" ${S.poufVoice ? "checked" : ""}></label>
      <label class="switch" for="optSfx">Effets sonores <input type="checkbox" id="optSfx" ${S.sfx ? "checked" : ""}></label>
      <label class="switch" for="optHap">Vibrations (téléphone) <input type="checkbox" id="optHap" ${S.haptics ? "checked" : ""}></label>
      <label class="f" for="optMotion">Animations
        <select id="optMotion">${[["auto", "Selon mon appareil"], ["full", "Toutes"], ["reduced", "Réduites"]].map(([v, t]) => html`<option value="${v}" ${v === S.motion ? "selected" : ""}>${t}</option>`)}</select></label>
      <label class="f" for="goal">Objectif quotidien
        <select id="goal">${[[20, "Tranquille · 20 XP"], [50, "Normal · 50 XP"], [100, "Sérieux · 100 XP"], [150, "Intense · 150 XP"]].map(([v, t]) => html`<option value="${v}" ${v === S.goalXp ? "selected" : ""}>${t}</option>`)}</select></label>
      <label class="f" for="voice">Voix anglaise des modèles
        <select id="voice">${voices.length ? voices.map(v => html`<option value="${v.voiceURI}" ${v.voiceURI === S.voice ? "selected" : ""}>${v.name} (${v.lang})</option>`) : html`<option value="">Voix par défaut</option>`}</select></label>
      <button class="btn ghost sm" id="tryVoice">${ICON.spk}Tester la voix</button>
      <label class="f" for="slowR">Vitesse « Lentement » : <span id="slowV">${Math.round(S.slow * 100)} %</span>
        <input type="range" id="slowR" min="0.5" max="0.9" step="0.05" value="${S.slow}"></label>
    </section>
    <section class="card security"><h3>${ICON.shield} Sécurité et confidentialité</h3>
      <ul class="plain"><li>Ta voix est analysée sur ton appareil, jamais envoyée sur internet.</li>
        <li>Les moteurs viennent de Hugging Face à une version figée, et chaque fichier est vérifié (empreinte SHA-256) avant usage.</li>
        <li>L'appli elle-même est vérifiée fichier par fichier à chaque mise à jour.</li>
        <li>Aucun compte, aucune pub, aucun traceur. Ta progression reste dans ce navigateur.</li>
        <li>Clé Gemini : ${keySaved ? "enregistrée chiffrée (AES-GCM) sur cet appareil" : "aucune clé enregistrée"}.</li></ul>
      <p class="small muted">${$("#engine").title} · ${self.crossOriginIsolated ? "isolation active, calcul multi-cœurs" : "calcul sur un cœur"} · ${globalThis.trustedTypes ? "Trusted Types actif" : "échappement HTML actif"}</p></section>
    <section class="card"><h3>Données</h3>
      <div class="row"><button class="btn ghost sm" id="export">Sauvegarder ma progression (fichier)</button>
      <label class="btn ghost sm filebtn" for="importFile">Restaurer une sauvegarde<input type="file" id="importFile" accept="application/json,.json"></label></div>
      <button class="btn ghost sm" id="delModel">Supprimer le moteur de prononciation</button>
      <button class="btn ghost sm" id="delChat">Supprimer l'IA locale de conversation</button>
      <button class="btn red sm" id="delData">Effacer ma progression</button></section>
    </div>`);
  $$("[data-ptab]").forEach(b => b.onclick = () => { play("tap"); PF.tab = b.dataset.ptab; $$("[data-ptab]").forEach(x => { const on = x.dataset.ptab === PF.tab; x.classList.toggle("on", on); x.setAttribute("aria-selected", on); }); $$(".pro-panel").forEach(p => { p.hidden = p.dataset.panel !== PF.tab; }); });
  $("#pShare").onclick = () => { play("tap"); app.social.shareMyCard(); };
  const mb = $("#pMoreBadges"); if (mb) mb.onclick = () => { $$(".bdg.more").forEach(x => { x.hidden = false; }); mb.remove(); };
  $("#pLocker").onclick = () => { play("tap"); go("locker"); };
  $("#pShop").onclick = () => { play("tap"); go("shop", { tab: "home" }); };
  $("#pBoard").onclick = () => { play("tap"); go("friends"); };
  $$("[data-pf]").forEach(b => b.onclick = () => { play("tap"); go("friend", { id: b.dataset.pf }); });
  $("#pfForm").onsubmit = async e => { e.preventDefault(); const v = $("#pfIn").value.trim(); if (v) { $("#pfAdd").disabled = true; await app.social.receive(v); const b2 = $("#pfAdd"); if (b2) b2.disabled = false; } };
  $(".player-name").textContent = S.player || "Joueur";
  $(".player-title").textContent = `${S.avatar.name} · ${shownTitle()}`;
  $("#toLocker").onclick = () => { play("tap"); go("locker"); };
  const oc = $("#openChest"); if (oc) oc.onclick = () => openChestFlow();
  $("#player").onchange = e => { S.player = cleanText(e.target.value, 20) || ""; save(); renderProfile(); };
  $("#titleSel").onchange = e => { S.title = e.target.value; save(); renderProfile(); };
  $("#optVoice").onchange = e => { S.poufVoice = e.target.checked; save(); renderHud(); };
  $("#optSfx").onchange = e => { S.sfx = e.target.checked; save(); play("tap"); };
  $("#optHap").onchange = e => { S.haptics = e.target.checked; save(); haptic("good"); };
  $("#optMotion").onchange = e => { S.motion = e.target.value; save(); applyPrefs(); };
  $("#goal").onchange = e => { S.goalXp = +e.target.value; save(); };
  $("#voice").onchange = e => { S.voice = e.target.value; save(); };
  $("#tryVoice").onclick = () => speak("Hello! How are you today?", { voiceURI: S.voice });
  $("#slowR").oninput = e => { S.slow = +e.target.value; $("#slowV").textContent = Math.round(S.slow * 100) + " %"; save(); };
  $("#export").onclick = async () => {
    const body = exportText(S), sealed = JSON.stringify({ ...JSON.parse(body), seal: await Seal.sign(JSON.stringify(S)) }, null, 1);
    const blob = new Blob([sealed], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `labo-accent-${today()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Sauvegarde téléchargée. Garde ce fichier pour toi : il contient ta progression (pas ta clé).");
  };
  $("#importFile").onchange = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f) return;
    if (f.size > MAX_IMPORT) { toast("Fichier trop gros (2 Mo maximum)."); return; }
    const r = parseImport(await f.text());
    if (!r.ok) { toast(r.error); return; }
    const s = r.summary;
    if (!await confirmDlg("Restaurer cette sauvegarde ?", `Niveau ${s.level} · ${s.xp} XP · ${s.lessons} leçons · ${s.words} mots maîtrisés · ${s.coins} pièces. Ta progression actuelle sur cet appareil sera remplacée.`, "Restaurer")) return;
    // Même appareil : le sceau le prouve, la sauvegarde est reprise telle quelle. Sinon (autre appareil, fichier
    // modifié) : pièces et objets sont ramenés à ce que la progression justifie.
    let file = null; try { file = JSON.parse(await f.text()); } catch (err) { file = null; }
    const sealOk = !!(file && file.state && typeof file.seal === "string" && await Seal.verify(JSON.stringify(file.state), file.seal));
    let next = r.state, notes = [];
    if (!sealOk) { const a = Econ.audit(next, today(), AUDIT_DEPS); notes = a.notes; next = sanitize(JSON.parse(JSON.stringify(next))); }
    S = next; S.econ.sealed = Seal.sealAvailable(); save(); applyPrefs(); renderHud(); go("profile");
    if (sealOk || !notes.length) toast(sealOk ? "Sauvegarde restaurée (sceau vérifié)." : "Sauvegarde restaurée et vérifiée.");
    else await confirmDlg("Sauvegarde restaurée", `Ce fichier ne vient pas de cet appareil ou a été modifié. Les valeurs impossibles ont été corrigées : ${notes.join(" ; ")}.`, "OK", { danger: false, noCancel: true });
  };
  $("#delModel").onclick = async () => {
    if (!await confirmDlg("Supprimer le moteur ?", "Le moteur de prononciation (≈ 355 Mo) sera retiré de ton appareil. Il faudra le retélécharger pour jouer. Ta progression est conservée.", "Supprimer")) return;
    await deleteModelFiles(["robg/speako-phoneme-recognizer"]);
    if (worker) { worker.terminate(); worker = null; }
    S.modelReady = false; save(); setEngine("off", "Moteur : non préparé"); toast("Moteur supprimé.");
  };
  $("#delChat").onclick = async () => {
    if (!await confirmDlg("Supprimer l'IA locale ?", "Les modèles de conversation (≈ 1 Go) seront retirés de ton appareil. Ta progression est conservée.", "Supprimer")) return;
    await deleteModelFiles(["onnx-community/whisper-base.en", "onnx-community/gemma-3-1b-it-ONNX"]);
    if (chatWorker) { chatWorker.terminate(); chatWorker = null; chatState = "off"; }
    S.chatModelReady = false; save(); toast("IA locale supprimée.");
  };
  $("#delData").onclick = async () => {
    if (!await confirmDlg("Effacer ta progression ?", "XP, niveaux, pièces, compagnons, badges, leçons, historique et série seront effacés de cet appareil. C'est définitif.", "Tout effacer")) return;
    const keep = { voice: S.voice, slow: S.slow, goalXp: S.goalXp, modelReady: S.modelReady, sfx: S.sfx, poufVoice: S.poufVoice, haptics: S.haptics, motion: S.motion, chat: S.chat, chatModelReady: S.chatModelReady, onboarded: true };
    S = { ...defaults(), ...keep }; save(); applyPrefs(); renderHud(); toast("Progression effacée."); renderProfile();
  };
}
async function deleteModelFiles(repos) {
  try {
    const c = await caches.open("transformers-cache");
    for (const req of await c.keys()) if (repos.some(r => req.url.includes("/" + r + "/"))) await c.delete(req);
  } catch (e) {}
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
  if (b.type === "sound") { const w = weakSoundList()[k]; const l = SOUND_LESSONS.find(x => x.p === w); return { t: "Son à travailler", s: l ? l.title : "Un son difficile au hasard" }; }
  if (b.type === "pairs") return { t: "Paires minimales", s: `${b.count / 2} paires (ship / sheep…)` };
  if (b.type === "dialogue") return { t: "Conversation", s: `Jeu de rôle « ${pickDialogue().title} »` };
  if (b.type === "grammar") return { t: "Grammaire", s: `« ${nextGrammarPoint().title} »` };
  if (b.type === "mistakes") return { t: "Fautes à éviter", s: `${b.count} pièges de francophones` };
  return { t: "Révision", s: `${b.count} phrases que tu as ratées` };
}
function renderSession() {
  const sel = S.sessMin || 15, plan = G.planSession(sel);
  const counters = { path: 0, sound: 0 };
  const recent = (S.sessions || []).slice(-5).reverse();
  render($("#view"), html`
    <h2>Séance chronométrée</h2>
    <section class="card"><div class="coach"><div class="av live">${avatarSvg(S.avatar)}</div><div class="bubble">Tu as combien de temps aujourd'hui ? Je prépare une séance sur mesure.</div></div>
      <div class="chips" role="radiogroup" aria-label="Durée">${G.DURATIONS.map(m => html`<button class="chip ${m === sel ? "on" : ""}" role="radio" aria-checked="${m === sel}" data-min="${m}">${m === 60 ? "1 h" : m + " min"}</button>`)}</div></section>
    <section class="card"><h3>Au programme · ${sel === 60 ? "1 h" : sel + " min"}</h3>
      <ol class="plan">${plan.map((b, k) => { const n = b.type in counters ? counters[b.type]++ : 0; const lb = blockLabel(b, n); return html`<li data-css="--i:${k}"><span><b>${lb.t}</b><br><span class="small muted">${lb.s}</span></span><span class="small muted">≈ ${G.estMinutes(b)} min</span></li>`; })}</ol>
      <label class="f" for="sLevel">Niveau du vocabulaire
        <select id="sLevel">${LEVELS.map(l => html`<option value="${l.id}" ${l.id === S.vocabLevel ? "selected" : ""}>${l.title}</option>`)}</select></label>
      <button class="btn green block shine" id="sGo">Lancer la séance</button>
      <p class="small muted">Tu peux passer un bloc ou arrêter quand tu veux. Quand le temps est écoulé, la séance s'arrête après le bloc en cours.</p></section>
    ${recent.length ? html`<section class="card"><h3>Dernières séances</h3><div class="list">${recent.map(x => html`<div class="item"><span><span class="t">${x.planned === 60 ? "1 h" : x.planned + " min"}</span><br><span class="s">${x.d}</span></span><span class="xpfloat">${x.real} min · +${x.xp} XP</span></div>`)}</div></section>` : ""}`);
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
  render($("#view"), html`<section class="card finish">
    <span class="pill good">Bloc ${SESS.bi + 1} / ${SESS.blocks.length}</span>
    <div class="steps">${SESS.blocks.map((_, k) => html`<i class="${k < SESS.bi ? "done" : k === SESS.bi ? "cur" : ""}"></i>`)}</div>
    <div class="coach"><div class="av live">${avatarSvg(S.avatar, { cls: SESS.bi ? "happy" : "" })}</div><div class="bubble">${SESS.bi ? "Bien joué ! On enchaîne ?" : "C'est parti pour ta séance !"}</div></div>
    <h2>${lb.t}</h2><p class="muted">${lb.s} · ≈ ${G.estMinutes(b)} min</p>
    <div class="row center"><button class="btn ghost sm" id="bSkip">Passer ce bloc</button><button class="btn ghost sm" id="bStop">Terminer la séance</button></div>
    <button class="btn green block shine" id="bGo">C'est parti</button></section>`);
  $("#bGo").onclick = () => runBlock(b);
  $("#bSkip").onclick = () => sessionNext(false);
  $("#bStop").onclick = () => endSession(true);
}
function runBlock(b) {
  if (b.type === "vocab") return startVocab(S.vocabLevel, b.count);
  if (b.type === "dialogue") return startDialog(pickDialogue().id);
  if (b.type === "grammar") return startGrammar(nextGrammarPoint().id);
  if (b.type === "mistakes") return startMistakes(null, b.count);
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
    const earned = G.newBadges(S, { streak: streak() }); S.badges.push(...earned);
    const bonus = earn(10 * s.done, "session"); earn(earned.length * 25, "badge");
    save();
    go("send", { real, xp, done: s.done, total: s.blocks.length, planned: s.min, earned, coins: bonus });
  } else go("session");
}
function renderSessionEnd(o) {
  render($("#view"), html`<section class="card finish">
    <div class="coach" id="seCoach"><div class="av live">${avatarSvg(S.avatar, { cls: "happy" })}</div><div class="bubble"></div></div>
    <h2>Séance terminée !</h2>
    <div class="tiles four">
      <div class="tile c"><span class="l">Durée</span><span class="v">${o.real} min</span></div>
      <div class="tile y"><span class="l">XP gagnés</span><span class="v">+${o.xp}</span></div>
      <div class="tile o" id="coinTile"><span class="l">Bonus pièces</span><span class="v">+${o.coins}</span></div>
      <div class="tile g"><span class="l">Blocs</span><span class="v">${o.done}/${o.total}</span></div>
    </div>
    <button class="btn green block shine" id="seOk">Continuer</button></section>`);
  fx(); play("done");
  collectCoins($("#coinTile"), o.coins);
  companionSay($("#seCoach"), o.real >= o.planned ? "Séance complète, bravo ! Tu as tenu jusqu'au bout." : "Belle séance ! Chaque minute compte.", { voice: S.poufVoice, mood: "happy", av: S.avatar });
  $("#seOk").onclick = async () => { await rewards({ earned: o.earned }); go("path"); };
}

// ---------------- Dates & nombres ----------------
// Fiches (prononciation à la française + phonétique + écoute), cartes au micro, quiz d'écoute, phrases à prononcer.
let BX = { theme: "questions" }, BQ = null;
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS = BASICS_BY_ID.months.groups[0].items.map(w => w.en);
const rnd = n => Math.floor(Math.random() * n);
function renderBasics() {
  const b = BASICS_BY_ID[BX.theme] || BASICS[0], best = (S.basics[b.id] || {}).best;
  const row = (w, k) => { const st2 = G.vocabStatus(S.vocab[basicsCardId(b, w)]);
    return html`<div class="bxrow" data-css="--i:${Math.min(k, 12)}"><div class="bx-say"><button class="iconbtn" data-say="${w.en}" aria-label="Écouter ${w.en}">${ICON.spk}</button><button class="iconbtn slow" data-slow="${w.en}" aria-label="Écouter lentement ${w.en}">${ICON.slow}</button></div>
      <div class="bx-txt"><div class="bx-line"><b class="bx-en">${w.en}</b> <span class="muted">= ${w.fr}</span>${st2 === "new" ? "" : html`<span class="pill sm ${st2 === "mastered" ? "good" : "ok"}">${st2 === "mastered" ? "maîtrisé" : "en cours"}</span>`}</div><span class="frpron">« ${w.pron} »</span> <span class="ipa" data-ipa="${w.en}"></span>${w.note ? html`<p class="small bx-note">${w.note}</p>` : ""}${w.ex ? html`<button class="bx-ex" data-say="${w.ex[0]}" aria-label="Écouter l'exemple">${ICON.spk}<span><b>${w.ex[0]}</b><br><span class="muted">${w.ex[1]}</span></span></button>` : ""}</div></div>`; };
  render($("#view"), html`${learnTabs("basics")}
    <h2>Vocabulaire par thème</h2>
    <div class="chips" role="tablist" aria-label="Thème">${BASICS.map(x => html`<button class="chip ${x.id === b.id ? "on" : ""}" role="tab" aria-selected="${x.id === b.id}" data-bx="${x.id}">${x.short}</button>`)}</div>
    <section class="card glow"><div class="row between"><h3>${b.title}</h3>${best !== undefined ? html`<span class="pill good">Quiz : ${best} %</span>` : ""}</div>
      <p class="small muted">${b.sub}</p>
      <div class="bx-actions"><button class="btn green shine" id="bxCards">Apprendre au micro</button><button class="btn cyan" id="bxQuiz">${b.quiz === "dictation" ? "Dictée de nombres" : b.quiz === "order" ? "Remets dans l'ordre" : "Quiz d'écoute"}</button><button class="btn ghost" id="bxSay">Prononcer des phrases</button></div>
      <h4 class="bx-h">Comment bien les prononcer</h4>
      <ul class="bx-tips">${b.tips.map(t => html`<li>${t}</li>`)}</ul>
      <p class="small muted">« MAJUSCULES » = la syllabe à accentuer · « th » = langue entre les dents · touche le haut-parleur pour écouter, la tortue pour écouter lentement${b.groups.some(g => g.items.some(w => w.ex)) ? ", un exemple pour l'entendre en entier" : ""}.</p></section>
    ${b.groups.map(g => html`<section class="card"><h3>${g.title}</h3><div class="bxlist">${g.items.map(row)}</div></section>`)}
    <section class="card"><h3>Phrases pour s'entraîner</h3><div class="bxlist">${b.sentences.map(([en, fr]) => html`<div class="bxrow"><div class="bx-say"><button class="iconbtn" data-say="${en}" aria-label="Écouter">${ICON.spk}</button></div><div class="bx-txt"><b>${en}</b><br><span class="small muted">${fr}</span></div></div>`)}</div></section>`);
  bindLearnTabs();
  $$("[data-bx]").forEach(c => c.onclick = () => { play("tap"); BX.theme = c.dataset.bx; renderBasics(); });
  $$("[data-say]").forEach(x => x.onclick = () => speak(x.dataset.say, { voiceURI: S.voice, rate: 0.9 }));
  $$("[data-slow]").forEach(x => x.onclick = () => speak(x.dataset.slow, { voiceURI: S.voice, rate: S.slow }));
  $("#bxCards").onclick = () => { play("tap"); startBasicsCards(b); };
  $("#bxQuiz").onclick = () => { play("tap"); startBasicsQuiz(b); };
  $("#bxSay").onclick = () => { play("tap"); startLesson({ id: null, kind: "basics-" + b.id, title: b.title, items: b.sentences.map(([en, fr]) => ({ en, fr })) }); };
  loadDict().then(d => { $$("[data-ipa]").forEach(el => { const r = P.buildReference(d, el.dataset.ipa); if (r.every(w => w.prons)) el.textContent = "/" + r.map(w => P.ipaString(w.prons[0])).join(" ") + "/"; }); }).catch(() => {});
}
function startBasicsCards(b) {
  const words = basicsItems(b).map(w => ({ id: basicsCardId(b, w), en: w.en, fr: w.fr, level: b.short, pron: w.pron, note: w.note }));
  let cards = G.pickVocab(words, S.vocab, 10, 10, today());
  if (!cards.length) cards = shuffle(words).slice(0, 10);
  V = { level: b.short, back: "basics", cards, i: 0, correct: 0, newly: 0, xp: 0, requeued: new Set(), startLevel: levelNow().level, revealed: false };
  if (engineState === "off") startEngine();
  go("vcard");
}
// Une question : say = ce qu'on entend ; answer = la bonne réponse ; options (QCM) ou saisie de chiffres.
function basicsQuestion(b) {
  if (b.quiz === "order") {
    const pool = [...basicsItems(b).filter(w => w.ex).map(w => w.ex), ...b.sentences];
    const [en, fr] = pool[rnd(pool.length)], words = en.split(" ");
    let mixed = shuffle(words.map((t, i) => ({ t, i })));
    if (mixed.every((x, k) => x.i === k)) mixed = [...mixed.slice(1), mixed[0]];
    return { kind: "order", say: en, answer: en, fr, words: en, chips: mixed, built: [] };
  }
  if (b.quiz === "dictation") {
    const tier = rnd(6);
    const n = tier === 0 ? rnd(21) : tier === 1 ? (rnd(2) ? 13 + rnd(7) : (3 + rnd(7)) * 10) : tier === 2 ? 21 + rnd(79) : tier === 3 ? 100 + rnd(900) : tier === 4 ? 1000 + rnd(9000) : 1950 + rnd(80);
    const words = tier === 5 ? yearWords(n) : numberWords(n);
    return { kind: "type", say: words, answer: String(n), words, hint: tier === 1 ? "Écoute où tombe l'accent : -TEEN ou -ty ?" : tier === 5 ? "C'est une année." : "" };
  }
  if (b.id === "dates") {
    const day = 1 + rnd(28), m = rnd(12), fr = d => `${d === 1 ? "1er" : d} ${MOIS[m]}`;
    const say = `the ${ordinalWords(day)} of ${MONTHS[m]}`;
    const near = [day + 10, day - 10, day + 1, day - 1, day + 20, day - 20].filter(x => x >= 1 && x <= 31 && x !== day);
    const opts = shuffle([fr(day), ...shuffle(near).slice(0, 2).map(fr), `${day === 1 ? "1er" : day} ${MOIS[(m + 1 + rnd(11)) % 12]}`]);
    return { kind: "choice", say, answer: fr(day), options: [...new Set(opts)], words: say };
  }
  const items = basicsItems(b), w = items[rnd(items.length)];
  const others = shuffle(items.filter(x => x !== w)).slice(0, 3).map(x => x.fr);
  return { kind: "choice", say: w.en, answer: w.fr, options: shuffle([w.fr, ...others]), words: w.en, pron: w.pron, note: w.note };
}
function startBasicsQuiz(b) {
  BQ = { b, i: 0, n: 8, ok: 0, q: basicsQuestion(b), done: false, startLevel: levelNow().level };
  go("bquiz");
}
function renderBasicsQuiz() {
  const q = BQ.q, b = BQ.b;
  render($("#view"), html`
    <div class="ltop"><button class="iconbtn" id="quit" aria-label="Quitter">${ICON.close}</button><div class="bar"><i data-css="--p:${BQ.i / BQ.n * 100}%"></i></div><span class="combo">${BQ.i + 1}/${BQ.n}</span></div>
    <div class="coach" id="coach"><div class="av live">${avatarSvg(S.avatar)}</div><div class="bubble">${q.kind === "type" ? "Écoute et écris le nombre en chiffres." : q.kind === "order" ? "Remets les mots dans l'ordre pour faire la question." : "Écoute : c'est lequel ?"}</div></div>
    <section class="card center bq">
      ${q.kind === "order" ? html`<p class="bq-fr">${q.fr}</p>` : html`<div class="listen"><button class="btn cyan" id="bqPlay">${ICON.spk}Écouter</button><button class="btn ghost" id="bqSlow">${ICON.slow}Lentement</button></div>`}
      ${q.hint ? html`<p class="small muted">${q.hint}</p>` : ""}
      ${q.kind === "order" ? html`<div class="ord-built" id="ordBuilt" aria-live="polite"><span class="muted small">Touche les mots dans le bon ordre</span></div><div class="ord-chips">${q.chips.map((c, k) => html`<button class="chip ord" data-ord="${k}">${c.t}</button>`)}</div><button class="btn ghost sm" id="ordUndo">Effacer le dernier mot</button>`
        : q.kind === "type" ? html`<form id="bqForm" class="bq-form"><input id="bqIn" inputmode="numeric" autocomplete="off" maxlength="9" aria-label="Le nombre en chiffres" placeholder="ex. 47"><button class="btn green" id="bqOk">Valider</button></form>`
        : html`<div class="bq-opts">${q.options.map(o => html`<button class="btn ghost bq-opt" data-opt="${o}">${o}</button>`)}</div>`}
      <div id="bqRes"></div></section>`);
  const say = r => speak(q.say, { voiceURI: S.voice, rate: r });
  if (q.kind !== "order") { $("#bqPlay").onclick = () => say(0.9); $("#bqSlow").onclick = () => say(S.slow); }
  $("#quit").onclick = () => quitActivity(BQ.i === 0, "basics");
  if (q.kind === "order") {
    const draw = () => { const el = $("#ordBuilt"); el.textContent = q.built.map(k => q.chips[k].t).join(" ") || "…"; $$("[data-ord]").forEach(b => { b.disabled = q.built.includes(+b.dataset.ord); }); };
    $$("[data-ord]").forEach(b => b.onclick = () => { if (BQ.done) return; play("tap"); q.built.push(+b.dataset.ord); draw();
      if (q.built.length === q.chips.length) { const got = q.built.map(k => q.chips[k].t).join(" "); answerBasics(got === q.answer, got); } });
    $("#ordUndo").onclick = () => { if (BQ.done) return; q.built.pop(); draw(); };
    return;
  }
  if (q.kind === "type") {
    $("#bqForm").onsubmit = e => { e.preventDefault(); const v = $("#bqIn").value.replace(/[\s.,]/g, ""); if (v) answerBasics(v === q.answer, v); };
    setTimeout(() => { const i = $("#bqIn"); if (i) i.focus(); }, 50);
  } else $$("[data-opt]").forEach(x => x.onclick = () => answerBasics(x.dataset.opt === q.answer, x.dataset.opt, x));
  if (q.kind !== "order") setTimeout(() => say(0.9), 250);
}
function answerBasics(ok, given, btn) {
  if (BQ.done) return;
  BQ.done = true;
  const q = BQ.q;
  if (ok) BQ.ok++;
  play(ok ? "great" : "bad"); haptic(ok ? "good" : "bad");
  $$("[data-opt]").forEach(x => { x.disabled = true; if (x.dataset.opt === q.answer) x.classList.add("good"); else if (x === btn) x.classList.add("bad"); });
  const f = $("#bqForm"); if (f) f.querySelectorAll("input,button").forEach(x => { x.disabled = true; });
  if (ok) FX.floatText("+4 XP", btn || $("#bqRes"), "gold");
  render($("#bqRes"), html`<div class="bq-fb ${ok ? "ok" : "ko"}"><b>${ok ? "Bravo !" : q.kind === "order" ? "Pas tout à fait, voici l'ordre :" : `Non : c'était ${q.answer}`}</b>
    ${q.kind === "order" ? html`<p><b>${q.answer}</b><br><span class="muted">${q.fr}</span></p><div class="row"><button class="btn cyan sm" id="bqHear">${ICON.spk}Écouter la question</button></div>`
      : html`<p><b>${q.words}</b>${q.kind === "type" ? html` = ${Number(q.answer).toLocaleString("fr-FR")}` : ""}</p><p class="frpron">« ${q.pron || pronOf(q.words)} »</p>`}${q.note ? html`<p class="small bx-note">${q.note}</p>` : ""}
    <button class="btn ${ok ? "green" : "orange"} block" id="bqNext">${BQ.i + 1 < BQ.n ? "Suivant" : "Terminer"}</button></div>`);
  $("#bqNext").onclick = nextBasics;
  const hq = $("#bqHear"); if (hq) { hq.onclick = () => speak(q.answer, { voiceURI: S.voice, rate: 0.9 }); speak(q.answer, { voiceURI: S.voice, rate: 0.9 }); }
  $("#bqNext").focus();
}
function nextBasics() {
  BQ.i++;
  if (BQ.i < BQ.n) { BQ.q = basicsQuestion(BQ.b); BQ.done = false; renderBasicsQuiz(); return; }
  const b = BQ.b, pct = Math.round(BQ.ok / BQ.n * 100), prev = S.basics[b.id];
  S.basics[b.id] = { best: Math.max(prev ? prev.best : 0, pct), d: today() };
  const first = pct >= 80 && (!prev || prev.best < 80);
  const r = gainXp(BQ.ok * 4 + 10, BQ.startLevel, { key: "basics:" + b.id, progress: first ? Econ.PROGRESS.firstDialogue : 0, why: `${b.short} réussis à ${pct} %` });
  go("done", { title: pct >= 80 ? "Excellente oreille !" : "Quiz terminé", tiles: [["g", "Bonnes réponses", `${BQ.ok}/${BQ.n}`], ["c", "Réussite", pct + "%"], ["y", "XP gagnés", "+" + r.xpGained], ["o", "Pièces", "+" + r.coins]],
    line: pct >= 80 ? "Tu les reconnais à l'oreille, bravo !" : "Réécoute les fiches, puis retente le quiz.", back: "basics", ...r });
}

// ---------------- Vocabulaire ----------------
let V = null;
function levelStats(lv) {
  const words = VOCAB[lv], d = today();
  let fresh = 0, learning = 0, mastered = 0, due = 0;
  for (const w of words) { const r = S.vocab[w.id], st = G.vocabStatus(r); if (st === "new") fresh++; else if (st === "mastered") mastered++; else learning++; if (r && r.due <= d) due++; }
  return { total: words.length, fresh, learning, mastered, due };
}
function learnTabs(active) {
  return html`<div class="seg" role="tablist" aria-label="Apprendre">${[["vocab", "Vocabulaire"], ["basics", "Thèmes"], ["verbs", "Verbes"], ["grammar", "Grammaire"], ["mistakes", "Fautes"]].map(([v, t]) => html`<button role="tab" aria-selected="${v === active}" class="${v === active ? "on" : ""}" data-seg="${v}">${t}</button>`)}</div>`;
}
function bindLearnTabs() { $$("[data-seg]").forEach(b => b.onclick = () => { play("tap"); go(b.dataset.seg); }); }
function renderVocabHome() {
  const lv = S.vocabLevel, info = LEVELS.find(l => l.id === lv), st = levelStats(lv);
  render($("#view"), html`${learnTabs("vocab")}
    <h2>Vocabulaire</h2>
    <div class="chips" role="tablist" aria-label="Niveau">${LEVELS.map(l => { const x = levelStats(l.id); return html`<button class="chip ${l.id === lv ? "on" : ""}" role="tab" aria-selected="${l.id === lv}" data-lv="${l.id}">${l.id} <span class="small">${x.mastered}/${x.total}</span></button>`; })}</div>
    <section class="card"><div class="row between"><h3>${info.title}</h3><span class="xpfloat">${st.mastered}/${st.total}</span></div>
      <p class="small muted">${info.sub}</p>
      <div class="bar"><i data-css="--p:${Math.round(st.mastered / st.total * 100)}%"></i></div>
      <div class="tiles"><div class="tile c"><span class="l">Nouveaux</span><span class="v">${st.fresh}</span></div><div class="tile o"><span class="l">En cours</span><span class="v">${st.learning}</span></div><div class="tile g"><span class="l">Maîtrisés</span><span class="v">${st.mastered}</span></div></div>
      <button class="btn green block shine" id="vGo">${st.due ? `Réviser ${Math.min(st.due, 10)} mot${st.due > 1 ? "s" : ""}` : "Apprendre 10 mots"}</button>
      <p class="small muted">${S.avatar.name} te montre le mot en français : dis-le en anglais au micro. Les mots ratés reviennent demain, les mots réussis de plus en plus tard (répétition espacée).</p></section>
    <section class="card theme-short"><h3>Par thème</h3><p class="small muted">Avec la prononciation, des exemples et un jeu pour chaque thème.</p>
      <div class="chips">${BASICS.map(b => html`<button class="chip" data-gobx="${b.id}">${b.title}</button>`)}</div></section>
    <section class="card"><h3>Liste ${lv} · ${st.total} mots</h3><div class="vlist">${VOCAB[lv].map(w => { const s2 = G.vocabStatus(S.vocab[w.id]); return html`<div class="vrow"><button class="iconbtn" data-say="${sayText(w)}" aria-label="Écouter ${w.en}">${ICON.spk}</button><span><b>${w.en}</b><br><span class="small muted">${w.fr}</span></span><span class="pill ${s2 === "mastered" ? "good" : s2 === "learning" ? "ok" : ""}">${s2 === "mastered" ? "maîtrisé" : s2 === "learning" ? "en cours" : "nouveau"}</span></div>`; })}</div></section>`);
  bindLearnTabs();
  $$(".chip[data-lv]").forEach(c => c.onclick = () => { play("tap"); S.vocabLevel = c.dataset.lv; save(); renderVocabHome(); });
  $$("[data-say]").forEach(b => b.onclick = () => speak(b.dataset.say, { voiceURI: S.voice, rate: 0.9 }));
  $("#vGo").onclick = () => { play("tap"); startVocab(lv, 10); };
  $$("[data-gobx]").forEach(b => b.onclick = () => { play("tap"); BX.theme = b.dataset.gobx; go("basics"); });
}
function startVocab(lv, n) {
  const words = VOCAB[lv];
  let cards = G.pickVocab(words, S.vocab, n, n, today());
  if (!cards.length) cards = shuffle(words).slice(0, n);
  V = { level: lv, cards, i: 0, correct: 0, newly: 0, xp: 0, requeued: new Set(), startLevel: levelNow().level, revealed: false };
  if (engineState === "off") startEngine();
  go("vcard");
}
function renderVocabCard() {
  const c = V.cards[V.i];
  V.revealed = false; lastResult = null; ref = null; TARGET = { text: sayText(c), onResult: showVocabResult };
  render($("#view"), html`
    <div class="ltop"><button class="iconbtn" id="quit" aria-label="Quitter">${ICON.close}</button><div class="bar"><i data-css="--p:${V.i / V.cards.length * 100}%"></i></div><span class="combo">${V.i + 1}/${V.cards.length}</span></div>
    <div class="coach" id="coach"><div class="av live">${avatarSvg(S.avatar)}</div><div class="bubble">Comment dit-on ça en anglais ?</div></div>
    <section class="card flipcard" id="sCard"><span class="pill ok">${c.level}${S.vocab[c.id] ? " · à revoir" : " · nouveau"}</span>
      <p class="vfr">${c.fr}</p>
      <div id="ans" hidden></div>
      <button class="btn ghost sm" id="reveal">Je ne sais pas, montre-moi</button></section>
    <div class="mic-wrap"><button class="mic" id="rec" aria-label="Enregistrer">${ICON.mic}</button><p class="status" id="status">Dis le mot en anglais.</p>
      <p class="kbd-hint"><b>Espace</b> enregistrer · <b>H</b> voir la réponse · <b>Entrée</b> continuer</p></div>
    <div class="spacer" id="spacer"></div>`);
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
  render(ans, html`<p class="sentence">${c.en}</p><p class="ipa">${ipa}</p>${c.pron ? html`<p class="frpron" title="Prononciation à la française, syllabe accentuée en majuscules">« ${c.pron} »</p>` : ""}${c.note ? html`<p class="small bx-note">${c.note}</p>` : ""}
    <div class="listen"><button class="btn cyan sm" id="listen">${ICON.spk}Écouter</button><button class="btn ghost sm" id="slow">${ICON.slow}Lentement</button></div>
    <div class="row"><button class="btn ghost sm" id="knew">Je le savais</button><button class="btn ghost sm" id="didnt">À revoir</button></div>`);
  $("#sCard").classList.add("flip");
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
  const lineTxt = correct ? line(sc >= 85 ? "great" : "good", S.avatar) : wasRevealed ? line(sc >= 75 ? "good" : "meh", S.avatar) : "Voilà le bon mot. Écoute-le et répète !";
  const phones = result.words.filter(w => w.scored).flatMap(w => w.phones);
  sheetShell(mood, html`<div class="head"><div class="av live" id="sheetPouf">${avatarSvg(S.avatar, { cls: mood === "great" ? "happy" : mood === "bad" ? "sad" : "" })}</div>
      <div><div class="title">${title}</div><p class="small"><b>${c.en}</b> = ${c.fr}</p></div><span class="score-big" id="scoreBig">${sc}</span></div>`,
    html`${tipsList(P.tipsFor(result, 2))}${phones.length ? html`<div class="detail">${phonesRow(phones)}</div>` : ""}`,
    html`<div class="row"><button class="btn ghost sm" id="mine">${ICON.play}Ma voix</button><button class="btn ghost sm" id="again">${ICON.review}Réessayer</button></div>
      <button class="btn ${mood === "great" ? "green" : mood === "meh" ? "orange" : "red"}" id="next">Continuer</button>`);
  FX.countUp($("#scoreBig"), 0, sc, 450);
  if (correct) FX.floatText("+5 XP", $("#scoreBig"), "gold");
  play(mood === "great" ? "great" : mood === "meh" ? "good" : "bad"); haptic(mood === "great" ? "great" : mood === "bad" ? "bad" : "good");
  sayLine($("#sheetPouf"), lineTxt);
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
  markActive();
  save();
  quest("word");
  V.i++;
  if (V.i < V.cards.length) { play("tap"); renderVocabCard(); return; }
  const total = V.xp + 10;
  const uniq = new Set(V.cards.map(x => x.id)).size;
  go("vfinish", { total, correct: V.correct, count: uniq, newly: V.newly, ...gainXp(total, V.startLevel, { key: "vocab" + (V.back ? ":" + V.level : ""), progress: V.newly * Econ.PROGRESS.newWord, why: V.newly > 1 ? `${V.newly} mots appris` : "1 mot appris" }) });
}
function renderVocabFinish(o) {
  render($("#view"), html`<section class="card finish">
    <div class="coach" id="vfCoach"><div class="av live">${avatarSvg(S.avatar, { cls: "happy" })}</div><div class="bubble"></div></div>
    <h2>Vocabulaire terminé !</h2>
    <div class="tiles four">
      <div class="tile g"><span class="l">Réussis</span><span class="v">${o.correct}/${o.count}</span></div>
      <div class="tile c"><span class="l">Nouveaux mots</span><span class="v">${o.newly}</span></div>
      <div class="tile y"><span class="l">XP gagnés</span><span class="v">+${o.xpGained}</span></div>
      <div class="tile o" id="coinTile"><span class="l">Pièces</span><span class="v">+${o.coins}</span></div>
    </div>
    <p class="small muted">${G.masteredCount(S.vocab)} mots maîtrisés en tout</p>
    <button class="btn green block shine" id="vfOk">Continuer</button></section>`);
  fx(); play("done");
  collectCoins($("#coinTile"), o.coins);
  companionSay($("#vfCoach"), o.correct >= o.count * 0.8 ? "Quelle mémoire ! Ces mots sont à toi." : "Les mots ratés reviendront demain, c'est comme ça qu'on retient.", { voice: S.poufVoice, mood: "happy", av: S.avatar });
  $("#vfOk").onclick = async () => { await rewards(o); if (SESS) sessionNext(); else go(V && V.back ? V.back : "vocab"); };
}

// ---------------- Conversation guidée et écoute ----------------
let D = null;
const meTurns = d => d.turns.filter(t => t.me).length;
function pickDialogue() {
  const order = ["A1", "A2", "B1"];
  const list = [...DIALOGUES].sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
  return list.find(d => !S.dialogues[d.id]) || list.sort((a, b) => S.dialogues[a.id].best - S.dialogues[b.id].best)[0];
}
function startDialog(id) {
  const d = DIALOGUES.find(x => x.id === id);
  D = { d, t: 0, log: [], done: new Set(), scores: [], xp: 0, startLevel: levelNow().level, busyAi: false };
  if (engineState === "off") startEngine();
  loadDict().catch(() => {});
  go("dialog");
}
function renderDialog() {
  const d = D.d;
  render($("#view"), html`
    <div class="ltop"><button class="iconbtn" id="quit" aria-label="Quitter">${ICON.close}</button><div class="bar"><i id="lBar"></i></div><span class="pill ok">${d.level}</span></div>
    <section class="card"><div class="row between"><h3>${d.title}</h3><span class="small muted">${d.role}</span></div>
      <p class="small">${d.goal}</p>
      <ul class="tasks" id="tasks">${d.tasks.map((t, i) => html`<li data-t="${i}">${t}</li>`)}</ul>
      <label class="switch small" for="dFr">Afficher la traduction <input type="checkbox" id="dFr" checked></label></section>
    <div class="chat" id="chat"></div>
    <section class="card" id="turn"></section>
    <div class="spacer" id="spacer"></div>`);
  $("#quit").onclick = () => quitActivity(D.t === 0, "train");
  $("#dFr").onchange = e => document.body.classList.toggle("hide-fr", !e.target.checked);
  document.body.classList.remove("hide-fr");
  updateDialogBar();
  advance();
}
function updateDialogBar() { setVar($("#lBar"), "--p", Math.round(D.scores.length / meTurns(D.d) * 100) + "%"); }
function addBubble(who, en, fr, extra = null) {
  const chat = $("#chat"); if (!chat) return null;
  const el = append(chat, html`<div class="msg ${who}">${who === "ai" ? html`<div class="av">${avatarSvg(S.avatar)}</div>` : ""}<div class="bub"><div class="en">${extra || en}</div>${fr ? html`<div class="tr">${fr}</div>` : ""}
    ${who === "ai" ? html`<button class="iconbtn sm" aria-label="Réécouter">${ICON.spk}</button>` : ""}</div></div>`);
  const rb = el.querySelector("button.iconbtn"); if (rb) rb.onclick = () => speak(en, { voiceURI: S.voice, rate: 0.95 });
  D.log.push({ who, en, fr });
  el.scrollIntoView({ block: "end", behavior: FX.reduced() ? "auto" : "smooth" });
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
  render($("#turn"), html`<p class="hintline"><b>À toi :</b> ${tu.hint}</p>
    <div id="opts" hidden><p class="small muted">Idées de réponse (tu peux aussi les adapter) :</p>${tu.me.map(o => html`<div class="opt"><button class="iconbtn" data-say="${o[0]}" aria-label="Écouter">${ICON.spk}</button><span><b>${o[0]}</b><br><span class="small muted tr">${o[1]}</span></span></div>`)}</div>
    <button class="btn ghost sm" id="dHint">Indice : voir des réponses possibles</button>
    <div class="mic-wrap"><button class="mic" id="rec" aria-label="Répondre au micro">${ICON.mic}</button><p class="status" id="status">Réponds à voix haute.</p>
    <p class="kbd-hint"><b>Espace</b> parler · <b>H</b> indice · <b>L</b> réécouter</p></div>`);
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
  if (FORCE) best.score = 90;
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
  if (tu.task !== undefined) { D.done.add(tu.task); const li = $(`#tasks li[data-t="${tu.task}"]`); if (li) { li.classList.add("done"); FX.pop(li); } }
  const words = html`${P.splitDisplayWords(opt[0]).map((w, i) => html`<span class="word ${best.words[i] ? best.words[i].level : ""}">${w}</span> `)}<span class="pill ${best.score >= 85 ? "good" : best.score >= 55 ? "ok" : "bad"}">${best.score}</span>`;
  const el = addBubble("me", opt[0], opt[1], words);
  const tips = P.tipsFor(best, 1);
  if (tips.length && best.score < 85) { const tip = document.createElement("div"); tip.className = "tr small"; tip.textContent = "Conseil : " + tips[0].word + " · " + tips[0].text; el.querySelector(".bub").appendChild(tip); }
  play(best.score >= 85 ? "great" : best.score >= 55 ? "good" : "bad");
  D.t++;
  updateDialogBar();
  render($("#turn"), html`<p class="status">${line(best.score >= 85 ? "great" : best.score >= 55 ? "good" : "meh", S.avatar)}</p>`);
  if (opt[2]) { const el2 = addBubble("ai", opt[2], ""); aiSpeak(el2, opt[2]).then(() => setTimeout(advance, 300)); }
  else setTimeout(advance, 700);
}
function finishDialog() {
  const avg = D.scores.length ? Math.round(D.scores.reduce((a, b) => a + b, 0) / D.scores.length) : 0;
  const prev = S.dialogues[D.d.id];
  S.dialogues[D.d.id] = { best: Math.max(prev ? prev.best : 0, avg), d: today() };
  const total = D.xp + 20;
  const dp = !prev ? Econ.PROGRESS.firstDialogue : avg >= prev.best + 5 ? Econ.PROGRESS.newBest : 0;
  const g = gainXp(total, D.startLevel, { key: "dialog:" + D.d.id, progress: dp, why: !prev ? "nouveau dialogue" : `record ${avg} %` });
  quest("dialog");
  go("dfinish", { avg, total, tasks: D.done.size, ntasks: D.d.tasks.length, ...g });
}
function renderDialogFinish(o) {
  render($("#view"), html`<section class="card finish">
    <div class="coach" id="dfCoach"><div class="av live">${avatarSvg(S.avatar, { cls: "happy" })}</div><div class="bubble"></div></div>
    <h2>Conversation réussie !</h2>
    <div class="tiles four">
      <div class="tile g"><span class="l">Tâches</span><span class="v">${o.tasks}/${o.ntasks}</span></div>
      <div class="tile c"><span class="l">Prononciation</span><span class="v">${o.avg}%</span></div>
      <div class="tile y"><span class="l">XP gagnés</span><span class="v">+${o.xpGained}</span></div>
      <div class="tile o" id="coinTile"><span class="l">Pièces</span><span class="v">+${o.coins}</span></div>
    </div>
    <details class="transcript"><summary>Revoir le dialogue</summary>${D.log.map(l => html`<p><b>${l.who === "ai" ? D.d.role : "Toi"} :</b> ${l.en}${l.fr ? html`<br><span class="small muted">${l.fr}</span>` : ""}</p>`)}</details>
    <div class="row center">${SESS ? "" : html`<button class="btn ghost" id="dRe">Rejouer</button>`}<button class="btn green shine" id="dOk">Continuer</button></div></section>`);
  fx(); play("done");
  collectCoins($("#coinTile"), o.coins);
  companionSay($("#dfCoach"), o.avg >= 80 ? "Tu as géré cette conversation comme un pro !" : "Bien joué ! Rejoue-la pour améliorer ta prononciation.", { voice: S.poufVoice, mood: "happy", av: S.avatar });
  const re = $("#dRe"); if (re) re.onclick = () => startDialog(D.d.id);
  $("#dOk").onclick = async () => { await rewards(o); if (SESS) sessionNext(); else go("train"); };
}
let LS = null;
function dialogueLines(d) { return d.turns.map(t => t.ai ? { who: "ai", en: t.ai, fr: t.fr } : { who: "me", en: t.me[0][0], fr: t.me[0][1] }); }
function wordsOf(text) { return P.splitDisplayWords(text).map(P.normWord).filter(w => w.length >= 3 && !STOP.has(w)); }
function startListen(id) {
  const d = DIALOGUES.find(x => x.id === id), lines = dialogueLines(d);
  const present = [...new Set(lines.flatMap(l => wordsOf(l.en)))];
  const others = [...new Set(DIALOGUES.filter(x => x.id !== id).flatMap(x => dialogueLines(x).flatMap(l => wordsOf(l.en))))].filter(w => !present.includes(w));
  const pick7 = shuffle(present).slice(0, 7), dis = shuffle(others).slice(0, 5);
  LS = { d, lines, chips: shuffle([...pick7, ...dis]), present: new Set(present), sel: new Set(), checked: false, playing: false, startLevel: levelNow().level };
  go("dlisten");
}
function renderListen() {
  const d = LS.d;
  render($("#view"), html`
    <div class="ltop"><button class="iconbtn" id="quit" aria-label="Quitter">${ICON.close}</button><h3 class="grow">${d.title} · écoute</h3><span class="pill ok">${d.level}</span></div>
    <section class="card"><div class="coach"><div class="av live">${avatarSvg(S.avatar)}</div><div class="bubble">Écoute le dialogue, puis touche tous les mots que tu as entendus.</div></div>
      <div class="row"><button class="btn cyan" id="lPlay">${ICON.play}Écouter le dialogue</button><button class="btn ghost sm" id="lSlow">${ICON.slow}Plus lentement</button></div></section>
    <section class="card"><h3>Quels mots as-tu entendus ?</h3>
      <div class="wchips" id="chips">${LS.chips.map(w => html`<button class="wchip" data-w="${w}" aria-pressed="false">${w}</button>`)}</div>
      <button class="btn green block" id="lCheck">Vérifier</button><div id="lRes"></div></section>`);
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
  const r = gainXp(xp, LS.startLevel, { key: "listen" });
  play(score >= 80 ? "great" : score >= 50 ? "good" : "bad");
  render($("#lRes"), html`<p class="hintline"><b>${score} %</b> · ${hit} trouvé${hit > 1 ? "s" : ""}, ${missed} manqué${missed > 1 ? "s" : ""}, ${wrong} en trop · <span class="xpfloat">+${r.xpGained} XP</span></p>
    <p class="small muted">Vert : bien entendu · orange : présent mais manqué · rouge : n'était pas dans le dialogue. Touche un mot pour l'écouter.</p>
    <details class="transcript" open><summary>Le dialogue</summary>${LS.lines.map(l => html`<p><b>${l.who === "ai" ? LS.d.role : "Toi"} :</b> ${l.en}<br><span class="small muted">${l.fr}</span></p>`)}</details>
    <div class="row center"><button class="btn green" id="lRole">${ICON.mic}Jouer ce dialogue</button><button class="btn ghost" id="lDone">${SESS ? "Continuer" : "Terminer"}</button></div>`);
  $("#lCheck").remove();
  $("#lRole").onclick = () => startDialog(LS.d.id);
  $("#lDone").onclick = async () => { await rewards(r); if (SESS) sessionNext(); else go("train"); };
}

// ---------------- Apprendre : grammaire et fautes typiques ----------------
const normSent = t => String(t).toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
function nextGrammarPoint() { return GRAMMAR.find(g => !S.grammar[g.id]) || [...GRAMMAR].sort((a, b) => S.grammar[a.id].best - S.grammar[b.id].best)[0]; }
function renderGrammarHome() {
  const lv = S.gLevel || "A1";
  render($("#view"), html`${learnTabs("grammar")}
    <h2>Grammaire</h2>
    <p class="small muted">Une règle à la fois : l'explication en français, beaucoup d'exemples, le piège des francophones, puis des exercices du plus simple au plus actif.</p>
    <div class="chips">${GLEVELS.map(l => { const n = GRAMMAR.filter(g => g.level === l).length, d = GRAMMAR.filter(g => g.level === l && S.grammar[g.id]).length; return html`<button class="chip ${l === lv ? "on" : ""}" data-gl="${l}">${l} <span class="small">${d}/${n}</span></button>`; })}</div>
    <div class="dgrid">${GRAMMAR.filter(g => g.level === lv).map((g, k) => { const r = S.grammar[g.id]; return html`<section class="card dcard" data-css="--i:${k}"><div class="row between"><span class="pill ok">${g.level}</span>${r ? html`<span class="pill ${r.best >= 80 ? "good" : "ok"}">${r.best} %</span>` : ""}</div>
      <h3>${g.title}</h3><p class="small muted">${g.rule.slice(0, 110)}${g.rule.length > 110 ? "…" : ""}</p>
      <button class="btn ${r ? "ghost" : "green"} sm" data-g="${g.id}">${r ? "Revoir" : "Apprendre"}</button></section>`; })}</div>`);
  bindLearnTabs();
  $$("[data-gl]").forEach(c => c.onclick = () => { play("tap"); S.gLevel = c.dataset.gl; save(); renderGrammarHome(); });
  $$("[data-g]").forEach(b => b.onclick = () => { play("tap"); startGrammar(b.dataset.g); });
}
let GR = null;
function startGrammar(id) {
  GR = { g: GRAMMAR.find(x => x.id === id), i: -1, ok: 0, xp: 0, startLevel: levelNow().level };
  loadDict().catch(() => {});
  go("gpoint");
}
function renderGrammarPoint() {
  const g = GR.g;
  if (GR.i < 0) {
    render($("#view"), html`
      <div class="ltop"><button class="iconbtn" id="quit" aria-label="Quitter">${ICON.close}</button><h3 class="grow">${g.title}</h3><span class="pill ok">${g.level}</span></div>
      <section class="card"><div class="coach"><div class="av live">${avatarSvg(S.avatar)}</div><div class="bubble">Lis bien la règle et écoute les exemples.</div></div>
        <h3>La règle</h3><p class="rule">${g.rule}</p></section>
      <section class="card"><h3>Exemples</h3>${g.examples.map(e => html`<div class="opt"><button class="iconbtn" data-say="${e[0]}" aria-label="Écouter">${ICON.spk}</button><span><b>${e[0]}</b><br><span class="small muted">${e[1]}</span></span></div>`)}</section>
      <section class="card trap"><h3>Le piège des Français</h3><p>${g.trap}</p></section>
      <button class="btn green block shine" id="gStart">Passer aux exercices (${g.ex.length})</button>`);
    $("#quit").onclick = () => quitActivity(true, "grammar");
    $$("[data-say]").forEach(b => b.onclick = () => speak(b.dataset.say, { voiceURI: S.voice, rate: 0.9 }));
    $("#gStart").onclick = () => { GR.i = 0; renderGrammarPoint(); };
    companionSay($(".coach"), "Lis bien la règle et écoute les exemples.", { voice: S.poufVoice, av: S.avatar });
    return;
  }
  const x = g.ex[GR.i];
  const head = html`<div class="ltop"><button class="iconbtn" id="quit" aria-label="Quitter">${ICON.close}</button><div class="bar"><i data-css="--p:${GR.i / g.ex.length * 100}%"></i></div><span class="combo">${GR.i + 1}/${g.ex.length}</span></div>`;
  let body;
  if (x[0] === "c") {
    const [a, b] = x[1].split("___");
    body = html`<section class="card qcard"><p class="small muted">Choisis la bonne forme</p><p class="gq">${a}<span class="blank">___</span>${b}</p>
      <div class="gopts">${x[2].map((o, i) => html`<button class="gopt" data-o="${i}">${o}</button>`)}</div></section>`;
  } else if (x[0] === "f") {
    GR.opts = shuffle([x[2], ...x[3]]);
    body = html`<section class="card qcard"><p class="small muted">Cette phrase est fausse. Trouve la bonne version.</p><p class="gq wrongs">${x[1]}</p>
      <div class="gopts col">${GR.opts.map((o, i) => html`<button class="gopt" data-o="${i}">${o}</button>`)}</div></section>`;
  } else {
    const words = P.splitDisplayWords(x[1]).map((w, i) => { w = w.replace(/[.,!?;:]+$/, ""); return i === 0 && !/^I($|')/.test(w) ? w.charAt(0).toLowerCase() + w.slice(1) : w; });
    GR.pool = shuffle(words.map((w, i) => ({ w, i }))); GR.ans = [];
    body = html`<section class="card qcard"><p class="small muted">Remets les mots dans l'ordre : « ${x[2]} »</p>
      <div class="ansline" id="ansline"></div><div class="wchips" id="pool"></div>
      <button class="btn green block" id="oCheck" disabled>Vérifier</button></section>`;
  }
  render($("#view"), html`${head}${body}<div id="gfb"></div><div class="spacer" id="spacer"></div>`);
  $("#quit").onclick = () => quitActivity(false, "grammar");
  if (x[0] === "c") $$(".gopt").forEach(b => b.onclick = () => gradeGrammar(+b.dataset.o === x[3], x[1].replace("___", x[2][x[3]]), x[4], b));
  else if (x[0] === "f") $$(".gopt").forEach(b => b.onclick = () => gradeGrammar(GR.opts[+b.dataset.o] === x[2], x[2], x[4], b));
  else { renderOrder(); $("#oCheck").onclick = () => { const said = GR.ans.map(t => t.w).join(" "); gradeGrammar(normSent(said) === normSent(x[1]), x[1], "", null, said); }; }
}
function renderOrder() {
  render($("#ansline"), GR.ans.length ? html`${GR.ans.map((t, k) => html`<button class="wchip on" data-a="${k}">${t.w}</button>`)}` : html`<span class="small muted">Touche les mots ci-dessous…</span>`);
  render($("#pool"), html`${GR.pool.map((t, k) => html`<button class="wchip" data-p="${k}">${t.w}</button>`)}`);
  $$("#ansline [data-a]").forEach(b => b.onclick = () => { GR.pool.push(GR.ans.splice(+b.dataset.a, 1)[0]); play("tap"); renderOrder(); });
  $$("#pool [data-p]").forEach(b => b.onclick = () => { GR.ans.push(GR.pool.splice(+b.dataset.p, 1)[0]); play("tap"); renderOrder(); });
  const c = $("#oCheck"); if (c) c.disabled = GR.pool.length > 0;
}
function gradeGrammar(ok, full, why, btn, said) {
  if ($("#gfb").dataset.done) return;
  $("#gfb").dataset.done = "1";
  $$(".gopt").forEach(b => b.disabled = true);
  if (btn) btn.classList.add(ok ? "good" : "bad");
  if (!ok) $$(".gopt").forEach(b => { if (b.textContent === (GR.g.ex[GR.i][0] === "c" ? GR.g.ex[GR.i][2][GR.g.ex[GR.i][3]] : full)) b.classList.add("good"); });
  if (!ok) FX.shake($(".qcard"));
  const oc = $("#oCheck"); if (oc) oc.remove();
  if (ok) { GR.ok++; GR.xp += 3; quest("gram"); FX.floatText("+3 XP", btn || $(".qcard"), "gold"); }
  play(ok ? "great" : "bad"); haptic(ok ? "good" : "bad");
  showFeedbackSheet({ ok, full, why: why || (ok ? "" : `Tu as proposé : « ${said} »`), next: () => { GR.i++; if (GR.i < GR.g.ex.length) renderGrammarPoint(); else finishGrammar(); } });
}
function showFeedbackSheet({ ok, full, why, next }) {
  TARGET = { text: full, onResult: r => { recordAttempt(full, r); const o = $("#sayRes"); if (o) render(o, html`<span class="pill ${r.score >= 85 ? "good" : r.score >= 55 ? "ok" : "bad"}">Prononciation ${r.score}</span> ${(P.tipsFor(r, 1)[0] || {}).text || ""}`); } };
  ref = null; loadDict().then(d => { ref = P.buildReference(d, full); }).catch(() => {});
  sheetShell(ok ? "great" : "bad", html`<div class="head"><div class="av live">${avatarSvg(S.avatar, { cls: ok ? "happy" : "sad" })}</div><div><div class="title">${ok ? "Correct !" : "Pas tout à fait"}</div><p><b>${full}</b></p></div></div>`,
    html`${why ? html`<p class="small">${why}</p>` : ""}<p class="small" id="sayRes"></p>`,
    html`<div class="row"><button class="btn ghost sm" id="fbListen">${ICON.spk}Écouter</button><button class="btn ghost sm" id="rec">${ICON.mic}Dis-la</button></div>
      <button class="btn ${ok ? "green" : "red"}" id="next">Continuer</button>`);
  $("#fbListen").onclick = () => speak(full, { voiceURI: S.voice, rate: 0.9 });
  $("#rec").onclick = () => { if (engineState === "off") startEngine(); toggleRecording(); };
  $("#next").onclick = () => { stopRecording(true); closeSheet(); next(); };
  speak(full, { voiceURI: S.voice, rate: 0.95 });
  syncSpacer();
}
function finishGrammar() {
  const g = GR.g, pct = Math.round(GR.ok / g.ex.length * 100), prev = S.grammar[g.id];
  S.grammar[g.id] = { best: Math.max(prev ? prev.best : 0, pct), d: today() };
  const gp = !prev ? Econ.PROGRESS.firstDialogue : pct >= prev.best + 5 ? Econ.PROGRESS.newBest : 0;
  const total = GR.xp + 15, r = gainXp(total, GR.startLevel, { key: "grammar:" + g.id, progress: gp, why: !prev ? "nouvelle règle" : `record ${pct} %` });
  go("done", { title: "Règle travaillée !", tiles: [["g", "Bonnes réponses", `${GR.ok}/${g.ex.length}`], ["c", "Réussite", pct + "%"], ["y", "XP gagnés", "+" + r.xpGained], ["o", "Pièces", "+" + r.coins]],
    line: pct >= 80 ? "Cette règle n'a plus de secret pour toi !" : "Refais-la demain, ça va rentrer.", back: "grammar", ...r });
}
function renderMistakesHome() {
  const d = today(), st = S.mistakes || {};
  const due = ALL_MISTAKES.filter(m => st[m.id] && st[m.id].due <= d).length, mastered = ALL_MISTAKES.filter(m => st[m.id] && st[m.id].box >= G.MASTERED_BOX).length;
  render($("#view"), html`${learnTabs("mistakes")}
    <h2>Fautes à éviter</h2>
    <section class="card"><div class="coach"><div class="av live">${avatarSvg(S.avatar)}</div><div class="bubble">Ces fautes viennent presque toutes d'une traduction mot à mot du français. On les chasse une par une !</div></div>
      <div class="tiles"><div class="tile c"><span class="l">Fautes</span><span class="v">${ALL_MISTAKES.length}</span></div><div class="tile o"><span class="l">À revoir</span><span class="v">${due}</span></div><div class="tile g"><span class="l">Corrigées</span><span class="v">${mastered}</span></div></div>
      <button class="btn green block shine" id="mGo">S'entraîner (10 fautes)</button></section>
    ${MISTAKE_CATS.map(c => html`<section class="card"><div class="row between"><h3>${c.title}</h3><button class="btn ghost sm" data-mc="${c.id}">S'entraîner</button></div>
      ${c.items.map(([w, r, why]) => html`<div class="mrow"><button class="iconbtn" data-say="${r}" aria-label="Écouter">${ICON.spk}</button><span><span class="wrongs">${w}</span><br><b class="rights">${r}</b><br><span class="small muted">${why}</span></span></div>`)}</section>`)}`);
  bindLearnTabs();
  $$("[data-say]").forEach(b => b.onclick = () => speak(b.dataset.say, { voiceURI: S.voice, rate: 0.9 }));
  $("#mGo").onclick = () => startMistakes(null, 10);
  $$("[data-mc]").forEach(b => b.onclick = () => startMistakes(b.dataset.mc, 10));
}
let MQ = null;
function startMistakes(cat, n) {
  const pool = ALL_MISTAKES.filter(m => !cat || m.cat === cat);
  let cards = G.pickVocab(pool, S.mistakes, n, n, today());
  if (cards.length < n) cards = [...cards, ...shuffle(pool.filter(m => !cards.includes(m)))].slice(0, n);
  MQ = { cards, i: 0, ok: 0, xp: 0, startLevel: levelNow().level };
  loadDict().catch(() => {});
  go("mcard");
}
function renderMistakeCard() {
  const m = MQ.cards[MQ.i];
  const opts = shuffle([m.right, m.wrong.replace(/\s*\(.*\)\s*$/, "")]);
  render($("#view"), html`
    <div class="ltop"><button class="iconbtn" id="quit" aria-label="Quitter">${ICON.close}</button><div class="bar"><i data-css="--p:${MQ.i / MQ.cards.length * 100}%"></i></div><span class="combo">${MQ.i + 1}/${MQ.cards.length}</span></div>
    <div class="coach"><div class="av live">${avatarSvg(S.avatar)}</div><div class="bubble">Laquelle est correcte ?</div></div>
    <section class="card qcard"><div class="gopts col">${opts.map((o, i) => html`<button class="gopt" data-o="${i}">${o}</button>`)}</div></section>
    <div id="gfb"></div><div class="spacer" id="spacer"></div>`);
  $("#quit").onclick = () => quitActivity(MQ.i === 0, "mistakes");
  $$(".gopt").forEach(b => b.onclick = () => {
    if ($("#gfb").dataset.done) return; $("#gfb").dataset.done = "1";
    const ok = opts[+b.dataset.o] === m.right;
    $$(".gopt").forEach(x => { x.disabled = true; if (x.textContent === m.right) x.classList.add("good"); });
    if (!ok) { b.classList.add("bad"); FX.shake($(".qcard")); }
    play(ok ? "great" : "bad"); haptic(ok ? "good" : "bad");
    if (ok) { MQ.ok++; MQ.xp += 3; quest("gram"); FX.floatText("+3 XP", b, "gold"); }
    const prev = S.mistakes[m.id]; S.mistakes[m.id] = G.gradeVocab(prev, ok, today()); save();
    showFeedbackSheet({ ok, full: m.right, why: m.why, next: () => { MQ.i++; if (MQ.i < MQ.cards.length) renderMistakeCard(); else finishMistakes(); } });
  });
}
function finishMistakes() {
  const total = MQ.xp + 10, r = gainXp(total, MQ.startLevel, { key: "mistakes" });
  go("done", { title: "Fautes chassées !", tiles: [["g", "Bonnes réponses", `${MQ.ok}/${MQ.cards.length}`], ["o", "À revoir", String(MQ.cards.length - MQ.ok)], ["y", "XP gagnés", "+" + r.xpGained], ["o", "Pièces", "+" + r.coins]],
    line: MQ.ok >= MQ.cards.length * 0.8 ? "Bravo, tu ne tombes plus dans le piège !" : "Les fautes ratées reviendront demain.", back: "mistakes", ...r });
}
function renderDone(o) {
  render($("#view"), html`<section class="card finish">
    <div class="coach" id="doCoach"><div class="av live">${avatarSvg(S.avatar, { cls: "happy" })}</div><div class="bubble"></div></div>
    <h2>${o.title}</h2>
    <div class="tiles four">${o.tiles.map(([c, l, v], k) => html`<div class="tile ${c}" id="${k === 3 ? "coinTile" : ""}"><span class="l">${l}</span><span class="v">${v}</span></div>`)}</div>
    <button class="btn green block shine" id="doOk">Continuer</button></section>`);
  fx(); play("done");
  collectCoins($("#coinTile"), o.coins);
  companionSay($("#doCoach"), o.line, { voice: S.poufVoice, mood: "happy", av: S.avatar });
  $("#doOk").onclick = async () => { await rewards(o); if (SESS) sessionNext(); else go(o.back); };
}

// ---------------- Conversation libre avec une IA ----------------
// Deux moteurs : IA locale (WebGPU, rien ne sort de l'appareil) ou Gemini avec la clé de l'utilisateur.
const GEMINI_HOST = "https://generativelanguage.googleapis.com";
const MODEL_RE = /^[a-z0-9][a-z0-9.-]{0,59}$/;
async function geminiKey() { if (sessionKey) return sessionKey; try { return await loadSecret("gemini"); } catch (e) { return ""; } }
function chatCfg() { return S.chat; }
let chatWorker = null, chatState = "off", chatPending = new Map(), chatReq = 0, chatWaiters = [];
function startChatEngine() {
  if (chatWorker) return;
  chatWorker = makeWorker(new URL("./chat-worker.js", import.meta.url));
  chatState = "loading";
  chatWorker.onmessage = e => {
    const m = e.data;
    if (m.type === "progress") { const pct = m.total ? Math.round(m.loaded / m.total * 100) : 0; setVar($("#cdBar > i"), "--p", pct + "%"); const t = $("#cdTxt"); if (t && m.total) t.textContent = `${(m.loaded / 1e6).toFixed(0)} / ${(m.total / 1e6).toFixed(0)} Mo · fichiers vérifiés (SHA-256)`; }
    else if (m.type === "ready") { chatState = "ready"; S.chatModelReady = true; save(); chatWaiters.splice(0).forEach(w => w.res()); if (view === "chatsetup") renderChatSetup(); }
    else if (m.type === "text" || m.type === "error") {
      const p = chatPending.get(m.id);
      if (m.type === "error" && !p) {
        chatState = "error"; chatWorker.terminate(); chatWorker = null; chatWaiters.splice(0).forEach(w => w.rej(new Error(m.message)));
        toast(m.message === "no_webgpu" ? "Ce navigateur ou cet appareil n'a pas WebGPU : utilise Gemini, ou Chrome/Edge récent sur PC." : /integrity|refusé/.test(m.message) ? errorText(m.message) : "Le chargement de l'IA locale a échoué. Vérifie ta connexion et la mémoire disponible.");
        if (view === "chatsetup") renderChatSetup(); return;
      }
      if (p) { chatPending.delete(m.id); m.type === "text" ? p.res(m.text) : p.rej(new Error(m.message)); }
    }
  };
  chatWorker.postMessage({ type: "init" });
}
function chatWhenReady() { return chatState === "ready" ? Promise.resolve() : new Promise((res, rej) => chatWaiters.push({ res, rej })); }
function chatCall(msg, transfer) { const id = ++chatReq; return new Promise((res, rej) => { chatPending.set(id, { res, rej }); chatWorker.postMessage({ ...msg, id }, transfer || []); }); }
const LOCAL_FORMAT = "\nAnswer EXACTLY in this format, nothing else:\nREPLY: <your answer in English>\nCORRECT: <the learner's last message corrected, or OK if it is correct>\nEXPLAIN: <short explanation of the errors in French, or nothing>";
function parseLocal(t) {
  const g = re => { const m = t.match(re); return m ? m[1].trim() : ""; };
  const reply = g(/REPLY:\s*([\s\S]*?)(?:\n\s*CORRECT:|$)/i) || t.trim();
  let corrected = g(/CORRECT:\s*([\s\S]*?)(?:\n\s*EXPLAIN:|$)/i);
  const explanation_fr = g(/EXPLAIN:\s*([\s\S]*)$/i);
  const ok = !corrected || /^ok\.?$/i.test(corrected);
  if (ok) corrected = "";
  return { reply, reply_fr: "", ok, corrected, explanation_fr, natural: "", pron_fr: "" };
}
// Réponse d'une IA = donnée non fiable : chaînes uniquement, longueurs bornées, toujours affichées échappées.
function clampAi(r) {
  const s = (v, n) => typeof v === "string" ? cleanText(v, n) : "";
  return { heard: r.heard === null ? null : s(r.heard, 500), reply: s(r.reply, 1500), reply_fr: s(r.reply_fr, 1500), ok: r.ok === true, corrected: s(r.corrected, 800), explanation_fr: s(r.explanation_fr, 1200), natural: s(r.natural, 800), pron_fr: s(r.pron_fr, 600), empty: !!r.empty };
}
async function chatTurn({ text, samples }) {
  const cfg = chatCfg(), scene = CH.scene, sys = systemPrompt(scene, cfg.level);
  const hist = CH.turns.slice(-10);
  if (cfg.engine === "test") {
    await new Promise(r => setTimeout(r, 300));
    return clampAi({ heard: text || "I would like a coffee please", reply: text === null ? "Hi! How can I help you today?" : "Sure! Anything else?", reply_fr: "Bien sûr ! Autre chose ?", ok: false, corrected: "I'd like a coffee, please.", explanation_fr: "Test : correction factice.", natural: "", pron_fr: "" });
  }
  if (cfg.engine === "local") {
    if (chatState !== "ready") { startChatEngine(); await chatWhenReady(); }
    let heard = text;
    if (samples) heard = await chatCall({ type: "transcribe", audio: samples }, [samples.buffer]);
    if (heard !== null && !heard) return { heard: "", reply: "", empty: true };
    const msgs = [{ role: "user", content: sys + LOCAL_FORMAT + "\n\nStart the conversation now, in your role." }];
    hist.forEach(h => msgs.push(h.who === "ai" ? { role: "assistant", content: "REPLY: " + h.text } : { role: "user", content: "Learner: " + h.text }));
    if (heard !== null) msgs.push({ role: "user", content: "Learner: " + heard });
    const out = await chatCall({ type: "generate", messages: msgs });
    return clampAi({ heard, ...parseLocal(out) });
  }
  const key = await geminiKey();
  if (!key) throw new Error("no_key");
  if (!MODEL_RE.test(cfg.model)) throw new Error("bad_model");
  const fmtJson = `\nReturn ONLY one JSON object: {"heard":"exact transcription of the learner's last message (empty at the start)","reply":"your answer in English","reply_fr":"French translation of reply","ok":true,"corrected":"the learner's message corrected, or empty if correct","explanation_fr":"short friendly explanation in French of each error, or empty","natural":"how a native would say it, or empty","pron_fr":"if you received audio: a short French note on a clearly mispronounced word, else empty"}`;
  const contents = hist.map(h => ({ role: h.who === "ai" ? "model" : "user", parts: [{ text: h.text }] }));
  if (text === null && !samples) contents.push({ role: "user", parts: [{ text: "Start the conversation now, in your role." }] });
  else if (samples) contents.push({ role: "user", parts: [{ inlineData: { mimeType: "audio/wav", data: wavBase64(samples) } }, { text: "(The learner said this out loud. Transcribe it in \"heard\", then answer and correct it.)" }] });
  else contents.push({ role: "user", parts: [{ text }] });
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 45000);
  let r;
  try {
    // « strict-origin » : Google reçoit seulement l'origine du site, ce qui permet de restreindre la clé à ce site.
    r = await fetch(`${GEMINI_HOST}/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`, {
      method: "POST", mode: "cors", credentials: "omit", cache: "no-store", redirect: "error", referrerPolicy: "strict-origin", signal: ctl.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: sys + fmtJson }] }, contents, generationConfig: { responseMimeType: "application/json", temperature: 0.7 } })
    });
  } finally { clearTimeout(to); }
  if (!r.ok) throw new Error("gemini_" + r.status);
  const data = await r.json();
  const raw = (((data.candidates || [])[0] || {}).content || {}).parts?.map(p => typeof p.text === "string" ? p.text : "").join("") || "";
  let j; try { j = JSON.parse(raw.match(/\{[\s\S]*\}/)[0]); } catch (e) { j = { reply: raw }; }
  if (!j || typeof j !== "object") j = { reply: String(raw) };
  return clampAi({ heard: typeof j.heard === "string" ? j.heard : (text ?? ""), reply: j.reply, reply_fr: j.reply_fr, ok: j.ok === true || !j.corrected, corrected: j.corrected, explanation_fr: j.explanation_fr, natural: j.natural, pron_fr: j.pron_fr });
}
function chatError(e) {
  const m = String(e && e.message || e);
  if (m === "no_key") return "Ajoute ta clé Gemini dans la configuration.";
  if (m === "bad_model") return "Nom de modèle Gemini invalide.";
  if (/abort/i.test(m)) return "Google met trop de temps à répondre. Réessaie.";
  if (/gemini_(400|401|403)/.test(m)) return "Google refuse la clé. Vérifie qu'elle est correcte et autorisée pour ce site.";
  if (/gemini_404/.test(m)) return "Ce modèle Gemini n'existe pas ou plus. Change le nom du modèle dans la configuration.";
  if (/gemini_429/.test(m)) return "Quota gratuit de Google atteint pour le moment. Réessaie dans une minute (ou demain).";
  if (/gemini_5/.test(m)) return "Les serveurs de Google ne répondent pas. Réessaie dans un instant.";
  if (m === "no_webgpu") return "WebGPU indisponible : passe en mode Gemini, ou utilise Chrome/Edge récent sur PC.";
  if (/integrity|refusé/.test(m)) return errorText(m);
  return "L'IA n'a pas pu répondre. Réessaie.";
}
function renderChatSetup() {
  const cfg = chatCfg();
  if (TEST_LOCAL && !cfg.engine) cfg.engine = "test";
  const hasGpu = !!navigator.gpu, key = !!sessionKey || keySaved;
  const localStatus = chatState === "ready" ? html`<span class="pill good">prête</span>` : chatState === "loading" ? html`<span class="pill ok">chargement</span>` : S.chatModelReady ? html`<span class="pill good">téléchargée</span>` : "";
  render($("#view"), html`
    <div class="ltop"><button class="iconbtn" id="back" aria-label="Retour">${ICON.close}</button><h3 class="grow">Conversation libre avec l'IA</h3></div>
    <section class="card"><div class="coach"><div class="av live">${avatarSvg(S.avatar)}</div><div class="bubble">Réponds ce que tu veux, avec tes mots. L'IA joue le rôle et corrige chacune de tes phrases.</div></div></section>
    <section class="card"><h3>1. Choisis le moteur</h3>
      <div class="engines">
        <button class="engine-card ${cfg.engine === "local" ? "on" : ""}" data-eng="local" ${hasGpu ? "" : "disabled"}><b>IA locale ${localStatus}</b><span class="small">Gratuite et privée : rien ne quitte ton appareil. PC récent avec Chrome ou Edge, ≈ 1 Go à télécharger une fois (chaque fichier est vérifié). Corrections plus approximatives.</span>${hasGpu ? "" : html`<span class="small bad-t">WebGPU indisponible sur cet appareil.</span>`}</button>
        <button class="engine-card ${cfg.engine === "gemini" ? "on" : ""}" data-eng="gemini"><b>Gemini (Google) ${key ? html`<span class="pill good">clé enregistrée</span>` : ""}</b><span class="small">Meilleure qualité, marche aussi sur téléphone. Il faut ta propre clé gratuite Google. Ta voix et tes messages sont envoyés à Google.</span></button>
      </div>
      ${cfg.engine === "local" && chatState !== "ready" ? html`<div id="cdl"><div class="bar xp" id="cdBar"><i></i></div><p class="small muted" id="cdTxt">${chatState === "loading" ? "Téléchargement…" : "Pas encore téléchargée."}</p>${chatState !== "loading" ? html`<button class="btn yellow sm" id="cdGo">Télécharger l'IA locale (≈ 1 Go)</button>` : ""}</div>` : ""}
      ${cfg.engine === "gemini" ? html`<div class="gform">
        <p class="small">1) Crée une clé gratuite sur <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">aistudio.google.com/apikey</a>. 2) Dans Google Cloud (Identifiants), restreins-la aux « Sites Web » <b>${location.origin}/*</b> et à l'API « Generative Language ». 3) Colle-la ici.</p>
        <label class="f" for="gKey">Clé API Gemini<input type="password" id="gKey" autocomplete="off" spellcheck="false" placeholder="${key ? "•••••••• (déjà enregistrée)" : "AIza…"}"></label>
        <label class="switch small" for="gRemember">Mémoriser la clé (chiffrée) sur cet appareil <input type="checkbox" id="gRemember" ${secretsAvailable() ? (keySaved || !sessionKey ? "checked" : "") : "disabled"}></label>
        <label class="f" for="gModel">Modèle<input type="text" id="gModel" value="${cfg.model}" spellcheck="false" maxlength="60"></label>
        <div class="row"><button class="btn yellow sm" id="gSave">Enregistrer</button>${key ? html`<button class="btn ghost sm" id="gDel">Effacer la clé</button>` : ""}</div>
        <p class="small muted">La clé est chiffrée (AES-GCM, clé non exportable) et n'est envoyée qu'à Google, jamais ailleurs, ni dans tes sauvegardes. Avec l'offre gratuite, Google peut utiliser ce que tu envoies pour améliorer ses produits : n'y mets rien de personnel.</p></div>` : ""}
    </section>
    <section class="card"><h3>2. Ton niveau</h3><div class="chips">${["A1", "A2", "B1", "B2"].map(l => html`<button class="chip ${l === cfg.level ? "on" : ""}" data-cl="${l}">${l}</button>`)}</div></section>
    <section class="card"><h3>3. Choisis une situation</h3>
      <div class="scenes">${SCENES.map((s, k) => html`<button class="scene" data-sc="${s.id}" data-css="--i:${k}"><b>${s.title}</b><span class="small muted">${s.sub}</span></button>`)}</div>
      <label class="f" for="cCustom">Ou décris ta propre situation (en français)<input type="text" id="cCustom" maxlength="200" placeholder="Ex : je suis dans un bar à Londres et je cherche les toilettes"></label>
      <button class="btn green" id="cCustomGo">Jouer cette situation</button></section>`);
  $("#back").onclick = () => go("train");
  $$("[data-eng]").forEach(b => b.onclick = () => { cfg.engine = b.dataset.eng; save(); renderChatSetup(); });
  $$("[data-cl]").forEach(b => b.onclick = () => { cfg.level = b.dataset.cl; save(); renderChatSetup(); });
  const dl = $("#cdGo"); if (dl) dl.onclick = () => { startChatEngine(); renderChatSetup(); };
  const gs = $("#gSave"); if (gs) gs.onclick = async () => {
    const k = $("#gKey").value.trim(), rem = $("#gRemember").checked, model = $("#gModel").value.trim().toLowerCase() || "gemini-3.8-flash";
    if (!MODEL_RE.test(model)) { toast("Nom de modèle invalide (lettres minuscules, chiffres, points et tirets)."); return; }
    if (k && !/^[A-Za-z0-9_-]{20,100}$/.test(k)) { toast("Cette clé n'a pas le bon format."); return; }
    cfg.model = model; save();
    if (k) {
      sessionKey = k;
      try { if (rem && secretsAvailable()) { await saveSecret("gemini", k); keySaved = true; } else { await deleteSecret("gemini"); keySaved = false; } }
      catch (e) { keySaved = false; toast("Clé gardée seulement pendant cette visite (stockage chiffré indisponible)."); }
    }
    toast("Configuration enregistrée."); renderChatSetup();
  };
  const gd = $("#gDel"); if (gd) gd.onclick = async () => {
    if (!await confirmDlg("Effacer la clé ?", "La clé Gemini sera retirée de cet appareil. Il faudra la recoller pour utiliser ce moteur.", "Effacer")) return;
    sessionKey = ""; try { await deleteSecret("gemini"); } catch (e) {} keySaved = false; toast("Clé effacée."); renderChatSetup();
  };
  const ready = () => { if (!cfg.engine) { toast("Choisis d'abord un moteur."); return false; } if (cfg.engine === "gemini" && !(sessionKey || keySaved)) { toast("Ajoute ta clé Gemini."); return false; } return true; };
  $$("[data-sc]").forEach(b => b.onclick = () => { if (ready()) startChat(SCENES.find(s => s.id === b.dataset.sc)); });
  $("#cCustomGo").onclick = () => { const t = cleanText($("#cCustom").value, 200); if (!t || !ready()) return; startChat({ id: "custom", title: t.slice(0, 50), sub: "", role: "the most natural other person in this situation (choose the role yourself and stay in it)", situation: `The learner described this real-life situation in French: ${JSON.stringify(t)}. Play it realistically.` }); };
}
let CH = null, chatRec = null;
function startChat(scene) {
  CH = { scene, turns: [], corrections: 0, msgs: 0, busy: false, startLevel: levelNow().level };
  go("chat");
  chatSend(null);
}
function renderChat() {
  const eng = chatCfg().engine;
  render($("#view"), html`
    <div class="ltop"><button class="iconbtn" id="quit" aria-label="Terminer">${ICON.close}</button><h3 class="grow">${CH.scene.title}</h3><span class="pill ok">${eng === "gemini" ? "Gemini" : eng === "local" ? "IA locale" : "test"}</span></div>
    <label class="switch small" for="cFr">Afficher la traduction <input type="checkbox" id="cFr" checked></label>
    <div class="chat" id="chat"></div>
    <p class="status" id="cStatus"></p>
    <section class="card composer-card">
      <div class="mic-wrap"><button class="mic" id="cMic" aria-label="Parler">${ICON.mic}</button><p class="small muted">Appuie et parle. Arrêt automatique quand tu as fini.</p></div>
      <div class="row"><label class="sr" for="cText">Ou écris ta réponse</label><input type="text" id="cText" maxlength="300" placeholder="Ou écris ta réponse en anglais…" autocomplete="off"><button class="btn cyan sm" id="cSend">Envoyer</button></div>
      <button class="btn ghost sm" id="cEnd">Terminer la conversation</button>
    </section>`);
  document.body.classList.remove("hide-fr");
  $("#cFr").onchange = e => document.body.classList.toggle("hide-fr", !e.target.checked);
  $("#quit").onclick = endChat; $("#cEnd").onclick = endChat;
  $("#cSend").onclick = () => { const t = cleanText($("#cText").value, 300); if (t) { $("#cText").value = ""; chatSend(t); } };
  $("#cText").addEventListener("keydown", e => { if (e.key === "Enter") $("#cSend").click(); });
  $("#cMic").onclick = chatMic;
}
async function chatMic() {
  if (CH.busy) return;
  const btn = $("#cMic");
  if (chatRec && chatRec.active) { const r = chatRec; chatRec = null; btn.classList.remove("on"); render(btn, ICON.mic); const out = await r.stop(); if (!out || !out.heardSpeech || !out.pcm) { $("#cStatus").textContent = "Je n'ai rien entendu."; return; } chatSend(undefined, out.pcm.samples); return; }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  chatRec = new Recorder({ onAutoStop: () => chatMic() });
  try { await chatRec.start(); } catch (e) { chatRec = null; toast("Accès au micro refusé ou micro introuvable."); return; }
  btn.classList.add("on"); render(btn, ICON.stop); $("#cStatus").textContent = "Je t'écoute…";
}
function chatBubble(who, content, speakText) {
  const chat = $("#chat"); if (!chat) return null;
  const el = append(chat, html`<div class="msg ${who}">${who === "ai" ? html`<div class="av">${avatarSvg(S.avatar)}</div>` : ""}<div class="bub">${content}${speakText ? html`<button class="iconbtn sm" aria-label="Réécouter">${ICON.spk}</button>` : ""}</div></div>`);
  const b = el.querySelector("button.iconbtn"); if (b) b.onclick = () => speak(speakText, { voiceURI: S.voice, rate: 0.95 });
  el.scrollIntoView({ block: "end", behavior: FX.reduced() ? "auto" : "smooth" });
  return el;
}
async function chatSend(text, samples) {
  if (CH.busy) return;
  CH.busy = true;
  const st = $("#cStatus");
  if (st) render(st, chatCfg().engine === "local" && chatState !== "ready" ? html`Chargement de l'IA locale… (la première fois peut être longue)` : html`<span class="typing"><i></i><i></i><i></i></span> ${S.avatar.name} réfléchit…`);
  const mic = $("#cMic"); if (mic) mic.disabled = true;
  try {
    const r = await chatTurn({ text: text === undefined ? null : text, samples });
    if (r.empty) { if (st) st.textContent = "Je n'ai pas compris. Réessaie ou écris ta réponse."; return; }
    if (r.heard !== null && r.heard !== undefined && (text !== null || samples)) {
      CH.msgs++; CH.turns.push({ who: "me", text: r.heard });
      let corr;
      if (r.ok && !r.corrected) corr = html`<div class="corrbox ok"><span class="pill good">Parfait !</span>${r.natural ? html` Plus naturel : <b>${r.natural}</b>` : ""}</div>`;
      else { CH.corrections++; corr = html`<div class="corrbox"><span class="pill bad">Correction</span> <b>${r.corrected}</b><br>${r.explanation_fr}${r.natural ? html`<br><span class="small">Plus naturel : ${r.natural}</span>` : ""}</div>`; }
      chatBubble("me", html`<div class="en">${r.heard}</div>${corr}${r.pron_fr ? html`<div class="corrbox pr"><span class="pill ok">Prononciation</span> ${r.pron_fr}</div>` : ""}`);
      markActive(); save();
    }
    CH.turns.push({ who: "ai", text: r.reply });
    const el = chatBubble("ai", html`<div class="en">${r.reply}</div>${r.reply_fr ? html`<div class="tr">${r.reply_fr}</div>` : ""}`, r.reply);
    if (st) st.textContent = "";
    const svg = el && el.querySelector(".pouf"); if (svg) svg.classList.add("talk");
    speak(r.reply, { voiceURI: S.voice, rate: 0.95 }).then(() => { if (svg) svg.classList.remove("talk"); });
  } catch (e) { if (st) st.textContent = chatError(e); }
  finally { CH.busy = false; const m = $("#cMic"); if (m) m.disabled = false; }
}
function endChat() {
  if (chatRec && chatRec.active) { chatRec.stop().catch(() => {}); chatRec = null; }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if (!CH || CH.msgs === 0) { go("train"); return; }
  const total = Math.min(CH.msgs, 12) * 5 + 10, r = gainXp(total, CH.startLevel, { key: "chat" });
  quest("dialog");
  go("done", { title: "Conversation terminée !", tiles: [["c", "Tes messages", String(CH.msgs)], ["o", "Corrections", String(CH.corrections)], ["y", "XP gagnés", "+" + r.xpGained], ["o", "Pièces", "+" + r.coins]],
    line: CH.corrections === 0 ? "Aucune faute, impressionnant !" : "Relis les corrections : ce sont tes points à travailler.", back: "train", ...r });
}

// ---------------- Vues ----------------
defView("path", renderPath);
defView("train", renderTrain);
defView("sounds", renderSounds, { tab: "train" });
defView("profile", renderProfile);
defView("lesson", renderLesson, { tab: "path", full: true });
defView("finish", renderFinish, { tab: "path", full: true });
defView("bfinish", renderBossFinish, { tab: "path", full: true });
defView("session", renderSession);
defView("block", renderBlock, { tab: "session", full: true });
defView("send", renderSessionEnd, { tab: "session", full: true });
defView("vocab", renderVocabHome);
defView("vcard", renderVocabCard, { tab: "vocab", full: true });
defView("vfinish", renderVocabFinish, { tab: "vocab", full: true });
defView("basics", renderBasics, { tab: "vocab" });
defView("bquiz", renderBasicsQuiz, { tab: "vocab", full: true });
defView("dialog", renderDialog, { tab: "train", full: true });
defView("dlisten", renderListen, { tab: "train", full: true });
defView("dfinish", renderDialogFinish, { tab: "train", full: true });
defView("grammar", renderGrammarHome, { tab: "vocab" });
defView("gpoint", renderGrammarPoint, { tab: "vocab", full: true });
defView("mistakes", renderMistakesHome, { tab: "vocab" });
defView("mcard", renderMistakeCard, { tab: "vocab", full: true });
defView("done", renderDone, { tab: "vocab", full: true });
defView("chatsetup", renderChatSetup, { tab: "train", full: true });
defView("chat", renderChat, { tab: "train", full: true });

// Contexte partagé avec les modules de vues (compagnon, arène).
const app = {
  get S() { return S; }, save, earn, now, learnTabs, bindLearnTabs, startLesson, go, defView, play, haptic, toast, notify, confirmDlg, celebrate, rewards, gainXp, quest, spend, openChestFlow, collectCoins,
  renderHud, applyPrefs, checkUnlocks, today, streak, levelNow, ICON, TEST_LOCAL, params, view: () => view, bossesWon, startBoss, speakEn: (t, rate = 0.9) => speak(t, { voiceURI: S.voice, rate })
};
app.lootbox = createLootbox(app);
setupLocker(app);
setupFriends(app);
setupArena(app);
setupVerbs(app);

// ---------------- Raccourcis clavier ----------------
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "KeyB", "KeyA"];
let kIdx = 0;
async function secretFound() {
  if (S.secret) { toast("Tu connais déjà le code secret !"); return; }
  S.secret = true; earn(100, "secret");
  const had = S.owned.includes("controller"); if (!had) S.owned.push("controller");
  save(); renderHud();
  await celebrate({ kind: "unlock", title: "Code secret !", text: `Vrai gamer détecté. +100 pièces${had ? "" : " et la manette pour ton compagnon"}.`, visual: html`<div class="unlock-ico av live">${avatarSvg({ ...S.avatar, hand: "controller" }, { cls: "happy" })}</div>` });
}
document.addEventListener("keydown", e => {
  kIdx = e.code === KONAMI[kIdx] ? kIdx + 1 : e.code === KONAMI[0] ? 1 : 0;
  if (kIdx === KONAMI.length) { kIdx = 0; secretFound(); return; }
  if (!["lesson", "vcard", "dialog"].includes(view) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.querySelector("dialog[open]") || /INPUT|SELECT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName)) return;
  if (e.code === "Space") { e.preventDefault(); toggleRecording(); }
  else if (e.code === "KeyL") { const b = $("#listen"); if (b) b.click(); }
  else if (e.code === "KeyH" && $("#reveal")) { $("#reveal").click(); }
  else if (e.code === "KeyH" && $("#dHint")) { $("#dHint").click(); }
  else if (e.code === "KeyR" && $("#again")) { $("#again").click(); }
  else if (e.code === "Enter" && $("#sheet")) { e.preventDefault(); $("#next").click(); }
});
// Sur téléphone : 7 touches rapides sur le logo.
let taps = [];
$("#brand").addEventListener("click", () => { const t = performance.now(); taps = [...taps.filter(x => t - x < 2500), t]; if (taps.length >= 7) { taps = []; secretFound(); } });

// ---------------- Service worker : hors ligne, en-têtes de sécurité, mises à jour vérifiées ----------------
async function setupServiceWorker() {
  if (!("serviceWorker" in navigator) || TEST_LOCAL) return;
  const hadController = !!navigator.serviceWorker.controller;
  let asked = false, reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    if (asked || (!hadController && !self.crossOriginIsolated && !sessionStorage.getItem("coiReload"))) {
      reloading = true; sessionStorage.setItem("coiReload", "1"); location.reload();
    }
  });
  let reg;
  try { reg = await navigator.serviceWorker.register(scriptURL("sw.js"), { updateViaCache: "none" }); } catch (e) { return; }
  if (!reg) return; // service worker bloqué par le navigateur : l'appli marche sans mode hors ligne
  const apply = w => { asked = true; w.postMessage("skipWaiting"); };
  const offer = w => {
    if (!w || !navigator.serviceWorker.controller) return;
    if (performance.now() < 8000 && !inActivity) return apply(w); // au démarrage : on applique tout de suite
    if ($("#updBar")) return;
    // Sinon : bouton visible, l'utilisateur choisit le moment (jamais au milieu d'un exercice sans son accord).
    const bar = append(document.body, html`<div class="updbar" id="updBar" role="status">${ICON.shield}<span>Nouvelle version prête (vérifiée)</span><button class="btn yellow sm" id="updGo">Mettre à jour</button></div>`);
    $("#updGo", bar).onclick = () => { bar.remove(); apply(w); };
  };
  if (reg.waiting) offer(reg.waiting);
  // Sur téléphone, l'appli reste ouverte en arrière-plan : on vérifie les mises à jour au retour et toutes les 30 min.
  const check = () => reg.update().catch(() => {});
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
  setInterval(check, 30 * 60000);
  reg.addEventListener("updatefound", () => {
    const w = reg.installing;
    if (w) w.addEventListener("statechange", () => { if (w.state === "installed") offer(w); });
  });
}

// ---------------- Démarrage ----------------
applyPrefs();
M.ensureQuests(S, today());
const used = M.applyFreezes(S, today());
save();
migrateLegacy("gemini").finally(refreshKeyState);
if (S.modelReady) startEngine();
go("path");
if (used) notify("Gel de série utilisé", `${used} jour${used > 1 ? "s" : ""} manqué${used > 1 ? "s" : ""} protégé${used > 1 ? "s" : ""} : ta série continue !`, SNOW);
if (integrity.status === "tampered") confirmDlg("Sauvegarde modifiée en dehors de l'appli",
  `Pour que chacun soit récompensé de ses vrais progrès, les pièces et les objets ont été ramenés à ce que ta progression justifie.${integrity.notes.length ? " Corrections : " + integrity.notes.join(" ; ") + "." : ""}`, "J'ai compris", { danger: false, noCancel: true });
else if (integrity.notes.length) confirmDlg("Sauvegarde vérifiée", `Des valeurs impossibles ont été corrigées : ${integrity.notes.join(" ; ")}.`, "OK", { danger: false, noCancel: true });
setupServiceWorker();

// Liens d'amis et de défis (#c=…) : lus puis effacés de la barre d'adresse. Le fragment n'est jamais envoyé au serveur.
// À la toute première visite, l'appli se recharge une fois (mode hors ligne) : le code est gardé de côté
// (sessionStorage, cet onglet seulement) et traité quand l'appli est prête.
function readLinkCode() {
  const m = location.hash.match(/^#c=([A-Za-z0-9._%-]{20,6000})$/);
  if (m) { try { sessionStorage.setItem("labo.pending", decodeURIComponent(m[1])); } catch (e) { /* stockage refusé */ } history.replaceState(null, "", location.pathname + location.search); }
  let code = null; try { code = sessionStorage.getItem("labo.pending"); } catch (e) { code = m ? decodeURIComponent(m[1]) : null; }
  if (!code) return;
  const willReload = "serviceWorker" in navigator && !TEST_LOCAL && !navigator.serviceWorker.controller && !self.crossOriginIsolated && !sessionStorage.getItem("coiReload");
  const go2 = () => { try { sessionStorage.removeItem("labo.pending"); } catch (e) { /* rien */ } app.social.receive(code); };
  if (willReload) setTimeout(() => { try { if (sessionStorage.getItem("labo.pending")) go2(); } catch (e) { go2(); } }, 5000); // si le rechargement n'a pas lieu
  else go2();
}
readLinkCode();
window.addEventListener("hashchange", readLinkCode);

// Heure du serveur (en-tête Date de la page) : si l'horloge de l'appareil est décalée de plus de 5 minutes,
// les récompenses du jour (quêtes, offres, série, défi du jour) suivent l'heure réelle.
async function syncClock() {
  if (TEST_LOCAL && !params.has("clock")) return;
  try {
    const t0 = Date.now(), r = await fetch("./?clock=" + t0, { method: "HEAD", cache: "no-store", credentials: "omit" }), t1 = Date.now();
    const srv = Date.parse(r.headers.get("date") || "");
    if (!Number.isFinite(srv)) return;
    const off = srv - (t0 + t1) / 2, had = clockOffset !== 0;
    clockOffset = Math.abs(off) > 5 * 60e3 ? Math.round(off) : 0;
    if (clockOffset && !had) toast("L'heure de ton appareil est décalée : les récompenses du jour suivent l'heure réelle.");
    if (S.econ.lastSeen > srv + 36e5) toast("Horloge avancée détectée : les récompenses du jour reprendront quand l'heure réelle aura rattrapé.");
  } catch (e) { /* hors ligne : on garde l'heure la plus tardive déjà vue */ }
}
syncClock();
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncClock(); });
