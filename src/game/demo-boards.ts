import { TAlignmentKey, TPlacements, TQuestBoard } from "./types";

const executiveCircle = {
  id: "trump-administration-demo",
  title: "Trump Administration Demo",
  subtitle:
    "Prompt match: recognizable Trump administration figures. Demo mode still uses a hand-authored roster while live AI generation, portraits, and sourcing are stubbed.",
  disclaimer:
    "This screen validates the sorting loop only. The current roster is hand-authored around famous administration figures, while the production version will resolve casts, fetch portraits, and hide the answer key server-side.",
  people: [
    {
      id: "james-mattis",
      name: "James Mattis",
      role: "Secretary of Defense",
      clueTags: ["disciplined", "institutional", "duty-bound"],
      hint: "Leans lawful over chaotic.",
      rationale:
        "Mattis is framed as a rules-and-duty figure whose public image centers on discipline and institutional restraint, which makes him the clearest lawful good fit in this demo roster.",
      confidence: 0.83,
      monogram: "JM",
      accent: "#4f7db8",
      alignment: "lawful-good",
    },
    {
      id: "anthony-fauci",
      name: "Anthony Fauci",
      role: "COVID Task Force Figure",
      clueTags: ["public health", "steady", "service-minded"],
      hint: "Leans good over evil.",
      rationale:
        "Fauci reads as a pragmatic public servant whose reputation is tied to care and expertise more than ideology, which makes neutral good the best slot here.",
      confidence: 0.77,
      monogram: "AF",
      accent: "#5ba46e",
      alignment: "neutral-good",
    },
    {
      id: "anthony-scaramucci",
      name: "Anthony Scaramucci",
      role: "Communications Director",
      clueTags: ["flashy", "brief", "combustible"],
      hint: "Leans chaotic over lawful.",
      rationale:
        "Scaramucci is famous for pure disruption energy more than cruelty or institutionalism, so this demo pegs him as chaotic good to keep that volatility on the lighter side of the board.",
      confidence: 0.66,
      monogram: "AS",
      accent: "#5ba46e",
      alignment: "chaotic-good",
    },
    {
      id: "mike-pence",
      name: "Mike Pence",
      role: "Vice President",
      clueTags: ["formal", "loyal", "process-minded"],
      hint: "Leans lawful over chaotic.",
      rationale:
        "Pence is sorted as a rigid institutional loyalist whose defining trait is rule-bound steadiness, making lawful neutral the cleanest read.",
      confidence: 0.79,
      monogram: "MP",
      accent: "#4f7db8",
      alignment: "lawful-neutral",
    },
    {
      id: "steven-mnuchin",
      name: "Steven Mnuchin",
      role: "Treasury Secretary",
      clueTags: ["markets", "transactional", "measured"],
      hint: "Balanced between the axes.",
      rationale:
        "Mnuchin lands in the middle for this demo because his public image reads as transactional and technocratic rather than especially moral, ideological, or anarchic.",
      confidence: 0.74,
      monogram: "MN",
      accent: "#c29a52",
      alignment: "true-neutral",
    },
    {
      id: "kellyanne-conway",
      name: "Kellyanne Conway",
      role: "Counselor to the President",
      clueTags: ["combative", "nimble", "message-warrior"],
      hint: "Leans chaotic over lawful.",
      rationale:
        "Conway's public role was highly improvisational and media-combat driven, which makes chaotic neutral a stronger fit than any rule-bound or altruistic slot.",
      confidence: 0.75,
      monogram: "KC",
      accent: "#b35d76",
      alignment: "chaotic-neutral",
    },
    {
      id: "william-barr",
      name: "William Barr",
      role: "Attorney General",
      clueTags: ["legalistic", "hardline", "protective"],
      hint: "Leans evil over good.",
      rationale:
        "Barr is placed in lawful evil here because his public image combines forceful legal authority with a willingness to use institutions in ways many critics saw as severe and self-protective.",
      confidence: 0.82,
      monogram: "WB",
      accent: "#9c4c46",
      alignment: "lawful-evil",
    },
    {
      id: "stephen-miller",
      name: "Stephen Miller",
      role: "Senior Adviser",
      clueTags: ["ideological", "hardline", "punitive"],
      hint: "Leans evil over good.",
      rationale:
        "Miller fits neutral evil in this roster because the dominant public read is ideological severity and punitive instinct more than order-for-order's-sake or gleeful chaos.",
      confidence: 0.85,
      monogram: "ML",
      accent: "#9c4c46",
      alignment: "neutral-evil",
    },
    {
      id: "donald-trump",
      name: "Donald Trump",
      role: "President",
      clueTags: ["showman", "volatile", "self-serving"],
      hint: "Leans chaotic over lawful.",
      rationale:
        "Trump anchors chaotic evil in this demo board because the prompt is matched to the highest-profile figure in the administration and the intended fantasy read is pure disruption plus self-interest.",
      confidence: 0.91,
      monogram: "DT",
      accent: "#b35d76",
      alignment: "chaotic-evil",
    },
  ],
} satisfies {
  id: string;
  title: string;
  subtitle: string;
  disclaimer: string;
  people: TQuestBoard["palette"];
};

