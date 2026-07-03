# 🚀 מדריך שחרור — Spontani

מדריך צעד-אחר-צעד לכל מה שדורש פעולה ידנית שלך כדי להוציא את האפליקציה.
מסודר לפי סדר ביצוע. זמן כולל של עבודה נטו: בערך שעה-שעתיים, פלוס המתנה
לאישור של Apple (יום-יומיים).

> מה **לא** במדריך: כל מה שכבר בוצע אוטומטית — CI ירוק, מחיקת חשבון בתוך
> האפליקציה, עמוד מדיניות פרטיות (`/privacy`), מיגרציות מסונכרנות, ו-pipeline
> אחד ברור ל-iOS (`.github/workflows/ios-release.yml`, מבוסס EAS).

---

## שלב 1 — שינוי ה-default branch ל-`main` (5 דקות, חינם)

**למה:** כל ה-pipelines (deploy, iOS, OTA, database) מקשיבים ל-push על `main`,
אבל ה-default branch של הריפו הוא `claude/spontani-social-app-dqsklc`, אז שום
דבר לא רץ אוטומטית.

**איך:**

1. גש ל: https://github.com/sharonekub-svg/spontaneous/settings/branches
2. ליד שם ה-branch הראשי לחץ על אייקון העיפרון (Rename branch).
3. שנה את השם ל-`main` ואשר. GitHub מעדכן אוטומטית את כל ה-clones הפתוחים
   עם הוראות משיכה.
4. מעכשיו: כל merge של PR → מפעיל את כל ה-pipelines.

---

## שלב 2 — הפעלת GitHub Pages (2 דקות, חינם) — נותן URL חי לאפליקציה ולמדיניות הפרטיות

**למה:** ה-workflow של Pages רץ ונכשל בצעד "Configure Pages" כי Pages לא
מופעל בריפו. ברגע שתפעיל — יהיה לך דמו ווב חי, כולל
`https://sharonekub-svg.github.io/spontaneous/privacy` שתצטרך בשלב 6
(Apple דורשת URL של מדיניות פרטיות).

**איך:**

1. גש ל: https://github.com/sharonekub-svg/spontaneous/settings/pages
2. תחת **Source** בחר **GitHub Actions**.
3. גש ל-Actions → "Deploy web to GitHub Pages" → **Run workflow**.
4. אחרי כ-2 דקות האתר חי ב-`https://sharonekub-svg.github.io/spontaneous`.

> חלופה: Vercel. הוסף secret בשם `VERCEL_TOKEN` (מ-vercel.com → Settings →
> Tokens) והרץ את ה-workflow "Deploy to Vercel" מלשונית Actions. שניהם
> נותנים URL תקין למדיניות פרטיות — מספיק אחד מהם.

---

## שלב 3 — הרשמה ל-Apple Developer Program ($99/שנה — חובה, אין דרך לעקוף)

**למה:** Apple לא מאפשרת TestFlight או App Store בלי חברות בתוכנית.
זה הפריט היחיד בכל התהליך שעולה כסף.

**איך:**

1. גש ל: https://developer.apple.com/programs/enroll/
2. התחבר עם Apple ID (או צור אחד). מומלץ להפעיל אימות דו-שלבי מראש —
   זו דרישה.
3. בחר הרשמה כ-**Individual** (אלא אם יש לך חברה רשומה ואתה רוצה ששמה
   יופיע בחנות).
4. שלם $99. האישור בדרך כלל תוך 24-48 שעות (מייל).

**בזמן ההמתנה אפשר לעשות את שלבים 4-5.**

---

## שלב 4 — חשבון Expo + `eas init` (10 דקות, חינם)

**למה:** ב-`app.json` יש `projectId` מזויף (כולו אפסים) — בלי אמיתי אין
builds, אין עדכוני OTA ואין push notifications אמיתיים.

**איך (על המחשב שלך, בתיקיית הפרויקט):**

