// Verbes irréguliers : les 67 plus utiles, rangés par familles de sons (méthode recommandée par la plupart des
// professeurs : on retient une « musique » commune plutôt qu'une liste alphabétique).
// Chaque verbe : infinitif, prétérit, participe passé, sens, prononciation « à la française » des 3 formes
// (syllabe accentuée en MAJUSCULES), un piège éventuel, et deux phrases de contexte :
// une au prétérit (hier, la semaine dernière…) et une au present perfect (have / has + participe).

const v = (base, past, pp, fr, pron, note, ps, pps) => ({ base, past, pp, fr, pron, note, ps: { en: ps[0], fr: ps[1], form: "past" }, pps: { en: pps[0], fr: pps[1], form: "pp" } });

export const FAMILIES = [
  { id: "stars", title: "Les stars du quotidien", short: "Stars", tune: "à connaître par cœur",
    tip: "Les plus fréquents de tous, et les plus irréguliers. Commence par eux : ils sont dans presque toutes les phrases.",
    verbs: [
      v("be", "was / were", "been", "être", ["BI", "OUOZ · OUEUR", "BIN"], "« was » avec I, he, she, it ; « were » avec you, we, they.", ["I was tired yesterday.", "J'étais fatigué hier."], ["Have you ever been to London?", "Tu es déjà allé à Londres ?"]),
      v("have", "had", "had", "avoir", ["HAV", "HAD", "HAD"], "Le h se souffle, toujours.", ["I had a great weekend.", "J'ai passé un super week-end."], ["We have had a lot of rain this week.", "On a eu beaucoup de pluie cette semaine."]),
      v("do", "did", "done", "faire", ["DOU", "DID", "DEUN"], "done se dit « deun », comme « fun ».", ["What did you do last night?", "Qu'as-tu fait hier soir ?"], ["I have done my homework.", "J'ai fait mes devoirs."]),
      v("go", "went", "gone", "aller", ["GÔ", "OUÈNT", "GONN"], "went ne ressemble pas du tout à go : à apprendre par cœur.", ["We went to the beach on Sunday.", "On est allés à la plage dimanche."], ["She has gone to work.", "Elle est partie au travail."]),
      v("get", "got", "got", "obtenir, devenir", ["GUÈT", "GOT", "GOT"], "En américain, le participe est souvent « gotten ».", ["I got a message from Tom.", "J'ai reçu un message de Tom."], ["I have got a new job.", "J'ai un nouveau travail."]),
      v("make", "made", "made", "fabriquer, faire", ["MÉÏK", "MÉÏD", "MÉÏD"], "make = fabriquer (a cake), do = faire une activité (homework).", ["She made a cake for my birthday.", "Elle a fait un gâteau pour mon anniversaire."], ["Have you made your bed?", "Tu as fait ton lit ?"]),
      v("say", "said", "said", "dire", ["SÉÏ", "SÈD", "SÈD"], "said se dit « sèd », pas « séïd ».", ["He said hello to everyone.", "Il a dit bonjour à tout le monde."], ["I have said it twice.", "Je l'ai dit deux fois."]),
      v("see", "saw", "seen", "voir", ["SII", "SO", "SIIN"], "saw : « so », bouche bien ouverte.", ["I saw a good film yesterday.", "J'ai vu un bon film hier."], ["Have you seen my phone?", "Tu as vu mon téléphone ?"]),
      v("take", "took", "taken", "prendre", ["TÉÏK", "TOUK", "TÉÏ-keun"], "took se dit « touk », court.", ["I took the bus this morning.", "J'ai pris le bus ce matin."], ["Who has taken my pen?", "Qui a pris mon stylo ?"]),
      v("give", "gave", "given", "donner", ["GUIV", "GUÉÏV", "GUI-veun"], "", ["He gave me a present.", "Il m'a offert un cadeau."], ["I have given her my number.", "Je lui ai donné mon numéro."]),
      v("eat", "ate", "eaten", "manger", ["IIT", "ÉÏT", "II-teun"], "ate se prononce comme eight (8) : « éït ».", ["We ate pizza last night.", "On a mangé une pizza hier soir."], ["Have you ever eaten sushi?", "Tu as déjà mangé des sushis ?"]),
    ] },
  { id: "aaa", title: "Rien ne change", short: "A-A-A", tune: "cut · cut · cut",
    tip: "Les trois formes sont identiques. Facile ! Seul piège : read s'écrit pareil mais se dit « riid » puis « rèd ».",
    verbs: [
      v("cut", "cut", "cut", "couper", ["KEUT", "KEUT", "KEUT"], "", ["I cut my finger yesterday.", "Je me suis coupé le doigt hier."], ["Have you cut the bread?", "Tu as coupé le pain ?"]),
      v("put", "put", "put", "mettre, poser", ["POUT", "POUT", "POUT"], "Le u se dit « ou » : « pout », pas « peut ».", ["She put her bag on the table.", "Elle a posé son sac sur la table."], ["Where have you put my keys?", "Où as-tu mis mes clés ?"]),
      v("let", "let", "let", "laisser", ["LÈT", "LÈT", "LÈT"], "", ["My parents let me go to the party.", "Mes parents m'ont laissé aller à la fête."], ["He has let the dog out.", "Il a sorti le chien."]),
      v("hit", "hit", "hit", "frapper, heurter", ["HIT", "HIT", "HIT"], "", ["The ball hit the window.", "Le ballon a heurté la fenêtre."], ["A storm has hit the city.", "Une tempête a frappé la ville."]),
      v("cost", "cost", "cost", "coûter", ["KOST", "KOST", "KOST"], "", ["The tickets cost fifty euros.", "Les billets ont coûté cinquante euros."], ["This trip has cost a lot of money.", "Ce voyage a coûté beaucoup d'argent."]),
      v("shut", "shut", "shut", "fermer", ["CHEUT", "CHEUT", "CHEUT"], "", ["He shut the door quietly.", "Il a fermé la porte doucement."], ["The shop has shut for the day.", "Le magasin a fermé pour la journée."]),
      v("hurt", "hurt", "hurt", "blesser, faire mal", ["HEURT", "HEURT", "HEURT"], "", ["I hurt my leg last week.", "Je me suis fait mal à la jambe la semaine dernière."], ["Have you hurt yourself?", "Tu t'es fait mal ?"]),
      v("read", "read", "read", "lire", ["RIID", "RÈD", "RÈD"], "Même écriture, deux sons : « riid » au présent, « rèd » au passé.", ["I read a great book last month.", "J'ai lu un super livre le mois dernier."], ["Have you read this book?", "Tu as lu ce livre ?"]),
    ] },
  { id: "ought", title: "La famille -ought / -aught", short: "-ought", tune: "buy · bought · bought",
    tip: "Le passé et le participe finissent tous en « -ought » ou « -aught », et les deux se disent pareil : « ot ». Le gh est muet.",
    verbs: [
      v("buy", "bought", "bought", "acheter", ["BAÏ", "BOT", "BOT"], "", ["I bought new shoes on Saturday.", "J'ai acheté des chaussures samedi."], ["Have you bought the tickets?", "Tu as acheté les billets ?"]),
      v("bring", "brought", "brought", "apporter", ["BRING", "BROT", "BROT"], "", ["She brought a cake to the party.", "Elle a apporté un gâteau à la fête."], ["I have brought you a coffee.", "Je t'ai apporté un café."]),
      v("think", "thought", "thought", "penser", ["THINK", "THOT", "THOT"], "Th : langue entre les dents.", ["I thought you were at home.", "Je pensais que tu étais à la maison."], ["Have you thought about it?", "Tu y as réfléchi ?"]),
      v("fight", "fought", "fought", "se battre", ["FAÏT", "FOT", "FOT"], "", ["The two cats fought in the garden.", "Les deux chats se sont battus dans le jardin."], ["They have never fought.", "Ils ne se sont jamais disputés."]),
      v("catch", "caught", "caught", "attraper", ["KATCH", "KOT", "KOT"], "", ["He caught the last train.", "Il a attrapé le dernier train."], ["I have caught a cold.", "J'ai attrapé un rhume."]),
      v("teach", "taught", "taught", "enseigner", ["TIITCH", "TOT", "TOT"], "", ["My mother taught me to swim.", "Ma mère m'a appris à nager."], ["She has taught English for ten years.", "Elle enseigne l'anglais depuis dix ans."]),
    ] },
  { id: "t", title: "Un -t à la fin", short: "-t", tune: "keep · kept · kept",
    tip: "Le son long du présent (« ii ») devient court (« è ») et on ajoute un t : keep → kept, sleep → slept.",
    verbs: [
      v("keep", "kept", "kept", "garder", ["KIIP", "KÈPT", "KÈPT"], "", ["He kept the secret.", "Il a gardé le secret."], ["I have kept all your letters.", "J'ai gardé toutes tes lettres."]),
      v("sleep", "slept", "slept", "dormir", ["SLIIP", "SLÈPT", "SLÈPT"], "", ["I slept very well last night.", "J'ai très bien dormi cette nuit."], ["Have you slept at all?", "Tu as dormi un peu ?"]),
      v("feel", "felt", "felt", "ressentir, se sentir", ["FIIL", "FÈLT", "FÈLT"], "", ["I felt happy after the run.", "Je me sentais heureux après la course."], ["I have never felt so tired.", "Je ne me suis jamais senti aussi fatigué."]),
      v("leave", "left", "left", "partir, quitter", ["LIIV", "LÈFT", "LÈFT"], "Le v devient f : left (qui veut aussi dire « gauche »).", ["We left the house at eight.", "On est partis de la maison à huit heures."], ["Has the train left?", "Le train est parti ?"]),
      v("meet", "met", "met", "rencontrer", ["MIIT", "MÈT", "MÈT"], "", ["I met my best friend at school.", "J'ai rencontré mon meilleur ami à l'école."], ["Have you met my brother?", "Tu connais mon frère ?"]),
      v("lose", "lost", "lost", "perdre", ["LOUZ", "LOST", "LOST"], "lose se dit « louz » (avec un z), loose (« lousse ») veut dire large.", ["I lost my keys yesterday.", "J'ai perdu mes clés hier."], ["I have lost my phone again.", "J'ai encore perdu mon téléphone."]),
      v("send", "sent", "sent", "envoyer", ["SÈND", "SÈNT", "SÈNT"], "Le d devient t.", ["She sent me a message.", "Elle m'a envoyé un message."], ["Have you sent the email?", "Tu as envoyé l'e-mail ?"]),
      v("spend", "spent", "spent", "dépenser, passer (du temps)", ["SPÈND", "SPÈNT", "SPÈNT"], "", ["We spent a week in Spain.", "On a passé une semaine en Espagne."], ["I have spent all my money.", "J'ai dépensé tout mon argent."]),
      v("build", "built", "built", "construire", ["BILD", "BILT", "BILT"], "Le u est muet : « bild », « bilt ».", ["They built a new school in my town.", "Ils ont construit une nouvelle école dans ma ville."], ["My father has built a garden shed.", "Mon père a construit un abri de jardin."]),
    ] },
  { id: "abb", title: "Passé = participe", short: "A-B-B", tune: "tell · told · told",
    tip: "Le prétérit et le participe sont identiques : une seule nouvelle forme à retenir par verbe.",
    verbs: [
      v("tell", "told", "told", "raconter, dire à", ["TÈL", "TÔLD", "TÔLD"], "", ["She told me a funny story.", "Elle m'a raconté une histoire drôle."], ["Have you told your parents?", "Tu l'as dit à tes parents ?"]),
      v("sell", "sold", "sold", "vendre", ["SÈL", "SÔLD", "SÔLD"], "", ["We sold our old car.", "On a vendu notre vieille voiture."], ["They have sold all the tickets.", "Ils ont vendu tous les billets."]),
      v("find", "found", "found", "trouver", ["FAÏND", "FAOUND", "FAOUND"], "", ["I found a wallet in the street.", "J'ai trouvé un portefeuille dans la rue."], ["Have you found your keys?", "Tu as retrouvé tes clés ?"]),
      v("stand", "stood", "stood", "être debout", ["STAND", "STOUD", "STOUD"], "", ["We stood in the rain for an hour.", "On est restés debout sous la pluie pendant une heure."], ["I have stood here all day.", "Je suis resté debout ici toute la journée."]),
      v("understand", "understood", "understood", "comprendre", ["eun-deur-STAND", "eun-deur-STOUD", "eun-deur-STOUD"], "Comme stand : understand → understood.", ["I understood everything he said.", "J'ai compris tout ce qu'il a dit."], ["Have you understood the rule?", "Tu as compris la règle ?"]),
      v("hear", "heard", "heard", "entendre", ["HIIR", "HEURD", "HEURD"], "heard ne se dit pas comme hear : « heurd », comme bird.", ["I heard a strange noise.", "J'ai entendu un bruit bizarre."], ["Have you heard the news?", "Tu as entendu la nouvelle ?"]),
      v("sit", "sat", "sat", "s'asseoir", ["SIT", "SAT", "SAT"], "", ["She sat next to me on the bus.", "Elle s'est assise à côté de moi dans le bus."], ["I have sat here for an hour.", "Je suis assis ici depuis une heure."]),
      v("win", "won", "won", "gagner", ["OUIN", "OUANN", "OUANN"], "won se prononce exactement comme one (1).", ["Our team won the match.", "Notre équipe a gagné le match."], ["She has won three medals.", "Elle a gagné trois médailles."]),
      v("pay", "paid", "paid", "payer", ["PÉÏ", "PÉÏD", "PÉÏD"], "S'écrit avec un i : paid, pas « payed ».", ["I paid for dinner.", "J'ai payé le dîner."], ["Have you paid the bill?", "Tu as payé l'addition ?"]),
      v("hold", "held", "held", "tenir", ["HÔLD", "HÈLD", "HÈLD"], "", ["He held my hand.", "Il m'a tenu la main."], ["She has held the record for years.", "Elle détient le record depuis des années."]),
    ] },
  { id: "iau", title: "La musique i · a · u", short: "i-a-u", tune: "sing · sang · sung",
    tip: "Seule la voyelle change : i au présent, a au prétérit, u au participe. Récite-les comme une chanson : sing, sang, sung !",
    verbs: [
      v("begin", "began", "begun", "commencer", ["bi-GUINN", "bi-GANN", "bi-GEUNN"], "", ["The film began at nine.", "Le film a commencé à neuf heures."], ["Has the meeting begun?", "La réunion a commencé ?"]),
      v("drink", "drank", "drunk", "boire", ["DRINK", "DRANK", "DREUNK"], "drunk veut aussi dire « ivre ».", ["I drank a lot of water.", "J'ai bu beaucoup d'eau."], ["Have you drunk your tea?", "Tu as bu ton thé ?"]),
      v("sing", "sang", "sung", "chanter", ["SING", "SANG", "SEUNG"], "", ["We sang songs around the fire.", "On a chanté des chansons autour du feu."], ["She has sung in a band.", "Elle a chanté dans un groupe."]),
      v("swim", "swam", "swum", "nager", ["SOUIM", "SOUAM", "SOUEUM"], "", ["We swam in the sea.", "On a nagé dans la mer."], ["I have never swum in a lake.", "Je n'ai jamais nagé dans un lac."]),
      v("ring", "rang", "rung", "sonner", ["RING", "RANG", "REUNG"], "", ["The phone rang twice.", "Le téléphone a sonné deux fois."], ["Has the bell rung?", "La sonnerie a retenti ?"]),
    ] },
  { id: "aba", title: "Retour au début", short: "A-B-A", tune: "come · came · come",
    tip: "Le participe revient à la forme de l'infinitif : come → came → come.",
    verbs: [
      v("come", "came", "come", "venir", ["KEUM", "KÉÏM", "KEUM"], "", ["My sister came to see me.", "Ma sœur est venue me voir."], ["Spring has come.", "Le printemps est arrivé."]),
      v("become", "became", "become", "devenir", ["bi-KEUM", "bi-KÉÏM", "bi-KEUM"], "Comme come, avec be- devant.", ["He became a doctor.", "Il est devenu médecin."], ["It has become very cold.", "Il est devenu très froid."]),
      v("run", "ran", "run", "courir", ["REUN", "RANN", "REUN"], "", ["I ran to the station.", "J'ai couru jusqu'à la gare."], ["Have you ever run a marathon?", "Tu as déjà couru un marathon ?"]),
    ] },
  { id: "ew", title: "La famille -ew / -own", short: "-ew", tune: "know · knew · known",
    tip: "Prétérit en « -ew » (« ou ») et participe en « -own » (« ôn ») : grow, grew, grown.",
    verbs: [
      v("know", "knew", "known", "savoir, connaître", ["NÔ", "NIOU", "NÔN"], "Le k est muet dans les trois formes.", ["I knew the answer.", "Je connaissais la réponse."], ["I have known him for ten years.", "Je le connais depuis dix ans."]),
      v("grow", "grew", "grown", "grandir, pousser", ["GRÔ", "GROU", "GRÔN"], "", ["My little brother grew a lot this year.", "Mon petit frère a beaucoup grandi cette année."], ["The city has grown fast.", "La ville a grandi vite."]),
      v("throw", "threw", "thrown", "lancer, jeter", ["THRÔ", "THROU", "THRÔN"], "Th : langue entre les dents.", ["He threw the ball to the dog.", "Il a lancé la balle au chien."], ["Have you thrown the old milk away?", "Tu as jeté le vieux lait ?"]),
      v("fly", "flew", "flown", "voler (en avion)", ["FLAÏ", "FLOU", "FLÔN"], "", ["We flew to Rome last summer.", "On a pris l'avion pour Rome l'été dernier."], ["Have you ever flown in a helicopter?", "Tu as déjà volé en hélicoptère ?"]),
      v("draw", "drew", "drawn", "dessiner", ["DRO", "DROU", "DRONN"], "", ["My son drew a picture of our cat.", "Mon fils a dessiné notre chat."], ["I have drawn a map for you.", "Je t'ai dessiné un plan."]),
      v("blow", "blew", "blown", "souffler", ["BLÔ", "BLOU", "BLÔN"], "", ["The wind blew all night.", "Le vent a soufflé toute la nuit."], ["The storm has blown the trees down.", "La tempête a abattu les arbres."]),
    ] },
  { id: "en", title: "Le participe en -en", short: "-en", tune: "speak · spoke · spoken",
    tip: "Le participe finit par « -en », souvent comme le prétérit + en : spoke → spoken, broke → broken.",
    verbs: [
      v("speak", "spoke", "spoken", "parler", ["SPIIK", "SPÔK", "SPÔ-keun"], "", ["I spoke to the manager.", "J'ai parlé au responsable."], ["Have you spoken to her?", "Tu lui as parlé ?"]),
      v("break", "broke", "broken", "casser", ["BRÉÏK", "BRÔK", "BRÔ-keun"], "break se dit « bréïk », pas « briik ».", ["I broke my glasses.", "J'ai cassé mes lunettes."], ["Who has broken the window?", "Qui a cassé la fenêtre ?"]),
      v("choose", "chose", "chosen", "choisir", ["TCHOUZ", "TCHÔZ", "TCHÔ-zeun"], "", ["She chose the red dress.", "Elle a choisi la robe rouge."], ["Have you chosen a name?", "Tu as choisi un prénom ?"]),
      v("wake", "woke", "woken", "(se) réveiller", ["OUÉÏK", "OUÔK", "OUÔ-keun"], "", ["I woke up at six.", "Je me suis réveillé à six heures."], ["The baby has woken up.", "Le bébé s'est réveillé."]),
      v("forget", "forgot", "forgotten", "oublier", ["feur-GUÈT", "feur-GOT", "feur-GO-teun"], "Deux t dans forgotten.", ["I forgot my umbrella.", "J'ai oublié mon parapluie."], ["I have forgotten his name.", "J'ai oublié son nom."]),
      v("write", "wrote", "written", "écrire", ["RAÏT", "RÔT", "RI-teun"], "Le w est muet ; deux t dans written.", ["He wrote me a long letter.", "Il m'a écrit une longue lettre."], ["Have you written to your grandmother?", "Tu as écrit à ta grand-mère ?"]),
      v("drive", "drove", "driven", "conduire", ["DRAÏV", "DRÔV", "DRI-veun"], "", ["We drove to the mountains.", "On est allés à la montagne en voiture."], ["I have never driven a truck.", "Je n'ai jamais conduit de camion."]),
      v("ride", "rode", "ridden", "monter (à cheval, à vélo)", ["RAÏD", "RÔD", "RI-deun"], "", ["I rode a horse on holiday.", "J'ai fait du cheval en vacances."], ["Have you ever ridden a camel?", "Tu es déjà monté sur un chameau ?"]),
      v("fall", "fell", "fallen", "tomber", ["FOL", "FÈL", "FO-leun"], "", ["She fell off her bike.", "Elle est tombée de vélo."], ["The prices have fallen.", "Les prix ont baissé."]),
    ] }
];
export const VERBS = FAMILIES.flatMap(f => f.verbs.map(x => ({ ...x, fam: f.id })));
export const VERB_BY_BASE = Object.fromEntries(VERBS.map(x => [x.base, x]));
export const verbCardId = x => `IV:${x.base}`;
export const FORM_LABEL = { base: "infinitif", past: "prétérit", pp: "participe passé" };
// Variantes acceptées d'une forme (« was / were » → was, were).
export const variants = f => f.split("/").map(s => s.trim());
// La forme attendue dans une phrase : celle (parmi les variantes) qui y figure.
export function targetOf(sent, verb) {
  const forms = variants(sent.form === "past" ? verb.past : verb.pp);
  for (const f of forms) if (new RegExp(`\\b${f}\\b`, "i").test(sent.en)) return f;
  return forms[0];
}
// Phrase avec un trou à la place de la forme (première occurrence comme mot entier).
export function cloze(sent, verb) {
  const t = targetOf(sent, verb), re = new RegExp(`\\b${t}\\b`, "i"), m = sent.en.match(re);
  return { before: sent.en.slice(0, m.index), after: sent.en.slice(m.index + m[0].length), answer: t };
}
// La faute classique : traiter le verbe comme un verbe régulier (goed, buyed, cutted…).
export function fakeRegular(base) {
  if (/e$/.test(base)) return base + "d";
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + "ied";
  if (/^[^aeiou]*[aeiou][bdgmnpt]$/.test(base)) return base + base.slice(-1) + "ed";
  return base + "ed";
}
