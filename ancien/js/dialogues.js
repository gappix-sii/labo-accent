// Dialogues guidés (jeu de rôle) : l'IA joue un personnage, tu réponds à l'oral.
// Chaque tour « me » accepte plusieurs réponses ; la plus proche de ce que tu as dit est retenue.
// Format d'un tour : { ai, fr } ou { me: [[en, fr, réplique IA optionnelle], ...], hint, task }

export const DIALOGUES = [
  { id: "cafe", title: "Au café", level: "A1", goal: "Commander une boisson et payer", role: "Le serveur",
    tasks: ["Saluer et commander", "Répondre au serveur", "Demander le prix", "Payer et remercier"],
    turns: [
      { ai: "Hi there! What can I get you?", fr: "Bonjour ! Qu'est-ce que je vous sers ?" },
      { me: [["Hi, a coffee, please.", "Bonjour, un café, s'il vous plaît."], ["Hello, can I have a tea, please?", "Bonjour, je peux avoir un thé ?"], ["Hi, I'd like a hot chocolate.", "Bonjour, je voudrais un chocolat chaud."]], hint: "Salue et commande une boisson.", task: 0 },
      { ai: "Sure. For here or to go?", fr: "Bien sûr. Sur place ou à emporter ?" },
      { me: [["For here, please.", "Sur place, s'il vous plaît."], ["To go, please.", "À emporter, s'il vous plaît."]], hint: "Dis si tu restes ici ou si tu l'emportes.", task: 1 },
      { ai: "Great. Anything else?", fr: "Parfait. Autre chose ?" },
      { me: [["No, thanks. How much is it?", "Non merci. C'est combien ?"], ["How much is that?", "Ça fait combien ?"]], hint: "Demande le prix.", task: 2 },
      { ai: "That's four fifty, please.", fr: "Ça fait quatre cinquante, s'il vous plaît." },
      { me: [["Here you are. Thank you!", "Voilà. Merci !"], ["Can I pay by card? Thanks!", "Je peux payer par carte ? Merci !"]], hint: "Paie et remercie.", task: 3 },
      { ai: "Thank you! Have a nice day!", fr: "Merci ! Bonne journée !" }
    ] },
  { id: "meet", title: "Faire connaissance", level: "A1", goal: "Te présenter à quelqu'un à une fête", role: "Sam, à une fête",
    tasks: ["Dire bonjour et ton prénom", "Dire d'où tu viens", "Parler de ton travail", "Poser une question à ton tour"],
    turns: [
      { ai: "Hi! I don't think we've met. I'm Sam.", fr: "Salut ! Je crois qu'on ne se connaît pas. Moi c'est Sam." },
      { me: [["Hi Sam, nice to meet you. I'm Alex.", "Salut Sam, enchanté. Moi c'est Alex."], ["Hello, nice to meet you too.", "Bonjour, enchanté aussi."]], hint: "Dis bonjour et présente-toi.", task: 0 },
      { ai: "Nice to meet you! Where are you from?", fr: "Enchanté ! Tu viens d'où ?" },
      { me: [["I'm from France.", "Je viens de France."], ["I'm French, I live near Paris.", "Je suis français, j'habite près de Paris."]], hint: "Dis d'où tu viens.", task: 1 },
      { ai: "Oh, cool! And what do you do?", fr: "Oh, cool ! Et tu fais quoi dans la vie ?" },
      { me: [["I work in tech. I'm a network administrator.", "Je travaille dans la tech. Je suis administrateur réseau."], ["I work with computers.", "Je travaille avec les ordinateurs."]], hint: "Parle de ton métier.", task: 2 },
      { ai: "That sounds interesting!", fr: "Ça a l'air intéressant !" },
      { me: [["What about you?", "Et toi ?"], ["And what do you do, Sam?", "Et toi Sam, tu fais quoi ?"]], hint: "Retourne-lui la question.", task: 3 },
      { ai: "I'm a teacher. I teach music to kids.", fr: "Je suis prof. J'enseigne la musique aux enfants." }
    ] },
  { id: "date", title: "Dîner en amoureux", level: "A2", goal: "Choisir un plat et parler de ta journée avec ta copine", role: "Ta copine",
    tasks: ["Dire ce que tu prends", "Parler de ta journée", "Lui faire un compliment", "Proposer la suite de la soirée"],
    turns: [
      { ai: "This place is so nice! What are you going to have?", fr: "Cet endroit est trop bien ! Tu vas prendre quoi ?" },
      { me: [["I think I'll have the pasta.", "Je crois que je vais prendre les pâtes."], ["I'm going to have the steak.", "Je vais prendre le steak."], ["I don't know yet. What about you?", "Je ne sais pas encore. Et toi ?"]], hint: "Dis ce que tu vas commander.", task: 0 },
      { ai: "Good choice! So, how was your day?", fr: "Bon choix ! Alors, ta journée ?" },
      { me: [["It was busy, but it was good.", "Chargée, mais c'était bien."], ["It was tiring. I had a lot of work.", "Fatigante. J'ai eu beaucoup de travail."]], hint: "Raconte ta journée en une phrase.", task: 1 },
      { ai: "Oh, poor you. Well, now you can relax.", fr: "Oh, mon pauvre. Bon, maintenant tu peux te détendre." },
      { me: [["You look beautiful tonight.", "Tu es magnifique ce soir."], ["I'm really happy to be here with you.", "Je suis vraiment content d'être ici avec toi."]], hint: "Fais-lui un compliment.", task: 2 },
      { ai: "Aw, that's sweet. Thank you!", fr: "Oh, c'est mignon. Merci !" },
      { me: [["Do you want to go for a walk after dinner?", "Tu veux aller te promener après le dîner ?"], ["Shall we watch a movie at home later?", "On regarde un film à la maison après ?"]], hint: "Propose quelque chose pour après.", task: 3 },
      { ai: "I'd love that!", fr: "Avec plaisir !" }
    ] },
  { id: "hotel", title: "Arrivée à l'hôtel", level: "A2", goal: "Faire ton check-in et poser des questions", role: "Le réceptionniste",
    tasks: ["Donner ta réservation", "Répondre sur le séjour", "Demander le petit-déjeuner", "Demander le Wi-Fi"],
    turns: [
      { ai: "Good evening! Welcome. How can I help you?", fr: "Bonsoir et bienvenue ! Que puis-je faire pour vous ?" },
      { me: [["Hi, I have a reservation under the name Martin.", "Bonjour, j'ai une réservation au nom de Martin."], ["Good evening, I'd like to check in, please.", "Bonsoir, je voudrais faire le check-in."]], hint: "Dis que tu as une réservation.", task: 0 },
      { ai: "Let me see. Yes, a double room for three nights, is that right?", fr: "Voyons. Oui, une chambre double pour trois nuits, c'est bien ça ?" },
      { me: [["Yes, that's right.", "Oui, c'est ça."], ["Yes, three nights, please.", "Oui, trois nuits."]], hint: "Confirme.", task: 1 },
      { ai: "Perfect. Here is your key card. Your room is on the fifth floor.", fr: "Parfait. Voici votre carte. Votre chambre est au cinquième étage." },
      { me: [["What time is breakfast?", "À quelle heure est le petit-déjeuner ?"], ["Is breakfast included?", "Le petit-déjeuner est compris ?"]], hint: "Pose une question sur le petit-déjeuner.", task: 2 },
      { ai: "Breakfast is from seven to ten, in the restaurant.", fr: "Le petit-déjeuner est de sept à dix heures, au restaurant." },
      { me: [["Great. And what's the Wi-Fi password?", "Super. Et quel est le mot de passe du Wi-Fi ?"], ["Thank you. Is there free Wi-Fi?", "Merci. Il y a le Wi-Fi gratuit ?"]], hint: "Demande pour le Wi-Fi.", task: 3 },
      { ai: "It's on the back of your key card. Enjoy your stay!", fr: "Il est au dos de votre carte. Bon séjour !" }
    ] },
  { id: "way", title: "Demander son chemin", level: "A2", goal: "Trouver la gare dans une ville inconnue", role: "Une passante",
    tasks: ["Interpeller poliment", "Demander où est la gare", "Demander si c'est loin", "Remercier"],
    turns: [
      { me: [["Excuse me, can you help me, please?", "Excusez-moi, vous pouvez m'aider ?"], ["Sorry, excuse me!", "Pardon, excusez-moi !"]], hint: "Interpelle poliment la passante.", task: 0 },
      { ai: "Of course. What are you looking for?", fr: "Bien sûr. Vous cherchez quoi ?" },
      { me: [["Where is the train station, please?", "Où est la gare, s'il vous plaît ?"], ["How do I get to the train station?", "Comment je vais à la gare ?"]], hint: "Demande la gare.", task: 1 },
      { ai: "Go straight ahead, then turn left at the bank.", fr: "Allez tout droit, puis tournez à gauche à la banque." },
      { me: [["Is it far from here?", "C'est loin d'ici ?"], ["Can I walk there?", "Je peux y aller à pied ?"]], hint: "Demande si c'est loin.", task: 2 },
      { ai: "No, it's about five minutes on foot.", fr: "Non, c'est à environ cinq minutes à pied." },
      { me: [["Thank you so much!", "Merci beaucoup !"], ["Great, thanks for your help.", "Super, merci pour votre aide."]], hint: "Remercie.", task: 3 },
      { ai: "You're welcome. Have a good trip!", fr: "De rien. Bon voyage !" }
    ] },
  { id: "pharmacy", title: "À la pharmacie", level: "A2", goal: "Expliquer que tu es malade et acheter un médicament", role: "La pharmacienne",
    tasks: ["Dire ce qui ne va pas", "Répondre aux questions", "Parler d'une allergie", "Demander comment le prendre"],
    turns: [
      { ai: "Hello. How can I help you today?", fr: "Bonjour. Que puis-je pour vous ?" },
      { me: [["Hi, I have a bad headache.", "Bonjour, j'ai très mal à la tête."], ["Hello, I have a sore throat.", "Bonjour, j'ai mal à la gorge."]], hint: "Dis ce qui ne va pas.", task: 0 },
      { ai: "I'm sorry. How long have you had it?", fr: "Désolée. Depuis combien de temps ?" },
      { me: [["Since yesterday.", "Depuis hier."], ["For two days.", "Depuis deux jours."]], hint: "Dis depuis quand.", task: 1 },
      { ai: "Okay. Are you allergic to anything?", fr: "D'accord. Vous êtes allergique à quelque chose ?" },
      { me: [["No, I'm not allergic to anything.", "Non, je ne suis allergique à rien."], ["Yes, I'm allergic to aspirin.", "Oui, je suis allergique à l'aspirine."]], hint: "Réponds sur les allergies.", task: 2 },
      { ai: "Then you can take these tablets.", fr: "Alors vous pouvez prendre ces comprimés." },
      { me: [["How often should I take them?", "Je dois les prendre tous les combien ?"], ["How many can I take a day?", "J'en prends combien par jour ?"]], hint: "Demande comment les prendre.", task: 3 },
      { ai: "One tablet every six hours, with water.", fr: "Un comprimé toutes les six heures, avec de l'eau." }
    ] },
  { id: "shop", title: "Magasin de vêtements", level: "A2", goal: "Essayer une veste et l'acheter", role: "Le vendeur",
    tasks: ["Dire que tu regardes", "Demander une autre taille", "Essayer", "Payer"],
    turns: [
      { ai: "Hi! Are you looking for anything in particular?", fr: "Bonjour ! Vous cherchez quelque chose en particulier ?" },
      { me: [["I'm just looking, thanks.", "Je regarde seulement, merci."], ["Yes, I'm looking for a jacket.", "Oui, je cherche une veste."]], hint: "Réponds au vendeur.", task: 0 },
      { ai: "Let me know if you need help.", fr: "Dites-moi si vous avez besoin d'aide." },
      { me: [["Do you have this in a bigger size?", "Vous l'avez dans une taille plus grande ?"], ["Do you have this jacket in black?", "Vous avez cette veste en noir ?"]], hint: "Demande une autre taille ou couleur.", task: 1 },
      { ai: "Yes, here you are.", fr: "Oui, tenez." },
      { me: [["Can I try it on?", "Je peux l'essayer ?"], ["Where are the fitting rooms?", "Où sont les cabines d'essayage ?"]], hint: "Demande à essayer.", task: 2 },
      { ai: "Sure, the fitting rooms are over there.", fr: "Bien sûr, les cabines sont là-bas." },
      { me: [["It fits well. I'll take it.", "Elle me va bien. Je la prends."], ["I'll take it. Can I pay by card?", "Je la prends. Je peux payer par carte ?"]], hint: "Dis que tu la prends.", task: 3 },
      { ai: "Great choice! That's sixty dollars.", fr: "Excellent choix ! Ça fait soixante dollars." }
    ] },
  { id: "weekend", title: "Le week-end à deux", level: "A2", goal: "Organiser le week-end avec ta copine", role: "Ta copine",
    tasks: ["Proposer une idée", "Donner ton avis", "Fixer l'heure", "Conclure"],
    turns: [
      { ai: "So, what do you want to do this weekend?", fr: "Alors, tu veux faire quoi ce week-end ?" },
      { me: [["We could go to the beach.", "On pourrait aller à la plage."], ["Let's visit your parents.", "Allons voir tes parents."], ["Why don't we stay home and relax?", "Et si on restait à la maison pour se reposer ?"]], hint: "Propose une idée.", task: 0 },
      { ai: "Hmm, but the weather might be bad on Saturday.", fr: "Hmm, mais il risque de faire mauvais samedi." },
      { me: [["Then let's go on Sunday.", "Alors allons-y dimanche."], ["I don't mind, we can do it anyway.", "Ça m'est égal, on peut le faire quand même."]], hint: "Donne ton avis.", task: 1 },
      { ai: "Okay! What time do you want to leave?", fr: "D'accord ! Tu veux partir à quelle heure ?" },
      { me: [["Around ten in the morning.", "Vers dix heures du matin."], ["After lunch is fine for me.", "Après le déjeuner, ça me va."]], hint: "Propose une heure.", task: 2 },
      { ai: "Perfect. I can't wait!", fr: "Parfait. J'ai hâte !" },
      { me: [["Me too. It's going to be great.", "Moi aussi. Ça va être génial."], ["Yes, it will be perfect.", "Oui, ça va être parfait."]], hint: "Conclus avec enthousiasme.", task: 3 }
    ] },
  { id: "flight", title: "Vol annulé", level: "B1", goal: "Trouver une solution au comptoir de la compagnie", role: "L'agent de la compagnie",
    tasks: ["Expliquer le problème", "Demander une solution", "Parler de ton bagage", "Demander une compensation"],
    turns: [
      { ai: "Next, please. How can I help you?", fr: "Suivant, s'il vous plaît. Que puis-je faire pour vous ?" },
      { me: [["Hi, my flight to London was cancelled.", "Bonjour, mon vol pour Londres a été annulé."], ["Hello, I just saw that my flight is cancelled.", "Bonjour, je viens de voir que mon vol est annulé."]], hint: "Explique le problème.", task: 0 },
      { ai: "I'm very sorry about that. Can I see your passport?", fr: "Je suis vraiment désolé. Puis-je voir votre passeport ?" },
      { me: [["Here it is. Is there another flight today?", "Le voici. Il y a un autre vol aujourd'hui ?"], ["Sure. When is the next flight?", "Bien sûr. C'est quand le prochain vol ?"]], hint: "Demande une autre solution.", task: 1 },
      { ai: "There's one at eight tonight. I can book you on it.", fr: "Il y en a un ce soir à vingt heures. Je peux vous y inscrire." },
      { me: [["Great. What about my luggage?", "Super. Et mes bagages ?"], ["Thanks. Will my suitcase be on that flight too?", "Merci. Ma valise sera aussi sur ce vol ?"]], hint: "Pose une question sur ta valise.", task: 2 },
      { ai: "Yes, it will be transferred automatically.", fr: "Oui, elle sera transférée automatiquement." },
      { me: [["Can I get a meal voucher while I wait?", "Je peux avoir un bon repas en attendant ?"], ["Is there any compensation for the delay?", "Il y a une compensation pour le retard ?"]], hint: "Demande une compensation.", task: 3 },
      { ai: "Of course. Here is a voucher for the restaurant.", fr: "Bien sûr. Voici un bon pour le restaurant." }
    ] },
  { id: "support", title: "Support informatique", level: "B1", goal: "Aider un collègue anglais dont le PC ne se connecte plus", role: "Chris, un collègue",
    tasks: ["Demander quel est le problème", "Poser une question de diagnostic", "Donner une solution", "Vérifier que ça marche"],
    turns: [
      { ai: "Hi, sorry to bother you. My computer can't connect to the network.", fr: "Salut, désolé de te déranger. Mon ordi n'arrive pas à se connecter au réseau." },
      { me: [["No problem. What exactly is happening?", "Pas de souci. Qu'est-ce qui se passe exactement ?"], ["Okay, what error message do you see?", "D'accord, quel message d'erreur tu vois ?"]], hint: "Demande des détails.", task: 0 },
      { ai: "It says no internet access. But my phone works fine.", fr: "Ça dit pas d'accès internet. Mais mon téléphone marche bien." },
      { me: [["Is your cable plugged in?", "Ton câble est bien branché ?"], ["Did you try to restart your computer?", "Tu as essayé de redémarrer ton ordi ?"]], hint: "Pose une question de diagnostic.", task: 1 },
      { ai: "Yes, I restarted it twice. Nothing changed.", fr: "Oui, je l'ai redémarré deux fois. Rien n'a changé." },
      { me: [["Okay, I'll reset your network settings.", "D'accord, je vais réinitialiser tes paramètres réseau."], ["Let me check the switch port. Give me a minute.", "Je vérifie le port du switch. Laisse-moi une minute."]], hint: "Propose une solution.", task: 2 },
      { ai: "Oh, it's working now! Thank you so much.", fr: "Oh, ça marche maintenant ! Merci beaucoup." },
      { me: [["You're welcome. Call me if it happens again.", "De rien. Appelle-moi si ça recommence."], ["Great. Can you open a website to check?", "Super. Tu peux ouvrir un site pour vérifier ?"]], hint: "Conclus et vérifie.", task: 3 },
      { ai: "Everything works perfectly. You're a lifesaver!", fr: "Tout marche parfaitement. Tu me sauves la vie !" }
    ] }
];

// Mots fréquents ignorés dans l'exercice d'écoute.
export const STOP = new Set("a an the i you he she it we they me my your is are am was be to of and or in on at for with this that can do does did not no yes so it's i'm you're don't what how".split(" "));