```bash
# פעם אחת:
npm i -g eas-cli
eas login              # צור חשבון חינם ב-expo.dev אם אין

# בתיקיית הפרויקט:
eas init               # יוצר את הפרויקט ב-Expo וכותב projectId אמיתי ל-app.json
eas update:configure   # מכוון את כתובת עדכוני ה-OTA ב-app.json
git add app.json && git commit -m "chore: real EAS project id" && git push
```

---

## שלב 5 — סוד `EXPO_TOKEN` ב-GitHub (3 דקות, חינם)

**למה:** זה הסוד היחיד שכל ה-pipelines של EAS צריכים (גם OTA וגם TestFlight).

**איך:**

1. גש ל: https://expo.dev → התחבר → Account Settings → **Access tokens** →
   **Create token**. תן שם כמו `github-actions` והעתק את הערך.
2. גש ל: https://github.com/sharonekub-svg/spontaneous/settings/secrets/actions
3. **New repository secret** → שם: `EXPO_TOKEN`, ערך: הטוקן. שמור.

**בדיקה:** Actions → "EAS Update (OTA)" → Run workflow → בחר `preview`.
אם עבר ירוק — כל שרשרת ה-Expo מחוברת. אפשר כבר עכשיו לפתוח את האפליקציה
ב-**Expo Go** בטלפון (התחבר עם חשבון ה-Expo שלך → Projects → Spontani).

---

## שלב 6 — אחרי אישור Apple: חיבור החתימה וההגשה (30-40 דקות, פעם אחת)

**למה:** EAS צריך הרשאה לחתום על האפליקציה ולהעלות ל-App Store Connect.
עושים את זה פעם אחת בצורה אינטראקטיבית; מכאן והלאה הכל אוטומטי מ-CI.

**איך (על המחשב שלך):**

```bash
# 1. תעודות חתימה — תן ל-EAS לנהל אותן (מומלץ):
eas credentials
# בחר: iOS → production → "Set up new credentials" ותן ל-EAS לייצר
# Distribution Certificate + Provisioning Profile. הם נשמרים אצל Expo.

# 2. build ראשון + חיבור App Store Connect:
eas build -p ios --profile production --auto-submit
# בהרצה ראשונה EAS ישאל על App Store Connect API Key:
```

ל-API Key: גש ל-https://appstoreconnect.apple.com → **Users and Access** →
**Integrations** → **App Store Connect API** → **Generate API Key** בתפקיד
**App Manager**. הורד את קובץ ה-`.p8` (אפשר להוריד רק פעם אחת! שמור אותו),
והעתק את ה-**Key ID** וה-**Issuer ID**. הדבק אותם כש-EAS מבקש — EAS ישמור
אותם ואף ייצור בשבילך את רשומת האפליקציה ב-App Store Connect
(`com.spontani.app`).

