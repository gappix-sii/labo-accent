// Moteur phonétique : dictionnaire CMU (ARPAbet) -> IPA du modèle, décodage CTC,
// alignement attendu / entendu, score et conseils pour francophones.
// Module pur (sans DOM) : utilisable dans le navigateur, le worker et les tests Node.

// Vocabulaire de sortie du modèle robg/speako-phoneme-recognizer (révision épinglée).
export const VOCAB = {
  0: "|", 1: "ɑ", 2: "æ", 3: "ə", 4: "aʊ", 5: "aɪ", 6: "b", 7: "ʧ", 8: "d", 9: "ð",
  10: "ɾ", 11: "ɛ", 12: "ɝ", 13: "eɪ", 14: "f", 15: "g", 16: " ", 17: "h", 18: "ɪ", 19: "i",
  20: "ʤ", 21: "k", 22: "l", 23: "m", 24: "n", 25: "ŋ", 26: "oʊ", 27: "ɔɪ", 28: "p", 29: "ɹ",
  30: "s", 31: "ʃ", 32: "t", 33: "θ", 34: "ʊ", 35: "u", 36: "v", 37: "w", 38: "j", 39: "z",
  40: "[UNK]", 41: "[PAD]"
};
export const BLANK_ID = 41;
const DELIM_IDS = new Set([0, 16]);
const IGNORE_IDS = new Set([40, 41]);

// ARPAbet (CMUdict) -> inventaire TIMIT-39 du modèle.
// TIMIT-39 fusionne AO avec AA, AH avec ə, ZH avec SH.
export const ARPA2IPA = {
  AA: "ɑ", AE: "æ", AH: "ə", AO: "ɑ", AW: "aʊ", AY: "aɪ", B: "b", CH: "ʧ", D: "d", DH: "ð",
  EH: "ɛ", ER: "ɝ", EY: "eɪ", F: "f", G: "g", HH: "h", IH: "ɪ", IY: "i", JH: "ʤ", K: "k",
  L: "l", M: "m", N: "n", NG: "ŋ", OW: "oʊ", OY: "ɔɪ", P: "p", R: "ɹ", S: "s", SH: "ʃ",
  T: "t", TH: "θ", UH: "ʊ", UW: "u", V: "v", W: "w", Y: "j", Z: "z", ZH: "ʃ"
};

export const VOWELS = new Set(["ɑ", "æ", "ə", "aʊ", "aɪ", "ɛ", "ɝ", "eɪ", "ɪ", "i", "oʊ", "ɔɪ", "ʊ", "u"]);

// Écriture « à la française » de chaque son, pour l'affichage.
export const FR_HINT = {
  "ɑ": "a (a de « pâte », bouche ouverte)", "æ": "è très ouvert (entre a et è)", "ə": "e faible (comme « le »)",
  "aʊ": "aou", "aɪ": "aï", "b": "b", "ʧ": "tch", "d": "d", "ð": "z avec la langue entre les dents",
  "ɾ": "d rapide", "ɛ": "è", "ɝ": "eur avec r anglais", "eɪ": "éï", "f": "f", "g": "g (gu)", "h": "h soufflé",
  "ɪ": "i court et relâché (presque é)", "i": "i long et souriant", "ʤ": "dj", "k": "k", "l": "l", "m": "m",
  "n": "n", "ŋ": "ng nasal (sans prononcer le g)", "oʊ": "eo-ou (o qui glisse vers ou)", "ɔɪ": "oï", "p": "p",
  "ɹ": "r anglais (langue en arrière, sans toucher)", "s": "s", "ʃ": "ch", "t": "t", "θ": "s avec la langue entre les dents",
  "ʊ": "ou court et relâché", "u": "ou long", "v": "v", "w": "ou rapide (lèvres arrondies)", "j": "y (de « yeux »)", "z": "z"
};

// ---------- Mots et dictionnaire ----------
export function normWord(w) {
  return String(w).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z']/g, "").replace(/^'+|'+$/g, "");
}

// Découpe une phrase en mots affichables (garde la ponctuation pour l'affichage).
export function splitDisplayWords(sentence) {
  return String(sentence).trim().split(/\s+/).filter(Boolean);
}

export function arpaToIpa(arpa) {
  return String(arpa).trim().split(/\s+/).map(t => {
    const m = t.match(/^([A-Z]+)([012])?$/);
    if (!m || !ARPA2IPA[m[1]]) return null;
    return { p: ARPA2IPA[m[1]], stress: m[2] ? Number(m[2]) : -1 };
  }).filter(Boolean);
}

// Prononciations d'un mot : [ [ {p,stress}, ... ], variante2, ... ]
export function lookupProns(dict, word) {
  const w = normWord(word);
  if (!w) return null;
  const out = [];
  if (dict[w]) out.push(arpaToIpa(dict[w]));
  for (let i = 1; i <= 4; i++) { const k = `${w}(${i})`; if (dict[k]) out.push(arpaToIpa(dict[k])); }
  return out.length ? out : null;
}

