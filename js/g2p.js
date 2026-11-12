// Texte anglais -> phonèmes pour la voix naturelle (Kokoro, anglais américain).
// Même notation que la bibliothèque de référence kokoro.js (sortie d'espeak-ng en en-us : ˈ ˌ ː ɾ ɚ ᵻ…),
// mais calculée avec le dictionnaire CMU déjà présent dans l'appli : aucun moteur supplémentaire à télécharger.
// Code pur (sans DOM) : utilisé dans le worker de synthèse et dans les tests.
import { numberWords, yearWords, ordinalWords } from "./basics.js";

// Voyelles ARPAbet -> [non accentuée, accentuée]
const V = {
  AA: ["ɑː", "ɑː"], AE: ["æ", "æ"], AH: ["ə", "ʌ"], AO: ["ɔː", "ɔː"], AW: ["aʊ", "aʊ"], AY: ["aɪ", "aɪ"],
  EH: ["ɛ", "ɛ"], ER: ["ɚ", "ɜː"], EY: ["eɪ", "eɪ"], IH: ["ɪ", "ɪ"], IY: ["i", "iː"], OW: ["oʊ", "oʊ"],
  OY: ["ɔɪ", "ɔɪ"], UH: ["ʊ", "ʊ"], UW: ["u", "uː"]
};
const C = {
  B: "b", CH: "tʃ", D: "d", DH: "ð", F: "f", G: "ɡ", HH: "h", JH: "dʒ", K: "k", L: "l", M: "m", N: "n", NG: "ŋ",
  P: "p", R: "ɹ", S: "s", SH: "ʃ", T: "t", TH: "θ", V: "v", W: "w", Y: "j", Z: "z", ZH: "ʒ"
};
const VOWEL_START = /^[ˈˌ]?[ɑæəʌɔaɛɜɚeɪiᵻoʊu]/;

// Petits mots prononcés sans accent dans la phrase (comme espeak) : c'est ce qui rend le débit naturel.
const FUNC = {
  a: "ə", an: "ən", the: "ðə", and: "ænd", or: "ɔːɹ", but: "bʌt", of: "ʌv", to: "tə", in: "ɪn", on: "ɑːn", at: "æt",
  for: "fɔːɹ", from: "fɹʌm", with: "wɪð", as: "æz", by: "baɪ", than: "ðæn", is: "ɪz", are: "ɑːɹ", was: "wʌz",
  were: "wɜː", be: "biː", been: "bɪn", am: "æm", can: "kæn", has: "hæz", have: "hæv", had: "hæd", do: "duː",
  does: "dʌz", will: "wɪl", would: "wʊd", could: "kʊd", should: "ʃʊd", i: "aɪ", you: "juː", he: "hiː", she: "ʃiː",
  it: "ɪt", we: "wiː", they: "ðeɪ", me: "miː", him: "hɪm", her: "hɜː", us: "ʌs", them: "ðɛm", my: "maɪ",
  your: "jʊɹ", his: "hɪz", its: "ɪts", our: "aʊɚ", their: "ðɛɹ"
};
// Variantes du dictionnaire à préférer (le CMU met parfois le passé ou le nom en premier).
const PREFER = { read: "R IY1 D", live: "L IH1 V", lead: "L IY1 D", wind: "W IH1 N D", tear: "T IH1 R", close: "K L OW1 Z", use: "Y UW1 Z", either: "IY1 DH ER0", neither: "N IY1 DH ER0", route: "R UW1 T", data: "D EY1 T AH0", tomato: "T AH0 M EY1 T OW2" };
const LETTER = {
  a: "EY1", b: "B IY1", c: "S IY1", d: "D IY1", e: "IY1", f: "EH1 F", g: "JH IY1", h: "EY1 CH", i: "AY1", j: "JH EY1",
  k: "K EY1", l: "EH1 L", m: "EH1 M", n: "EH1 N", o: "OW1", p: "P IY1", q: "K Y UW1", r: "AA1 R", s: "EH1 S", t: "T IY1",
  u: "Y UW1", v: "V IY1", w: "D AH1 B AH0 L Y UW0", x: "EH1 K S", y: "W AY1", z: "Z IY1"
};

export function parseArpa(s) {
  return String(s).trim().split(/\s+/).map(t => {
    const m = t.match(/^([A-Z]+)([012])?$/);
    return m && (V[m[1]] || C[m[1]]) ? { a: m[1], s: m[2] ? +m[2] : (V[m[1]] ? 0 : -1) } : null;
  }).filter(Boolean);
}

