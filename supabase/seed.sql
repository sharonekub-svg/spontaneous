-- ============================================================================
-- Spontani — Seed data
-- Categories, mission packs, badges, and a large library of side quests.
-- Safe to run repeatedly: uses ON CONFLICT / slug-based upserts where possible.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Categories
-- ----------------------------------------------------------------------------
insert into mission_categories (slug, name, description, icon, color, sort_order) values
  ('social',     'Social',     'Break the ice with the people around you.', 'people',        '#7C5CFF', 1),
  ('adventure',  'Adventure',  'Step into the unknown.',                    'map',           '#FF7A45', 2),
  ('fitness',    'Fitness',    'Get your body moving.',                     'barbell',       '#22C55E', 3),
  ('food',       'Food',       'Taste something new.',                      'restaurant',    '#F59E0B', 4),
  ('random',     'Random',     'Tiny chaos, big smiles.',                   'dice',          '#06B6D4', 5),
  ('confidence', 'Confidence', 'Turn nerves into courage.',                 'flame',         '#EF4444', 6),
  ('outdoor',    'Outdoor',    'Get outside and explore.',                  'leaf',          '#10B981', 7),
  ('friends',    'Friends',    'Bring people closer together.',             'happy',         '#EC4899', 8),
  ('dating',     'Dating',     'Put yourself out there.',                   'heart',         '#F43F5E', 9),
  ('creative',   'Creative',   'Make something out of nothing.',            'color-palette', '#A855F7', 10),
  ('weekend',    'Weekend',    'Make your days off count.',                 'sunny',         '#FACC15', 11),
  ('kindness',   'Kindness',   'Make someone''s day better.',               'gift',          '#34D399', 12),
  ('travel',     'Travel',     'See a new corner of the world.',            'airplane',      '#3B82F6', 13)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description,
  icon = excluded.icon, color = excluded.color, sort_order = excluded.sort_order;

-- ----------------------------------------------------------------------------
-- Mission packs (unlocked by level / purchased with points)
-- ----------------------------------------------------------------------------
insert into mission_packs (slug, name, description, icon, color, required_level, price_points, is_premium, sort_order) values
  ('starter',    'Starter Quests',    'Where every legend begins.',            'sparkles', '#7C5CFF', 1, 0, false, 1),
  ('night-owl',  'Night Owl Pack',    'Quests that only come alive after dark.', 'moon',    '#6366F1', 5, 0, false, 2),
  ('daredevil',  'Daredevil Pack',    'Not for the faint of heart.',           'flash',    '#EF4444', 10, 0, true, 3),
  ('romantic',   'Romantic Pack',     'Quests for the bold at heart.',         'heart',    '#F43F5E', 8, 500, true, 4),
  ('wanderer',   'Wanderer Pack',     'Explore further than ever before.',     'compass',  '#3B82F6', 12, 800, true, 5)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, required_level = excluded.required_level;