// Référence d'une phrase : [{display, norm, prons|null}]
export function buildReference(dict, sentence) {
  return splitDisplayWords(sentence).map(display => {
    const norm = normWord(display);
    return { display, norm, prons: norm ? lookupProns(dict, norm) : null };
  });
}

// ---------- Décodage CTC ----------
// logits : Float32Array de taille T*V (lignes = trames de 20 ms).
export function decodeCTC(logits, T, V, frameSec = 0.02) {
  const segs = [];
  let prev = -1, cur = null;
  for (let t = 0; t < T; t++) {
    const off = t * V;
    let best = 0, bv = -Infinity;
    for (let v = 0; v < V; v++) { const x = logits[off + v]; if (x > bv) { bv = x; best = v; } }
    // probabilité softmax du meilleur jeton
    let sum = 0;
    for (let v = 0; v < V; v++) sum += Math.exp(logits[off + v] - bv);
    const prob = 1 / sum;
    if (best === prev && cur) { cur.end = (t + 1) * frameSec; cur.probs.push(prob); continue; }
    prev = best;
    cur = null;
    if (IGNORE_IDS.has(best) || best >= 42) continue;
    if (DELIM_IDS.has(best)) { segs.push({ delim: true, start: t * frameSec, end: (t + 1) * frameSec }); continue; }
    cur = { p: VOCAB[best], start: t * frameSec, end: (t + 1) * frameSec, probs: [prob] };
    segs.push(cur);
  }
  return segs.filter(s => !s.delim).map(s => ({
    p: s.p, start: s.start, end: s.end,
    conf: s.probs.reduce((a, b) => a + b, 0) / s.probs.length
  }));
}

// Découpe une chaîne IPA (sortie texte du modèle) en jetons du vocabulaire.
const TOKENS_BY_LEN = Object.values(VOCAB).filter(t => t.length && !t.startsWith("[") && t !== "|" && t !== " ")
  .sort((a, b) => b.length - a.length);
export function tokenizeIpa(str) {
  const out = []; const s = String(str).replace(/\s+/g, "");
  let i = 0;
  while (i < s.length) {
    const tok = TOKENS_BY_LEN.find(t => s.startsWith(t, i));
    if (tok) { out.push(tok); i += tok.length; } else i++;
  }
  return out;
}

// ---------- Alignement ----------
const EQUIV = new Set(["t|ɾ", "ɾ|t", "d|ɾ", "ɾ|d", "ə|ɪ", "ɪ|ə", "ɑ|ə", "ə|ɑ", "ɝ|ə", "ə|ɝ"]);
// Ces équivalences ne valent que pour des voyelles non accentuées (ə, ɪ, ɝ réduits) ou des t/d intervocaliques.
function subCost(r, h) {
  if (r.p === h.p) return 0;
  if (EQUIV.has(r.p + "|" + h.p) && (r.stress <= 0 || ["t", "d"].includes(r.p))) return 0.15;
  const rv = VOWELS.has(r.p), hv = VOWELS.has(h.p);
  if (rv && hv) return 0.75;
  if (!rv && !hv) return 0.85;
  return 1.3;
}
const DEL = 1.0, INS = 0.7;

// ref : [{p, stress, wi}] ; hyp : [{p, start, end, conf}]
export function align(ref, hyp) {
  const n = ref.length, m = hyp.length;
  const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  const B = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1)); // 1 diag, 2 up(del), 3 left(ins)
  for (let i = 1; i <= n; i++) { D[i][0] = i * DEL; B[i][0] = 2; }
  for (let j = 1; j <= m; j++) { D[0][j] = j * INS; B[0][j] = 3; }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const d = D[i - 1][j - 1] + subCost(ref[i - 1], hyp[j - 1]);
      const u = D[i - 1][j] + DEL;
      const l = D[i][j - 1] + INS;
      if (d <= u && d <= l) { D[i][j] = d; B[i][j] = 1; }
      else if (u <= l) { D[i][j] = u; B[i][j] = 2; }
      else { D[i][j] = l; B[i][j] = 3; }
    }
  }
  const ops = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    const b = B[i][j];
    if (b === 1) { ops.push({ r: i - 1, h: j - 1 }); i--; j--; }
    else if (b === 2) { ops.push({ r: i - 1, h: -1 }); i--; }
    else { ops.push({ r: -1, h: j - 1 }); j--; }
  }
  ops.reverse();
  return { ops, cost: D[n][m] };
}

// ---------- Évaluation ----------
const CONF_OK = 0.55;

