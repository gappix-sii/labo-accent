// Vocabulaire par niveau du CECRL (cadre européen). Listes originales, anglais | français.
// Les niveaux suivent l'usage courant ; un mot peut apparaître plus tôt ou plus tard selon les référentiels.

const RAW = {
A1: `hello|bonjour
goodbye|au revoir
please|s'il te plaît
thank you|merci
sorry|désolé
yes|oui
no|non
man|homme
woman|femme
child|enfant
friend|ami
family|famille
mother|mère
father|père
brother|frère
sister|sœur
husband|mari
wife|épouse
boyfriend|petit ami
girlfriend|petite amie
name|nom, prénom
house|maison
room|pièce, chambre
kitchen|cuisine
bathroom|salle de bain
bed|lit
table|table
chair|chaise
door|porte
window|fenêtre
car|voiture
bus|bus
train|train
plane|avion
city|ville
street|rue
shop|magasin
money|argent
food|nourriture
water|eau
coffee|café
tea|thé
bread|pain
cheese|fromage
apple|pomme
egg|œuf
milk|lait
meat|viande
fish|poisson
breakfast|petit-déjeuner
lunch|déjeuner
dinner|dîner
day|jour
night|nuit
week|semaine
year|année
today|aujourd'hui
tomorrow|demain
yesterday|hier
morning|matin
evening|soir
time|temps, heure
Monday|lundi
Friday|vendredi
weekend|week-end
one|un
two|deux
three|trois
ten|dix
hundred|cent
red|rouge
blue|bleu
green|vert
black|noir
white|blanc
big|grand
small|petit
good|bon, bien
bad|mauvais
hot|chaud
cold|froid
happy|heureux
tired|fatigué
hungry|qui a faim
new|nouveau
old|vieux
to be|être
to have|avoir
to go|aller
to come|venir
to eat|manger
to drink|boire
to sleep|dormir
to work|travailler
to live|habiter, vivre
to like|aimer bien
to love|aimer, adorer
to want|vouloir
to see|voir
to speak|parler
to read|lire
to write|écrire
to buy|acheter
to open|ouvrir
to close|fermer
phone|téléphone
computer|ordinateur
book|livre
dog|chien
cat|chat
here|ici
there|là
where|où
when|quand
why|pourquoi`,
A2: `airport|aéroport
ticket|billet
passport|passeport
luggage|bagages
suitcase|valise
hotel|hôtel
booking|réservation
key|clé
map|plan, carte
station|gare
journey|trajet, voyage
holiday|vacances
beach|plage
mountain|montagne
weather|météo
rain|pluie
snow|neige
sunny|ensoleillé
windy|venteux
cloudy|nuageux
cheap|bon marché
expensive|cher
price|prix
bill|addition, facture
receipt|ticket de caisse
change|monnaie
size|taille
clothes|vêtements
shoes|chaussures
jacket|veste
shirt|chemise
doctor|médecin
hospital|hôpital
pharmacy|pharmacie
headache|mal de tête
fever|fièvre
medicine|médicament
appointment|rendez-vous
job|emploi
office|bureau
boss|chef, patron
meeting|réunion
colleague|collègue
email|e-mail
neighbour|voisin
hobby|loisir
music|musique
movie|film
game|jeu, match
sport|sport
team|équipe
restaurant|restaurant
menu|carte, menu
waiter|serveur
dessert|dessert
vegetables|légumes
chicken|poulet
rice|riz
salt|sel
sugar|sucre
early|tôt
late|tard, en retard
always|toujours
often|souvent
sometimes|parfois
never|jamais
already|déjà
soon|bientôt
again|encore, à nouveau
together|ensemble
because|parce que
but|mais
maybe|peut-être
really|vraiment
enough|assez
quiet|calme
noisy|bruyant
busy|occupé
free|libre, gratuit
easy|facile
difficult|difficile
dangerous|dangereux
safe|en sécurité
beautiful|beau
ugly|laid
funny|drôle
boring|ennuyeux
interesting|intéressant
to travel|voyager
to visit|visiter
to arrive|arriver
to leave|partir
to wait|attendre
to pay|payer
to try on|essayer (un vêtement)
to rent|louer
to book|réserver
to forget|oublier
to remember|se souvenir
to lose|perdre
to find|trouver
to help|aider
to ask|demander
to answer|répondre
to call|appeler
to meet|rencontrer
to cook|cuisiner
to clean|nettoyer
to learn|apprendre
to teach|enseigner
to understand|comprendre
to change|changer
to feel|se sentir`,
B1: `advice|conseil
opinion|avis
experience|expérience
decision|décision
choice|choix
mistake|erreur
problem|problème
solution|solution
reason|raison
result|résultat
goal|objectif
skill|compétence
knowledge|connaissances
improvement|amélioration
progress|progrès
challenge|défi
opportunity|occasion, opportunité
relationship|relation
feeling|sentiment
memory|souvenir, mémoire
trust|confiance
patience|patience
behaviour|comportement
environment|environnement
society|société
culture|culture
language|langue
accent|accent
pronunciation|prononciation
vocabulary|vocabulaire
grammar|grammaire
fluent|qui parle couramment
confident|sûr de soi
shy|timide
nervous|stressé, nerveux
proud|fier
worried|inquiet
disappointed|déçu
surprised|surpris
excited|enthousiaste
jealous|jaloux
grateful|reconnaissant
honest|honnête
polite|poli
rude|impoli
reliable|fiable
lazy|paresseux
generous|généreux
anyway|de toute façon
actually|en fait
probably|probablement
especially|surtout
unfortunately|malheureusement
however|cependant
although|bien que
instead|à la place
meanwhile|pendant ce temps
suddenly|soudain
recently|récemment
nearly|presque
to agree|être d'accord
to disagree|ne pas être d'accord
to explain|expliquer
to describe|décrire
to suggest|proposer
to decide|décider
to choose|choisir
to improve|améliorer
to practise|s'entraîner
to manage|gérer, réussir à
to share|partager
to complain|se plaindre
to apologise|s'excuser
to promise|promettre
to expect|s'attendre à
to allow|permettre
to avoid|éviter
to prefer|préférer
to recommend|recommander
to compare|comparer
to realise|se rendre compte
to wonder|se demander
to miss|manquer, rater
to look forward to|avoir hâte de
to get used to|s'habituer à
to give up|abandonner
to find out|découvrir
to set up|installer, configurer
to turn off|éteindre
to turn on|allumer
to look after|s'occuper de
to run out of|être à court de
network|réseau
server|serveur
password|mot de passe
update|mise à jour
backup|sauvegarde
software|logiciel
device|appareil
issue|problème, ticket
deadline|date limite`,
B2: `achievement|réussite
approach|approche
assumption|supposition
awareness|prise de conscience
background|contexte, parcours
benefit|avantage
commitment|engagement
concern|inquiétude, préoccupation
consequence|conséquence
drawback|inconvénient
evidence|preuve
feature|caractéristique, fonction
outcome|résultat, issue
purpose|but
requirement|exigence
responsibility|responsabilité
risk|risque
strength|point fort
weakness|point faible
threat|menace
trend|tendance
breach|faille, violation
vulnerability|vulnérabilité
infrastructure|infrastructure
bandwidth|bande passante
outage|panne
maintenance|maintenance
deployment|déploiement
reliable|fiable
efficient|efficace
accurate|précis
obvious|évident
reasonable|raisonnable
relevant|pertinent
significant|important, notable
sensitive|sensible
aware|conscient
eager|impatient, désireux
reluctant|réticent
straightforward|simple, direct
tough|difficile, dur
overwhelmed|débordé
furthermore|de plus
nevertheless|néanmoins
whereas|alors que
therefore|donc
otherwise|sinon
eventually|finalement
apparently|apparemment
regardless|quoi qu'il en soit
basically|en gros
to achieve|accomplir
to address|traiter (un problème)
to assess|évaluer
to assume|supposer
to claim|affirmer
to deal with|gérer, s'occuper de
to emphasize|souligner
to encourage|encourager
to ensure|s'assurer
to estimate|estimer
to handle|gérer
to highlight|mettre en avant
to involve|impliquer
to maintain|maintenir
to monitor|surveiller
to negotiate|négocier
to overcome|surmonter
to point out|faire remarquer
to put off|repousser
to rely on|compter sur
to come up with|trouver (une idée)
to carry out|effectuer
to figure out|comprendre, résoudre
to keep up with|suivre le rythme
to look into|examiner
to point at|montrer du doigt
to take over|prendre le relais
to break down|tomber en panne
to back up|sauvegarder
to roll back|revenir en arrière
to troubleshoot|dépanner
to upgrade|mettre à niveau
to restore|restaurer
to encrypt|chiffrer
to grant access|donner l'accès
to be in charge of|être responsable de
to make sense|avoir du sens
to take into account|prendre en compte
on purpose|exprès
in the long run|à long terme
by the way|au fait
as far as I know|à ma connaissance
it depends on|ça dépend de`,
C1: `accountability|responsabilité (devoir rendre des comptes)
ambiguity|ambiguïté
bias|biais, parti pris
compliance|conformité
contingency|imprévu, plan de secours
discrepancy|écart, incohérence
expertise|expertise
feasibility|faisabilité
hindsight|recul (après coup)
insight|compréhension fine
leverage|levier
milestone|étape clé
nuance|nuance
oversight|oubli, supervision
pitfall|piège
redundancy|redondance
scalability|évolutivité
shortcoming|défaut, lacune
stakeholder|partie prenante
workaround|solution de contournement
thorough|minutieux
meticulous|méticuleux
resilient|résilient
seamless|transparent, sans accroc
robust|robuste
tedious|fastidieux
cumbersome|lourd, encombrant
compelling|convaincant
consistent|cohérent, régulier
plausible|plausible
inevitable|inévitable
unprecedented|sans précédent
outdated|obsolète
arguably|sans doute
admittedly|certes
inherently|intrinsèquement
presumably|vraisemblablement
notwithstanding|malgré
hence|d'où
thereby|ainsi, de ce fait
to acknowledge|reconnaître
to anticipate|anticiper
to articulate|formuler clairement
to comply with|se conformer à
to convey|transmettre
to delegate|déléguer
to deteriorate|se détériorer
to elaborate|développer (une idée)
to enforce|faire appliquer
to foster|favoriser
to mitigate|atténuer
to undermine|saper
to streamline|simplifier, optimiser
to scrutinize|examiner de près
to substantiate|étayer
to tackle|s'attaquer à
to underestimate|sous-estimer
to bear in mind|garder à l'esprit
to touch base|faire un point
to cut corners|bâcler
to iron out|régler (les détails)
to phase out|supprimer progressivement
to rule out|exclure
to stem from|découler de
to lay out|exposer, présenter
to brush up on|rafraîchir (ses connaissances)
to get the hang of|prendre le coup de main
to be on the same page|être sur la même longueur d'onde
a blessing in disguise|un mal pour un bien
the bottom line|l'essentiel
food for thought|matière à réflexion
in a nutshell|en bref
to play it by ear|improviser
to hit the nail on the head|mettre le doigt dessus
to bite off more than you can chew|avoir les yeux plus gros que le ventre
up in the air|incertain
off the top of my head|de mémoire, sans vérifier
a steep learning curve|un apprentissage difficile`
};

export const LEVELS = [
  { id: "A1", title: "A1 · Découverte", sub: "Les mots de base du quotidien" },
  { id: "A2", title: "A2 · Survie", sub: "Voyager, acheter, se débrouiller" },
  { id: "B1", title: "B1 · Seuil", sub: "Donner son avis, raconter, s'exprimer" },
  { id: "B2", title: "B2 · Avancé", sub: "Argumenter, travailler en anglais" },
  { id: "C1", title: "C1 · Autonome", sub: "Nuances, expressions, langue pro" }
];

export const VOCAB = Object.fromEntries(Object.entries(RAW).map(([lv, txt]) => {
  const seen = new Set();
  const words = txt.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
    const [en, fr] = l.split("|");
    return { id: `${lv}:${en}`, en: en.trim(), fr: (fr || "").trim(), level: lv };
  }).filter(w => !seen.has(w.en) && seen.add(w.en));
  return [lv, words];
}));

// Mot à prononcer : on retire le « to » des verbes (on note la prononciation du verbe lui-même).
export const sayText = w => w.en.replace(/^to /, "");