const shakespeareCourt = {
  id: "shakespeare-court",
  title: "Shakespeare Court Demo",
  subtitle:
    "Prompt match: literary cast. This board uses a local dramatic ensemble to mimic what a generated culture board would feel like.",
  disclaimer:
    "Real AI board generation is not wired yet, so the app picks from hand-authored demo casts with hidden answers.",
  people: [
    {
      id: "rowan-blythe",
      name: "Rowan Blythe",
      role: "Exiled Prince",
      clueTags: ["idealistic", "earnest", "dutiful"],
      hint: "Leans lawful over chaotic.",
      rationale: "Rowan is framed as virtuous and rule-conscious, which the AI reads as lawful good.",
      confidence: 0.7,
      monogram: "RB",
      accent: "#4f7db8",
      alignment: "lawful-good",
    },
    {
      id: "lys-marrow",
      name: "Lys Marrow",
      role: "Court Fool",
      clueTags: ["witty", "subversive", "compassionate"],
      hint: "Leans chaotic over lawful.",
      rationale: "Lys disrupts power while protecting the vulnerable, matching chaotic good.",
      confidence: 0.79,
      monogram: "LM",
      accent: "#b35d76",
      alignment: "chaotic-good",
    },
    {
      id: "prue-castor",
      name: "Prue Castor",
      role: "Lady Regent",
      clueTags: ["gracious", "measured", "protective"],
      hint: "Leans good over evil.",
      rationale: "Prue's board seat reflects kindness without radicalism, so neutral good fit best.",
      confidence: 0.66,
      monogram: "PC",
      accent: "#5ba46e",
      alignment: "neutral-good",
    },
    {
      id: "cedric-thorne",
      name: "Cedric Thorne",
      role: "Chancellor",
      clueTags: ["formal", "ceremonial", "exact"],
      hint: "Leans lawful over chaotic.",
      rationale: "Cedric is a pure protocol machine, placing him in lawful neutral.",
      confidence: 0.73,
      monogram: "CT",
      accent: "#4f7db8",
      alignment: "lawful-neutral",
    },
    {
      id: "maeve-rune",
      name: "Maeve Rune",
      role: "Archivist",
      clueTags: ["watchful", "balanced", "quiet"],
      hint: "Balanced between the axes.",
      rationale: "Maeve lands center board because her motives are intentionally unreadable and equilibrium-driven.",
      confidence: 0.68,
      monogram: "MR",
      accent: "#c29a52",
      alignment: "true-neutral",
    },
    {
      id: "orion-fenn",
      name: "Orion Fenn",
      role: "Captain of Guards",
      clueTags: ["loyal", "rough", "impulsive"],
      hint: "Leans chaotic over lawful.",
      rationale: "The AI sees Orion as instinctive and self-directed, making chaotic neutral the clearest fit.",
      confidence: 0.65,
      monogram: "OF",
      accent: "#b35d76",
      alignment: "chaotic-neutral",
    },
    {
      id: "silas-vale",
      name: "Silas Vale",
      role: "Magistrate",
      clueTags: ["stern", "punitive", "unyielding"],
      hint: "Leans evil over good.",
      rationale: "Silas weaponizes order, pushing him toward lawful evil.",
      confidence: 0.8,
      monogram: "SV",
      accent: "#9c4c46",
      alignment: "lawful-evil",
    },
    {
      id: "vera-noct",
      name: "Vera Noct",
      role: "Usurper",
      clueTags: ["scheming", "elegant", "predatory"],
      hint: "Leans evil over good.",
      rationale: "Vera fits neutral evil because ambition defines her more than ideology or impulse.",
      confidence: 0.83,
      monogram: "VN",
      accent: "#9c4c46",
      alignment: "neutral-evil",
    },
    {
      id: "briar-kestrel",
      name: "Briar Kestrel",
      role: "Avenger",
      clueTags: ["vengeful", "reckless", "radiant"],
      hint: "Leans chaotic over lawful.",
      rationale: "Briar is destructive and charismatic, a sharp chaotic evil read for the AI.",
      confidence: 0.71,
      monogram: "BK",
      accent: "#b35d76",
      alignment: "chaotic-evil",
    },
  ],
} satisfies {
  id: string;
  title: string;
  subtitle: string;
  disclaimer: string;
  people: TQuestBoard["palette"];
};

