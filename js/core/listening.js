// Exercice d'écoute par paires de mots (phase 3) : logique pure, sans DOM (test/listening.test.mjs).
// Une séance = QUESTIONS questions ; pour chacune, une paire et le mot joué (a ou b).
// Les paires ratées reviennent plus souvent : chaque erreur ajoute du poids, chaque réussite en retire.
export const QUESTIONS = 10;
const MISS_MAX = 5, WEIGHT_PER_MISS = 2;

export function newListening() { return { v: 1, miss: {} }; }

// Tirage pondéré sans remise, partagé avec les fautes typiques (js/core/tracks.js) :
// un élément pèse 1 + 2 par erreur retenue dans `miss`. rnd() renvoie un nombre dans [0, 1).
export function weightedPick(miss, items, idOf, rnd = Math.random, n = QUESTIONS) {
  const pool = items.map((x) => ({ x, w: 1 + WEIGHT_PER_MISS * (Object.hasOwn(miss, idOf(x)) ? miss[idOf(x)] : 0) }));
  const out = [];
  while (out.length < n && pool.length) {
    let r = rnd() * pool.reduce((a, p) => a + p.w, 0), k = 0;
    while (k < pool.length - 1 && r >= pool[k].w) { r -= pool[k].w; k++; }
    out.push(pool.splice(k, 1)[0].x);
  }
  return out;
}

// Une réponse : ratée, l'élément prend du poids (plafonné) ; réussie, il en perd.
export function bumpMiss(miss, id, ok) {
  const n = Object.hasOwn(miss, id) ? miss[id] : 0;
  const m = ok ? Math.max(0, n - 1) : Math.min(MISS_MAX, n + 1);
  if (m) miss[id] = m; else delete miss[id];
}

// Relecture des erreurs retenues : identifiants conformes à `idRe`, poids entier de 1 à MISS_MAX.
// known(id) : l'élément existe-t-il encore ? (sinon il est oublié et n'occupe pas la limite)
export function cleanMiss(raw, idRe, max = 200, known = () => true) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const id of Object.keys(raw).filter((k) => idRe.test(k) && known(k)).slice(0, max)) {
    const n = raw[id];
    if (Number.isInteger(n) && n >= 1 && n <= MISS_MAX) out[id] = n;
  }
  return out;
}

// Tire `n` questions sans répéter une paire ; le mot joué est a ou b au hasard.
export function pickQuestions(L, pairs, rnd = Math.random, n = QUESTIONS) {
  return weightedPick(L.miss, pairs, (p) => p.id, rnd, n).map((pair) => ({ pair, side: rnd() < 0.5 ? "a" : "b" }));
}

// Réponse à une question : la paire ratée prend du poids, réussie elle en perd.
export const recordPair = (L, id, ok) => bumpMiss(L.miss, id, ok);

const PAIR_ID = /^[a-z]{1,20}-[a-z]{1,20}$/;
export function sanitizeListening(raw) {
  const L = newListening();
  if (!raw || typeof raw !== "object" || raw.v !== 1) return L;
  L.miss = cleanMiss(raw.miss, PAIR_ID);
  return L;
}
