// Les bases (phase 10, tâche 1) : mots-questions, jours, mois, saisons, nombres, ordinaux et dates.
// Contenu repris de l'ancienne appli (ancien/js/basics.js, contenu original), découpé en 14 leçons du parcours,
// chacune rangée en fin d'une région, avant son boss (« region »).
// pron : prononciation écrite « à la française », la syllabe accentuée en MAJUSCULES (« th » = langue entre les dents) ;
// note : le piège à connaître ; ex : un exemple [anglais, français], affiché sous le mot.
// Le moteur ne lit pas les chiffres : les nombres et les dates à dire sont écrits en lettres (le chiffre est dans fr).

export const BASIC_LESSONS = [
  { id: "b-wh", kind: "basics", region: "couple", icon: "❓", title: "Les 8 mots-questions",
    sub: "« wh » se dit « ou » (what = « ouot »), sauf dans who et whose où c'est un h soufflé (« hou »).",
    items: [
    { en: "what", fr: "quoi, que, quel", pron: "OUOT", note: "Pour une chose. Veut aussi dire « quel » : What time? What colour?", ex: ["What is your name?","Comment tu t'appelles ?"] },
    { en: "who", fr: "qui", pron: "HOU", note: "Le w est muet : « hou ».", ex: ["Who is your best friend?","Qui est ton meilleur ami ?"] },
    { en: "where", fr: "où", pron: "OUÈR", note: "Ne pas confondre avec were (« oueur »).", ex: ["Where do you live?","Où habites-tu ?"] },
    { en: "when", fr: "quand", pron: "OUÈN", ex: ["When is your birthday?","C'est quand, ton anniversaire ?"] },
    { en: "why", fr: "pourquoi", pron: "OUAÏ", note: "On répond avec because (parce que).", ex: ["Why are you late?","Pourquoi es-tu en retard ?"] },
    { en: "how", fr: "comment", pron: "HAOU", note: "Le h se souffle.", ex: ["How do you say this in English?","Comment on dit ça en anglais ?"] },
    { en: "which", fr: "lequel, quel (dans un choix)", pron: "OUITCH", note: "Quand on choisit parmi quelques possibilités : Which one? (lequel ?)", ex: ["Which bus goes to the airport?","Quel bus va à l'aéroport ?"] },
    { en: "whose", fr: "à qui", pron: "HOUZ", note: "Se prononce comme who's (who is).", ex: ["Whose phone is this?","À qui est ce téléphone ?"] }
    ] },
  { id: "b-how", kind: "basics", region: "couple", icon: "❓", title: "Les questions avec How",
    sub: "L'ordre : mot-question + auxiliaire (do, does, did, can…) + sujet + verbe. Where do you live? (jamais « Where you live? »).",
    items: [
    { en: "how much", fr: "combien (quantité, prix)", pron: "haou MEUTCH", note: "Pour ce qui ne se compte pas (money, water, time) et pour un prix.", ex: ["How much is this coffee?","Combien coûte ce café ?"] },
    { en: "how many", fr: "combien (nombre)", pron: "haou MÈ-ni", note: "Pour ce qui se compte, au pluriel : people, days.", ex: ["How many brothers do you have?","Combien de frères as-tu ?"] },
    { en: "how old", fr: "quel âge", pron: "haou ÔLD", note: "On répond : I'm thirty (years old).", ex: ["How old are you?","Quel âge as-tu ?"] },
    { en: "how long", fr: "combien de temps", pron: "haou LONG", ex: ["How long is the film?","Combien de temps dure le film ?"] },
    { en: "how often", fr: "à quelle fréquence", pron: "haou O-feun", note: "Le t est souvent muet : « o-feun ».", ex: ["How often do you play football?","Tu joues au foot tous les combien ?"] },
    { en: "how far", fr: "à quelle distance", pron: "haou FAR", ex: ["How far is the beach?","La plage est à quelle distance ?"] }
    ] },
  { id: "b-months-1", kind: "basics", region: "travel", icon: "📅", title: "Les mois (1/2)",
    sub: "« En janvier » = in January : on met « in » devant le mois.",
    items: [
    { en: "January", fr: "janvier", pron: "DJAN-iou-è-ri", note: "J anglais = « dj ». En anglais britannique : « DJAN-iou-eu-ri »." },
    { en: "February", fr: "février", pron: "FÈB-rou-è-ri", note: "Beaucoup d'Anglais disent « FÈB-iou-è-ri » : les deux sont corrects." },
    { en: "March", fr: "mars", pron: "MARTCH", note: "Le « ch » se dit « tch »." },
    { en: "April", fr: "avril", pron: "ÉÏ-preul", note: "Le A se dit « éï », comme la lettre A en anglais." },
    { en: "May", fr: "mai", pron: "MÉÏ" },
    { en: "June", fr: "juin", pron: "DJOUN" }
    ] },
  { id: "b-months-2", kind: "basics", region: "travel", icon: "📅", title: "Les mois (2/2)",
    sub: "July a l'accent à la fin (« djou-LAÏ ») ; les autres l'ont plutôt au début ou au milieu.",
    items: [
    { en: "July", fr: "juillet", pron: "djou-LAÏ", note: "Accent à la fin, contrairement à June." },
    { en: "August", fr: "août", pron: "O-gueust", note: "Le « au » se dit « o » ouvert." },
    { en: "September", fr: "septembre", pron: "sèp-TÈM-beur" },
    { en: "October", fr: "octobre", pron: "ok-TÔ-beur" },
    { en: "November", fr: "novembre", pron: "nô-VÈM-beur" },
    { en: "December", fr: "décembre", pron: "di-SÈM-beur", note: "Le De se dit « di »." }
    ] },
  { id: "b-days", kind: "basics", region: "daily", icon: "📅", title: "Les 7 jours",
    sub: "« Lundi » = Monday, mais « le lundi / ce lundi » = on Monday : on met « on » devant le jour.",
    items: [
    { en: "Monday", fr: "lundi", pron: "MEUN-dé", note: "« Mon » se dit « meun », pas « mon »." },
    { en: "Tuesday", fr: "mardi", pron: "TIOUZ-dé", note: "Le s se dit z. En américain : « TOUZ-dé »." },
    { en: "Wednesday", fr: "mercredi", pron: "OUÈNZ-dé", note: "Le premier d est muet : 2 syllabes, pas « ouèd-nèss-dé »." },
    { en: "Thursday", fr: "jeudi", pron: "THEURZ-dé", note: "Th : langue entre les dents, comme un s soufflé." },
    { en: "Friday", fr: "vendredi", pron: "FRAÏ-dé", note: "Le i se dit « aï »." },
    { en: "Saturday", fr: "samedi", pron: "SA-teur-dé", note: "Le a est très ouvert, presque « è »." },
    { en: "Sunday", fr: "dimanche", pron: "SEUN-dé", note: "Comme « sun » (soleil) : « seun »." }
    ] },
  { id: "b-week", kind: "basics", region: "daily", icon: "📅", title: "Autour de la semaine",
    sub: "La fin « -day » se dit « dé » (souvent « di » quand on parle vite).",
    items: [
    { en: "today", fr: "aujourd'hui", pron: "teu-DÉ" },
    { en: "tomorrow", fr: "demain", pron: "teu-MO-rô" },
    { en: "yesterday", fr: "hier", pron: "YÈS-teur-dé" },
    { en: "week", fr: "semaine", pron: "OUIIK", note: "« ee » = i long et souriant." },
    { en: "weekend", fr: "week-end", pron: "OUIIK-ènd" },
    { en: "every day", fr: "tous les jours", pron: "ÈV-ri DÉ" }
    ] },
  { id: "b-ordinals", kind: "basics", region: "past", icon: "🥇", title: "Les ordinaux",
    sub: "Pour les dates, on utilise les ordinaux : the first (1st), the second (2nd), the third (3rd), puis -th : the fourth (4th).",
    items: [
    { en: "first", fr: "1er (1st)", pron: "FEURST" },
    { en: "second", fr: "2e (2nd)", pron: "SÈ-keund" },
    { en: "third", fr: "3e (3rd)", pron: "THEURD", note: "Th : langue entre les dents." },
    { en: "fourth", fr: "4e (4th)", pron: "FORTH" },
    { en: "fifth", fr: "5e (5th)", pron: "FIFTH", note: "Five devient « fif » + th." },
    { en: "eighth", fr: "8e (8th)", pron: "ÉÏTTH", note: "Un seul t à l'écrit : eighth." },
    { en: "ninth", fr: "9e (9th)", pron: "NAÏNTH", note: "Pas de e : ninth." },
    { en: "twelfth", fr: "12e (12th)", pron: "TOUÈLFTH", note: "Le v devient f : twelfth." },
    { en: "twentieth", fr: "20e (20th)", pron: "TOUÈN-ti-eth", note: "Le y devient ie : twentieth." },
    { en: "twenty-first", fr: "21e (21st)", pron: "touèn-ti-FEURST" },
    { en: "thirty-first", fr: "31e (31st)", pron: "theur-ti-FEURST" }
    ] },
  { id: "b-dates", kind: "basics", region: "past", icon: "📅", title: "Dire une date",
    sub: "Royaume-Uni : « the first of May » (écrit 1 May). États-Unis : « May first » (écrit May 1). Les années se coupent en deux : 2026 = twenty twenty-six, 1995 = nineteen ninety-five. Mais 2005 = two thousand and five.",
    items: [
    { en: "the first of May", fr: "le 1er mai (R.-U.)", pron: "the FEURST ov MÉÏ", note: "« of » se dit « ov », très court." },
    { en: "May first", fr: "le 1er mai (É.-U.)", pron: "MÉÏ FEURST" },
    { en: "twenty twenty-six", fr: "2026", pron: "TOUÈN-ti touèn-ti-SIKS" },
    { en: "nineteen ninety-five", fr: "1995", pron: "naïn-TIIN naïn-ti-FAÏV" },
    { en: "two thousand and five", fr: "2005", pron: "tou THAOU-zeund eunn FAÏV" }
    ] },
  { id: "b-num-1", kind: "basics", region: "work", icon: "🔢", title: "Les nombres de 0 à 12",
    sub: "Hundred, thousand et million ne prennent pas de s : two hundred, five thousand.",
    items: [
    { en: "zero", fr: "0", pron: "ZI-rô", note: "Au téléphone, on dit souvent « oh » (ô)." },
    { en: "one", fr: "1", pron: "OUANN", note: "Se prononce comme « won », pas « one » à la française." },
    { en: "two", fr: "2", pron: "TOU", note: "Le w est muet." },
    { en: "three", fr: "3", pron: "THRII", note: "Th : langue entre les dents. Pas « tri », pas « fri »." },
    { en: "four", fr: "4", pron: "FOR" },
    { en: "five", fr: "5", pron: "FAÏV", note: "Le v final se fait entendre." },
    { en: "six", fr: "6", pron: "SIKS" },
    { en: "seven", fr: "7", pron: "SÈ-veun" },
    { en: "eight", fr: "8", pron: "ÉÏT", note: "Le « gh » est muet." },
    { en: "nine", fr: "9", pron: "NAÏN" },
    { en: "ten", fr: "10", pron: "TÈN" },
    { en: "eleven", fr: "11", pron: "i-LÈ-veun" },
    { en: "twelve", fr: "12", pron: "TOUÈLV" }
    ] },
  { id: "b-num-2", kind: "basics", region: "work", icon: "🔢", title: "Les nombres de 13 à 19",
    sub: "Le grand piège : -teen (13 à 19) a l'accent à la FIN et un i long : thirTEEN. -ty (20, 30…) a l'accent au DÉBUT : THIRty.",
    items: [
    { en: "thirteen", fr: "13", pron: "theur-TIIN", note: "Ne pas confondre avec thirty (30) : ici l'accent est à la fin." },
    { en: "fourteen", fr: "14", pron: "for-TIIN" },
    { en: "fifteen", fr: "15", pron: "fif-TIIN", note: "Five devient « fif »." },
    { en: "sixteen", fr: "16", pron: "siks-TIIN" },
    { en: "seventeen", fr: "17", pron: "sè-veun-TIIN" },
    { en: "eighteen", fr: "18", pron: "éï-TIIN", note: "Un seul t." },
    { en: "nineteen", fr: "19", pron: "naïn-TIIN" }
    ] },
  { id: "b-num-3", kind: "basics", region: "out", icon: "🔢", title: "Les dizaines",
    sub: "Le grand piège : -teen (13 à 19) a l'accent à la FIN et un i long : thirTEEN. -ty (20, 30…) a l'accent au DÉBUT : THIRty.",
    items: [
    { en: "twenty", fr: "20", pron: "TOUÈN-ti" },
    { en: "thirty", fr: "30", pron: "THEUR-ti", note: "En américain, le t se dit presque d : « THEUR-di »." },
    { en: "forty", fr: "40", pron: "FOR-ti", note: "S'écrit sans u : forty, pas « fourty »." },
    { en: "fifty", fr: "50", pron: "FIF-ti" },
    { en: "sixty", fr: "60", pron: "SIKS-ti" },
    { en: "seventy", fr: "70", pron: "SÈ-veun-ti", note: "Pas de « soixante-dix » : 70 a son propre mot." },
    { en: "eighty", fr: "80", pron: "ÉÏ-ti", note: "Pas de « quatre-vingts » : eighty." },
    { en: "ninety", fr: "90", pron: "NAÏN-ti" }
    ] },
  { id: "b-num-4", kind: "basics", region: "out", icon: "🔢", title: "Les grands nombres",
    sub: "On compose avec un tiret : twenty-one, forty-five. Après hundred, les Britanniques ajoutent « and » : one hundred and five.",
    items: [
    { en: "twenty-one", fr: "21", pron: "touèn-ti-OUANN" },
    { en: "forty-five", fr: "45", pron: "for-ti-FAÏV" },
    { en: "ninety-nine", fr: "99", pron: "naïn-ti-NAÏN" },
    { en: "one hundred", fr: "100", pron: "ouann HEUN-dreud", note: "On dit aussi « a hundred »." },
    { en: "one hundred and five", fr: "105", pron: "ouann HEUN-dreud eunn FAÏV", note: "« and » se dit très faiblement : « eunn »." },
    { en: "two hundred and fifty", fr: "250", pron: "tou HEUN-dreud eunn FIF-ti" },
    { en: "one thousand", fr: "1 000", pron: "ouann THAOU-zeund", note: "Th : langue entre les dents. S'écrit 1,000." },
    { en: "one million", fr: "1 000 000", pron: "ouann MI-lieun", note: "S'écrit 1,000,000." }
    ] },
  { id: "b-everyday", kind: "basics", region: "health", icon: "💬", title: "Les questions de tous les jours",
    sub: "La voix descend à la fin d'une question en Wh- (Where do you live? ↘) et monte pour une question oui/non (Do you live here? ↗).",
    items: [
    { en: "What time is it?", fr: "Quelle heure est-il ?", pron: "ouot TAÏM iz it" },
    { en: "Where are you from?", fr: "D'où viens-tu ?", pron: "ouèr ar iou FROM", note: "On répond : I'm from France." },
    { en: "How are you?", fr: "Comment vas-tu ?", pron: "haou AR iou", note: "On répond : I'm fine, thanks. And you?" },
    { en: "What do you do?", fr: "Qu'est-ce que tu fais dans la vie ?", pron: "ouot dou iou DOU", note: "C'est une question sur le métier, pas sur ce que tu fais en ce moment." },
    { en: "What does it mean?", fr: "Qu'est-ce que ça veut dire ?", pron: "ouot deuz it MIIN" },
    { en: "Can you repeat, please?", fr: "Tu peux répéter, s'il te plaît ?", pron: "kann iou ri-PIIT, PLIIZ", note: "Très utile quand on n'a pas compris !" }
    ] },
  { id: "b-seasons", kind: "basics", region: "fun", icon: "🍂", title: "Les saisons",
    sub: "En américain, l'automne se dit aussi « fall ».",
    items: [
    { en: "spring", fr: "printemps", pron: "SPRING", note: "Le ng final ne se prononce pas « gue »." },
    { en: "summer", fr: "été", pron: "SEU-meur" },
    { en: "autumn", fr: "automne", pron: "O-teum", note: "Le n final est muet. En américain on dit aussi « fall »." },
    { en: "winter", fr: "hiver", pron: "OUIN-teur" },
    { en: "month", fr: "mois", pron: "MEUNTH", note: "Th final : langue entre les dents." },
    { en: "year", fr: "année", pron: "YIIR" }
    ] }
];