const mascotMayhem = {
  id: "mascot-mayhem",
  title: "Mascot Mayhem Demo",
  subtitle:
    "Prompt match: brand and culture board. This sample leans comedic and fast so the reveal lands in under three minutes.",
  disclaimer:
    "The production app will support live casts and sourced portraits; this MVP keeps it local for fast iteration.",
  people: [
    {
      id: "captain-crisp",
      name: "Captain Crisp",
      role: "Breakfast Mascot",
      clueTags: ["disciplined", "sunny", "orderly"],
      hint: "Leans lawful over chaotic.",
      rationale: "The captain's hyper-structured optimism slots cleanly into lawful good.",
      confidence: 0.73,
      monogram: "CC",
      accent: "#4f7db8",
      alignment: "lawful-good",
    },
    {
      id: "peppy-pop",
      name: "Peppy Pop",
      role: "Soda Sprite",
      clueTags: ["joyful", "zippy", "messy"],
      hint: "Leans chaotic over lawful.",
      rationale: "Peppy is a helper with pure sugar-chaos energy, which screams chaotic good.",
      confidence: 0.77,
      monogram: "PP",
      accent: "#5ba46e",
      alignment: "chaotic-good",
    },
    {
      id: "burger-baron",
      name: "Burger Baron",
      role: "Fast Food CEO",
      clueTags: ["slick", "mercenary", "calculating"],
      hint: "Leans evil over good.",
      rationale: "The baron chases appetite and leverage more than rules or anarchic fun, reading neutral evil.",
      confidence: 0.76,
      monogram: "BB",
      accent: "#9c4c46",
      alignment: "neutral-evil",
    },
    {
      id: "sundae-sage",
      name: "Sundae Sage",
      role: "Dessert Oracle",
      clueTags: ["calm", "balanced", "wise"],
      hint: "Balanced between the axes.",
      rationale: "The sage feels built for center board, detached and observational.",
      confidence: 0.64,
      monogram: "SS",
      accent: "#c29a52",
      alignment: "true-neutral",
    },
    {
      id: "fry-fiend",
      name: "Fry Fiend",
      role: "Late-Night Tempter",
      clueTags: ["reckless", "smirking", "wild"],
      hint: "Leans chaotic over lawful.",
      rationale: "The fiend's core trait is gleeful destruction, making chaotic evil the AI's favorite slot.",
      confidence: 0.82,
      monogram: "FF",
      accent: "#b35d76",
      alignment: "chaotic-evil",
    },
    {
      id: "garden-guardian",
      name: "Garden Guardian",
      role: "Healthy Plate Hero",
      clueTags: ["earnest", "protective", "plainspoken"],
      hint: "Leans good over evil.",
      rationale: "Guardian is altruistic without much swagger, which landed them in neutral good.",
      confidence: 0.69,
      monogram: "GG",
      accent: "#5ba46e",
      alignment: "neutral-good",
    },
    {
      id: "ledger-latte",
      name: "Ledger Latte",
      role: "Coffee Accountant",
      clueTags: ["ritualized", "compliance", "sharp"],
      hint: "Leans lawful over chaotic.",
      rationale: "Ledger Latte embodies rules and structure, but for profit rather than kindness, so lawful evil fit.",
      confidence: 0.74,
      monogram: "LL",
      accent: "#9c4c46",
      alignment: "lawful-evil",
    },
    {
      id: "trail-mixter",
      name: "Trail Mixter",
      role: "Outdoor Brand Guide",
      clueTags: ["wandering", "playful", "curious"],
      hint: "Leans chaotic over lawful.",
      rationale: "The mixter is impulsive without cruelty or heroism, putting them in chaotic neutral.",
      confidence: 0.67,
      monogram: "TM",
      accent: "#b35d76",
      alignment: "chaotic-neutral",
    },
    {
      id: "marshal-muffin",
      name: "Marshal Muffin",
      role: "Bakery Sheriff",
      clueTags: ["dutiful", "decent", "protective"],
      hint: "Leans lawful over chaotic.",
      rationale: "Marshal Muffin is another order-first archetype, but warmer than punitive, so lawful neutral almost fit before the AI chose lawful good elsewhere.",
      confidence: 0.62,
      monogram: "MM",
      accent: "#4f7db8",
      alignment: "lawful-neutral",
    },
  ],
} satisfies {
  id: string;
  title: string;
  subtitle: string;
  disclaimer: string;
  people: TQuestBoard["palette"];
};

