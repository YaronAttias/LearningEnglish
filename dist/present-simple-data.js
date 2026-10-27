// Original grammar exercises using the New Mosaic Unit 1 vocabulary.
const PRESENT_SIMPLE_QUESTIONS = [
  {
    "kind": "positive",
    "before": "She",
    "after": "fantasy books.",
    "answer": [
      "prefers"
    ],
    "tip": "עם she מוסיפים s: prefer → prefers.",
    "id": "ps-1",
    "options": [
      "prefer",
      "prefers",
      "preferring",
      "preferred"
    ]
  },
  {
    "kind": "positive",
    "before": "He",
    "after": "his bike to school every day.",
    "answer": [
      "rides"
    ],
    "tip": "עם he מוסיפים s: ride → rides.",
    "id": "ps-2",
    "options": [
      "ride",
      "rides",
      "riding",
      "rode"
    ]
  },
  {
    "kind": "positive",
    "before": "The musician",
    "after": "on stage every Friday.",
    "answer": [
      "plays"
    ],
    "tip": "הנושא The musician הוא יחיד, ולכן מוסיפים s לפועל.",
    "id": "ps-3",
    "options": [
      "play",
      "plays",
      "playing",
      "played"
    ]
  },
  {
    "kind": "positive",
    "before": "The stars",
    "after": "the sky every night.",
    "answer": [
      "light up"
    ],
    "tip": "The stars הוא נושא ברבים, ולכן משתמשים ב־light up ללא s.",
    "id": "ps-4",
    "options": [
      "light up",
      "lights up",
      "lighting up",
      "lit up"
    ]
  },
  {
    "kind": "positive",
    "before": "My brother",
    "after": "after school every day.",
    "answer": [
      "relaxes"
    ],
    "tip": "עם נושא יחיד ופועל שמסתיים ב־x מוסיפים es: relaxes.",
    "id": "ps-5",
    "options": [
      "relax",
      "relaxes",
      "relaxing",
      "relaxed"
    ]
  },
  {
    "kind": "positive",
    "before": "The brave firefighter",
    "after": "animals from danger.",
    "answer": [
      "rescues"
    ],
    "tip": "The firefighter הוא נושא יחיד, ולכן משתמשים ב־rescues.",
    "id": "ps-6",
    "options": [
      "rescue",
      "rescues",
      "rescuing",
      "rescued"
    ]
  },
  {
    "kind": "positive",
    "before": "This character",
    "after": "into a bird in every story.",
    "answer": [
      "turns"
    ],
    "tip": "This character הוא נושא יחיד: turns into.",
    "id": "ps-7",
    "options": [
      "turn",
      "turns",
      "turning",
      "turned"
    ]
  },
  {
    "kind": "positive",
    "before": "My friends",
    "after": "science fiction films every weekend.",
    "answer": [
      "watch"
    ],
    "tip": "My friends הוא נושא ברבים, ולכן משתמשים ב־watch ללא es.",
    "id": "ps-8",
    "options": [
      "watch",
      "watches",
      "watching",
      "watched"
    ]
  },
  {
    "kind": "negative",
    "before": "The musician",
    "after": "on Sundays. He works all day.",
    "answer": [
      "doesn't relax"
    ],
    "tip": "בשלילה עם נושא יחיד משתמשים ב־doesn’t ובפועל הבסיס relax.",
    "id": "ps-9",
    "options": [
      "don't relax",
      "doesn't relax",
      "doesn't relaxes",
      "not relax"
    ]
  },
  {
    "kind": "negative",
    "before": "We",
    "after": "about the mission. We all have the same opinion.",
    "answer": [
      "don't disagree"
    ],
    "tip": "עם we משתמשים ב־don’t ואחריו פועל הבסיס disagree.",
    "id": "ps-10",
    "options": [
      "doesn't disagree",
      "don't disagrees",
      "don't disagree",
      "not disagree"
    ]
  },
  {
    "kind": "negative",
    "before": "She",
    "after": "other people for her mistakes.",
    "answer": [
      "doesn't blame"
    ],
    "tip": "עם she משתמשים ב־doesn’t ואחריו blame ללא s.",
    "id": "ps-11",
    "options": [
      "don't blame",
      "doesn't blames",
      "doesn't blame",
      "not blame"
    ]
  },
  {
    "kind": "negative",
    "before": "They",
    "after": "second-hand bikes in this shop.",
    "answer": [
      "don't sell"
    ],
    "tip": "עם they משתמשים ב־don’t ואחריו sell בצורת הבסיס.",
    "id": "ps-12",
    "options": [
      "don't sell",
      "doesn't sell",
      "don't sells",
      "not sell"
    ]
  },
  {
    "kind": "negative",
    "before": "He",
    "after": "to help people in danger.",
    "answer": [
      "doesn't refuse"
    ],
    "tip": "עם he משתמשים ב־doesn’t ואחריו refuse ללא s.",
    "id": "ps-13",
    "options": [
      "doesn't refuse",
      "don't refuse",
      "doesn't refuses",
      "not refuse"
    ]
  },
  {
    "kind": "negative",
    "before": "I",
    "after": "to show off my new clothes.",
    "answer": [
      "don't like"
    ],
    "tip": "עם I משתמשים ב־don’t ואחריו like בצורת הבסיס.",
    "id": "ps-14",
    "options": [
      "doesn't like",
      "don't likes",
      "not like",
      "don't like"
    ]
  },
  {
    "kind": "question",
    "before": "",
    "after": "she prefer science fiction?",
    "answer": [
      "does"
    ],
    "tip": "שאלה עם she מתחילה ב־Does. הפועל prefer נשאר בצורת הבסיס.",
    "id": "ps-15",
    "options": [
      "Do",
      "Does",
      "Is",
      "Are"
    ]
  },
  {
    "kind": "question",
    "before": "",
    "after": "they travel abroad every summer?",
    "answer": [
      "do"
    ],
    "tip": "שאלה עם they מתחילה ב־Do.",
    "id": "ps-16",
    "options": [
      "Does",
      "Are",
      "Do",
      "Is"
    ]
  },
  {
    "kind": "question",
    "before": "",
    "after": "your brother ride his bike across the busy street?",
    "answer": [
      "does"
    ],
    "tip": "your brother הוא נושא יחיד, ולכן השאלה מתחילה ב־Does.",
    "id": "ps-17",
    "options": [
      "Do",
      "Does",
      "Is",
      "Are"
    ]
  },
  {
    "kind": "question",
    "before": "Where",
    "after": "the band play every Friday?",
    "answer": [
      "does"
    ],
    "tip": "אחרי Where משתמשים ב־does עם הנושא היחיד the band.",
    "id": "ps-18",
    "options": [
      "do",
      "does",
      "is",
      "are"
    ]
  },
  {
    "kind": "question",
    "before": "What",
    "after": "you do to relax after school?",
    "answer": [
      "do"
    ],
    "tip": "בשאלה עם you משתמשים ב־do. הפועל do שאחריו הוא הפועל הראשי.",
    "id": "ps-19",
    "options": [
      "does",
      "are",
      "do",
      "is"
    ]
  },
  {
    "kind": "question",
    "before": "How often",
    "after": "she watch adventure films?",
    "answer": [
      "does"
    ],
    "tip": "אחרי How often משתמשים ב־does עם she, ואחריו watch ללא es.",
    "id": "ps-20",
    "options": [
      "do",
      "is",
      "does",
      "are"
    ]
  },
  {
    "kind": "positive",
    "before": "My sister",
    "after": "to help people in trouble.",
    "answer": [
      "tries"
    ],
    "tip": "עם נושא יחיד, בפועל try מחליפים y ב־ies: tries.",
    "id": "ps-21",
    "options": [
      "try",
      "tries",
      "trying",
      "tried"
    ]
  },
  {
    "kind": "positive",
    "before": "We",
    "after": "a reward after our hard work.",
    "answer": [
      "deserve"
    ],
    "tip": "עם we משתמשים בפועל הבסיס deserve ללא s.",
    "id": "ps-22",
    "options": [
      "deserve",
      "deserves",
      "deserving",
      "deserved"
    ]
  },
  {
    "kind": "positive",
    "before": "The actors",
    "after": "the scene every morning.",
    "answer": [
      "practice"
    ],
    "tip": "The actors הוא נושא ברבים, ולכן משתמשים ב־practice.",
    "id": "ps-23",
    "options": [
      "practice",
      "practices",
      "practicing",
      "practiced"
    ]
  },
  {
    "kind": "positive",
    "before": "He",
    "after": "the danger before every stunt.",
    "answer": [
      "realizes"
    ],
    "tip": "עם he מוסיפים s: realize → realizes.",
    "id": "ps-24",
    "options": [
      "realize",
      "realizes",
      "realizing",
      "realized"
    ]
  },
  {
    "kind": "positive",
    "before": "The elevator",
    "after": "at the top of the tower.",
    "answer": [
      "stops"
    ],
    "tip": "The elevator הוא נושא יחיד, ולכן משתמשים ב־stops.",
    "id": "ps-25",
    "options": [
      "stop",
      "stops",
      "stopping",
      "stopped"
    ]
  },
  {
    "kind": "positive",
    "before": "Our dreams",
    "after": "true when we work hard.",
    "answer": [
      "come"
    ],
    "tip": "Our dreams הוא נושא ברבים: dreams come true.",
    "id": "ps-26",
    "options": [
      "come",
      "comes",
      "coming",
      "came"
    ]
  },
  {
    "kind": "positive",
    "before": "This film",
    "after": "a famous musician.",
    "answer": [
      "stars"
    ],
    "tip": "This film הוא נושא יחיד, ולכן משתמשים ב־stars.",
    "id": "ps-27",
    "options": [
      "star",
      "stars",
      "starring",
      "starred"
    ]
  },
  {
    "kind": "positive",
    "before": "She always",
    "after": "the bill after dinner.",
    "answer": [
      "pays"
    ],
    "tip": "עם she מוסיפים s: pay → pays. האות שלפני y היא תנועה.",
    "id": "ps-28",
    "options": [
      "pay",
      "pays",
      "paying",
      "paid"
    ]
  },
  {
    "kind": "positive",
    "before": "My adventurous friends",
    "after": "new places every summer.",
    "answer": [
      "explore"
    ],
    "tip": "My friends הוא נושא ברבים, ולכן משתמשים ב־explore.",
    "id": "ps-29",
    "options": [
      "explore",
      "explores",
      "exploring",
      "explored"
    ]
  },
  {
    "kind": "positive",
    "before": "He usually",
    "after": "in the championship because he trains hard.",
    "answer": [
      "succeeds"
    ],
    "tip": "עם he מוסיפים s לפועל succeed.",
    "id": "ps-30",
    "options": [
      "succeed",
      "succeeds",
      "succeeding",
      "succeeded"
    ]
  },
  {
    "kind": "positive",
    "before": "I",
    "after": "a pleasant walk after school.",
    "answer": [
      "enjoy"
    ],
    "tip": "עם I משתמשים ב־enjoy ללא s.",
    "id": "ps-31",
    "options": [
      "enjoy",
      "enjoys",
      "enjoying",
      "enjoyed"
    ]
  },
  {
    "kind": "positive",
    "before": "The toy characters",
    "after": "to life in this story.",
    "answer": [
      "come"
    ],
    "tip": "The toy characters הוא נושא ברבים: come to life.",
    "id": "ps-32",
    "options": [
      "come",
      "comes",
      "coming",
      "came"
    ]
  },
  {
    "kind": "negative",
    "before": "The band",
    "after": "on stage on Mondays.",
    "answer": [
      "doesn't play"
    ],
    "tip": "עם נושא יחיד משתמשים ב־doesn’t ואחריו הפועל בצורת הבסיס, ללא s.",
    "id": "ps-33",
    "options": [
      "doesn't play",
      "don't play",
      "doesn't plays",
      "not play"
    ]
  },
  {
    "kind": "negative",
    "before": "We",
    "after": "abroad during the school year.",
    "answer": [
      "don't travel"
    ],
    "tip": "עם I / you / we / they או נושא ברבים משתמשים ב־don’t ואחריו הפועל בצורת הבסיס.",
    "id": "ps-34",
    "options": [
      "doesn't travel",
      "don't travels",
      "not travel",
      "don't travel"
    ]
  },
  {
    "kind": "negative",
    "before": "She",
    "after": "the elevator to reach her flat.",
    "answer": [
      "doesn't use"
    ],
    "tip": "עם נושא יחיד משתמשים ב־doesn’t ואחריו הפועל בצורת הבסיס, ללא s.",
    "id": "ps-35",
    "options": [
      "don't use",
      "doesn't uses",
      "doesn't use",
      "not use"
    ]
  },
  {
    "kind": "negative",
    "before": "They",
    "after": "control during a dangerous stunt.",
    "answer": [
      "don't lose"
    ],
    "tip": "עם I / you / we / they או נושא ברבים משתמשים ב־don’t ואחריו הפועל בצורת הבסיס.",
    "id": "ps-36",
    "options": [
      "don't lose",
      "doesn't lose",
      "don't loses",
      "not lose"
    ]
  },
  {
    "kind": "negative",
    "before": "He",
    "after": "the danger near the busy street.",
    "answer": [
      "doesn't realize"
    ],
    "tip": "עם נושא יחיד משתמשים ב־doesn’t ואחריו הפועל בצורת הבסיס, ללא s.",
    "id": "ps-37",
    "options": [
      "doesn't realizes",
      "not realize",
      "don't realize",
      "doesn't realize"
    ]
  },
  {
    "kind": "negative",
    "before": "I",
    "after": "science fiction to fantasy.",
    "answer": [
      "don't prefer"
    ],
    "tip": "עם I / you / we / they או נושא ברבים משתמשים ב־don’t ואחריו הפועל בצורת הבסיס.",
    "id": "ps-38",
    "options": [
      "don't prefer",
      "doesn't prefer",
      "don't prefers",
      "not prefer"
    ]
  },
  {
    "kind": "negative",
    "before": "The listener",
    "after": "the musician during the show.",
    "answer": [
      "doesn't interrupt"
    ],
    "tip": "עם נושא יחיד משתמשים ב־doesn’t ואחריו הפועל בצורת הבסיס, ללא s.",
    "id": "ps-39",
    "options": [
      "don't interrupt",
      "doesn't interrupt",
      "doesn't interrupts",
      "not interrupt"
    ]
  },
  {
    "kind": "negative",
    "before": "These lights",
    "after": "the stage very well.",
    "answer": [
      "don't light up"
    ],
    "tip": "עם I / you / we / they או נושא ברבים משתמשים ב־don’t ואחריו הפועל בצורת הבסיס.",
    "id": "ps-40",
    "options": [
      "doesn't light up",
      "don't lights up",
      "don't light up",
      "not light up"
    ]
  },
  {
    "kind": "negative",
    "before": "My brother",
    "after": "off his new bike.",
    "answer": [
      "doesn't show"
    ],
    "tip": "עם נושא יחיד משתמשים ב־doesn’t ואחריו הפועל בצורת הבסיס, ללא s.",
    "id": "ps-41",
    "options": [
      "doesn't show",
      "don't show",
      "doesn't shows",
      "not show"
    ]
  },
  {
    "kind": "negative",
    "before": "We",
    "after": "a reward for every small task.",
    "answer": [
      "don't expect"
    ],
    "tip": "עם I / you / we / they או נושא ברבים משתמשים ב־don’t ואחריו הפועל בצורת הבסיס.",
    "id": "ps-42",
    "options": [
      "don't expects",
      "doesn't expect",
      "not expect",
      "don't expect"
    ]
  },
  {
    "kind": "negative",
    "before": "The story",
    "after": "into a boring lesson.",
    "answer": [
      "doesn't turn"
    ],
    "tip": "עם נושא יחיד משתמשים ב־doesn’t ואחריו הפועל בצורת הבסיס, ללא s.",
    "id": "ps-43",
    "options": [
      "don't turn",
      "doesn't turn",
      "doesn't turns",
      "not turn"
    ]
  },
  {
    "kind": "negative",
    "before": "You",
    "after": "to do harmful things to succeed.",
    "answer": [
      "don't need"
    ],
    "tip": "עם I / you / we / they או נושא ברבים משתמשים ב־don’t ואחריו הפועל בצורת הבסיס.",
    "id": "ps-44",
    "options": [
      "doesn't need",
      "don't needs",
      "don't need",
      "not need"
    ]
  },
  {
    "kind": "negative",
    "before": "The musician",
    "after": "for money after the show.",
    "answer": [
      "doesn't beg"
    ],
    "tip": "עם נושא יחיד משתמשים ב־doesn’t ואחריו הפועל בצורת הבסיס, ללא s.",
    "id": "ps-45",
    "options": [
      "doesn't begs",
      "not beg",
      "doesn't beg",
      "don't beg"
    ]
  },
  {
    "kind": "negative",
    "before": "They",
    "after": "suitable entertainment for children here.",
    "answer": [
      "don't offer"
    ],
    "tip": "עם I / you / we / they או נושא ברבים משתמשים ב־don’t ואחריו הפועל בצורת הבסיס.",
    "id": "ps-46",
    "options": [
      "don't offer",
      "doesn't offer",
      "don't offers",
      "not offer"
    ]
  },
  {
    "kind": "question",
    "before": "",
    "after": "you enjoy thrilling adventures?",
    "answer": [
      "do"
    ],
    "tip": "עם I / you / we / they או נושא ברבים משתמשים ב־Do, ואחריו הנושא והפועל בצורת הבסיס.",
    "id": "ps-47",
    "options": [
      "Do",
      "Does",
      "Are",
      "Is"
    ]
  },
  {
    "kind": "question",
    "before": "",
    "after": "the musician play his biggest hits at every concert?",
    "answer": [
      "does"
    ],
    "tip": "עם he / she / it או נושא יחיד משתמשים ב־Does, ואחריו הנושא והפועל בצורת הבסיס.",
    "id": "ps-48",
    "options": [
      "Do",
      "Is",
      "Does",
      "Are"
    ]
  },
  {
    "kind": "question",
    "before": "Where",
    "after": "they keep the second-hand books?",
    "answer": [
      "do"
    ],
    "tip": "עם I / you / we / they או נושא ברבים משתמשים ב־Do, ואחריו הנושא והפועל בצורת הבסיס.",
    "id": "ps-49",
    "options": [
      "does",
      "do",
      "are",
      "is"
    ]
  },
  {
    "kind": "question",
    "before": "",
    "after": "your sister enjoy exciting films?",
    "answer": [
      "does"
    ],
    "tip": "עם he / she / it או נושא יחיד משתמשים ב־Does, ואחריו הנושא והפועל בצורת הבסיס.",
    "id": "ps-50",
    "options": [
      "Are",
      "Do",
      "Is",
      "Does"
    ]
  },
  {
    "kind": "question",
    "before": "How often",
    "after": "you take the elevator?",
    "answer": [
      "do"
    ],
    "tip": "עם I / you / we / they או נושא ברבים משתמשים ב־Do, ואחריו הנושא והפועל בצורת הבסיס.",
    "id": "ps-51",
    "options": [
      "do",
      "does",
      "are",
      "is"
    ]
  },
  {
    "kind": "question",
    "before": "",
    "after": "these toys come to life in the story?",
    "answer": [
      "do"
    ],
    "tip": "עם I / you / we / they או נושא ברבים משתמשים ב־Do, ואחריו הנושא והפועל בצורת הבסיס.",
    "id": "ps-52",
    "options": [
      "Does",
      "Is",
      "Do",
      "Are"
    ]
  },
  {
    "kind": "question",
    "before": "Why",
    "after": "he blame others for his mistakes?",
    "answer": [
      "does"
    ],
    "tip": "עם he / she / it או נושא יחיד משתמשים ב־Does, ואחריו הנושא והפועל בצורת הבסיס.",
    "id": "ps-53",
    "options": [
      "do",
      "does",
      "is",
      "are"
    ]
  },
  {
    "kind": "question",
    "before": "",
    "after": "they disagree about the best fantasy film?",
    "answer": [
      "do"
    ],
    "tip": "עם I / you / we / they או נושא ברבים משתמשים ב־Do, ואחריו הנושא והפועל בצורת הבסיס.",
    "id": "ps-54",
    "options": [
      "Does",
      "Are",
      "Is",
      "Do"
    ]
  },
  {
    "kind": "question",
    "before": "When",
    "after": "the band go on stage?",
    "answer": [
      "does"
    ],
    "tip": "עם he / she / it או נושא יחיד משתמשים ב־Does, ואחריו הנושא והפועל בצורת הבסיס.",
    "id": "ps-55",
    "options": [
      "does",
      "do",
      "is",
      "are"
    ]
  },
  {
    "kind": "question",
    "before": "",
    "after": "your friend realize the danger?",
    "answer": [
      "does"
    ],
    "tip": "עם he / she / it או נושא יחיד משתמשים ב־Does, ואחריו הנושא והפועל בצורת הבסיס.",
    "id": "ps-56",
    "options": [
      "Do",
      "Is",
      "Does",
      "Are"
    ]
  },
  {
    "kind": "question",
    "before": "How often",
    "after": "you read about space?",
    "answer": [
      "do"
    ],
    "tip": "עם I / you / we / they או נושא ברבים משתמשים ב־Do, ואחריו הנושא והפועל בצורת הבסיס.",
    "id": "ps-57",
    "options": [
      "are",
      "does",
      "do",
      "is"
    ]
  },
  {
    "kind": "question",
    "before": "",
    "after": "the firefighter rescue animals in trouble?",
    "answer": [
      "does"
    ],
    "tip": "עם he / she / it או נושא יחיד משתמשים ב־Does, ואחריו הנושא והפועל בצורת הבסיס.",
    "id": "ps-58",
    "options": [
      "Do",
      "Does",
      "Is",
      "Are"
    ]
  },
  {
    "kind": "question",
    "before": "Where",
    "after": "they train for the championship?",
    "answer": [
      "do"
    ],
    "tip": "עם I / you / we / they או נושא ברבים משתמשים ב־Do, ואחריו הנושא והפועל בצורת הבסיס.",
    "id": "ps-59",
    "options": [
      "does",
      "are",
      "is",
      "do"
    ]
  },
  {
    "kind": "question",
    "before": "Why",
    "after": "she refuse to cross the busy street?",
    "answer": [
      "does"
    ],
    "tip": "עם he / she / it או נושא יחיד משתמשים ב־Does, ואחריו הנושא והפועל בצורת הבסיס.",
    "id": "ps-60",
    "options": [
      "does",
      "do",
      "is",
      "are"
    ]
  }
];
