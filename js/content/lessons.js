// Parcours de leçons (phase 2) : une leçon sur un son, puis une leçon de phrases d'un thème qui réutilise ce son.
// Contenus repris de l'ancienne appli (ancien/js/content.js : SOUND_LESSONS et CATEGORIES) ; chaque thème
// d'une dizaine de phrases est coupé en deux leçons d'environ 5 phrases.
// Un élément est réussi à 65 ou plus (voir js/core/progress.js) ; chaque élément a son son fabriqué à l'avance.

// Leçons par son : p = le son travaillé (IPA du dictionnaire), tip = comment le faire.
export const SOUNDS = [
  { id: "s-th", p: "θ", title: "Le « th » sourd", tip: "Bout de la langue entre les dents, et souffle. Ni « s », ni « f », ni « t ».",
    items: ["think", "three", "thank you", "birthday", "I think it's Thursday.", "Thank you for the three things."] },
  { id: "s-dh", p: "ð", title: "Le « th » sonore", tip: "Langue entre les dents et la gorge vibre. Ni « z », ni « d ».",
    items: ["this", "the", "mother", "together", "This is the other one.", "My brother is there."] },
  { id: "s-h", p: "h", title: "Le « h » soufflé", tip: "Souffle comme de la buée sur une vitre. Sans h, hungry devient angry.",
    items: ["hello", "happy", "house", "hungry", "How are you?", "He has a huge house."] },
  { id: "s-ih", p: "ɪ", title: "Le i court", tip: "Bref et relâché, presque « é ». Ne souris pas.",
    items: ["ship", "sit", "live", "fill", "This is my little sister.", "It is a big city."] },
  { id: "s-ii", p: "i", title: "Le i long", tip: "Long et souriant : étire les lèvres et tiens le son.",
    items: ["sheep", "seat", "leave", "feel", "Please eat the cheese.", "We need to sleep."] },
  { id: "s-ae", p: "æ", title: "Le a de cat", tip: "Bouche grande ouverte, entre « a » et « è ». Mâchoire vers le bas.",
    items: ["cat", "bad", "happy", "black", "That man has a cat.", "I am happy to have a map."] },
  { id: "s-r", p: "ɹ", title: "Le r anglais", tip: "La langue recule sans rien toucher. Pas de r de gorge, pas de r roulé.",
    items: ["red", "right", "really", "very", "The red car is really fast.", "I'm ready for the trip."] },
  { id: "s-w", p: "w", title: "Le w", tip: "Lèvres arrondies comme pour « ou ». Les dents ne touchent pas la lèvre.",
    items: ["we", "water", "want", "word", "We want some water.", "What a wonderful week."] },
  { id: "s-ng", p: "ŋ", title: "Le ng final", tip: "Son nasal au fond de la gorge, sans prononcer le g à la fin.",
    items: ["sing", "thing", "morning", "long", "I'm going shopping this morning.", "She is singing a long song."] },
  { id: "s-ou", p: "oʊ", title: "Le o qui glisse", tip: "Le o anglais glisse vers « ou » : « eo-ou ».",
    items: ["go", "no", "home", "phone", "I don't know.", "Go home and call me on the phone."] },
  { id: "s-schwa", p: "ə", title: "Le son faible (schwa)", tip: "Les syllabes non accentuées se réduisent à un « e » faible. Accentue une seule syllabe.",
    items: ["banana", "about", "today", "problem", "A cup of coffee, please.", "What about tomorrow?"] },
  { id: "s-ei", p: "eɪ", title: "Le son « éï »", tip: "Le son glisse de « é » vers « i ».",
    items: ["day", "name", "wait", "great", "Wait for me at the gate.", "Have a great day."] },
  { id: "s-z", p: "z", title: "Le z (s qui vibre)", tip: "Beaucoup de « s » anglais se prononcent « z » : is, was, these, easy. Fais vibrer la gorge.",
    items: ["is", "was", "easy", "busy", "These shoes are always cheap.", "Is it easy to use?"] },
  { id: "s-v", p: "v", title: "Le v", tip: "Dents du haut posées sur la lèvre du bas, et ça vibre. Pas de « w ».",
    items: ["very", "visit", "voice", "never", "I have a very good view.", "We visited Venice in November."] },
  { id: "s-sh", p: "ʃ", title: "Le ch (sh)", tip: "Avance les lèvres comme pour « chut ». Attention, « ch » anglais se dit souvent « tch ».",
    items: ["she", "shop", "wish", "station", "She should push the shopping cart.", "I wish you a nice vacation."] },
  { id: "s-dj", p: "ʤ", title: "Le dj (j anglais)", tip: "Commence par un petit « d » : « dj ». Le j anglais n'est jamais un « j » français.",
    items: ["job", "just", "jacket", "orange", "I just changed my job.", "John enjoys orange juice."] },
  { id: "s-ai", p: "aɪ", title: "Le son « aï »", tip: "Le i anglais en syllabe ouverte se dit souvent « aï » : I, my, time, nice.",
    items: ["I", "my", "time", "nice", "I like my new bike.", "It's time to fly to Miami."] },
  { id: "s-er", p: "ɝ", title: "Le son « eur » (bird)", tip: "Langue repliée vers l'arrière, lèvres un peu arrondies : bird, work, her, first.",
    items: ["bird", "work", "her", "first", "Her first word was bird.", "I work on Thursday."] }
];