// Suite ARPAbet -> chaîne IPA : accent juste avant la voyelle, « t » battu américain (water -> wˈɔːɾɚ).
export function render(ph) {
  let out = "";
  for (let i = 0; i < ph.length; i++) {
    const { a, s } = ph[i], next = ph[i + 1], prev = ph[i - 1];
    if (V[a]) {
      const st = a === "IY" && s === 2 && i === ph.length - 1 ? 0 : s; // thirty, city : « i » final atone
      let v = V[a][st > 0 ? 1 : 0];
      if (a === "IH" && s === 0 && i === ph.length - 2 && (next.a === "D" || next.a === "Z")) v = "ᵻ"; // nested, oranges
      if (a === "ER" && next && V[next.a]) v += "ɹ"; // hurry, interesting
      out += (st === 1 ? "ˈ" : st === 2 ? "ˌ" : "") + v;
    } else {
      let c = C[a];
      if (a === "T" && prev && (V[prev.a] || prev.a === "R") && next && V[next.a] && next.s === 0) c = "ɾ"; // better, city
      out += c;
    }
  }
  return out;
}

function lastPhone(ph) { return ph.length ? ph[ph.length - 1].a : ""; }
const SIBIL = new Set(["S", "Z", "SH", "ZH", "CH", "JH"]), VOICELESS = new Set(["P", "T", "K", "F", "TH", "S", "SH", "CH", "HH"]);
function plural(ph) { const l = lastPhone(ph); return [...ph, ...(SIBIL.has(l) ? parseArpa("IH0 Z") : VOICELESS.has(l) ? parseArpa("S") : parseArpa("Z"))]; }
function past(ph) { const l = lastPhone(ph); return [...ph, ...(l === "T" || l === "D" ? parseArpa("IH0 D") : VOICELESS.has(l) ? parseArpa("T") : parseArpa("D"))]; }

function dictLookup(dict, w) {
  if (PREFER[w]) return parseArpa(PREFER[w]);
  const e = Object.prototype.hasOwnProperty.call(dict, w) ? dict[w] : null;
  return typeof e === "string" ? parseArpa(e) : null;
}

// Mots absents du dictionnaire : terminaisons courantes sur un mot connu, puis mots composés.
const SUFFIX = [
  ["'s", plural], ["s", plural], ["es", plural], ["ed", past], ["d", past],
  ["ing", p => [...p, ...parseArpa("IH0 NG")]], ["ly", p => [...p, ...parseArpa("L IY0")]],
  ["er", p => [...p, ...parseArpa("ER0")]], ["est", p => [...p, ...parseArpa("AH0 S T")]],
  ["ness", p => [...p, ...parseArpa("N AH0 S")]], ["ful", p => [...p, ...parseArpa("F AH0 L")]],
  ["less", p => [...p, ...parseArpa("L AH0 S")]], ["ment", p => [...p, ...parseArpa("M AH0 N T")]]
];
function morph(dict, w) {
  for (const [suf, fn] of SUFFIX) {
    if (w.length <= suf.length + 2 || !w.endsWith(suf)) continue;
    const base = w.slice(0, -suf.length);
    const cands = [base, base + "e"];
    if (/([bdgklmnprt])\1$/.test(base)) cands.push(base.slice(0, -1)); // running -> run
    if (base.endsWith("i")) cands.push(base.slice(0, -1) + "y"); // studies -> study
    for (const b of cands) { const p = dictLookup(dict, b); if (p) return fn(p); }
  }
  for (let k = w.length - 3; k >= 3; k--) { // weekend, homework
    const a = dictLookup(dict, w.slice(0, k)), b = a && dictLookup(dict, w.slice(k));
    if (a && b) return [...a, ...b.map(x => x.s === 1 ? { ...x, s: 2 } : x)];
  }
  return null;
}