-- ----------------------------------------------------------------------------
-- Badges
-- ----------------------------------------------------------------------------
insert into badges (slug, name, description, icon, color, rarity, is_secret, criteria, sort_order) values
  ('first-mission',   'First Mission',    'Complete your very first side quest.',          'rocket',       '#7C5CFF', 'common',    false, '{"type":"missions_completed","value":1}',          1),
  ('getting-started', 'Getting Started',  'Complete 5 side quests.',                       'trending-up',  '#7C5CFF', 'common',    false, '{"type":"missions_completed","value":5}',          2),
  ('explorer',        'Explorer',         'Complete 10 adventure quests.',                 'map',          '#FF7A45', 'rare',      false, '{"type":"category","category":"adventure","value":10}', 3),
  ('social-butterfly','Social Butterfly', 'Complete 15 social quests.',                     'people',       '#7C5CFF', 'rare',      false, '{"type":"category","category":"social","value":15}', 4),
  ('fearless',        'Fearless',         'Complete 5 extreme quests.',                    'flame',        '#EF4444', 'epic',      false, '{"type":"difficulty","difficulty":"extreme","value":5}', 5),
  ('night-owl',       'Night Owl',        'Complete 10 quests after dark.',                'moon',         '#6366F1', 'rare',      false, '{"type":"category","category":"weekend","value":10}', 6),
  ('kind-person',     'Kind Person',      'Complete 10 kindness quests.',                  'gift',         '#34D399', 'rare',      false, '{"type":"category","category":"kindness","value":10}', 7),
  ('streak-3',        'On a Roll',        'Reach a 3 day streak.',                          'flame',        '#F59E0B', 'common',    false, '{"type":"streak","value":3}',                      8),
  ('streak-7',        'Week Warrior',     'Reach a 7 day streak.',                          'flame',        '#F97316', 'rare',      false, '{"type":"streak","value":7}',                      9),
  ('streak-30',       '30 Day Streak',    'Reach a 30 day streak.',                         'flame',        '#EF4444', 'epic',      false, '{"type":"streak","value":30}',                     10),
  ('streak-100',      'Legend',           'Reach a legendary 100 day streak.',             'trophy',       '#FFD700', 'legendary', false, '{"type":"streak","value":100}',                    11),
  ('century',         '100 Missions',     'Complete 100 side quests.',                     'ribbon',       '#A855F7', 'epic',      false, '{"type":"missions_completed","value":100}',        12),
  ('crazy-mode',      'Crazy Mode',       'Complete a quest while feeling crazy.',         'skull',        '#EF4444', 'epic',      false, '{"type":"difficulty","difficulty":"extreme","value":1}', 13),
  ('foodie',          'Foodie',           'Complete 10 food quests.',                      'restaurant',   '#F59E0B', 'rare',      false, '{"type":"category","category":"food","value":10}', 14),
  ('heartbreaker',    'Heartbreaker',     'Complete 5 dating quests.',                     'heart',        '#F43F5E', 'epic',      false, '{"type":"category","category":"dating","value":5}', 15),
  ('level-10',        'Rising Star',      'Reach level 10.',                               'star',         '#FACC15', 'rare',      false, '{"type":"level","value":10}',                      16),
  ('level-25',        'Veteran',          'Reach level 25.',                               'star',         '#F59E0B', 'epic',      false, '{"type":"level","value":25}',                      17),
  ('high-roller',     'High Roller',      'Earn 5,000 points.',                            'cash',         '#22C55E', 'epic',      false, '{"type":"points","value":5000}',                   18),
  ('secret-legend',   '???',              'A hidden achievement waiting to be found.',     'help',         '#64748B', 'legendary', true,  '{"type":"missions_completed","value":250}',        19),
  ('the-completionist','The Completionist','Complete 500 side quests.',                    'diamond',      '#06B6D4', 'legendary', false, '{"type":"missions_completed","value":500}',        20)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, criteria = excluded.criteria;

-- ----------------------------------------------------------------------------
-- Missions
-- Points/XP scale with difficulty; min_mood gates which moods can receive them.
-- ----------------------------------------------------------------------------
insert into missions (title, description, category_id, difficulty, base_points, xp_reward, proof_types, min_mood, is_featured)
select v.title, v.description, c.id, v.difficulty::difficulty, v.base_points, v.xp_reward,
       v.proof_types::proof_type[], v.min_mood::mood, v.is_featured