בסיום ה-build (כ-15-30 דק' בענן של Expo) האפליקציה תופיע אוטומטית
ב-**TestFlight**. מכאן והלאה כל push ל-`main` (או הרצה ידנית של
"iOS Release (TestFlight)" מ-Actions) עושה את זה לבד.

> 💡 חיסכון: ה-tier החינמי של EAS מוגבל במספר builds לחודש. עדיף להריץ את
> ה-workflow ידנית לפני שחרור אמיתי במקום על כל push. שינויי JS/עיצוב/טקסט
> ממילא מגיעים דרך עדכוני OTA בלי build.

---

## שלב 7 — TestFlight: בדיקה על הטלפון שלך (10 דקות)

1. התקן את אפליקציית **TestFlight** מה-App Store בטלפון.
2. ב-https://appstoreconnect.apple.com → Apps → Spontani → TestFlight →
   הוסף את עצמך כ-Internal Tester (עם ה-Apple ID שלך).
3. תקבל מייל הזמנה → פתח ב-TestFlight → התקן.
4. עבור על הכל: הרשמה, משימה יומית, העלאת הוכחה, אישור באדמין, לוח
   דירוג, קבוצות, **מחיקת חשבון** (עם משתמש בדיקה!), והתראות push.

---

## שלב 8 — הגשה ל-App Store (שעה של מילוי טפסים + יום-יומיים ביקורת)

ב-https://appstoreconnect.apple.com → Apps → Spontani:

1. **App Information:** שם (Spontani), קטגוריה (Lifestyle או Social
   Networking), ו-**Privacy Policy URL**:
   `https://sharonekub-svg.github.io/spontaneous/privacy` (משלב 2).
2. **Pricing:** חינם.
3. **App Privacy (שאלון):** הצהר על איסוף: Email, Name/Username, Photos or
   Videos (הוכחות), User Content, Identifiers (push token), Diagnostics
   (Sentry). Linked to user: כן לרוב הפריטים. Used for tracking: **לא**.
4. **Age Rating:** מלא את השאלון — האפליקציה מכילה תוכן שנוצר ע"י משתמשים,
   אז צפה לדירוג 12+ בערך.
5. **Screenshots:** חובה לגודל 6.7&Prime; (iPhone Pro Max) ו-6.5&Prime;. הכי פשוט:
   הרץ את האפליקציה בסימולטור iPhone 15 Pro Max (`npm run ios`) וצלם
   (Cmd+S) את המסכים היפים — Today, משימה, לוח דירוג, פרופיל, תגים.
6. **Description + Keywords** בעברית (אפשר גם אנגלית כשפה נוספת).
7. בחר את ה-build מ-TestFlight → **Submit for Review**.
8. ביקורת ראשונה לוקחת בדרך כלל 24-48 שעות. אם נדחית — קרא את הסיבה,
   רוב הדחיות הראשונות הן על פרטים קטנים במטא-דאטה, לא על קוד.

> ⚠️ טיפ ביקורת: ספק ל-Apple חשבון דמו (Review Notes → Sign-In Information)
> עם משתמש קיים, כדי שהבודק לא ייתקע על ההרשמה.

---

## שלב 9 — הקשחות קטנות ב-Supabase (5 דקות, מומלץ, לא חוסם)

1. **Leaked Password Protection:** ב-https://supabase.com/dashboard →
   פרויקט spontani → Authentication → Providers → Email → הפעל
   "Prevent use of leaked passwords".
2. שים לב: קיים trigger בשם `auto_confirm_user` שמאשר אוטומטית כל אימייל
   בהרשמה (נוצר כדי לעקוף בעיית קונפיגורציה). אם תרצה אימות אימייל אמיתי
   לפני השקה רחבה — הפעל Email Confirmations בהגדרות Auth ומחק את ה-trigger:
   `drop trigger auto_confirm_user on auth.users;`

---

## סיכום — מה כבר מוכן ומה עליך

| #   | פעולה                                          | מי                         | סטטוס          |
| --- | ---------------------------------------------- | -------------------------- | -------------- |
| —   | CI ירוק, lint/typecheck/format                 | ✅ בוצע                    | מוכן           |
| —   | מחיקת חשבון בתוך האפליקציה (דרישת Apple 5.1.1) | ✅ בוצע + נבדק על ה-DB החי | מוכן           |
| —   | עמוד מדיניות פרטיות `/privacy`                 | ✅ בוצע                    | מוכן           |
| —   | מיגרציות מסונכרנות לריפו                       | ✅ בוצע                    | מוכן           |
| —   | pipeline יחיד ל-iOS (EAS)                      | ✅ בוצע                    | מוכן           |
| 1   | שינוי default branch ל-`main`                  | אתה                        | 5 דק'          |
| 2   | הפעלת GitHub Pages                             | אתה                        | 2 דק'          |
| 3   | Apple Developer ($99)                          | אתה                        | המתנה 1-2 ימים |
| 4   | `eas init`                                     | אתה                        | 10 דק'         |
| 5   | סוד `EXPO_TOKEN`                               | אתה                        | 3 דק'          |
| 6   | `eas credentials` + build ראשון                | אתה                        | 30-40 דק'      |
| 7   | בדיקת TestFlight                               | אתה                        | 10 דק'         |
| 8   | מטא-דאטה + הגשה לביקורת                        | אתה                        | ~שעה + ביקורת  |
| 9   | הקשחות Supabase                                | אתה                        | 5 דק'          |