// Dernier recours : règles de lecture simples (noms propres, mots inventés).
const GRAPH = [
  ["tion", "SH AH0 N"], ["sion", "ZH AH0 N"], ["ture", "CH ER0"], ["ough", "AO"], ["augh", "AO"], ["eigh", "EY"],
  ["igh", "AY"], ["tch", "CH"], ["sch", "S K"], ["ch", "CH"], ["sh", "SH"], ["th", "TH"], ["ph", "F"], ["wh", "W"],
  ["ck", "K"], ["ng", "NG"], ["qu", "K W"], ["gh", ""], ["ee", "IY"], ["ea", "IY"], ["oo", "UW"], ["ou", "AW"],
  ["ow", "OW"], ["ai", "EY"], ["ay", "EY"], ["oi", "OY"], ["oy", "OY"], ["au", "AO"], ["aw", "AO"], ["ie", "IY"],
  ["ei", "EY"], ["ey", "IY"], ["ew", "UW"], ["oa", "OW"], ["ue", "UW"], ["ar", "AA R"], ["or", "AO R"],
  ["er", "ER"], ["ir", "ER"], ["ur", "ER"]
];
const SHORT = { a: "AE", e: "EH", i: "IH", o: "AA", u: "AH" }, LONG = { a: "EY", e: "IY", i: "AY", o: "OW", u: "UW" };
const CONS = { b: "B", d: "D", f: "F", h: "HH", j: "JH", k: "K", l: "L", m: "M", n: "N", p: "P", r: "R", s: "S", t: "T", v: "V", w: "W", x: "K S", z: "Z", q: "K" };
export function letterToSound(word) {
  let w = word.replace(/[^a-z]/g, "");
  if (!w) return [];
  w = w.replace(/^kn/, "n").replace(/^wr/, "r").replace(/([b-df-hj-np-tv-z])\1/g, "$1");
  const silentE = w.length > 3 && /[^aeiou]e$/.test(w) && !/le$/.test(w);
  if (silentE) w = w.slice(0, -1);
  const out = [];
  for (let i = 0; i < w.length;) {
    const g = GRAPH.find(([k]) => w.startsWith(k, i));
    if (g) { if (g[1]) out.push(...g[1].split(" ")); i += g[0].length; continue; }
    const ch = w[i], nx = w[i + 1] || "";
    if (SHORT[ch]) {
      // voyelle longue avant « consonne + e muet » (make, time, home)
      const long = silentE && i === w.length - 2 && !SHORT[nx];
      out.push(long ? LONG[ch] : SHORT[ch]);
    } else if (ch === "y") out.push(i === 0 ? "Y" : i === w.length - 1 ? "IY" : "IH");
    else if (ch === "c") out.push(/[eiy]/.test(nx) ? "S" : "K");
    else if (ch === "g") out.push(/[eiy]/.test(nx) ? "JH" : "G");
    else if (CONS[ch]) out.push(...CONS[ch].split(" "));
    i++;
  }
  if (w.endsWith("le") && w.length > 3) out.splice(out.length - 2, 2, "AH", "L"); // table, little
  let stressed = false;
  return out.map(a => {
    if (!V[a]) return { a, s: -1 };
    const s = !stressed && !(a === "ER" && out.indexOf(a) === out.length - 1) ? 1 : 0;
    if (s) stressed = true;
    return { a, s };
  });
}

// Prononciation d'un mot (tel qu'écrit) -> IPA.
export function wordIpa(dict, raw) {
  const w = raw.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(FUNC, w)) return FUNC[w];
  let ph = dictLookup(dict, w);
  // Sigles en majuscules absents du dictionnaire : on épelle (BBC, USA)
  if (!ph && /^[A-Z]{2,5}$/.test(raw)) return w.split("").map(l => render(parseArpa(LETTER[l]))).join(" ");
  if (!ph) ph = morph(dict, w);
  if (!ph) ph = letterToSound(w);
  return render(ph);
}

// ---------- Normalisation du texte (nombres, symboles, abréviations) ----------
function intWords(n) { return n <= 999999999 ? numberWords(n) : String(n).split("").map(d => numberWords(+d)).join(" "); }
function digits(s) { return s.split("").map(d => numberWords(+d)).join(" "); }
const PLURAL_Y = s => s.endsWith("y") ? s.slice(0, -1) + "ies" : s + "s";