from (values
  -- ===== EASY / "Not today" & "A little" =====
  ('Touch something blue', 'Find something blue near you and snap a photo of it.', 'random', 'easy', 5, 5, '{photo}', 'not_today', false),
  ('Smile at someone', 'Give a genuine smile to a stranger or coworker.', 'social', 'easy', 5, 5, '{text}', 'not_today', false),
  ('Look up at the sky', 'Stop for 30 seconds and really look at the sky. Describe it.', 'outdoor', 'easy', 5, 5, '{photo,text}', 'not_today', false),
  ('Drink a full glass of water', 'Hydrate. Take a photo of your empty glass.', 'fitness', 'easy', 5, 5, '{photo}', 'not_today', false),
  ('Text someone good morning', 'Send a kind good-morning message to someone you care about.', 'kindness', 'easy', 10, 10, '{photo,text}', 'not_today', false),
  ('Stretch for one minute', 'Do a one-minute full body stretch.', 'fitness', 'easy', 10, 10, '{video,text}', 'not_today', false),
  ('Take a photo of something that made you smile', 'Capture one small joyful thing today.', 'creative', 'easy', 10, 10, '{photo}', 'not_today', false),
  ('Say hello to a neighbor', 'Greet a neighbor you usually walk past.', 'social', 'easy', 10, 10, '{text}', 'a_little', false),
  ('Try a new song', 'Listen to a song from a genre you never play.', 'creative', 'easy', 10, 10, '{text}', 'a_little', false),
  ('Compliment a stranger''s outfit', 'Tell someone you like what they''re wearing.', 'kindness', 'easy', 15, 15, '{text}', 'a_little', false),
  ('Take a 10 minute walk', 'Go outside and walk for at least 10 minutes.', 'outdoor', 'easy', 15, 15, '{photo,text}', 'a_little', false),
  ('Write down 3 things you''re grateful for', 'List three things you appreciate today.', 'creative', 'easy', 10, 10, '{text}', 'not_today', false),
  ('Hold a door for someone', 'Hold the door and wish them a good day.', 'kindness', 'easy', 10, 10, '{text}', 'not_today', false),
  ('Sit somewhere new', 'Sit in a spot you''ve never sat before.', 'random', 'easy', 10, 10, '{photo,text}', 'a_little', false),
  ('Take a selfie', 'Take a fun selfie wherever you are right now.', 'creative', 'easy', 10, 10, '{photo}', 'not_today', false),
  ('Doodle for 5 minutes', 'Draw anything for five minutes, no judgement.', 'creative', 'easy', 10, 10, '{photo}', 'not_today', false),
  ('Wave at a kid or a dog', 'Brighten a moment with a friendly wave.', 'kindness', 'easy', 5, 5, '{text}', 'not_today', false),
  ('Notice 5 sounds', 'Close your eyes and name five sounds around you.', 'random', 'easy', 5, 5, '{text}', 'not_today', false),

  -- ===== MEDIUM / "A little" & "Pretty spontaneous" =====
  ('Talk to a stranger', 'Start a short, friendly conversation with someone you don''t know.', 'social', 'medium', 30, 30, '{photo,voice,text}', 'pretty_spontaneous', true),
  ('Compliment someone genuinely', 'Give someone a specific, heartfelt compliment.', 'kindness', 'medium', 25, 25, '{voice,text}', 'a_little', false),
  ('Try a new food', 'Eat something you''ve never tried before.', 'food', 'medium', 30, 30, '{photo,text}', 'a_little', true),
  ('Take a different route home', 'Get home a completely different way than usual.', 'adventure', 'medium', 25, 25, '{photo,text}', 'a_little', false),
  ('Buy a random snack', 'Pick the most random snack you can find and try it.', 'food', 'medium', 25, 25, '{photo,text}', 'a_little', false),
  ('Ask someone for a recommendation', 'Ask a stranger or staff member for their favorite pick.', 'social', 'medium', 30, 30, '{text}', 'pretty_spontaneous', false),
  ('Take a selfie with a friend', 'Grab a friend and capture the moment together.', 'friends', 'medium', 25, 25, '{photo}', 'a_little', false),
  ('Visit somewhere you''ve never been', 'Explore a place in your area you''ve never visited.', 'adventure', 'medium', 35, 35, '{photo,text}', 'pretty_spontaneous', true),
  ('Help someone', 'Find a way to genuinely help a person today.', 'kindness', 'medium', 30, 30, '{text}', 'a_little', false),
  ('Invite someone to hang out', 'Reach out and make plans with someone.', 'friends', 'medium', 30, 30, '{photo,text}', 'pretty_spontaneous', false),
  ('Start a conversation with a stranger', 'Break the ice and chat with someone new.', 'confidence', 'medium', 35, 35, '{voice,text}', 'pretty_spontaneous', false),
  ('Ask someone about their favorite movie', 'Strike up a chat about films with someone.', 'social', 'medium', 25, 25, '{text}', 'pretty_spontaneous', false),
  ('Cook something new', 'Make a dish you''ve never cooked before.', 'food', 'medium', 30, 30, '{photo,text}', 'a_little', false),
  ('Do 25 push-ups', 'Knock out 25 push-ups in one session.', 'fitness', 'medium', 30, 30, '{video}', 'a_little', false),
  ('Leave a kind note', 'Write an anonymous kind note and leave it for someone to find.', 'kindness', 'medium', 30, 30, '{photo}', 'a_little', false),
  ('Try a new coffee order', 'Order a drink you''ve never had before.', 'food', 'medium', 20, 20, '{photo,text}', 'a_little', false),
  ('Explore a new neighborhood', 'Wander through an area you don''t know well.', 'adventure', 'medium', 35, 35, '{photo,text}', 'pretty_spontaneous', false),
  ('Give up your seat', 'Offer your seat to someone who could use it.', 'kindness', 'medium', 25, 25, '{text}', 'a_little', false),
  ('Learn 3 words in a new language', 'Pick a language and learn three useful words.', 'creative', 'medium', 25, 25, '{voice,text}', 'a_little', false),
  ('Take a photo of a stranger doing something cool', 'With permission, capture someone being awesome.', 'creative', 'medium', 30, 30, '{photo}', 'pretty_spontaneous', false),
  ('Ask a coworker about their weekend', 'Have a real conversation, not just small talk.', 'social', 'medium', 20, 20, '{text}', 'a_little', false),
  ('Try a new workout', 'Do a type of exercise you''ve never tried.', 'fitness', 'medium', 30, 30, '{photo,video,text}', 'a_little', false),
  ('Visit a local shop you''ve never entered', 'Step into that store you always walk past.', 'adventure', 'medium', 25, 25, '{photo,text}', 'a_little', false),
  ('Pay for someone behind you', 'Cover a small purchase for the next person in line.', 'kindness', 'medium', 40, 40, '{photo,text}', 'pretty_spontaneous', false),
  ('Recommend a book to someone', 'Share a book you love with a friend.', 'social', 'medium', 20, 20, '{text}', 'a_little', false),
  ('Take a cold shower', 'End your shower with 30 seconds of cold water.', 'fitness', 'medium', 30, 30, '{text}', 'a_little', false),
  ('Go a meal without your phone', 'Eat one full meal with zero screen time.', 'random', 'medium', 25, 25, '{text}', 'a_little', false),

  -- ===== HARD / "Pretty spontaneous" & "Crazy" =====
  ('Buy coffee for a stranger', 'Surprise someone by paying for their coffee.', 'kindness', 'hard', 60, 60, '{photo,text}', 'crazy', true),
  ('Give a genuine compliment to 5 strangers', 'Brighten five different people''s days.', 'confidence', 'hard', 60, 60, '{text}', 'pretty_spontaneous', false),
  ('Ask a stranger to take a photo with you', 'Make a new memory with someone you just met.', 'social', 'hard', 65, 65, '{photo}', 'crazy', false),
  ('Learn a stranger''s story', 'Have a real 5-minute conversation and learn something about them.', 'social', 'hard', 60, 60, '{voice,text}', 'pretty_spontaneous', false),
  ('Try the spiciest thing on the menu', 'Order and finish the spiciest dish available.', 'food', 'hard', 60, 60, '{video,photo}', 'pretty_spontaneous', false),
  ('Do a random act of kindness for a stranger', 'Help someone you don''t know, expecting nothing back.', 'kindness', 'hard', 60, 60, '{photo,text}', 'pretty_spontaneous', true),
  ('Sing along out loud in public', 'Sing to a song where others can hear you.', 'confidence', 'hard', 65, 65, '{video}', 'crazy', false),
  ('Strike up a conversation in an elevator', 'Break the elevator silence with a friendly chat.', 'confidence', 'hard', 55, 55, '{text}', 'pretty_spontaneous', false),
  ('Go somewhere alone you''d normally avoid', 'Visit a restaurant, movie, or event solo.', 'adventure', 'hard', 65, 65, '{photo,text}', 'pretty_spontaneous', false),
  ('Give an honest compliment to your boss', 'Tell someone in authority something you genuinely appreciate.', 'confidence', 'hard', 55, 55, '{text}', 'pretty_spontaneous', false),
  ('Run 5km', 'Complete a 5 kilometer run.', 'fitness', 'hard', 70, 70, '{photo,text}', 'pretty_spontaneous', false),
  ('Join a group activity with strangers', 'Show up to a class, meetup, or pickup game.', 'social', 'hard', 70, 70, '{photo,text}', 'crazy', false),
  ('Make a stranger laugh', 'Crack a joke and get a genuine laugh from someone new.', 'confidence', 'hard', 60, 60, '{voice,text}', 'pretty_spontaneous', false),
  ('Cook a meal for someone', 'Prepare a full meal and share it with someone.', 'kindness', 'hard', 55, 55, '{photo,text}', 'pretty_spontaneous', false),
  ('Take a spontaneous day trip', 'Pick a spot and just go for the day.', 'travel', 'hard', 75, 75, '{photo,text}', 'crazy', true),
  ('Perform a small talent in public', 'Show off a skill where strangers can see.', 'confidence', 'hard', 70, 70, '{video}', 'crazy', false),
  ('Ask for a discount', 'Politely ask for a better price somewhere.', 'confidence', 'hard', 50, 50, '{text}', 'pretty_spontaneous', false),
  ('Volunteer for an hour', 'Give an hour of your time to help others.', 'kindness', 'hard', 70, 70, '{photo,text}', 'pretty_spontaneous', false),
  ('Try an extreme sport activity', 'Do something with a real adrenaline kick.', 'adventure', 'hard', 80, 80, '{photo,video,text}', 'crazy', false),
  ('Have a deep conversation with a friend', 'Skip the small talk and really connect.', 'friends', 'hard', 55, 55, '{voice,text}', 'pretty_spontaneous', false),

  -- ===== EXTREME / "Crazy" =====
  ('Sing in public', 'Sing a full song loudly somewhere public.', 'confidence', 'extreme', 120, 120, '{video}', 'crazy', true),
  ('Ask someone on a date', 'Gather your courage and ask someone out.', 'dating', 'extreme', 150, 150, '{text}', 'crazy', true),
  ('Dance for 10 seconds in public', 'Bust a move where strangers can see you.', 'confidence', 'extreme', 110, 110, '{video}', 'crazy', true),
  ('Give a stranger your number', 'Hand someone your number and see what happens.', 'dating', 'extreme', 140, 140, '{text}', 'crazy', false),
  ('Do a 2-minute street performance', 'Perform for passersby for two full minutes.', 'confidence', 'extreme', 130, 130, '{video}', 'crazy', false),
  ('Ask 10 strangers a fun question', 'Survey ten different people with a quirky question.', 'social', 'extreme', 120, 120, '{video,text}', 'crazy', false),
  ('Compliment your crush', 'Tell the person you like exactly what you admire about them.', 'dating', 'extreme', 130, 130, '{text}', 'crazy', false),
  ('Give a spontaneous toast', 'Stand up and give an unprompted toast to a room.', 'confidence', 'extreme', 120, 120, '{video,text}', 'crazy', false),
  ('Spend a day saying yes to everything', 'For one day, say yes to every reasonable invitation.', 'adventure', 'extreme', 150, 150, '{text}', 'crazy', false),
  ('Plan a surprise for someone', 'Organize a genuine surprise that makes someone''s day.', 'kindness', 'extreme', 120, 120, '{photo,text}', 'crazy', false),
  ('Wear something bold all day', 'Wear an outfit way outside your comfort zone.', 'confidence', 'extreme', 100, 100, '{photo}', 'crazy', false),
  ('Start a conversation with someone you find attractive', 'Walk up and say hi, no agenda needed.', 'dating', 'extreme', 130, 130, '{text}', 'crazy', false),
  ('Lead a group of strangers in something fun', 'Get a group to do a wave, chant, or game.', 'confidence', 'extreme', 140, 140, '{video,text}', 'crazy', false),
  ('Book a spontaneous trip', 'Reserve a trip somewhere within the next month.', 'travel', 'extreme', 160, 160, '{photo,text}', 'crazy', true)
) as v(title, description, cat_slug, difficulty, base_points, xp_reward, proof_types, min_mood, is_featured)
join mission_categories c on c.slug = v.cat_slug;