const marvelHeroes = {
  id: "marvel-mcu-demo",
  title: "Marvel (MCU style)",
  subtitle: "A blockbuster-sized nine with familiar moral textures.",
  disclaimer:
    "This is a playful house-casting for alignment practice—not an authoritative take on the characters or canon.",
  people: [
    {
      id: "marvel-captain-america",
      name: "Steve Rogers",
      role: "Avenger · Captain America",
      clueTags: ["duty", "sacrifice", "symbol"],
      hint: "Lawful to a fault, good first.",
      rationale: "Dutiful, protective, and defined by a moral code even when the world wobbles—classic lawful good.",
      confidence: 0.8,
      monogram: "SR",
      accent: "#4f7db8",
      alignment: "lawful-good",
    },
    {
      id: "marvel-spider-man",
      name: "Peter Parker",
      role: "Avenger · Spider-Man",
      clueTags: ["empathy", "guilt", "responsibility"],
      hint: "Helps the block more than the institution.",
      rationale: "Kindness and service without needing the law to be his main axis—reads neutral good.",
      confidence: 0.78,
      monogram: "PP",
      accent: "#5ba46e",
      alignment: "neutral-good",
    },
    {
      id: "marvel-star-lord",
      name: "Peter Quill",
      role: "Guardian of the Galaxy",
      clueTags: ["sass", "found family", "chaos"],
      hint: "Good, loud, and improvisational.",
      rationale: "Heart in the right place, playbook in the trash—chaotic good energy.",
      confidence: 0.7,
      monogram: "PQ",
      accent: "#5ba46e",
      alignment: "chaotic-good",
    },
    {
      id: "marvel-okoye",
      name: "Okoye",
      role: "Dora Milaje",
      clueTags: ["oath", "royal guard", "precision"],
      hint: "Law and order as identity.",
      rationale: "Discipline, ritual, and nation-first strength without mustache-twirling villainy—lawful neutral.",
      confidence: 0.75,
      monogram: "OK",
      accent: "#4f7db8",
      alignment: "lawful-neutral",
    },
    {
      id: "marvel-vision",
      name: "Vision",
      role: "Synthezoid",
      clueTags: ["detached", "curious", "equilibrium"],
      hint: "Center of the Venn diagram.",
      rationale: "Tries to weigh all sides; neither crusading for chaos nor for law in a human way—true neutral read.",
      confidence: 0.68,
      monogram: "VI",
      accent: "#c29a52",
      alignment: "true-neutral",
    },
    {
      id: "marvel-loki",
      name: "Loki",
      role: "Trickster · Prince of Asgard",
      clueTags: ["mischief", "survival", "reinvention"],
      hint: "Aligned to the bit.",
      rationale: "Self-directed, improv-heavy, and not reliably good or evil on purpose—chaotic neutral.",
      confidence: 0.8,
      monogram: "LO",
      accent: "#b35d76",
      alignment: "chaotic-neutral",
    },
    {
      id: "marvel-killmonger",
      name: "Erik Killmonger",
      role: "Claimant to the throne",
      clueTags: ["grievance", "strategy", "punitive justice"],
      hint: "Lawlike mission, dark means.",
      rationale: "A revolutionary program with a spine of punishment—this cast puts him in lawful evil for contrast.",
      confidence: 0.72,
      monogram: "EK",
      accent: "#9c4c46",
      alignment: "lawful-evil",
    },
    {
      id: "marvel-ego",
      name: "Ego",
      role: "Celestial (expansionist)",
      clueTags: ["narcissism", "paternalism", "scale"],
      hint: "Evil of appetite and ego.",
      rationale: "Cruelty as self-expression more than a love of rules or chaos—neutral evil in this table.",
      confidence: 0.7,
      monogram: "EG",
      accent: "#9c4c46",
      alignment: "neutral-evil",
    },
    {
      id: "marvel-hydra",
      name: "Red Skull (Stonekeeper)",
      role: "Exile of ambition",
      clueTags: ["fanatic", "hollow", "menace"],
      hint: "Chaotic, cruel, cursed.",
      rationale: "A gleeful destructive presence at the far corner—serves chaotic evil in this skirmish set.",
      confidence: 0.65,
      monogram: "RS",
      accent: "#b35d76",
      alignment: "chaotic-evil",
    },
  ],
} satisfies {
  id: string;
  title: string;
  subtitle: string;
  disclaimer: string;
  people: TQuestBoard["palette"];
};

