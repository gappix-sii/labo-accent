// Paires de mots pour l'exercice d'écoute (phase 3) : deux mots qui ne diffèrent que par un son,
// choisis parmi les sons que les Français confondent. Un mot est joué, on choisit lequel.
// [mot A, sens, mot B, sens, sons qui changent « A|B » (« - » : son absent)]. Les 15 premières viennent
// de l'ancienne appli (ancien/js/content.js) ; test/vocab.test.mjs vérifie qu'un seul son change.
const RAW = [
  ["ship", "bateau", "sheep", "mouton", "ɪ|i"],
  ["live", "vivre", "leave", "partir", "ɪ|i"],
  ["sit", "s'asseoir", "seat", "siège", "ɪ|i"],
  ["fill", "remplir", "feel", "ressentir", "ɪ|i"],
  ["chip", "frite, puce", "cheap", "pas cher", "ɪ|i"],
  ["think", "penser", "sink", "évier, couler", "θ|s"],
  ["thing", "chose", "sing", "chanter", "θ|s"],
  ["thank", "remercier", "sank", "a coulé", "θ|s"],
  ["mouth", "bouche", "mouse", "souris", "θ|s"],
  ["three", "trois", "tree", "arbre", "θ|t"],
  ["thin", "mince", "tin", "étain, boîte", "θ|t"],
  ["bath", "bain", "bat", "batte, chauve-souris", "θ|t"],
  ["this", "ceci", "dis", "manquer de respect (argot)", "ð|d"],
  ["then", "ensuite", "den", "tanière", "ð|d"],
  ["they", "ils, elles", "day", "jour", "ð|d"],
  ["breathe", "respirer", "breeze", "brise", "ð|z"],
  ["heat", "chaleur", "eat", "manger", "h|-"],
  ["hair", "cheveux", "air", "air", "h|-"],
  ["hill", "colline", "ill", "malade", "h|-"],
  ["hold", "tenir", "old", "vieux", "h|-"],
  ["bad", "mauvais", "bed", "lit", "æ|ɛ"],
  ["cat", "chat", "cut", "couper", "æ|ə"],
  ["hat", "chapeau", "hut", "cabane", "æ|ə"],
  ["full", "plein", "fool", "idiot", "ʊ|u"],
  ["pull", "tirer", "pool", "piscine", "ʊ|u"],
  ["west", "ouest", "vest", "gilet", "w|v"],
  ["wine", "vin", "vine", "vigne", "w|v"],
  ["walk", "marcher", "work", "travailler", "ɑ|ɝ"],
  ["sing", "chanter", "sin", "péché", "ŋ|n"],
  ["share", "partager", "chair", "chaise", "ʃ|ʧ"],
  ["wash", "laver", "watch", "regarder, montre", "ʃ|ʧ"],
  ["price", "prix", "prize", "récompense", "s|z"]
];

export const PAIRS = RAW.map(([a, fa, b, fb, sounds]) => ({ id: `${a}-${b}`, a: { en: a, fr: fa }, b: { en: b, fr: fb }, sounds }));
export const pairById = (id) => PAIRS.find((p) => p.id === id) || null;