-- ----------------------------------------------------------------------------
-- Attach a sampling of missions to the Starter pack so it is non-empty.
-- ----------------------------------------------------------------------------
update missions m
set pack_id = (select id from mission_packs where slug = 'starter')
where m.pack_id is null and m.difficulty = 'easy';

update missions m
set pack_id = (select id from mission_packs where slug = 'daredevil')
where m.pack_id is null and m.difficulty = 'extreme';

-- ----------------------------------------------------------------------------
-- Generate additional variety so the library reaches several hundred quests.
-- These are programmatic permutations across categories and locations.
-- ----------------------------------------------------------------------------
insert into missions (title, description, category_id, difficulty, base_points, xp_reward, proof_types, min_mood)
select
  'Explore: ' || place,
  'Visit a ' || place || ' you''ve never been to and capture a moment there.',
  (select id from mission_categories where slug = 'adventure'),
  'medium', 30, 30, '{photo,text}'::proof_type[], 'pretty_spontaneous'::mood
from unnest(array[
  'rooftop','park bench','farmers market','art gallery','book store','botanical garden',
  'food truck','vintage shop','viewpoint','pier','museum wing','hidden cafe',
  'public library','community garden','street market','old bridge','river walk','hilltop'
]) as place;

insert into missions (title, description, category_id, difficulty, base_points, xp_reward, proof_types, min_mood)
select
  'Compliment a ' || who,
  'Give a genuine, specific compliment to a ' || who || ' today.',
  (select id from mission_categories where slug = 'kindness'),
  'easy', 15, 15, '{text}'::proof_type[], 'a_little'::mood