const actionBlockbusters = {
  id: "action-stars-demo",
  title: "Action movie icons",
  subtitle: "Big-screen brawlers and spies—snap judgments for a fast run.",
  disclaimer:
    "A tongue-in-cheek read for a party game, not a serious moral judgment on the films or the actors.",
  people: [
    {
      id: "action-ethan-hunt",
      name: "Ethan Hunt",
      role: "Mission: Impossible",
      clueTags: ["protocol", "saves the world", "team first"],
      hint: "By the mission brief, for good.",
      rationale: "Bends rules a little, but identity is service and the plan—lawful good in spirit.",
      confidence: 0.75,
      monogram: "EH",
      accent: "#4f7db8",
      alignment: "lawful-good",
    },
    {
      id: "action-john-mcclane",
      name: "John McClane",
      role: "Die Hard",
      clueTags: ["everyman", "sarcasm", "stubborn help"],
      hint: "Good, middle-of-the-road style.",
      rationale: "A decent cop in impossible rooms—not chasing law as theology, not chasing chaos for fun: neutral good.",
      confidence: 0.78,
      monogram: "JM",
      accent: "#5ba46e",
      alignment: "neutral-good",
    },
    {
      id: "action-john-wick",
      name: "John Wick",
      role: "Baba Yaga",
      clueTags: ["revenge", "code", "relentless"],
      hint: "Chaos, but a soft spot for the dog in us all.",
      rationale: "Operates outside police lines but is guided by a personal, violent kindness—chaotic good read.",
      confidence: 0.72,
      monogram: "JW",
      accent: "#5ba46e",
      alignment: "chaotic-good",
    },
    {
      id: "action-jack-reacher",
      name: "Jack Reacher",
      role: "Drifter with rules",
      clueTags: ["minimal", "lone", "procedure"],
      hint: "Lawful-adjacent loner.",
      rationale: "Has his own book of procedure; not here to debate harmony—lawful neutral.",
      confidence: 0.7,
      monogram: "JR",
      accent: "#4f7db8",
      alignment: "lawful-neutral",
    },
    {
      id: "action-mad-max",
      name: "Max Rockatansky",
      role: "Mad Max",
      clueTags: ["wasteland", "survive", "trauma"],
      hint: "Center of the road if there is a road.",
      rationale: "Survival and refusal to be owned by a fixed ideology—true neutral in the dust.",
      confidence: 0.66,
      monogram: "MR",
      accent: "#c29a52",
      alignment: "true-neutral",
    },
    {
      id: "action-john-rambo",
      name: "John Rambo",
      role: "First Blood series",
      clueTags: ["wound", "trigger", "force"],
      hint: "Unpredictable, not a villain in slot.",
      rationale: "Instinct, survival, and violence without a clear grand plan—chaotic neutral for this list.",
      confidence: 0.65,
      monogram: "RA",
      accent: "#b35d76",
      alignment: "chaotic-neutral",
    },
    {
      id: "action-hans-gruber",
      name: "Hans Gruber",
      role: "Die Hard",
      clueTags: ["heist", "patrician", "control"],
      hint: "Evil with a plan.",
      rationale: "Crime with manners and a timetable—textbook lawful evil in pop culture class.",
      confidence: 0.82,
      monogram: "HG",
      accent: "#9c4c46",
      alignment: "lawful-evil",
    },
    {
      id: "action-agent",
      name: "Agent Smith",
      role: "The Matrix",
      clueTags: ["system", "persistence", "cold"],
      hint: "Evil of pure function.",
      rationale: "Order used to erase, not to heal—sits in neutral evil for methodical menace over gleeful randomness.",
      confidence: 0.78,
      monogram: "AS",
      accent: "#9c4c46",
      alignment: "neutral-evil",
    },
    {
      id: "action-bane",
      name: "Bane",
      role: "The Dark Knight Rises",
      clueTags: ["theater", "pain", "revolution as costume"],
      hint: "Chaotic, imposing evil.",
      rationale: "Grand gestures, public terror, and personal theater—this cast maps him to chaotic evil.",
      confidence: 0.74,
      monogram: "BA",
      accent: "#b35d76",
      alignment: "chaotic-evil",
    },
  ],
} satisfies {
  id: string;
  title: string;
  subtitle: string;
  disclaimer: string;
  people: TQuestBoard["palette"];
};

