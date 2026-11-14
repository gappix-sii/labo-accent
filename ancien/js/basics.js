// Les bases : jours, mois, nombres, ordinaux et dates. Contenu original.
// pron : prononciation écrite « à la française », la syllabe accentuée en MAJUSCULES (« th » = langue entre les dents).
// note : le piège à connaître ; ex : un exemple [anglais, français]. Les phrases servent à l'entraînement au micro.

const it = (en, fr, pron, note = "", ex = null) => ({ en, fr, pron, note, ex });

export const BASICS = [
  { id: "questions", title: "Les mots-questions", short: "Questions", sub: "What, Where, When, How… pour poser toutes tes questions",
    tips: [
      "L'ordre : mot-question + auxiliaire (do, does, did, can…) + sujet + verbe. Where do you live? (jamais « Where you live? »).",
      "Avec be, pas de do : Where is the station? How are you?",
      "Quand who ou what est le sujet, pas de do non plus : Who called you?",
      "« wh » se dit « ou » (what = « ouot »), sauf dans who et whose où c'est un h soufflé (« hou »).",
      "La voix descend à la fin d'une question en Wh- (Where do you live? ↘) et monte pour une question oui/non (Do you live here? ↗)."
    ],
    groups: [
      { title: "Les 8 mots-questions", items: [
        it("what", "quoi, que, quel", "OUOT", "Pour une chose. Veut aussi dire « quel » : What time? What colour?", ["What is your name?", "Comment tu t'appelles ?"]),
        it("who", "qui", "HOU", "Le w est muet : « hou ».", ["Who is your best friend?", "Qui est ton meilleur ami ?"]),
        it("where", "où", "OUÈR", "Ne pas confondre avec were (« oueur »).", ["Where do you live?", "Où habites-tu ?"]),
        it("when", "quand", "OUÈN", "", ["When is your birthday?", "C'est quand, ton anniversaire ?"]),
        it("why", "pourquoi", "OUAÏ", "On répond avec because (parce que).", ["Why are you late?", "Pourquoi es-tu en retard ?"]),
        it("how", "comment", "HAOU", "Le h se souffle.", ["How do you say this in English?", "Comment on dit ça en anglais ?"]),
        it("which", "lequel, quel (dans un choix)", "OUITCH", "Quand on choisit parmi quelques possibilités : Which one? (lequel ?)", ["Which bus goes to the airport?", "Quel bus va à l'aéroport ?"]),
        it("whose", "à qui", "HOUZ", "Se prononce comme who's (who is).", ["Whose phone is this?", "À qui est ce téléphone ?"]),
      ] },
      { title: "Les questions avec How", items: [
        it("how much", "combien (quantité, prix)", "haou MEUTCH", "Pour ce qui ne se compte pas (money, water, time) et pour un prix.", ["How much is this coffee?", "Combien coûte ce café ?"]),
        it("how many", "combien (nombre)", "haou MÈ-ni", "Pour ce qui se compte, au pluriel : people, days.", ["How many brothers do you have?", "Combien de frères as-tu ?"]),
        it("how old", "quel âge", "haou ÔLD", "On répond : I'm thirty (years old).", ["How old are you?", "Quel âge as-tu ?"]),
        it("how long", "combien de temps", "haou LONG", "", ["How long is the film?", "Combien de temps dure le film ?"]),
        it("how often", "à quelle fréquence", "haou O-feun", "Le t est souvent muet : « o-feun ».", ["How often do you play football?", "Tu joues au foot tous les combien ?"]),
        it("how far", "à quelle distance", "haou FAR", "", ["How far is the beach?", "La plage est à quelle distance ?"]),
      ] },
      { title: "Les questions de tous les jours", items: [
        it("What time is it?", "Quelle heure est-il ?", "ouot TAÏM iz it"),
        it("Where are you from?", "D'où viens-tu ?", "ouèr ar iou FROM", "On répond : I'm from France."),
        it("How are you?", "Comment vas-tu ?", "haou AR iou", "On répond : I'm fine, thanks. And you?"),
        it("What do you do?", "Qu'est-ce que tu fais dans la vie ?", "ouot dou iou DOU", "C'est une question sur le métier, pas sur ce que tu fais en ce moment."),
        it("What does it mean?", "Qu'est-ce que ça veut dire ?", "ouot deuz it MIIN"),
        it("Can you repeat, please?", "Tu peux répéter, s'il te plaît ?", "kann iou ri-PIIT, PLIIZ", "Très utile quand on n'a pas compris !"),
      ] }
    ],
    quiz: "order",
    sentences: [
      ["Where do you live?", "Où habites-tu ?"],
      ["What do you want to eat?", "Qu'est-ce que tu veux manger ?"],
      ["When does the train leave?", "Quand part le train ?"],
      ["Why is she so happy?", "Pourquoi est-elle si heureuse ?"],
      ["Who wants a coffee?", "Qui veut un café ?"],
      ["Which one do you prefer?", "Lequel préfères-tu ?"],
      ["How much does it cost?", "Combien ça coûte ?"],
      ["How many people are coming?", "Combien de personnes viennent ?"],
      ["How long have you lived here?", "Depuis combien de temps habites-tu ici ?"]
    ] },
  { id: "days", title: "Jours de la semaine", short: "Jours", sub: "Monday, Tuesday… et parler de ta semaine",
    tips: [
      "Toujours une majuscule : Monday, Friday.",
      "La fin « -day » se dit « dé » (souvent « di » quand on parle vite).",
      "« Lundi » = Monday, mais « le lundi / ce lundi » = on Monday : on met « on » devant le jour."
    ],
    groups: [
      { title: "Les 7 jours", items: [
        it("Monday", "lundi", "MEUN-dé", "« Mon » se dit « meun », pas « mon »."),
        it("Tuesday", "mardi", "TIOUZ-dé", "Le s se dit z. En américain : « TOUZ-dé »."),
        it("Wednesday", "mercredi", "OUÈNZ-dé", "Le premier d est muet : 2 syllabes, pas « ouèd-nèss-dé »."),
        it("Thursday", "jeudi", "THEURZ-dé", "Th : langue entre les dents, comme un s soufflé."),
        it("Friday", "vendredi", "FRAÏ-dé", "Le i se dit « aï »."),
        it("Saturday", "samedi", "SA-teur-dé", "Le a est très ouvert, presque « è »."),
        it("Sunday", "dimanche", "SEUN-dé", "Comme « sun » (soleil) : « seun »."),
      ] },
      { title: "Autour de la semaine", items: [
        it("today", "aujourd'hui", "teu-DÉ"),
        it("tomorrow", "demain", "teu-MO-rô"),
        it("yesterday", "hier", "YÈS-teur-dé"),
        it("week", "semaine", "OUIIK", "« ee » = i long et souriant."),
        it("weekend", "week-end", "OUIIK-ènd"),
        it("every day", "tous les jours", "ÈV-ri DÉ"),
      ] }
    ],
    quiz: "choice",
    sentences: [
      ["Today is Monday.", "Aujourd'hui, c'est lundi."],
      ["What day is it today?", "On est quel jour aujourd'hui ?"],
      ["I work from Monday to Friday.", "Je travaille du lundi au vendredi."],
      ["See you on Wednesday!", "À mercredi !"],
      ["I play football on Thursday evenings.", "Je joue au foot le jeudi soir."],
      ["We have a party on Saturday night.", "On fait une fête samedi soir."],
      ["Sunday is my day off.", "Le dimanche, c'est mon jour de repos."]
    ] },

  { id: "months", title: "Mois de l'année", short: "Mois", sub: "January, February… et les saisons",
    tips: [
      "Toujours une majuscule : January, July.",
      "« En janvier » = in January : on met « in » devant le mois.",
      "July a l'accent à la fin (« djou-LAÏ ») ; les autres l'ont plutôt au début ou au milieu."
    ],
    groups: [
      { title: "Les 12 mois", items: [
        it("January", "janvier", "DJAN-iou-è-ri", "J anglais = « dj ». En anglais britannique : « DJAN-iou-eu-ri »."),
        it("February", "février", "FÈB-rou-è-ri", "Beaucoup d'Anglais disent « FÈB-iou-è-ri » : les deux sont corrects."),
        it("March", "mars", "MARTCH", "Le « ch » se dit « tch »."),
        it("April", "avril", "ÉÏ-preul", "Le A se dit « éï », comme la lettre A en anglais."),
        it("May", "mai", "MÉÏ"),
        it("June", "juin", "DJOUN"),
        it("July", "juillet", "djou-LAÏ", "Accent à la fin, contrairement à June."),
        it("August", "août", "O-gueust", "Le « au » se dit « o » ouvert."),
        it("September", "septembre", "sèp-TÈM-beur"),
        it("October", "octobre", "ok-TÔ-beur"),
        it("November", "novembre", "nô-VÈM-beur"),
        it("December", "décembre", "di-SÈM-beur", "Le De se dit « di »."),
      ] },
      { title: "Les saisons", items: [
        it("spring", "printemps", "SPRING", "Le ng final ne se prononce pas « gue »."),
        it("summer", "été", "SEU-meur"),
        it("autumn", "automne", "O-teum", "Le n final est muet. En américain on dit aussi « fall »."),
        it("winter", "hiver", "OUIN-teur"),
        it("month", "mois", "MEUNTH", "Th final : langue entre les dents."),
        it("year", "année", "YIIR"),
      ] }
    ],
    quiz: "choice",
    sentences: [
      ["My birthday is in July.", "Mon anniversaire est en juillet."],
      ["It's cold in January and February.", "Il fait froid en janvier et en février."],
      ["We go on holiday in August.", "On part en vacances en août."],
      ["School starts in September.", "L'école commence en septembre."],
      ["Christmas is in December.", "Noël est en décembre."],
      ["The weather is nice in May and June.", "Il fait beau en mai et en juin."],
      ["I love spring and autumn.", "J'adore le printemps et l'automne."]
    ] },

  { id: "numbers", title: "Les nombres", short: "Nombres", sub: "De zéro à un million",
    tips: [
      "Le grand piège : -teen (13 à 19) a l'accent à la FIN et un i long : thirTEEN. -ty (20, 30…) a l'accent au DÉBUT : THIRty.",
      "On compose avec un tiret : twenty-one, forty-five. Après hundred, les Britanniques ajoutent « and » : one hundred and five.",
      "Hundred, thousand et million ne prennent pas de s : two hundred, five thousand.",
      "À l'écrit, c'est l'inverse du français : 1,000 (mille, avec une virgule) et 3.5 (trois virgule cinq, avec un point, « three point five »)."
    ],
    groups: [
      { title: "De 0 à 12", items: [
        it("zero", "0", "ZI-rô", "Au téléphone, on dit souvent « oh » (ô)."),
        it("one", "1", "OUANN", "Se prononce comme « won », pas « one » à la française."),
        it("two", "2", "TOU", "Le w est muet."),
        it("three", "3", "THRII", "Th : langue entre les dents. Pas « tri », pas « fri »."),
        it("four", "4", "FOR"),
        it("five", "5", "FAÏV", "Le v final se fait entendre."),
        it("six", "6", "SIKS"),
        it("seven", "7", "SÈ-veun"),
        it("eight", "8", "ÉÏT", "Le « gh » est muet."),
        it("nine", "9", "NAÏN"),
        it("ten", "10", "TÈN"),
        it("eleven", "11", "i-LÈ-veun"),
        it("twelve", "12", "TOUÈLV"),
      ] },
      { title: "De 13 à 19 (-teen, accent à la fin)", items: [
        it("thirteen", "13", "theur-TIIN", "Ne pas confondre avec thirty (30) : ici l'accent est à la fin."),
        it("fourteen", "14", "for-TIIN"),
        it("fifteen", "15", "fif-TIIN", "Five devient « fif »."),
        it("sixteen", "16", "siks-TIIN"),
        it("seventeen", "17", "sè-veun-TIIN"),
        it("eighteen", "18", "éï-TIIN", "Un seul t."),
        it("nineteen", "19", "naïn-TIIN"),
      ] },
      { title: "Les dizaines (-ty, accent au début)", items: [
        it("twenty", "20", "TOUÈN-ti"),
        it("thirty", "30", "THEUR-ti", "En américain, le t se dit presque d : « THEUR-di »."),
        it("forty", "40", "FOR-ti", "S'écrit sans u : forty, pas « fourty »."),
        it("fifty", "50", "FIF-ti"),
        it("sixty", "60", "SIKS-ti"),
        it("seventy", "70", "SÈ-veun-ti", "Pas de « soixante-dix » : 70 a son propre mot."),
        it("eighty", "80", "ÉÏ-ti", "Pas de « quatre-vingts » : eighty."),
        it("ninety", "90", "NAÏN-ti"),
      ] },
      { title: "Composer et les grands nombres", items: [
        it("twenty-one", "21", "touèn-ti-OUANN"),
        it("forty-five", "45", "for-ti-FAÏV"),
        it("ninety-nine", "99", "naïn-ti-NAÏN"),
        it("one hundred", "100", "ouann HEUN-dreud", "On dit aussi « a hundred »."),
        it("one hundred and five", "105", "ouann HEUN-dreud eunn FAÏV", "« and » se dit très faiblement : « eunn »."),
        it("two hundred and fifty", "250", "tou HEUN-dreud eunn FIF-ti"),
        it("one thousand", "1 000", "ouann THAOU-zeund", "Th : langue entre les dents. S'écrit 1,000."),
        it("one million", "1 000 000", "ouann MI-lieun", "S'écrit 1,000,000."),
      ] }
    ],
    quiz: "dictation",
    sentences: [
      ["There are seven days in a week.", "Il y a sept jours dans une semaine."],
      ["There are twelve months in a year.", "Il y a douze mois dans une année."],
      ["I have two brothers and three sisters.", "J'ai deux frères et trois sœurs."],
      ["I'm thirty years old.", "J'ai trente ans."],
      ["Thirteen or thirty? Thirteen!", "Treize ou trente ? Treize !"],
      ["It costs fifteen euros.", "Ça coûte quinze euros."],
      ["Room one hundred and five, please.", "Chambre cent cinq, s'il vous plaît."],
      ["About two thousand people live here.", "Environ deux mille personnes habitent ici."]
    ] },

  { id: "dates", title: "Ordinaux et dates", short: "Dates", sub: "Le premier, le 21 mars, l'année 2026",
    tips: [
      "Pour les dates, on utilise les ordinaux : the first (1st), the second (2nd), the third (3rd), puis -th : the fourth (4th).",
      "Le « th » final se dit avec la langue entre les dents : fifth, sixth, twelfth.",
      "Royaume-Uni : « the first of May » (écrit 1 May). États-Unis : « May first » (écrit May 1).",
      "Les années se coupent en deux : 2026 = twenty twenty-six, 1995 = nineteen ninety-five. Mais 2005 = two thousand and five."
    ],
    groups: [
      { title: "Les ordinaux", items: [
        it("first", "1er (1st)", "FEURST"),
        it("second", "2e (2nd)", "SÈ-keund"),
        it("third", "3e (3rd)", "THEURD", "Th : langue entre les dents."),
        it("fourth", "4e (4th)", "FORTH"),
        it("fifth", "5e (5th)", "FIFTH", "Five devient « fif » + th."),
        it("eighth", "8e (8th)", "ÉÏTTH", "Un seul t à l'écrit : eighth."),
        it("ninth", "9e (9th)", "NAÏNTH", "Pas de e : ninth."),
        it("twelfth", "12e (12th)", "TOUÈLFTH", "Le v devient f : twelfth."),
        it("twentieth", "20e (20th)", "TOUÈN-ti-eth", "Le y devient ie : twentieth."),
        it("twenty-first", "21e (21st)", "touèn-ti-FEURST"),
        it("thirty-first", "31e (31st)", "theur-ti-FEURST"),
      ] },
      { title: "Dire une date", items: [
        it("the first of May", "le 1er mai (R.-U.)", "the FEURST ov MÉÏ", "« of » se dit « ov », très court."),
        it("May first", "le 1er mai (É.-U.)", "MÉÏ FEURST"),
        it("twenty twenty-six", "2026", "TOUÈN-ti touèn-ti-SIKS"),
        it("nineteen ninety-five", "1995", "naïn-TIIN naïn-ti-FAÏV"),
        it("two thousand and five", "2005", "tou THAOU-zeund eunn FAÏV"),
      ] }
    ],
    quiz: "choice",
    sentences: [
      ["Today is the first of May.", "Aujourd'hui, c'est le premier mai."],
      ["What's the date today?", "On est le combien aujourd'hui ?"],
      ["My birthday is on the twenty-first of March.", "Mon anniversaire est le vingt et un mars."],
      ["I was born in nineteen ninety-five.", "Je suis né en mille neuf cent quatre-vingt-quinze."],
      ["We are in twenty twenty-six.", "Nous sommes en deux mille vingt-six."],
      ["The meeting is on Tuesday the third of June.", "La réunion est le mardi trois juin."]
    ] }
];
export const BASICS_BY_ID = Object.fromEntries(BASICS.map(b => [b.id, b]));
export const basicsItems = b => b.groups.flatMap(g => g.items);
export const basicsCardId = (b, w) => `N:${b.id}:${w.en}`;

