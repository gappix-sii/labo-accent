// Exercice d'écoute par paires de mots (phase 3) : logique pure, sans DOM (test/listening.test.mjs).
// Une séance = QUESTIONS questions ; pour chacune, une paire et le mot joué (a ou b).
// Les paires ratées reviennent plus souvent : chaque erreur ajoute du poids, chaque réussite en retire.
export const QUESTIONS = 10;
const MISS_MAX = 5, WEIGHT_PER_MISS = 2;

export function newListening() { return { v: 1, miss: {} }; }

// Tire `n` questions sans répéter une paire ; rnd() renvoie un nombre dans [0, 1) (Math.random en vrai).
export function pickQuestions(L, pairs, rnd = Math.random, n = QUESTIONS) {
  const pool = pairs.map((p) => ({ p, w: 1 + WEIGHT_PER_MISS * (Object.hasOwn(L.miss, p.id) ? L.miss[p.id] : 0) }));
  const out = [];
  while (out.length < n && pool.length) {
    let r = rnd() * pool.reduce((a, x) => a + x.w, 0), k = 0;
    while (k < pool.length - 1 && r >= pool[k].w) { r -= pool[k].w; k++; }
    const [{ p }] = pool.splice(k, 1);
    out.push({ pair: p, side: rnd() < 0.5 ? "a" : "b" });
  }
  return out;
}

// Réponse à une question : la paire ratée prend du poids, réussie elle en perd.
export function recordPair(L, id, ok) {
  const n = Object.hasOwn(L.miss, id) ? L.miss[id] : 0;
  const m = ok ? Math.max(0, n - 1) : Math.min(MISS_MAX, n + 1);
  if (m) L.miss[id] = m; else delete L.miss[id];
}

const PAIR_ID = /^[a-z]{1,20}-[a-z]{1,20}$/;
export function sanitizeListening(raw) {
  const L = newListening();
  if (!raw || typeof raw !== "object" || raw.v !== 1 || !raw.miss || typeof raw.miss !== "object") return L;
  for (const id of Object.keys(raw.miss).filter((k) => PAIR_ID.test(k)).slice(0, 200)) {
    const n = raw.miss[id];
    if (Number.isInteger(n) && n >= 1 && n <= MISS_MAX) L.miss[id] = n;
  }
  return L;
}
