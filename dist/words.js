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