function flatten(refWords, choice) {
  const flat = [];
  refWords.forEach((w, wi) => {
    if (!w.prons) return;
    w.prons[choice[wi] || 0].forEach(ph => flat.push({ p: ph.p, stress: ph.stress, wi }));
  });
  return flat;
}

// Choisit, mot par mot, la variante du dictionnaire qui colle le mieux à ce qui a été dit.
function bestAlignment(refWords, hyp) {
  const choice = refWords.map(() => 0);
  let flat = flatten(refWords, choice);
  let best = align(flat, hyp);
  refWords.forEach((w, wi) => {
    if (!w.prons || w.prons.length < 2) return;
    for (let k = 1; k < w.prons.length; k++) {
      const c2 = choice.slice(); c2[wi] = k;
      const f2 = flatten(refWords, c2);
      const a2 = align(f2, hyp);
      if (a2.cost < best.cost - 1e-9) { best = a2; flat = f2; choice[wi] = k; }
    }
  });
  return { flat, ops: best.ops, choice };
}

export function evaluate(refWords, hyp) {
  const { flat, ops, choice } = bestAlignment(refWords, hyp);
  const words = refWords.map((w, wi) => ({
    display: w.display, scored: !!w.prons, phones: [], score: null, level: "skip", start: null, end: null,
    ipa: w.prons ? w.prons[choice[wi] || 0] : null
  }));
  const inserted = [];
  let total = 0, count = 0;
  for (const op of ops) {
    if (op.r < 0) { inserted.push(hyp[op.h]); continue; }
    const r = flat[op.r], W = words[r.wi];
    let status, heard = null, weight;
    if (op.h < 0) { status = "bad"; weight = 0; }
    else {
      const h = hyp[op.h]; heard = h.p;
      W.start = W.start === null ? h.start : Math.min(W.start, h.start);
      W.end = W.end === null ? h.end : Math.max(W.end, h.end);
      const c = subCost(r, h);
      if (c === 0) { status = h.conf >= CONF_OK ? "good" : "ok"; weight = h.conf >= CONF_OK ? 1 : 0.65; }
      else if (c <= 0.15) { status = "good"; weight = 0.9; }
      else { status = "bad"; weight = 0; }
    }
    W.phones.push({ p: r.p, stress: r.stress, status, heard });
    total += weight; count++;
  }
  for (const W of words) {
    if (!W.scored || !W.phones.length) continue;
    const s = W.phones.reduce((a, ph) => a + (ph.status === "good" ? 1 : ph.status === "ok" ? 0.65 : 0), 0) / W.phones.length;
    W.score = Math.round(s * 100);
    W.level = s >= 0.85 ? "good" : s >= 0.55 ? "ok" : "bad";
  }
  // Pénalité légère pour les sons ajoutés en trop (au-delà de 2)
  const extra = Math.max(0, inserted.length - 2);
  const raw = count ? total / count : 0;
  const score = Math.max(0, Math.round((raw - extra * 0.02) * 100));
  return { score, words, inserted, heardIpa: hyp.map(h => h.p).join(" ") };
}

