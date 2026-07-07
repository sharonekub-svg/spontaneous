-- ============================================================================
-- Replace all missions with the 400 curated ones.
--
-- Points are now DIFFICULTY-based and awarded from the mission's own
-- base_points (easy 2, medium 5, hard 10, extreme 20) instead of the check-in
-- mood. Each mission carries a short Hebrew rationale explaining its points,
-- shown on the mission screen. Category names are translated to Hebrew.
-- ============================================================================

-- 1. Per-mission explanation of the points value.
alter table missions add column if not exists points_rationale text not null default '';

-- 2. Hebrew category names for the Browse tab.
update mission_categories set name = case slug
  when 'social'     then 'חברתי'
  when 'adventure'  then 'הרפתקה'
  when 'fitness'    then 'כושר'
  when 'food'       then 'אוכל'
  when 'random'     then 'אקראי'
  when 'confidence' then 'ביטחון'
  when 'outdoor'    then 'טבע'
  when 'friends'    then 'חברים'
  when 'dating'     then 'דייטים'
  when 'creative'   then 'יצירתי'
  when 'weekend'    then 'סוף שבוע'
  when 'kindness'   then 'חסד'
  when 'travel'     then 'טיולים'
  else name end;

-- 3. Award points from the mission's difficulty-based base_points, not the mood.
create or replace function approve_submission(submission uuid, reviewer uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  sub submissions%rowtype;
  m missions%rowtype;
  prof profiles%rowtype;
  award_points int;
  new_level int;
  old_level int;
  new_streak int;
begin
  if not is_admin(auth.uid()) then raise exception 'Admin only'; end if;

  select * into sub from submissions where id = submission for update;
  if not found then raise exception 'Submission not found'; end if;
  if sub.status = 'approved' then return; end if;

  select * into m from missions where id = sub.mission_id;
  select * into prof from profiles where id = sub.user_id for update;
  old_level := prof.level;

  -- Points are the mission's own value, set by its difficulty.
  award_points := coalesce(m.base_points, 0);

  -- Streak: consecutive day if last completion was yesterday, reset otherwise.
  if prof.last_completed_date = current_date then
    new_streak := prof.current_streak;
  elsif prof.last_completed_date = current_date - 1 then
    new_streak := prof.current_streak + 1;
  else
    new_streak := 1;
  end if;

  new_level := level_for_xp(prof.xp + m.xp_reward);

  update profiles set
    points = points + award_points,
    xp = xp + m.xp_reward,
    level = new_level,
    missions_completed = missions_completed + 1,
    current_streak = new_streak,
    longest_streak = greatest(longest_streak, new_streak),
    last_completed_date = current_date
  where id = sub.user_id;

  update submissions set
    status = 'approved',
    reviewed_by = reviewer,
    reviewed_at = now(),
    points_awarded = award_points,
    xp_awarded = m.xp_reward
  where id = submission;

  update mission_assignments set status = 'approved'
  where id = sub.assignment_id;

  insert into xp_events (user_id, xp_delta, points_delta, reason, ref_id)
  values (sub.user_id, m.xp_reward, award_points, 'mission_approved', submission);

  insert into notifications (user_id, type, title, body, data)
  values (
    sub.user_id, 'mission_approved', 'המשימה אושרה! 🎉',
    'הרווחת ' || award_points || ' נקודות ו-' || m.xp_reward || ' XP על «' || m.title || '».',
    jsonb_build_object('submission_id', submission, 'mission_id', m.id)
  );

  if new_level > old_level then
    insert into notifications (user_id, type, title, body, data)
    values (
      sub.user_id, 'level_up', 'הגעת לרמה ' || new_level || '! ⚡',
      'עלית רמה. פרסים חדשים אולי מחכים.',
      jsonb_build_object('level', new_level)
    );
  end if;

  perform evaluate_badges(sub.user_id);
end;
$$;

-- 4. Remove the old missions (cascades to their old assignments/submissions).
delete from missions;

-- Auto-generated: the 400 curated missions.

-- easy: 100 missions worth 2 points each
insert into missions (title, description, category_id, difficulty, base_points, xp_reward, proof_types, min_mood, points_rationale) values
('צלמו סלפי ליד משהו כחול','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו שלושה פרחים שונים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם עושים 20 קפיצות פיסוק','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את השמיים בדיוק כמו שהם נראים עכשיו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את הנעליים שאתם נועלים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי עם החיוך הכי מאושר שלכם','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו משהו אדום בתוך הבית','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם מחזיקים פלאנק 30 שניות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את הספל או הכוס האהובים עליכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('ציירו פרצוף מחייך וצלמו אותו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי ליד צמח','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו עץ שנראה לכם מעניין','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם עושים 10 סקוואטים','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את הנוף מהחלון שלכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו משהו צהוב','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי עם אגודל למעלה','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את ארוחת הבוקר שלכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם מסתובבים שלוש פעמים','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו כריכת ספר שאתם אוהבים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('עשו פרצוף מצחיק וצלמו סלפי','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו משהו שמעלה לכם חיוך','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם עושים 15 סיבובי זרועות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו ענן שנראה כמו משהו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו חיית מחמד שאתם רואים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי עם כובע','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו שלושה חפצים באותו צבע','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם מתכופפים לגעת בבהונות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את היד שלכם עושה צורת לב','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו משהו עגול לחלוטין','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי ליד חלון','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו שלט רחוב לידכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='adventure'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם מנופפים שלום למצלמה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את החטיף האהוב עליכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('ציירו כוכב וצלמו אותו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי בעיניים עצומות','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו משהו ירוק בחוץ','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם קופצים כמה שיותר גבוה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו דלת שנראית לכם מעניינת','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את הרצפה מתחת לרגליים שלכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי עם חיוך רחב','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו שלולית או השתקפות במים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם מוחאים כפיים עשר פעמים','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את השולחן או סביבת העבודה שלכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו משהו רך','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי כשאתם מצביעים לשמיים','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו צל על הקרקע','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם עומדים על רגל אחת 20 שניות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו פרי','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('בנו מגדל משלושה חפצים וצלמו אותו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי עם סימן וי','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו משהו עם דוגמה מעניינת','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם עושים 10 ברכיים גבוהות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו ציפור שאתם רואים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את העט או העיפרון האהובים עליכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי עם חבר או בן משפחה','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את אור השמיים ברגע זה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם מותחים את שתי הזרועות גבוה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו משהו מבוגר מכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו מספר כלשהו שאתם מוצאים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי כשאתם שולחים נשיקה','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו עלה בודד מקרוב','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם מדלגים על רגל אחת חמש פעמים','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את החדר האהוב עליכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('ציירו את החיה האהובה עליכם וצלמו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי כשהראש מוטה הצידה','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו משהו מתכתי ומבריק','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם מרימים כתפיים 10 פעמים','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו מכונית שאתם אוהבים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו משהו עם פסים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי כשאתם מרימים שלוש אצבעות','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו צמח שגדל בחוץ','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם צועדים במקום 20 שניות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את פריט הלבוש האהוב עליכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלע או אבן','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי מול קיר חלק','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו משהו בצבע האהוב עליכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם מנענעים ראש לקצב 10 שניות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו שעון','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('כתבו את התאריך של היום על דף וצלמו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי כשאתם מוציאים לשון','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו פרח שאתם לא יודעים את שמו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם עושים 10 סיבובי צוואר עדינים','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את כפות הרגליים שלכם על הרצפה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו משהו שקוף','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי כשאתם מחזיקים חפץ אהוב','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו בניין שאתם עוברים לידו הרבה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם מאזנים ספר על הראש 10 שניות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את הדבר הראשון שאתם רואים כשמסתכלים שמאלה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('ערמו חמישה מטבעות וצלמו את הערימה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי עם הבעת הפתעה','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו משהו עשוי עץ','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם עושים חמש מכרעות עדינות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו מקור אור בחדר','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו משהו קטן מהאגודל שלכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי כשאתם מביטים למעלה אל המצלמה','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו צמח על אדן חלון או מרפסת','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את עצמכם מציירים עיגול גדול באוויר עם הזרוע','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{video}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו את הפינה האהובה עליכם בבית','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('כתבו את המילה שלום על דף וצלמו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.'),
('צלמו סלפי חוגגים את סיום האתגר הראשון שלכם','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='outdoor'),'easy',2,10,'{photo}','not_today','משימה קלה ומהירה שאפשר לעשות כמעט מכל מקום — לכן היא שווה 2 נקודות.');

-- medium: 100 missions worth 5 points each
insert into missions (title, description, category_id, difficulty, base_points, xp_reward, proof_types, min_mood, points_rationale) values
('טעמו מאכל שמעולם לא אכלתם ותעדו את התגובה','צרפו תמונה וסרטון קצר כהוכחה.',(select id from mission_categories where slug='food'),'medium',5,20,'{photo,video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו סלפי עם חבר שפגשתם היום, באישורו','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='random'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('בקרו בפארק שמעולם לא הייתם בו וצלמו שם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('למדו לומר תודה בשפה חדשה והקליטו את עצמכם','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='kindness'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('הכינו ארוחה פשוטה מאפס וצלמו את הצלחת המוכנה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('תנו מחמאה כנה למישהו, ואז תעדו רפלקציה קצרה על ההרגשה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='social'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('מצאו גרם מדרגות וצלמו את עצמכם עולים עד למעלה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('הזמינו משקה שמעולם לא ניסיתם וצלמו את הלגימה הראשונה','צרפו תמונה וסרטון קצר כהוכחה.',(select id from mission_categories where slug='food'),'medium',5,20,'{photo,video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צעדו לפחות 3,000 צעדים וצלמו מסך של מונה הצעדים','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('שחזרו תנוחה מציור מפורסם וצלמו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו ציור קיר או אמנות רחוב באזורכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו את עצמכם שרים את הפזמון של השיר האהוב עליכם','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('כתבו פתק תודה קצר למישהו וצלמו אותו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='kindness'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('השלימו מדיטציה מודרכת של 5 דקות וצלמו מסך של הסשן','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='random'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו את הזריחה או השקיעה של היום','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('למדו קסם פשוט וצלמו את עצמכם מבצעים אותו','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('היכנסו לחנות מקומית שמעולם לא נכנסתם אליה וצלמו משהו בפנים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('עשו 30 שכיבות סמיכה בכל מספר סטים וצלמו את העשר האחרונות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו תמונת פרספקטיבה שבה נראה שאתם מחזיקים את השמש או הירח','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('ציירו דיוקן של מישהו בחמש דקות וצלמו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('מצאו שלושה סוגי עלים שונים וצלמו אותם יחד','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('ספרו בדיחה לחבר ותעדו את התגובה שלו','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='social'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('לכו בדרך חדשה למקום מוכר וצלמו משהו בדרך','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('אזנו על רגל אחת בעיניים עצומות 30 שניות מול המצלמה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו את ההשתקפות שלכם במשטח לא שגרתי','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('למדו את שמונת הספירות הראשונות של ריקוד וצלמו את עצמכם','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('הכינו מטוס נייר וצלמו אותו עף','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('הרימו ספר שהייתם ממליצים עליו וצלמו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('הקדישו 15 דקות לרישום הסביבה וצלמו את הציור','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו את עצמכם עושים את חיקוי החיה הכי טוב שלכם','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('מצאו ספסל עם נוף יפה, שבו חמש דקות וצלמו את הנוף','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('כתבו את שמכם עם היד החלשה וצלמו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו שלושה דברים באותה צורה אך בגדלים שונים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('עשו ישיבת קיר של שתי דקות וצלמו את הטיימר','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('הציגו את עצמכם לשכן או לחבר לכיתה וצלמו סלפי יחד, באישור','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='social'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('הכינו שייק או מיץ טרי וצלמו את התוצאה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו את עצמכם מלהטטים בשני חפצים או יותר עשר שניות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('מצאו וצלמו משהו בעיר שלכם בן יותר מ-50 שנה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו תמונת קפיצה ששתי הרגליים באוויר','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('למדו שיבוש לשון והקליטו את עצמכם אומרים אותו שלוש פעמים מהר','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו ארוחה שבישלתם ושתפו את המתכון בכיתוב','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('עשו 25 כפיפות בטן וצלמו את חמש האחרונות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('בקרו בספרייה או בחנות ספרים וצלמו ספר שתפס את עינכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו סרטון של 20 שניות המתאר את המקום האהוב עליכם בעיר','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('קפלו צורת אוריגמי וצלמו את הדמות המוגמרת','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו תמונה שבה קו האופק ישר לחלוטין','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('נסו שגרת מתיחות של חמש דקות וצלמו חלק ממנה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('מצאו דלת צבעונית וצלמו סלפי מולה','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='random'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו את עצמכם לומדים לשרוק מנגינה קצרה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו את אותו חפץ משלוש זוויות שונות לגמרי','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('עשו 15 ברפי וצלמו את חמש האחרונות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('בקשו מחבר להמליץ על שיר, האזינו ותעדו את התגובה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('סדרו חפצים בצבעי הקשת וצלמו אותם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('הקדישו עשר דקות לצפייה בציפורים וצלמו ציפור שראיתם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו את עצמכם עושים גלגלון או גלגלת קדימה על משטח רך','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('כתבו שלוש מטרות לשבוע וצלמו את הרשימה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('מצאו מראה ציבורית וצלמו סלפי השתקפות יצירתי','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='random'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו פרי שאינכם יודעים את שמו וצלמו את הביס הראשון','צרפו תמונה וסרטון קצר כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo,video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('החזיקו פלאנק דקה שלמה וצלמו את הטיימר','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו מדבקה מעניינת או גרפיטי על עמוד תאורה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('למדו לצייר קובייה תלת-ממדית וצלמו את הציור','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('ציירו משבצות קלאס וצלמו את עצמכם מדלגים לאורכן','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו את הרחוב הכי הומה לידכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='adventure'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('עשו 20 מכרעות על כל רגל וצלמו עשר מהן','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('קראו עשר דקות ואז צלמו את העמוד שבו עצרתם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו את עצמכם קופצים בחבל 20 פעמים ברצף','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו ענן ותארו בכיתוב למה הוא דומה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('הכינו ערימת פנקייקים וצלמו אותם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו סלפי בתנוחת גיבור-על הכי טובה שלכם','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='fitness'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו את עצמכם מאזנים כף על האף חמש שניות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('מצאו מזרקה וצלמו את המים בתנועה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('עשו 40 קפיצות פיסוק ללא הפסקה וצלמו','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('כתבו הייקו על היום שלכם וצלמו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('מצאו וצלמו שלושה מרקמים שונים תוך דקה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו את עצמכם מנסים לגעת בבהונות ומשתפרים בשלושה ניסיונות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='food'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('בקרו בשוק או במכולת וצלמו את הפריט הכי צבעוני שם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='adventure'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו תמונה כאילו אתם מדריכי תיירים המצביעים על אתר','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='travel'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('עשו 10 סקוואטים איטיים ומבוקרים וצלמו','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('ציירו קומיקס בן שלוש משבצות וצלמו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('מצאו וצלמו צורת לב שנוצרת באופן טבעי','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('עשו ישיבת קיר של 90 שניות וצלמו את עצמכם קמים בסוף','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו סלפי עם מישהו שלובש את אותו צבע כמוכם, באישור','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='random'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו את עצמכם מונים חמישה דברים שאתם אסירי תודה עליהם','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='kindness'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו גשר, גדול או קטן, לידכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='adventure'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('למדו קסם קלפים וצלמו את עצמכם מבצעים אותו למישהו','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו תמונת טשטוש תנועה של משהו נע','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('עשו 30 הרמות עקב וצלמו את העשר האחרונות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('הגיעו לנקודת תצפית או מרפסת וצלמו את קו הרקיע','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו את עצמכם נותנים נאום עידוד של 30 שניות למצלמה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו את הצל שלכם עושה משהו יצירתי','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('נסו מתכון למשקה חם או קר חדש וצלמו את הטעימה הראשונה','צרפו תמונה וסרטון קצר כהוכחה.',(select id from mission_categories where slug='food'),'medium',5,20,'{photo,video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('עשו 15 מקבילים על כיסא יציב וצלמו','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('מצאו פסל וצלמו תמונה שמחקה את תנוחתו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='adventure'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו את עצמכם אומרים את האלף-בית מהסוף להתחלה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו את חלון הראווה הכי מעניין שאתם מוצאים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('עשו 20 מטפסי הרים וצלמו','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('כתבו לעצמכם פתק חיובי על דף דביק וצלמו אותו על המראה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו סלפי בכניסה למקום שמעולם לא נכנסתם אליו','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='random'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('צלמו את עצמכם רוקדים פרי-סטייל 30 שניות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'medium',5,20,'{video}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.'),
('חקרו רחוב שמעולם לא הלכתם בו במשך 20 דקות וצלמו את הדבר האהוב עליכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='adventure'),'medium',5,20,'{photo}','a_little','דורשת קצת יותר מאמץ, יצירתיות או יציאה קטנה מהשגרה — לכן היא שווה 5 נקודות.');

-- hard: 100 missions worth 10 points each
insert into missions (title, description, category_id, difficulty, base_points, xp_reward, proof_types, min_mood, points_rationale) values
('בקשו המלצה על מסעדה, נסו אותה וצלמו את עצמכם טועמים','צרפו תמונה וסרטון קצר כהוכחה.',(select id from mission_categories where slug='food'),'hard',10,40,'{photo,video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('התעוררו מוקדם מספיק כדי לראות את הזריחה וצלמו אותה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('הקדישו שעה לחקירת שכונה שמעולם לא ביקרתם בה וצלמו שלושה רגעים בולטים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('פתחו שיחה עם אדם זר וצלמו סלפי יחד, באישורו','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='social'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('למדו כוריאוגרפיה של 30 שניות וצלמו את עצמכם מבצעים את כולה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('בשלו מנה ממטבח שמעולם לא הכנתם וצלמו את הארוחה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('רוצו 3 קילומטרים ללא הפסקה וצלמו מסך של המסלול או הטיימר','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('שאלו בעל חנות על ההיסטוריה של העסק שלו ותעדו סיכום קצר','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='social'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('בקרו במוזיאון או בגלריה וצלמו את היצירה שהכי מרגשת אתכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='adventure'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('ראיינו חבר במצלמה על החלום הכי גדול שלו במשך דקה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='social'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צעדו לנקודת תצפית טבעית וצלמו את הנוף','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('למדו להכין ביצים בשלוש דרכים שונות וצלמו את שלושתן','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('תנו פינוק קטן למישהו ותעדו את תגובתו, באישור','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='kindness'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('הקדישו 30 דקות לרישום בניין וצלמו את הציור המוגמר','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('הזמינו בשפה שאתם לומדים וצלמו את האינטראקציה, באישור','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='food'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('מצאו חמישה סוגי עצים שונים, צלמו כל אחד ותייגו אותם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('השלימו אימון מלא של 20 דקות וצלמו מסך של הסשן','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('שאלו שלושה אנשים מה משמח אותם ותעדו את תשובותיהם, באישור','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='social'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('בקרו בבניין העתיק ביותר בעיר וצלמו אותו עם עובדה בכיתוב','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='adventure'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('בשלו ארוחה למישהו אחר וצלמו אותו נהנה ממנה, באישור','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צלמו תמונה בדיוק בשעת הזהב','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('למדו ללהטט בשלושה חפצים וצלמו עשר תפיסות רצופות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='food'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צעדו 8,000 צעדים ביום אחד וצלמו מסך של מונה הצעדים','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('הקדישו 30 דקות לעזרה למישהו במשימה וצלמו במה עזרתם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='kindness'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צלמו ולוג של דקה המתאר הליכה בחלק האהוב עליכם בעיר','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('נסו ספורט או פעילות שמעולם לא עשיתם וצלמו את הניסיון','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='random'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('הגיעו לגג או לגבעה וצלמו את העיר מלמעלה בשקיעה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('שאלו נגן רחוב על האומנות שלו ותעדו קליפ קצר, באישור','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='social'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('הכינו קינוח מאפס וצלמו את המנה המוגמרת','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('עשו 50 שכיבות סמיכה בסשן אחד וצלמו את העשר האחרונות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('השתמשו באמצעי תחבורה ציבורית שמעולם לא נסעתם בו וצלמו את הנסיעה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('למדו מישהו מיומנות במשך עשר דקות ותעדו קליפ מהשיעור, באישור','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='random'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צלמו את אותו מקום בבוקר ושוב בערב','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('למדו שיר קצר בעל פה ודקלמו אותו מול המצלמה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('רכבו 5 קילומטרים וצלמו את עצמכם בסיום','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('בקשו מאדם זר להמליץ על ספרו האהוב וצלמו את עצמכם מוצאים אותו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='social'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('הקדישו שעה במקום שאתם מוצאים יפה וצלמו חמישה פרטים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צאו לטיול של 30 דקות וצלמו את עצמכם בנקודה הגבוהה ביותר','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('ציירו עם היד החלשה במשך 15 דקות וצלמו את התוצאה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צלמו את עצמכם מזמינים בביטחון משהו חדש בבית קפה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='food'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('מצאו שלוש דוגמאות לארכיטקטורה מעניינת בהליכה אחת וצלמו אותן','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('השלימו ריצה של 15 דקות וצלמו מסך של הקצב והמרחק','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('בקשו ממישהו מעל גיל 60 עצה אחת לחיים ותעדו אותה, באישור','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('הכינו פיצה ביתית מאפס וצלמו אותה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('בקרו בגן בוטני או בחממה וצלמו את הצמח האהוב עליכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('החזיקו פלאנק של שתי דקות וצלמו','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('השלימו שיעור באפליקציית שפות וצלמו מסך של השיעור','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='random'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צלמו השתקפות של השמיים במים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('עשו 100 קפיצות פיסוק בסשן אחד וצלמו את העשרים האחרונות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('הגיעו לנקודת תצפית שמעולם לא הייתם בה וצלמו את הנוף','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('כתבו ובצעו קטע סטנד-אפ של דקה מול המצלמה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('הכינו ארוחת בוקר במיטה לעצמכם או למישהו וצלמו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('הקדישו 30 דקות לצילום רגעים ברחוב ושתפו את התמונה הטובה ביותר','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('בקשו ממקומי על הפינה הנסתרת האהובה עליו וצלמו את עצמכם שם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צאו להליכה בטבע של 5 קילומטרים וצלמו שלושה צמחים בדרך','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('למדו להכין עגור נייר וצלמו את הקיפול האחרון','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צלמו ראיון של דקה עם חבר על הרגע הכי מגאה שלו','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='random'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('נסו שיעור כושר שמעולם לא עשיתם וצלמו מסך המוכיח שהשתתפתם','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צלמו את הירח, בלילה או ביום','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('אפו לחם או עוגיות וצלמו אותם טריים מהתנור','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('העבירו שעה בלי הטלפון ואז צלמו מה עשיתם במקום','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('מצאו אגם, נהר או ים וצלמו את קו המים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צלמו את עצמכם עולים ויורדים במדרגות חמש פעמים','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('שאלו שף או ברמן איך הם התחילו ותעדו את תשובתם, באישור','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='social'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('ציירו דיוקן עצמי בעזרת מראה וצלמו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('עשו 60 סקוואטים בסשן אחד וצלמו את העשרים האחרונים','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('חקרו שוק שמעולם לא ביקרתם בו וצלמו את הפריט הכי יוצא דופן','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='adventure'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('למדו לקפל סדין עם גומי וצלמו את התוצאה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='random'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צלמו סצנה שמספרת סיפור והסבירו אותה בכיתוב','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('השלימו סשן יוגה של 20 דקות וצלמו מסך של השיעור','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('בקשו משני זרים לתאר את יומם במילה אחת ותעדו, באישור','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='social'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('בשלו מתכון שעובר במשפחה שלכם וצלמו את המנה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('מצאו את הבניין הגבוה ביותר בסביבה וצלמו את עצמכם מביטים בו למעלה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צלמו את עצמכם עושים ראפ פרי-סטייל של דקה על היום שלכם','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('הקיפו אגם או פארק גדול וצלמו את ההתחלה והסוף','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('טעמו שלושה מאכלים שמעולם לא אכלתם בישיבה אחת וצלמו כל ביס ראשון','צרפו תמונה וסרטון קצר כהוכחה.',(select id from mission_categories where slug='food'),'hard',10,40,'{photo,video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('בקרו במקום בעל עניין היסטורי וצלמו שלט או לוח שם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('עשו רכיבת אופניים של 25 דקות וצלמו מסך של המסלול','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צלמו סרטון תודה קצר למישהו שעזר לכם לאחרונה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='kindness'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צלמו חמש דלתות כניסה שונות ברחוב אחד','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='adventure'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('למדו שיר פשוט בכלי נגינה וצלמו את עצמכם מנגנים','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('הקדישו 30 דקות לסידור מרחב וצלמו לפני ואחרי','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('בקשו מאדם זר על המנה המקומית האהובה עליו וצלמו את עצמכם טועמים','צרפו תמונה וסרטון קצר כהוכחה.',(select id from mission_categories where slug='food'),'hard',10,40,'{photo,video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('מצאו גבעה וצלמו את הזריחה או השקיעה מהפסגה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('עשו 30 דקות של תנועה רציפה וצלמו מסך של דקות הפעילות','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='random'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צלמו את עצמכם מקריאים סיפור ילדים עם קולות דמויות','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צלמו את הבניין הכי צבעוני בשכונה שלכם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='adventure'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('נסו עמידת ידיים על קיר וצלמו את הניסיון הטוב ביותר','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('בקרו בבית קפה שמעולם לא הייתם בו וצלמו את ההזמנה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('הקדישו שעה ללמידת מלאכה חדשה ממדריך וצלמו מה יצרתם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('שאלו מישהו איך היה בגיל 16 ותעדו את תשובתו, באישור','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='social'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('השלימו ריצה קלה של 4 קילומטרים וצלמו מסך של זמן הסיום','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צלמו נוף ללא בניינים בפריים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('בשלו ארוחה בת שתי מנות בעצמכם וצלמו את שתי המנות','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('מצאו וצלמו יצירת אמנות ציבורית שרוב האנשים עוברים לידה בלי לשים לב','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='social'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('עשו 20 קפיצות סקוואט רצופות וצלמו','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('חקרו חלק לא מוכר בעיר במשך שעה וצלמו מסך של המסלול כהוכחה','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='adventure'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('בקשו מחבר לתת לכם אתגר קטן וצלמו את עצמכם משלימים אותו','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'hard',10,40,'{video}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('צלמו את הנוף מהקומה הגבוהה ביותר שנגישה לציבור בבניין','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.'),
('העבירו שעה שלמה בחוץ ללא מסכים וצלמו כיצד ביליתם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'hard',10,40,'{photo}','pretty_spontaneous','אתגר אמיתי שדורש זמן, אומץ או מאמץ פיזי משמעותי — לכן הוא שווה 10 נקודות.');

-- extreme: 100 missions worth 20 points each
insert into missions (title, description, category_id, difficulty, base_points, xp_reward, proof_types, min_mood, points_rationale) values
('סעו לעיר אחרת היום וצלמו סלפי שם','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='travel'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('השלימו רכיבת אופניים של 20 קילומטרים וצלמו את הסיום','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{video}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('העבירו את היום בלי רשתות חברתיות והעלו צילום מסך של זמן המסך','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='random'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('טפסו לפסגת גבעה או הר וצלמו את הנוף מהראש','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('רוצו 10 קילומטרים וצלמו מסך של המסלול וזמן הסיום','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('בקרו במקום במרחק יותר מ-100 קילומטרים מהבית וצלמו סלפי שם','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='travel'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('קומו לזריחה והישארו בחוץ עד השקיעה, צלמו את שתיהן','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הקדישו יום שלם לחקירת עיר ברגל וצלמו מסך של 20,000 צעדים','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('צאו לטיול יומי לחוף, לאגם או להרים וצלמו את ההגעה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='travel'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('בשלו ארוחה בת שלוש מנות לחברים או משפחה וצלמו כל מנה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('השלימו הליכה של 21 קילומטרים וצלמו מסך של המסלול','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('העבירו יום שלם בדיבור נעים בלבד ותעדו רפלקציה בסוף','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{video}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('למדו ובצעו כוריאוגרפיה מלאה של דקה וצלמו את כולה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'extreme',20,80,'{video}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('בקרו בשלוש שכונות שונות ביום אחד וצלמו כל אחת','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('סעו בתחבורה ציבורית עד סוף קו שמעולם לא נסעתם בו וצלמו את התחנה האחרונה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='travel'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('ארגנו מפגש קטן של חברים וצלמו תמונה קבוצתית, באישור כולם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='social'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('העבירו את היום כתיירים בעיר שלכם וצלמו חמישה אתרים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='travel'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('השלימו מסלול רכיבה של 30 קילומטרים וצלמו את עצמכם בסיום','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{video}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('צאו לקמפינג או לינה במקום חדש וצלמו את המקום','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='travel'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('טפסו 500 מדרגות ביום וצלמו מסך של מונה הקומות','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('בשלו מנה ממדינה שמעולם לא ביקרתם בה וצלמו את הניסיון שלכם ליד תמונת המקור','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('העבירו יום שלם מנותקים בטבע וצלמו את הנוף בצהריים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('השלימו טרק של 15 קילומטרים וצלמו את תחילת המסלול ואת הפסגה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('התנדבו חצי יום באירוע קהילתי וצלמו את עצמכם עוזרים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='social'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('צאו לטיול ספונטני עם לינה לעיר חדשה וצלמו היכן ישנתם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='travel'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('שחו במים פתוחים וצלמו את עצמכם נכנסים בבטחה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{video}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('העבירו יום בניסיון לדבר עם עשרה אנשים חדשים וצלמו סלפי קבוצתי של כל מי שהסכים','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='social'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('השלימו מסלול אופניים של 25 קילומטרים באזורכם וצלמו מסך של המפה','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('צפו גם בזריחה וגם בכוכבים באותן 24 שעות וצלמו כל אחד','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('למדו מתכון חדש כל שעה במשך ארבע שעות וצלמו את כל ארבע המנות','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הגיעו לנקודה הגבוהה ביותר באזורכם וצלמו פנורמה של 360 מעלות','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הקדישו יום שלם ליצירת אמנות וצלמו חמש יצירות מוגמרות','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('סעו למקום שראיתם רק בתמונות וצלמו סלפי שם','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='travel'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('השלימו ריצת שטח של 12 קילומטרים וצלמו מסך של הנתונים','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('העבירו 24 שעות ללא סוכר מוסף וצלמו כל ארוחה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('תכננו והשלימו סיור הליכה עצמאי בעיר וצלמו כל תחנה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('קומו לפני 5 בבוקר, צפו בעולם מתעורר וצלמו את הרחובות הריקים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('בשלו תפריט ארוחת ערב שלם לשישה אנשים וצלמו את כל השולחן','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('שוטו בקיאק, סאפ או חתירה 5 קילומטרים וצלמו את הסיום','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{video}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הקדישו יום שלם ללימוד מיומנות חדשה לגמרי וצלמו קליפ שמדגים אותה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{video}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('השלימו יום רכיבה של 40 קילומטרים וצלמו מסך של המרחק הכולל','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('בקרו בחמישה בתי קפה ביום אחד בחיפוש אחר הקפה הטוב ביותר וצלמו כל כוס','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('צלמו עשרה כלבים שונים ביום אחד, באישור הבעלים, ושתפו את האהובים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('סעו ברכבת או באוטובוס לעיר שמעולם לא ביקרתם בה וצלמו את הכיכר המרכזית','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='travel'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('העבירו יום שלם ללא מסכים מלבד המצלמה וצלמו כיצד ביליתם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('רוצו או צעדו סך של 15 קילומטרים במהלך היום וצלמו מסך של המרחק','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הגיעו לחוף עם שחר וצלמו את הזריחה מעל המים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הקדישו את היום ללימוד שיר בכלי נגינה וצלמו את הביצוע המלא','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'extreme',20,80,'{video}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('חקרו שביל יער במשך שעתיים וצלמו חמישה יצורים חיים שונים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('ארגנו וצלמו פיקניק או ארוחה בחוץ לקבוצת חברים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('רכבו על אופניים לעיר שכנה וצלמו סלפי ליד שלט הכניסה','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הקדישו יום שלם לעזרה לחבר במשימה גדולה וצלמו את התוצאה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='kindness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('השלימו ריצת זריחה של 10 קילומטרים וצלמו מסך של זמן הסיום','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הגיעו לנקודת התצפית הגבוהה ביותר שנגישה בתחבורה ציבורית וצלמו את הפנורמה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הקדישו יום שלם לטעימת מאכלים מחמישה מטבחים שונים וצלמו כל ארוחה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('צאו לטיול יומי ספונטני לבד ותעדו אותו כסיפור בחמש תמונות','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='travel'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('צעדו, רכבו או רוצו סך של 20 קילומטרים ביום אחד וצלמו מסך של הסך','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הקדישו את היום ליצירת סרט קצר של פחות משתי דקות והעלו את הסרטון המוגמר','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'extreme',20,80,'{video}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הגיעו למגדל תצפית או לפסגה וצלמו את הטיפוס','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('תעדו תמונה אחת בכל שעת ערות במשך יום שלם ושתפו את הקולאז','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('סעו לאתר שתמיד רציתם לבקר בו וצלמו סלפי מולו','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='travel'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('השלימו לולאת רכיבה של 21 קילומטרים וצלמו את עצמכם בהתחלה ובסיום','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{video}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('העבירו יום בדיבור בשפה שאתם לומדים כמה שיותר ותעדו רפלקציה מסכמת','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{video}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('צעדו מצד אחד של העיר לצד השני וצלמו את שני הקצוות','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('בקרו בשלושה מוזיאונים ביום אחד וצלמו יצירה אהובה מכל אחד','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('השלימו שחייה של 1 קילומטר במים פתוחים או באגם וצלמו את הסיום בבטחה','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{video}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('ארגנו משחק או ספורט ספונטני עם חברים וצלמו רגע שיא','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{video}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הגיעו ברגל לנקודת תצפית לזריחה וצלמו את האור הראשון','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('העבירו יום שלם כצלמים של הרפתקה של חבר ושתפו עשר תמונות','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('השלימו הליכה של 30 קילומטרים במהלך היום וצלמו מסך של הצעדים','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('בקרו במקום בקצה האזור שלכם וצלמו את שלט הגבול','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הקדישו את היום לבישול אוכל מתקופת הסבים שלכם וצלמו את הסעודה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('טפסו 1,000 מדרגות במהלך היום וצלמו מסך של מונה הקומות','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('סעו במעבורת, ברכבת או באוטובוס לאי או לאזור חדש וצלמו את ההגעה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='travel'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('העבירו יום שלם בלי להוציא כסף וצלמו כיצד הסתדרתם עם ארוחה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('השלימו טיול מהזריחה עד הפסגה וצלמו את עצמכם בראש','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הקדישו את היום ללימוד סקייטבורד, גלגיליות או החלקה על הקרח וצלמו את הריצה הטובה ביותר','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{video}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('בקרו בארבעה פארקים ביום אחד וצלמו עץ שונה בכל אחד','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('רוצו מרחק שיא אישי וצלמו מסך של השיא החדש','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('העבירו יום שלם בהתנדבות בחוץ וצלמו לפני ואחרי של העבודה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='kindness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('השלימו רכיבה למרחק של 50 קילומטרים וצלמו מסך של המסלול','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הקדישו את היום לחקירת עיר שמעולם לא ביקרתם בה וצלמו עשרה אתרים','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='travel'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('צפו בשקיעה מהנקודה הגבוהה ביותר שאתם יכולים להגיע אליה וצלמו את האופק','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('צלמו את אותו נוף כל כמה שעות במשך 24 שעות ושתפו את סדרת הטיים-לאפס','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('סעו לפלא טבע באזורכם וצלמו סלפי שם','צרפו סלפי כהוכחה.',(select id from mission_categories where slug='travel'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('השלימו יום של שחייה, רכיבה וריצה וצלמו מסך של כל פעילות','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('העבירו יום שלם בביצוע חמישה מעשי חסד קטנים ותעדו רפלקציה בסוף','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='kindness'),'extreme',20,80,'{video}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('צעדו למפל וצלמו את עצמכם לידו','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הקדישו את היום לשכלול מתכון אחד וצלמו את הגרסה הסופית','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='food'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('צעדו או רכבו לאורך כל שביל נהר לידכם וצלמו את שני הקצוות','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('העבירו יום שלם כצלמי רחוב ופרסמו מסה של עשר תמונות','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הגיעו לראש המגדל הגבוה ביותר הנגיש לציבור בסביבה וצלמו את הנוף','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('העבירו 24 שעות בלי להתלונן אפילו פעם אחת ותעדו רפלקציה בסוף','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='random'),'extreme',20,80,'{video}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('השלימו טיפוס של 100 קומות במדרגות במהלך היום וצלמו מסך של המונה','צרפו צילום מסך כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('צאו לטיול ספונטני למקום שבחרתם באקראי וצלמו את ההגעה','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='random'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הקדישו את היום ללימוד ריקוד זוגי וצלמו ביצוע של 30 שניות עם חבר','צרפו סרטון כהוכחה.',(select id from mission_categories where slug='creative'),'extreme',20,80,'{video}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('רכבו בין שלוש ערים ביום אחד וצלמו את שלט הכניסה של כל אחת','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('הקדישו יום שלם לצילום ארבעת היסודות אדמה, מים, אש ואוויר','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='outdoor'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('השלימו ריצת זריחה של 5 קילומטרים, טיול צהריים והליכת שקיעה ביום אחד וצלמו את שלושתם','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='fitness'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.'),
('תכננו והשלימו יום הרפתקה מושלם משלכם ושתפו סרטון תקציר של חמש תמונות','צרפו תמונה כהוכחה.',(select id from mission_categories where slug='creative'),'extreme',20,80,'{photo}','crazy','אתגר קיצוני של יום שלם ויציאה גדולה מאוד מאזור הנוחות — לכן הוא שווה 20 נקודות.');