const ttrpgParty = {
  id: "ttrpg-party-demo",
  title: "Tabletop RPG party",
  subtitle: "Classic class vibes for your campaign alignment chart.",
  disclaimer: "A generic fantasy party—swap names at your home table. Answer key is for this app run only.",
  people: [
    {
      id: "ttrpg-paladin",
      name: "Alden Brightshield",
      role: "Paladin",
      clueTags: ["oath", "smite", "armored"],
      hint: "Lawful and kind.",
      rationale: "Oath, armor, and public virtue—lawful good.",
      confidence: 0.7,
      monogram: "AB",
      accent: "#4f7db8",
      alignment: "lawful-good",
    },
    {
      id: "ttrpg-cleric",
      name: "Mira Voss",
      role: "Cleric of mercy",
      clueTags: ["heal", "comfort", "pragmatism"],
      hint: "Good, flexible on means.",
      rationale: "Care-first faith without a need to legislate the room—neutral good.",
      confidence: 0.68,
      monogram: "MV",
      accent: "#5ba46e",
      alignment: "neutral-good",
    },
    {
      id: "ttrpg-bard",
      name: "Rex Quickfoot",
      role: "Bard / troublemaker",
      clueTags: ["charm", "stunt", "empathy"],
      hint: "Chaotic, sweet.",
      rationale: "Talks their way in and out; heart usually lands right—chaotic good.",
      confidence: 0.66,
      monogram: "RQ",
      accent: "#5ba46e",
      alignment: "chaotic-good",
    },
    {
      id: "ttrpg-monk",
      name: "Sister Jian",
      role: "Monk, old order",
      clueTags: ["discipline", "routine", "quiet"],
      hint: "Law, not a sermon.",
      rationale: "Kata and order without preaching alignment politics—lawful neutral.",
      confidence: 0.64,
      monogram: "SJ",
      accent: "#4f7db8",
      alignment: "lawful-neutral",
    },
    {
      id: "ttrpg-druid",
      name: "Thorn Underleaf",
      role: "Druid",
      clueTags: ["balance", "seasons", "circle"],
      hint: "True middle.",
      rationale: "Cycles and ecosystems over heroes and villains in the abstract—true neutral.",
      confidence: 0.67,
      monogram: "TH",
      accent: "#c29a52",
      alignment: "true-neutral",
    },
    {
      id: "ttrpg-barbarian",
      name: "Gorr Stonejaw",
      role: "Barbarian",
      clueTags: ["rage", "impulse", "tribe"],
      hint: "Chaotic, not a villain by default.",
      rationale: "Instinct, appetite, and motion—chaotic neutral until the story sharpens the blade.",
      confidence: 0.63,
      monogram: "GS",
      accent: "#b35d76",
      alignment: "chaotic-neutral",
    },
    {
      id: "ttrpg-warlock",
      name: "Vex Ashcroft",
      role: "Warlock, patron’s bargain",
      clueTags: ["contract", "leverage", "fear"],
      hint: "Evil with fine print.",
      rationale: "Promises, debts, and controlled cruelty—lawful evil.",
      confidence: 0.65,
      monogram: "VA",
      accent: "#9c4c46",
      alignment: "lawful-evil",
    },
    {
      id: "ttrpg-rogue",
      name: "Kade Sharpeyes",
      role: "Rogue / assassin for hire",
      clueTags: ["price", "knife", "ambition"],
      hint: "Evil, flexible.",
      rationale: "Kills and steals without needing a cult—neutral evil.",
      confidence: 0.64,
      monogram: "KS",
      accent: "#9c4c46",
      alignment: "neutral-evil",
    },
    {
      id: "ttrpg-warlock-hex",
      name: "Lilith Mourn",
      role: "Warlock, burned path",
      clueTags: ["spite", "fire", "fun"],
      hint: "Chaotic evil flair.",
      rationale: "Delight in the wound as much as the win—chaotic evil at the table.",
      confidence: 0.62,
      monogram: "LM",
      accent: "#b35d76",
      alignment: "chaotic-evil",
    },
  ],
} satisfies {
  id: string;
  title: string;
  subtitle: string;
  disclaimer: string;
  people: TQuestBoard["palette"];
};

