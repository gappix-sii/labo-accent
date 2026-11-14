// Phrases du premier écran, choisies pour les sons difficiles pour un Français.
// Elles servent aussi au protocole de test du moteur (PLAN.md, phase 1, tâche 7) :
// « fault » dit quelle faute faire exprès, « expect » quels sons doivent alors être signalés.
export const SENTENCES = [
  { en: "I think this is the third one.", fr: "Je pense que c'est le troisième.", focus: "th (θ et ð)",
    fault: "Dis « s » à la place de « th » : « I sink zis is ze sird one ».", expect: ["θ", "ð"] },
  { en: "He is happy in his house.", fr: "Il est heureux dans sa maison.", focus: "h soufflé",
    fault: "Ne prononce aucun « h » : « e is appy in is ouse ».", expect: ["h"] },
  { en: "Sit on the seat.", fr: "Assieds-toi sur le siège.", focus: "i court (ɪ) et i long (i)",
    fault: "Dis les deux « i » pareils, longs à la française : « siit on ze siit ».", expect: ["ɪ", "ð"] },
  { en: "I live here, I don't leave.", fr: "J'habite ici, je ne pars pas.", focus: "i court (ɪ) et i long (i)",
    fault: "Dis « live » comme « leave » (i long), et « ere » sans h.", expect: ["ɪ", "h"] },
  { en: "We want warm water.", fr: "On veut de l'eau chaude.", focus: "w (pas v)",
    fault: "Dis « v » à la place de « w » : « ve vant varm vater ».", expect: ["w"] },
  { en: "The red car is very far.", fr: "La voiture rouge est très loin.", focus: "r anglais",
    fault: "Fais des « r » français, roulés dans la gorge, et dis « ze ».", expect: ["ɹ", "ð"] },
  { en: "She watched the old cat.", fr: "Elle a regardé le vieux chat.", focus: "consonnes finales, æ",
    fault: "Avale les fins de mots : « She watch ze ol ca ».", expect: ["t", "d"] },
  { en: "Can I have a receipt?", fr: "Je peux avoir un reçu ?", focus: "t final",
    fault: "Ne prononce pas le « t » final de receipt, et dis « ave » sans h.", expect: ["t", "h"] },
  { en: "I'm hungry, not angry.", fr: "J'ai faim, je ne suis pas en colère.", focus: "h soufflé",
    fault: "Dis « hungry » sans h : « I'm ungry, not angry ».", expect: ["h"] },
  { en: "Good food is good for you.", fr: "La bonne nourriture est bonne pour toi.", focus: "ou court (ʊ) et ou long (u)",
    fault: "Dis tous les « ou » pareils, longs : « goud foud is goud for you ».", expect: ["ʊ"] }
];
