update badges b set name = v.he_name, description = v.he_desc
from (values
('Heartbreaker','שובר לבבות','השלם 5 משימות דייטינג.'),
('Explorer','מגלה ארצות','השלם 10 משימות הרפתקה.'),
('Social Butterfly','פרפר חברתי','השלם 15 משימות חברתיות.'),
('Night Owl','ינשוף לילה','השלם 10 משימות של סוף השבוע.'),
('Kind Person','אדם טוב לב','השלם 10 משימות חסד.'),
('Foodie','חובב אוכל','השלם 10 משימות אוכל.'),
('Crazy Mode','מצב מטורף','השלם משימה ברמת קושי קיצונית.'),
('Fearless','חסר פחד','השלם 5 משימות קיצוניות.'),
('Rising Star','כוכב עולה','הגע לרמה 10.'),
('Veteran','ותיק','הגע לרמה 25.'),
('First Mission','משימה ראשונה','השלם את המשימה הראשונה שלך.'),
('Getting Started','יוצאים לדרך','השלם 5 משימות.'),
('100 Missions','100 משימות','השלם 100 משימות.'),
('???','???','הישג נסתר שמחכה להתגלות.'),
('The Completionist','המשלים','השלם 500 משימות.'),
('High Roller','מהמר כבד','צבור 5,000 נקודות.'),
('Week Warrior','לוחם שבועי','הגע לרצף של 7 ימים.'),
('On a Roll','על גל','הגע לרצף של 3 ימים.'),
('Legend','אגדה','הגע לרצף אגדי של 100 ימים.'),
('30 Day Streak','רצף של 30 יום','הגע לרצף של 30 ימים.')
) as v(en_name, he_name, he_desc)
where b.name = v.en_name;
select count(*) filter (where name ~ '[a-zA-Z]' and name <> '???') as english_badges_left from badges;