const videoGameSquad = {
  id: "video-games-demo",
  title: "Video game heroes (archetypal)",
  subtitle: "Familiar controller-era vibes for a quick sort.",
  disclaimer: "Picks are playful archetypes, not a review score on any studio’s writing.",
  people: [
    {
      id: "vg-link",
      name: "Link",
      role: "The Legend of Zelda",
      clueTags: ["destiny", "silence", "courage"],
      hint: "Lawful good, hero’s quest.",
      rationale: "Chosen duty, protect the weak, return every bottle—lawful good read.",
      confidence: 0.72,
      monogram: "LK",
      accent: "#4f7db8",
      alignment: "lawful-good",
    },
    {
      id: "vg-chief",
      name: "Master Chief",
      role: "Halo",
      clueTags: ["orders", "save everyone", "stoic"],
      hint: "Good through mission.",
      rationale: "Does the right thing in the field without sermonizing a philosophy—neutral good.",
      confidence: 0.74,
      monogram: "MC",
      accent: "#5ba46e",
      alignment: "neutral-good",
    },
    {
      id: "vg-mario",
      name: "Mario",
      role: "Super Mario",
      clueTags: ["jump", "help", "chaos with coins"],
      hint: "Chaotic, wholesome.",
      rationale: "Breaks the castle, saves the day, breaks the castle again—chaotic good energy.",
      confidence: 0.68,
      monogram: "MA",
      accent: "#5ba46e",
      alignment: "chaotic-good",
    },
    {
      id: "vg-shepard",
      name: "Commander Shepard",
      role: "Mass Effect (paragon lean)",
      clueTags: ["regs", "spectre", "hard calls"],
      hint: "Law and duty first.",
      rationale: "Military mind with a public mission—this cast frames them as lawful neutral baseline.",
      confidence: 0.7,
      monogram: "SH",
      accent: "#4f7db8",
      alignment: "lawful-neutral",
    },
    {
      id: "vg-chef",
      name: "The Chef (Cook, Serve, Delicious! tone)",
      role: "Just make the orders",
      clueTags: ["timer", "balance", "service"],
      hint: "Center of the pass.",
      rationale: "Neither hero nor villain—just the perfect ticket—true neutral for this bit.",
      confidence: 0.55,
      monogram: "CH",
      accent: "#c29a52",
      alignment: "true-neutral",
    },
    {
      id: "vg-sackboy",
      name: "Sackboy",
      role: "LittleBigPlanet",
      clueTags: ["craft", "whimsy", "side-eye"],
      hint: "Chaotic, cute.",
      rationale: "Soft chaos, creative trolling possible—chaotic neutral.",
      confidence: 0.58,
      monogram: "SB",
      accent: "#b35d76",
      alignment: "chaotic-neutral",
    },
    {
      id: "vg-ganon",
      name: "Ganondorf",
      role: "The Legend of Zelda",
      clueTags: ["dynasty", "power", "order of darkness"],
      hint: "Evil with a throne in mind.",
      rationale: "Conquest, ritual, and rule—lawful evil.",
      confidence: 0.76,
      monogram: "GD",
      accent: "#9c4c46",
      alignment: "lawful-evil",
    },
    {
      id: "vg-villain-ne",
      name: "GLaDOS",
      role: "Portal",
      clueTags: ["testing", "dry wit", "lethal labs"],
      hint: "Evil of the spreadsheet.",
      rationale: "Cold harm as procedure—classic neutral evil in tone.",
      confidence: 0.8,
      monogram: "GL",
      accent: "#9c4c46",
      alignment: "neutral-evil",
    },
    {
      id: "vg-kratos-early",
      name: "Kratos (early arc)",
      role: "God of War (classic)",
      clueTags: ["rage", "pantheon", "vengeance tour"],
      hint: "Chaotic, destructive.",
      rationale: "Pure violence-as-journey in the old games—chaotic evil for this list.",
      confidence: 0.7,
      monogram: "KR",
      accent: "#b35d76",
      alignment: "chaotic-evil",
    },
  ],
} satisfies {
  id: string;
  title: string;
  subtitle: string;
  disclaimer: string;
  people: TQuestBoard["palette"];
};

export const defaultPrompt = "Marvel characters";

export type TSuggestedTopic = { label: string; prompt: string; emoji: string; hook: string };

/** Shown in the app as tappable quick starts (each maps to a keyword match or a custom cast). */
export const suggestedTopics: TSuggestedTopic[] = [
  { label: "Marvel", prompt: "Marvel characters", emoji: "🦸", hook: "Capes, quips, cosmic stakes" },
  { label: "Action stars", prompt: "action movie icons", emoji: "🎬", hook: "Charisma cranked to eleven" },
  { label: "D&D / RPG", prompt: "my D&D party", emoji: "🎲", hook: "Your table, nine alignments" },
  { label: "Video games", prompt: "video game heroes", emoji: "🕹", hook: "Lore, loot, and boss energy" },
  { label: "Fast food", prompt: "fast food mascots", emoji: "🍟", hook: "Mascots with… strong opinions" },
  { label: "Shakespeare", prompt: "Shakespeare villains", emoji: "📜", hook: "The stage is a battlefield" },
  { label: "Politics (US)", prompt: "Trump administration", emoji: "🏛", hook: "Satirical sorting—game only" },
];