// ---------- Conseils (francophones) ----------
const PAIR_TIPS = {
  "θ|s": "Tu as dit « s ». Pour « th », sors le bout de la langue entre les dents et souffle.",
  "θ|t": "Tu as dit « t ». Ne bloque pas l'air : langue entre les dents, et souffle en continu.",
  "θ|f": "Tu as dit « f ». Les lèvres ne bougent pas : c'est la langue, entre les dents, qui fait le son.",
  "ð|z": "Tu as dit « z ». Même son, mais avec la langue entre les dents et la gorge qui vibre.",
  "ð|d": "Tu as dit « d ». Ne tape pas la langue derrière les dents : pose-la entre les dents et laisse vibrer.",
  "ð|v": "Tu as dit « v ». Les lèvres restent ouvertes, c'est la langue entre les dents qui travaille.",
  "ɪ|i": "Tu as fait un « i » français, trop long et tendu. Le i anglais court est relâché, presque « é » : sit, live, ship.",
  "i|ɪ": "Ce son doit être long et souriant : étire les lèvres et tiens le son (sheep, leave, seat).",
  "æ|ɛ": "Tu as dit « è ». Ouvre beaucoup plus la bouche, mâchoire vers le bas, entre « a » et « è » (cat, bad).",
  "æ|ɑ": "Tu as dit « a ». Garde la langue en avant et étire un peu les lèvres : entre « a » et « è ».",
  "ɑ|æ": "Ouvre la bouche en arrière, comme chez le médecin : « aah » (hot, father).",
  "ə|ɛ": "Ce son est très faible et neutre, comme le e de « le ». Ne l'accentue pas.",
  "ʊ|u": "Le ou court est relâché et bref (good, book, look) : ne l'allonge pas.",
  "u|ʊ": "Ce ou est long, lèvres bien arrondies (food, you, blue).",
  "oʊ|ɑ": "Ce o doit glisser vers « ou » : « eo-ou » (go, no, home).",
  "eɪ|ɛ": "Ce son glisse de « é » vers « i » : « éï » (day, name, wait).",
  "w|v": "Tu as dit « v ». Les dents ne touchent pas la lèvre : arrondis les lèvres comme pour « ou » (water, we).",
  "ŋ|n": "Garde le son au fond de la gorge, comme dans « parking » (sans prononcer le g).",
  "ŋ|g": "Ne prononce pas le « g » à la fin : le son reste nasal (sing, thing).",
  "ɹ|h": "Pas de r de gorge : la langue recule sans toucher le palais, lèvres un peu arrondies.",
  "ʃ|s": "Avance les lèvres comme pour « chut » : sh = ch.",
  "s|ʃ": "Lèvres détendues, langue derrière les dents : un simple « s ».",
  "ʧ|ʃ": "Commence par un petit « t » : « tch » (church, watch).",
  "ʤ|ʒ": "Commence par un petit « d » : « dj » (job, just)."
};
const SOUND_TIPS = {
  "h": "Le « h » se souffle, comme de la buée sur une vitre. Sans lui, hungry devient angry !",
  "θ": "« th » sourd : bout de la langue entre les dents, et souffle.",
  "ð": "« th » sonore : langue entre les dents, et la gorge vibre (this, the, mother).",
  "ɹ": "R anglais : la langue recule sans rien toucher, pas de r roulé ni de r de gorge.",
  "ɪ": "i court et relâché, presque « é » (sit, big, live).",
  "i": "i long et souriant (see, eat, leave).",
  "æ": "Bouche grande ouverte, entre « a » et « è » (cat, happy).",
  "ə": "Son faible et neutre, comme le e de « le ». Les syllabes non accentuées se réduisent à ce son.",
  "ŋ": "ng nasal, au fond de la gorge, sans g final.",
  "w": "Lèvres arrondies comme pour « ou », sans toucher les dents.",
  "oʊ": "Le o anglais glisse vers « ou » : « eo-ou ».",
  "eɪ": "« éï » : le son glisse vers i.",
  "ɝ": "« eur » avec la langue repliée en arrière (bird, work, her).",
  "aɪ": "« aï » bien marqué (I, my, nice).",
  "aʊ": "« aou » (now, house, how).",
  "ʊ": "ou court et relâché (good, book).",
  "u": "ou long (food, two).",
  "z": "Fais vibrer : z, pas s (is, was, easy).",
  "v": "Dents du haut sur la lèvre du bas, et ça vibre.",
  "t": "Prononce la consonne finale : en anglais, elle change le sens (wait / way).",
  "d": "Prononce le d final, surtout au passé : played, called.",
  "default": "Écoute le modèle au ralenti, puis répète ce son seul avant le mot entier."
};

export function tipsFor(result, max = 4) {
  const tips = [], seen = new Set();
  for (const w of result.words) {
    if (!w.scored) continue;
    w.phones.forEach((ph, idx) => {
      if (ph.status !== "bad") return;
      const key = ph.heard ? `${ph.p}|${ph.heard}` : `${ph.p}|-`;
      if (seen.has(ph.p)) return;
      seen.add(ph.p);
      let text;
      if (ph.heard && PAIR_TIPS[key]) text = PAIR_TIPS[key];
      else if (!ph.heard) {
        const last = idx === w.phones.length - 1;
        text = last && !VOWELS.has(ph.p)
          ? `Tu as avalé le son final « ${ph.p} ». En anglais, la dernière consonne se prononce. ${SOUND_TIPS[ph.p] || ""}`.trim()
          : `Le son « ${ph.p} » n'a pas été entendu. ${SOUND_TIPS[ph.p] || SOUND_TIPS.default}`;
      } else text = `On attendait « ${ph.p} » (${FR_HINT[ph.p] || ""}), j'ai entendu « ${ph.heard} ». ${SOUND_TIPS[ph.p] || SOUND_TIPS.default}`;
      tips.push({ word: w.display, sound: ph.p, heard: ph.heard, text });
    });
  }
  return tips.slice(0, max);
}

// Mise à jour des statistiques par son : { p: {ok, n} }
export function updateSoundStats(stats, result) {
  const s = { ...stats };
  for (const w of result.words) for (const ph of (w.phones || [])) {
    const cur = s[ph.p] || { ok: 0, n: 0 };
    s[ph.p] = { ok: cur.ok + (ph.status === "good" ? 1 : ph.status === "ok" ? 0.65 : 0), n: cur.n + 1 };
  }
  return s;
}

export function ipaString(phones) {
  return (phones || []).map(ph => ph.p).join("");
}
