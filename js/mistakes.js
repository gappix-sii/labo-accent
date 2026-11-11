// Les fautes typiques des francophones, regroupées par type. [faux, correct, explication]
export const MISTAKE_CATS = [
  { id: "gram", title: "Grammaire", items: [
    ["I have 30 years.", "I'm 30.", "L'âge se dit avec be."],
    ["I am agree with you.", "I agree with you.", "agree est un verbe : pas de am devant."],
    ["She like coffee.", "She likes coffee.", "-s à la 3ᵉ personne du présent."],
    ["He don't know.", "He doesn't know.", "He / she / it → doesn't."],
    ["Do you can help me?", "Can you help me?", "Pas de do avec can, will, must, should."],
    ["What means this word?", "What does this word mean?", "Les questions se font avec do / does."],
    ["Yesterday I have seen her.", "Yesterday I saw her.", "Moment précis du passé → prétérit."],
    ["I live here since two years.", "I've lived here for two years.", "Depuis + durée → present perfect + for."],
    ["People is nice here.", "People are nice here.", "people est pluriel."],
    ["A car red.", "A red car.", "L'adjectif se place avant le nom."],
    ["I drink often tea.", "I often drink tea.", "L'adverbe de fréquence va avant le verbe."],
    ["If I would have time, I would come.", "If I had time, I would come.", "Jamais de would juste après if."],
    ["I'm boring.", "I'm bored.", "-ed = ce que je ressens ; -ing = ce qui provoque."],
    ["Thank you for help me.", "Thank you for helping me.", "Après une préposition : verbe en -ing."]
  ]},
  { id: "faux", title: "Faux amis", items: [
    ["Actually, I live in Lyon. (= actuellement)", "Currently, I live in Lyon.", "actually = en fait ; actuellement = currently, at the moment."],
    ["I'll eventually come. (= éventuellement)", "I might come.", "eventually = finalement ; éventuellement = maybe, possibly."],
    ["I'm going to the library to buy a book.", "I'm going to the bookshop to buy a book.", "library = bibliothèque ; librairie = bookshop (UK), bookstore (US)."],
    ["She is very sensible. (= sensible)", "She is very sensitive.", "sensible = raisonnable ; sensible (émotion) = sensitive."],
    ["I assisted to the meeting.", "I attended the meeting.", "assister à = attend ; assist = aider."],
    ["Can you give me your actual address? (= actuelle)", "Can you give me your current address?", "actual = réel ; actuel = current."],
    ["I passed my exam but I failed. (= passer un examen)", "I took my exam but I failed.", "pass an exam = réussir ; passer un examen = take an exam."],
    ["This hotel has a great ambiance and a lot of commodities.", "This hotel has a great atmosphere and a lot of facilities.", "commodities = matières premières ; commodités = facilities."],
    ["I'm excited. (pour dire excité, énervé)", "I'm nervous. / I'm worked up.", "excited = impatient, enthousiaste (positif)."],
    ["The control of the server is tomorrow.", "The inspection of the server is tomorrow.", "control = maîtriser, contrôler (commander) ; un contrôle = a check, an inspection."],
    ["I need to rest at home. (= rester)", "I need to stay at home.", "rest = se reposer ; rester = stay."],
    ["I prefer the deception.", "I was disappointed.", "deception = tromperie ; déception = disappointment."]
  ]},
  { id: "prep", title: "Prépositions", items: [
    ["It depends of the weather.", "It depends on the weather.", "depend on."],
    ["I'm going to home.", "I'm going home.", "Pas de to devant home."],
    ["I'm married with Julie.", "I'm married to Julie.", "married to."],
    ["I'm good in English.", "I'm good at English.", "good at."],
    ["Explain me the problem.", "Explain the problem to me.", "explain something to someone."],
    ["Listen me!", "Listen to me!", "listen to."],
    ["I'm waiting the bus.", "I'm waiting for the bus.", "wait for."],
    ["I arrived to London.", "I arrived in London.", "arrive in (ville, pays) / arrive at (lieu précis)."],
    ["See you in Monday.", "See you on Monday.", "Jour → on."],
    ["I'm interested by music.", "I'm interested in music.", "interested in."]
  ]},
  { id: "words", title: "Vocabulaire et expressions", items: [
    ["You learn me English.", "You teach me English.", "learn = apprendre soi-même ; teach = enseigner."],
    ["I make a photo.", "I take a photo.", "take a photo, take a shower, have breakfast."],
    ["I win 2,000 euros a month.", "I earn 2,000 euros a month.", "win = gagner un jeu ; earn = gagner (salaire)."],
    ["Can you give me an information?", "Can you give me some information?", "information ne se compte pas."],
    ["I have a lot of works.", "I have a lot of work.", "work (le travail) ne prend pas de -s."],
    ["I'm late of ten minutes.", "I'm ten minutes late.", "La durée se place avant late."],
    ["You miss me. (pour « tu me manques »)", "I miss you.", "Le sens est inversé."],
    ["Say me the truth.", "Tell me the truth.", "tell someone something ; say something."],
    ["I lend money to the bank.", "I borrow money from the bank.", "borrow = emprunter ; lend = prêter."],
    ["It's a souvenir of my holidays.", "It's a memory of my holidays.", "un souvenir (dans la tête) = a memory ; souvenir = objet."]
  ]}
];
export const ALL_MISTAKES = MISTAKE_CATS.flatMap(c => c.items.map(([wrong, right, why]) => ({ id: c.id + ":" + right, cat: c.id, wrong, right, why })));