const boardMap: Array<{ keywords: string[]; board: typeof executiveCircle }> = [
  {
    keywords: [
      "marvel",
      "mcu",
      "avengers",
      "spider-man",
      "spiderman",
      "x-men",
      "wolverine",
      "thanos",
      "iron man",
      "captain america",
    ],
    board: marvelHeroes,
  },
  {
    keywords: [
      "action movie",
      "action star",
      "action hero",
      "action icons",
      "action blockbuster",
      "80s action",
      "die hard",
      "mission impossible",
      "john wick",
      "keanu",
      "stallone",
      "schwarzenegger",
      "statham",
      "fast and furious",
      "fast & furious",
      "bruce willis",
    ],
    board: actionBlockbusters,
  },
  {
    keywords: [
      "d&d",
      "dnd",
      "dungeons",
      "pathfinder",
      "ttrpg",
      "tabletop",
      "critical role", // culture-adjacent
    ],
    board: ttrpgParty,
  },
  {
    keywords: [
      "video game",
      "videogame",
      "gamer",
      "nintendo",
      "playstation",
      "xbox",
      "halo",
      "zelda",
      "mario",
      "mass effect",
      "portal",
    ],
    board: videoGameSquad,
  },
  {
    keywords: ["trump", "administration", "white house", "cabinet"],
    board: executiveCircle,
  },
  {
    keywords: ["shakespeare", "villains", "hamlet", "macbeth", "othello", "romeo", "iago", "lear"],
    board: shakespeareCourt,
  },
  {
    keywords: ["mascot", "fast food", "brand", "soda", "snack", "cereal"],
    board: mascotMayhem,
  },
];

function toAnswerKey(people: TQuestBoard["palette"]): TPlacements {
  return people.reduce(
    (placements, person) => {
      placements[person.alignment] = person.id;
      return placements;
    },
    {
      "lawful-good": null,
      "neutral-good": null,
      "chaotic-good": null,
      "lawful-neutral": null,
      "true-neutral": null,
      "chaotic-neutral": null,
      "lawful-evil": null,
      "neutral-evil": null,
      "chaotic-evil": null,
    } as TPlacements
  );
}

const EXPECTED_CELLS = 9;

function cloneBoard(source: typeof executiveCircle): TQuestBoard {
  if (source.people.length !== EXPECTED_CELLS) {
    throw new Error(`Cast "${source.id}" must have ${EXPECTED_CELLS} people for the 3x3 board.`);
  }

  return {
    id: source.id,
    title: source.title,
    subtitle: source.subtitle,
    disclaimer: source.disclaimer,
    palette: source.people.map((person) => ({ ...person })),
    answerKey: toAnswerKey(source.people),
  };
}

/**
 * Returns a hand-authored demo cast when the prompt matches known keywords; otherwise null.
 * Custom topics are resolved asynchronously via `resolveQuestBoard` (OpenAI).
 */
export function tryKeywordDemoBoard(prompt: string): TQuestBoard | null {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return null;
  }
  const lowered = trimmed.toLowerCase();
  const match = boardMap.find((entry) =>
    entry.keywords.some((keyword) => lowered.includes(keyword))
  );
  if (!match) {
    return null;
  }
  const board = cloneBoard(match.board);
  if (board.id === executiveCircle.id) {
    board.subtitle = `Prompt match: ${trimmed}. Local roster: nine figures mapped one-to-one to alignments.`;
  }
  return board;
}

/**
 * @deprecated Prefer `resolveQuestBoard` — this only returns keyword demos and throws otherwise.
 */
export function generateBoard(prompt: string): TQuestBoard {
  const board = tryKeywordDemoBoard(prompt);
  if (!board) {
    throw new Error("No keyword demo matched; use resolveQuestBoard() for custom topics.");
  }
  return board;
}

/** @deprecated Use `resolveQuestBoard` */
export const buildDemoBoard = generateBoard;

export function getAlignmentLabel(alignment: TAlignmentKey): string {
  switch (alignment) {
    case "lawful-good":
      return "Lawful Good";
    case "neutral-good":
      return "Neutral Good";
    case "chaotic-good":
      return "Chaotic Good";
    case "lawful-neutral":
      return "Lawful Neutral";
    case "true-neutral":
      return "True Neutral";
    case "chaotic-neutral":
      return "Chaotic Neutral";
    case "lawful-evil":
      return "Lawful Evil";
    case "neutral-evil":
      return "Neutral Evil";
    case "chaotic-evil":
      return "Chaotic Evil";
  }
}