// ---------- Nombres en toutes lettres ----------
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function under100(n) { return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : ""); }
// Anglais britannique : « and » après hundred/thousand (one hundred and five).
export function numberWords(n) {
  n = Math.floor(n);
  if (n < 0 || n > 999999999) throw new RangeError("nombre hors limites");
  if (n < 100) return under100(n);
  if (n < 1000) { const r = n % 100; return ONES[Math.floor(n / 100)] + " hundred" + (r ? " and " + under100(r) : ""); }
  const big = n < 1e6 ? [1000, "thousand"] : [1e6, "million"];
  const head = Math.floor(n / big[0]), r = n % big[0];
  return numberWords(head) + " " + big[1] + (r ? (r < 100 ? " and " : " ") + numberWords(r) : "");
}
export function yearWords(y) {
  if (y >= 2000 && y <= 2009) return "two thousand" + (y % 10 ? " and " + ONES[y % 10] : "");
  const h = Math.floor(y / 100), r = y % 100;
  if (y < 1000 || y > 2099) return numberWords(y);
  if (!r) return under100(h) + " hundred";
  return under100(h) + " " + (r < 10 ? "oh " + ONES[r] : under100(r));
}
const ORD = { one: "first", two: "second", three: "third", five: "fifth", eight: "eighth", nine: "ninth", twelve: "twelfth" };
export function ordinalWords(n) {
  const w = numberWords(n), parts = w.split(/([ -])/), last = parts.pop();
  const o = ORD[last] || (last.endsWith("y") ? last.slice(0, -1) + "ieth" : last + "th");
  return parts.join("") + o;
}
export function ordinalSuffix(n) {
  const t = n % 100;
  if (t >= 11 && t <= 13) return n + "th";
  return n + ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
}
// Prononciation « à la française » d'un nombre écrit en lettres, mot par mot.
const PRON = Object.fromEntries(BASICS.flatMap(basicsItems).filter(w => !/[ -]/.test(w.en)).map(w => [w.en.toLowerCase(), w.pron]));
Object.assign(PRON, { and: "eunn", hundred: "HEUN-dreud", thousand: "THAOU-zeund", million: "MI-lieun", oh: "ô" });
export function pronOf(words) {
  return words.toLowerCase().split(/[ -]/).map(w => PRON[w] || w).join(" · ");
}