// Thèmes de phrases : [anglais, français].
export const THEMES = [
  { id: "couple", title: "En couple", sub: "Parler avec ta copine", items: [
    ["How was your day?", "Comment s'est passée ta journée ?"],
    ["I miss you so much.", "Tu me manques tellement."],
    ["What do you want to eat tonight?", "Tu veux manger quoi ce soir ?"],
    ["I'm really happy with you.", "Je suis vraiment heureux avec toi."],
    ["Can you help me with my English?", "Tu peux m'aider avec mon anglais ?"],
    ["Let's watch a movie together.", "Regardons un film ensemble."],
    ["I'm looking forward to the weekend.", "J'ai hâte d'être au week-end."],
    ["Thank you for being so patient.", "Merci d'être si patiente."],
    ["I think we should go out tonight.", "Je pense qu'on devrait sortir ce soir."],
    ["Sorry, I didn't mean that.", "Pardon, ce n'est pas ce que je voulais dire."]
  ]},
  { id: "travel", title: "Voyage", sub: "Aéroport, hôtel, restaurant", items: [
    ["I'd like to check in, please.", "Je voudrais m'enregistrer, s'il vous plaît."],
    ["Where is the nearest train station?", "Où est la gare la plus proche ?"],
    ["I have a reservation for two nights.", "J'ai une réservation pour deux nuits."],
    ["Is breakfast included?", "Le petit-déjeuner est compris ?"],
    ["A table for two, please.", "Une table pour deux, s'il vous plaît."],
    ["Could we have the bill, please?", "On pourrait avoir l'addition ?"],
    ["How much is a ticket to the city center?", "Combien coûte un billet pour le centre-ville ?"],
    ["My flight was delayed by three hours.", "Mon vol a eu trois heures de retard."],
    ["Excuse me, I think I'm lost.", "Excusez-moi, je crois que je suis perdu."],
    ["Can I pay by card?", "Je peux payer par carte ?"]
  ]},
  { id: "daily", title: "Quotidien", sub: "Se présenter, la vie de tous les jours", items: [
    ["Hello, nice to meet you.", "Bonjour, enchanté."],
    ["I'm from France and I live in a small town.", "Je viens de France et j'habite une petite ville."],
    ["I work with computers and networks.", "Je travaille avec les ordinateurs et les réseaux."],
    ["I'm learning English every day.", "J'apprends l'anglais tous les jours."],
    ["Could you speak more slowly, please?", "Tu pourrais parler plus lentement ?"],
    ["What do you do in your free time?", "Que fais-tu pendant ton temps libre ?"],
    ["I'm hungry, let's have lunch.", "J'ai faim, allons déjeuner."],
    ["It's very hot today.", "Il fait très chaud aujourd'hui."],
    ["I usually get up at seven.", "D'habitude, je me lève à sept heures."],
    ["See you tomorrow!", "À demain !"]
  ]},
  { id: "past", title: "Le passé en -ed", sub: "Bien prononcer la fin des verbes", items: [
    ["I worked late yesterday.", "J'ai travaillé tard hier."],
    ["We watched a great movie.", "On a regardé un super film."],
    ["She called me this morning.", "Elle m'a appelé ce matin."],
    ["I needed a break.", "J'avais besoin d'une pause."],
    ["We visited London last year.", "On a visité Londres l'année dernière."],
    ["He wanted to stay home.", "Il voulait rester à la maison."],
    ["I stopped and asked for help.", "Je me suis arrêté et j'ai demandé de l'aide."],
    ["We played tennis on Sunday.", "On a joué au tennis dimanche."]
  ]},
  { id: "work", title: "Au travail", sub: "Bureau, informatique, réunions", items: [
    ["I'm a system and network administrator.", "Je suis administrateur système et réseau."],
    ["The server is down again.", "Le serveur est encore en panne."],
    ["Did you restart the router?", "Tu as redémarré le routeur ?"],
    ["I need to update the software tonight.", "Je dois mettre à jour le logiciel ce soir."],
    ["Can you send me the report by email?", "Tu peux m'envoyer le rapport par e-mail ?"],
    ["The meeting starts at nine thirty.", "La réunion commence à neuf heures et demie."],
    ["Please change your password every month.", "Change ton mot de passe tous les mois."],
    ["We made a backup before the update.", "On a fait une sauvegarde avant la mise à jour."],
    ["I'm working from home on Friday.", "Je télétravaille vendredi."],
    ["Could you share your screen, please?", "Tu peux partager ton écran ?"]
  ]},
  { id: "out", title: "Sortir", sub: "Restaurant, café, magasins", items: [
    ["Can we see the menu, please?", "On peut voir la carte, s'il vous plaît ?"],
    ["I'll have the chicken with rice.", "Je vais prendre le poulet avec du riz."],
    ["Is this dish spicy?", "Ce plat est épicé ?"],
    ["Could I have some water, please?", "Je pourrais avoir de l'eau ?"],
    ["Do you have this in a bigger size?", "Vous l'avez dans une taille plus grande ?"],
    ["Can I try it on?", "Je peux l'essayer ?"],
    ["How much does this cost?", "Combien ça coûte ?"],
    ["I'm just looking, thank you.", "Je regarde seulement, merci."],
    ["Keep the change.", "Gardez la monnaie."],
    ["That was delicious, thank you!", "C'était délicieux, merci !"]
  ]},
  { id: "health", title: "Santé et imprévus", sub: "Pharmacie, médecin, urgences", items: [
    ["I have a terrible headache.", "J'ai un terrible mal de tête."],
    ["I need to see a doctor.", "J'ai besoin de voir un médecin."],
    ["Where is the nearest pharmacy?", "Où est la pharmacie la plus proche ?"],
    ["I think I have a fever.", "Je crois que j'ai de la fièvre."],
    ["I'm allergic to peanuts.", "Je suis allergique aux cacahuètes."],
    ["I lost my phone and my wallet.", "J'ai perdu mon téléphone et mon portefeuille."],
    ["Can you call a taxi for me?", "Pouvez-vous m'appeler un taxi ?"],
    ["My train was cancelled.", "Mon train a été annulé."],
    ["Is there a bank near here?", "Il y a une banque près d'ici ?"],
    ["Please help me, it's urgent.", "Aidez-moi, s'il vous plaît, c'est urgent."]
  ]},
  { id: "fun", title: "Loisirs et opinions", sub: "Donner son avis, parler de ses goûts", items: [
    ["I really like playing video games.", "J'aime beaucoup jouer aux jeux vidéo."],
    ["What kind of music do you listen to?", "Quel genre de musique tu écoutes ?"],
    ["In my opinion, the book was better.", "À mon avis, le livre était meilleur."],
    ["I don't agree with you.", "Je ne suis pas d'accord avec toi."],
    ["That sounds like a great idea.", "Ça a l'air d'être une super idée."],
    ["I've never been to Australia.", "Je ne suis jamais allé en Australie."],
    ["Have you ever tried sushi?", "Tu as déjà goûté les sushis ?"],
    ["I'd rather stay home tonight.", "Je préfère rester à la maison ce soir."],
    ["It depends on the weather.", "Ça dépend de la météo."],
    ["What are you doing this weekend?", "Tu fais quoi ce week-end ?"]
  ]},
  { id: "phone", title: "Au téléphone", sub: "Appeler, réserver, se faire comprendre", items: [
    ["Hello, this is Alex speaking.", "Bonjour, c'est Alex à l'appareil."],
    ["Could you repeat that, please?", "Pourriez-vous répéter, s'il vous plaît ?"],
    ["Sorry, the line is very bad.", "Désolé, la ligne est très mauvaise."],
    ["I'd like to book a table for Saturday.", "Je voudrais réserver une table pour samedi."],
    ["Can I leave a message?", "Je peux laisser un message ?"],
    ["I'll call you back later.", "Je te rappelle plus tard."],
    ["Could you spell your name, please?", "Pourriez-vous épeler votre nom ?"],
    ["What time do you open tomorrow?", "À quelle heure ouvrez-vous demain ?"],
    ["Thanks for calling.", "Merci d'avoir appelé."],
    ["Talk to you soon!", "À bientôt !"]
  ]}
];

