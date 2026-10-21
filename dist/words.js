const SOURCE_WORDS = `abroad|בחוץ לארץ
adventure|הרפתקה
amazed|נדהם
amazing|מדהים
band|להקה
beg|להתחנן
bill|חשבון
boring|משעמם
can't afford|לא יכול להרשות לעצמו
championship|אליפות
character|דמות
come to life|להתעורר לחיים
danger|סכנה
deserve|להיות ראוי
dreams come true|חלומות מתגשמים
elevator|מעלית
entertainment|בידור
especially|במיוחד
exciting|מרגש
experience|חוויה; לחוות
fantasy|פנטזיה
guilty|אשם
hits|להיטים
in trouble|בצרות
listener|מאזין
light up|להאיר
lose control|לאבד שליטה
mission|משימה
musician|מוזיקאי
out of this world|יוצא מן הכלל
pleasant|נעים
prefer|להעדיף
probably|כנראה
refuse|לסרב
relax|להירגע
rescue|להציל
reward|פרס; גמול
ride|לרכוב
science fiction|מדע בדיוני
second-hand|יד שנייה
space|חלל
stage|במה
star|לככב
succeed|להצליח
thrilling|מרתק; מלהיב
tower|מגדל
adventurous|הרפתקני
blame|להאשים
bravery|אומץ לב
busy street|רחוב סואן
disagree|לא להסכים
harmful|מזיק
realize|להבין; להיווכח
scene|סצנה
show off|להשוויץ
stunt|פעלול
suitable|מתאים
turn into|להפוך ל־`.split('\n').map((line,i)=>{const [en,he]=line.split('|');return {en,he,extra:i>=46,sentence:'',translation:'',cloze:''};});

// Original practice examples, not quotations from the textbook.
const PRACTICE_EXAMPLES = [["We travel abroad every summer.","אנחנו נוסעים לחוץ לארץ בכל קיץ."],["The trip was a great adventure.","הטיול היה הרפתקה נהדרת."],["I was amazed by the view.","נדהמתי מהנוף."],["The show was amazing.","המופע היה מדהים."],["My brother plays in a band.","אחי מנגן בלהקה."],["Please do not beg for another prize.","בבקשה אל תתחנן לפרס נוסף."],["We asked the waiter for the bill.","ביקשנו מהמלצר את החשבון."],["This film is boring.","הסרט הזה משעמם."],["I can't afford a new bike.","אני לא יכול להרשות לעצמי אופניים חדשים."],["Our team won the championship.","הקבוצה שלנו זכתה באליפות."],["My favorite character is a brave girl.","הדמות האהובה עליי היא ילדה אמיצה."],["In this story, toys come to life.","בסיפור הזה צעצועים מתעוררים לחיים."],["The sign warns us of danger.","השלט מזהיר אותנו מפני סכנה."],["You deserve a break after your hard work.","מגיעה לך הפסקה אחרי העבודה הקשה שלך."],["Sometimes dreams come true.","לפעמים חלומות מתגשמים."],["Take the elevator to the fifth floor.","עלו במעלית לקומה החמישית."],["The park offers entertainment for everyone.","הפארק מציע בידור לכולם."],["I like fruit, especially apples.","אני אוהב פירות, במיוחד תפוחים."],["The final game was exciting.","משחק הגמר היה מרגש."],["Visiting London was a wonderful experience.","הביקור בלונדון היה חוויה נפלאה."],["She enjoys reading fantasy books.","היא נהנית לקרוא ספרי פנטזיה."],["He felt guilty after telling a lie.","הוא הרגיש אשם אחרי שסיפר שקר."],["The singer performed her biggest hits.","הזמרת ביצעה את הלהיטים הגדולים ביותר שלה."],["The boy was in trouble for being late.","הילד הסתבך בצרות כי איחר."],["A good listener pays attention.","מאזין טוב מקשיב בתשומת לב."],["The stars light up the sky.","הכוכבים מאירים את השמיים."],["A driver must not lose control of the car.","אסור לנהג לאבד שליטה על המכונית."],["Our mission is to clean the beach.","המשימה שלנו היא לנקות את החוף."],["The musician played the piano.","המוזיקאי ניגן בפסנתר."],["This cake is out of this world.","העוגה הזאת יוצאת מן הכלל."],["We had a pleasant evening.","היה לנו ערב נעים."],["I prefer tea to coffee.","אני מעדיף תה על קפה."],["It will probably rain tomorrow.","כנראה ירד גשם מחר."],["I refuse to give up.","אני מסרב לוותר."],["Sit down and relax.","שב והירגע."],["The firefighters came to rescue the cat.","הכבאים באו להציל את החתול."],["She received a reward for her help.","היא קיבלה פרס על עזרתה."],["I ride my bike to school.","אני רוכב על האופניים שלי לבית הספר."],["He loves science fiction films.","הוא אוהב סרטי מדע בדיוני."],["We bought a second-hand table.","קנינו שולחן מיד שנייה."],["Astronauts travel into space.","אסטרונאוטים נוסעים לחלל."],["The actors walked onto the stage.","השחקנים עלו לבמה."],["She will star in the new film.","היא תככב בסרט החדש."],["Practice helps you succeed.","תרגול עוזר לך להצליח."],["The roller coaster was thrilling.","רכבת ההרים הייתה מלהיבה."],["We climbed to the top of the tower.","טיפסנו לראש המגדל."],["My adventurous friend loves exploring.","החבר ההרפתקני שלי אוהב לחקור."],["Do not blame others for your mistakes.","אל תאשים אחרים בטעויות שלך."],["The soldier showed great bravery.","החייל הפגין אומץ לב רב."],["Be careful when crossing a busy street.","היזהרו כשחוצים רחוב סואן."],["We disagree about the best film.","אנחנו לא מסכימים לגבי הסרט הטוב ביותר."],["Smoking is harmful to your health.","עישון מזיק לבריאות שלך."],["I realize that I need more practice.","אני מבין שאני צריך עוד תרגול."],["The last scene made me laugh.","הסצנה האחרונה הצחיקה אותי."],["He likes to show off his new shoes.","הוא אוהב להשוויץ בנעליים החדשות שלו."],["The actor performed a dangerous stunt.","השחקן ביצע פעלול מסוכן."],["This book is suitable for teenagers.","הספר הזה מתאים לבני נוער."],["Caterpillars turn into butterflies.","זחלים הופכים לפרפרים."]];
SOURCE_WORDS.forEach((w,i)=>{[w.sentence,w.translation]=PRACTICE_EXAMPLES[i];w.cloze=w.sentence.replace(new RegExp(w.en.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i"),"___");});