from unnest(array[
  'barista','bus driver','coworker','cashier','waiter','librarian','teacher',
  'security guard','delivery driver','shop owner','stranger','classmate'
]) as who;

insert into missions (title, description, category_id, difficulty, base_points, xp_reward, proof_types, min_mood)
select
  'Try ' || dish,
  'Order or make ' || dish || ' for the first time and share how it went.',
  (select id from mission_categories where slug = 'food'),
  'medium', 25, 25, '{photo,text}'::proof_type[], 'a_little'::mood
from unnest(array[
  'dumplings','a dragon fruit','ramen','falafel','sushi','a mango lassi','pho',
  'tapas','a poke bowl','kimchi','an arepa','baklava','a samosa','gelato'
]) as dish;

insert into missions (title, description, category_id, difficulty, base_points, xp_reward, proof_types, min_mood)
select
  do_what || ' for ' || mins || ' minutes',
  'Spend ' || mins || ' focused minutes to ' || lower(do_what) || '.',
  (select id from mission_categories where slug = 'fitness'),
  'easy', 15, 15, '{photo,video,text}'::proof_type[], 'a_little'::mood
from unnest(array['Stretch','Walk briskly','Dance','Do yoga','Jog in place','Jump rope']) as do_what,
     unnest(array[5, 10, 15]) as mins;

-- ----------------------------------------------------------------------------
-- Feature a rotating handful of the boldest quests on the home screen.
-- ----------------------------------------------------------------------------
update missions set is_featured = true
where id in (
  select id from missions where difficulty in ('hard', 'extreme')
  order by random() limit 6
);