// Chaque thème coupé en deux leçons : « couple-1 » (1re moitié), « couple-2 » (2de moitié).
function halves(t) {
  const k = Math.ceil(t.items.length / 2);
  return [t.items.slice(0, k), t.items.slice(k)].map((items, i) => ({
    id: `${t.id}-${i + 1}`, kind: "theme", title: `${t.title} (${i + 1}/2)`, sub: t.sub,
    items: items.map(([en, fr]) => ({ en, fr }))
  }));
}

// Ordre du parcours : [leçon de son, moitié de thème qui réemploie ce son]. Calculé pour que chaque
// leçon de phrases contienne le son qui vient d'être travaillé : 2 à 4 phrases sur 5 le plus souvent,
// 1 seule pour le « dj », rare dans les thèmes (vérifié par test/lessons.test.mjs).
export const ORDER = [
  ["s-h", "couple-1"], ["s-sh", "couple-2"], ["s-ei", "travel-1"], ["s-z", "travel-2"],
  ["s-ou", "daily-1"], ["s-v", "daily-2"], ["s-r", "past-1"], ["s-w", "past-2"],
  ["s-dh", "work-1"], ["s-ng", "work-2"], ["s-schwa", "out-1"], ["s-th", "out-2"],
  ["s-dj", "health-1"], ["s-ii", "health-2"], ["s-ih", "fun-1"], ["s-er", "fun-2"],
  ["s-ai", "phone-1"], ["s-ae", "phone-2"]
];

const SOUND_BY_ID = Object.fromEntries(SOUNDS.map((s) => [s.id, s]));
const THEME_BY_ID = Object.fromEntries(THEMES.flatMap(halves).map((t) => [t.id, t]));

export const LESSONS = ORDER.flatMap(([s, t]) => {
  const snd = SOUND_BY_ID[s];
  return [
    { id: snd.id, kind: "sound", title: snd.title, sub: snd.tip, p: snd.p, items: snd.items.map((en) => ({ en, fr: "" })) },
    { ...THEME_BY_ID[t], p: snd.p } // p : le son travaillé, mis en avant dans la note (tâche 5)
  ];
});

export const ALL_THEME_LESSONS = Object.values(THEME_BY_ID);
export const lessonById = (id) => LESSONS.find((l) => l.id === id) || null;