export function normalize(text) {
  return String(text).normalize("NFKC")
    .replace(/[‘’ʼ´`]/g, "'").replace(/[“”«»„]/g, '"').replace(/\.{3,}/g, "…")
    .replace(/\be\.g\./gi, "for example").replace(/\bi\.e\./gi, "that is").replace(/\betc\./gi, "et cetera")
    .replace(/\bMr\./g, "Mister").replace(/\bMrs\./g, "Missus").replace(/\bMs\./g, "Miz").replace(/\bDr\.(?= [A-Z])/g, "Doctor")
    .replace(/\bvs\.?(?= )/gi, "versus")
    .replace(/(\d),(?=\d{3}\b)/g, "$1")
    .replace(/([$£€])\s?(\d+)(?:\.(\d{1,2}))?/g, (m, c, a, b) => {
      const [one, many, sub] = c === "$" ? ["dollar", "dollars", "cents"] : c === "£" ? ["pound", "pounds", "pence"] : ["euro", "euros", "cents"];
      const n = +a, cents = b ? +b.padEnd(2, "0") : 0;
      return `${intWords(n)} ${n === 1 ? one : many}${cents ? ` and ${intWords(cents)} ${sub}` : ""}`;
    })
    .replace(/\b(\d{1,2}):(\d{2})\b/g, (m, h, mm) => +mm === 0 ? `${intWords(+h)} o'clock` : +mm < 10 ? `${intWords(+h)} oh ${intWords(+mm)}` : `${intWords(+h)} ${intWords(+mm)}`)
    .replace(/(\d+(?:\.\d+)?)\s?%/g, "$1 percent")
    .replace(/\b(\d+)(st|nd|rd|th)\b/gi, (m, n) => ordinalWords(+n))
    .replace(/(\d)\s?[-–]\s?(?=\d)/g, "$1 to ")
    .replace(/\b(\d+)\.(\d+)\b/g, (m, a, b) => `${intWords(+a)} point ${digits(b)}`)
    .replace(/\b(1[1-9]\d\d|20\d\d)(s)?\b/g, (m, y, s) => s ? PLURAL_Y(yearWords(+y)) : yearWords(+y))
    .replace(/\b\d+\b/g, m => intWords(+m))
    .replace(/&/g, " and ").replace(/\+/g, " plus ").replace(/=/g, " equals ").replace(/@/g, " at ")
    .replace(/\s+[-–]\s+/g, " — ").replace(/[()[\]{}]/g, ", ")
    .replace(/\s+/g, " ").trim();
}

// ---------- Phrase -> IPA ----------
const TOKEN = /[A-Za-z]+(?:'[A-Za-z]+)*|[.,!?;:—…"]/g;
export function phonemize(dict, text, normalized = false) {
  const t = normalized ? text : normalize(text);
  const toks = (t.match(TOKEN) || []);
  const words = [];
  for (const tok of toks) {
    if (/^[.,!?;:—…"]$/.test(tok)) { words.push({ p: tok }); continue; }
    words.push({ w: tok, ipa: wordIpa(dict, tok) });
  }
  let out = "", openQuote = false;
  for (let i = 0; i < words.length; i++) {
    const x = words[i];
    if (x.p) {
      if (x.p === '"') { openQuote = !openQuote; out += openQuote ? (out ? " " : "") + '"' : '"'; continue; }
      if (x.p === "—") { out += " —"; continue; }
      if (/[,;:]$/.test(out) && /[.!?]/.test(x.p)) { out = out.slice(0, -1) + x.p; continue; } // « (maybe). »
      if (/[.,!?;:…]$/.test(out) && x.p !== "…") continue; // ponctuation en double
      out += x.p; continue;
    }
    let ipa = x.ipa;
    const nextWord = words.slice(i + 1).find(y => y.w);
    const nextIsAdjacent = words[i + 1] && words[i + 1].w;
    const w = x.w.toLowerCase();
    if (w === "the" && nextIsAdjacent && VOWEL_START.test(nextWord.ipa)) ipa = "ði";
    if (w === "to" && !nextIsAdjacent) ipa = "tˈuː";
    if (w === "a" && x.w === "A" && !nextIsAdjacent) ipa = "ˈeɪ";
    const glue = !out || out.endsWith('"') && openQuote ? "" : " ";
    out += glue + ipa;
  }
  return out.replace(/\s+/g, " ").trim();
}

// Découpe en morceaux de taille raisonnable (le modèle accepte 510 symboles ; on reste bien en dessous
// pour une première phrase rapide et une prosodie stable).
export function chunks(dict, text, max = 380) {
  const t = normalize(text);
  if (!t) return [];
  const sentences = t.split(/(?<=[.!?…])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const out = [];
  for (const s of sentences) {
    const ph = phonemize(dict, s, true);
    if (!ph) continue;
    if (ph.length <= max) { out.push(ph); continue; }
    // trop long : on coupe aux virgules, puis par groupes de mots
    let cur = "";
    for (const part of s.split(/(?<=[,;:—])\s+/)) {
      const p = phonemize(dict, part, true);
      if (!p) continue;
      if (p.length > max) {
        if (cur) { out.push(cur); cur = ""; }
        let buf = "";
        for (const word of p.split(" ")) {
          if ((buf + " " + word).length > max && buf) { out.push(buf); buf = word; } else buf = buf ? buf + " " + word : word;
        }
        if (buf) out.push(buf);
      } else if ((cur + " " + p).length > max) { out.push(cur); cur = p; }
      else cur = cur ? cur + " " + p : p;
    }
    if (cur) out.push(cur);
  }
  return out;
}
