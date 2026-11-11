// Contenu des exercices. Chaque phrase est vérifiée au build contre le dictionnaire (tools/check-content.mjs).

export const CATEGORIES = [
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
  ]}
];

// Leçons par son : un conseil et des mots ou phrases centrés sur ce son.
export const SOUND_LESSONS = [
  { p: "θ", title: "Le « th » sourd", tip: "Bout de la langue entre les dents, et souffle. Ni « s », ni « f », ni « t ».",
    items: ["think", "three", "thank you", "birthday", "I think it's Thursday.", "Thank you for the three things."] },
  { p: "ð", title: "Le « th » sonore", tip: "Langue entre les dents et la gorge vibre. Ni « z », ni « d ».",
    items: ["this", "the", "mother", "together", "This is the other one.", "My brother is there."] },
  { p: "h", title: "Le « h » soufflé", tip: "Souffle comme de la buée sur une vitre. Sans h, hungry devient angry.",
    items: ["hello", "happy", "house", "hungry", "How are you?", "He has a huge house."] },
  { p: "ɪ", title: "Le i court", tip: "Bref et relâché, presque « é ». Ne souris pas.",
    items: ["ship", "sit", "live", "fill", "This is my little sister.", "It is a big city."] },
  { p: "i", title: "Le i long", tip: "Long et souriant : étire les lèvres et tiens le son.",
    items: ["sheep", "seat", "leave", "feel", "Please eat the cheese.", "We need to sleep."] },
  { p: "æ", title: "Le a de cat", tip: "Bouche grande ouverte, entre « a » et « è ». Mâchoire vers le bas.",
    items: ["cat", "bad", "happy", "black", "That man has a cat.", "I am happy to have a map."] },
  { p: "ɹ", title: "Le r anglais", tip: "La langue recule sans rien toucher. Pas de r de gorge, pas de r roulé.",
    items: ["red", "right", "really", "very", "The red car is really fast.", "I'm ready for the trip."] },
  { p: "w", title: "Le w", tip: "Lèvres arrondies comme pour « ou ». Les dents ne touchent pas la lèvre.",
    items: ["we", "water", "want", "word", "We want some water.", "What a wonderful week."] },
  { p: "ŋ", title: "Le ng final", tip: "Son nasal au fond de la gorge, sans prononcer le g à la fin.",
    items: ["sing", "thing", "morning", "long", "I'm going shopping this morning.", "She is singing a long song."] },
  { p: "oʊ", title: "Le o qui glisse", tip: "Le o anglais glisse vers « ou » : « eo-ou ».",
    items: ["go", "no", "home", "phone", "I don't know.", "Go home and call me on the phone."] },
  { p: "ə", title: "Le son faible (schwa)", tip: "Les syllabes non accentuées se réduisent à un « e » faible. Accentue une seule syllabe.",
    items: ["banana", "about", "today", "problem", "A cup of coffee, please.", "What about tomorrow?"] },
  { p: "eɪ", title: "Le son « éï »", tip: "Le son glisse de « é » vers « i ».",
    items: ["day", "name", "wait", "great", "Wait for me at the gate.", "Have a great day."] }
];

// Paires minimales : deux mots qui ne diffèrent que par un son.
export const MINIMAL_PAIRS = [
  ["ship", "sheep"], ["live", "leave"], ["sit", "seat"], ["think", "sink"], ["three", "tree"],
  ["hungry", "angry"], ["heat", "eat"], ["hair", "air"], ["bad", "bed"], ["cat", "cut"],
  ["full", "fool"], ["west", "vest"], ["thing", "sing"], ["this", "dis"], ["walk", "work"]
];
