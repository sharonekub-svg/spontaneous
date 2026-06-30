-- ----------------------------------------------------------------------------
-- friends_feed(): recent approved missions from the caller's accepted friends.
--
-- Submissions are owner-only under RLS, so this runs SECURITY DEFINER but is
-- internally scoped to the caller's accepted friends and to approved
-- submissions only. Executable by signed-in users.
-- ----------------------------------------------------------------------------
create or replace function public.friends_feed()
returns table (
  submission_id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  mission_title text,
  difficulty difficulty,
  reviewed_at timestamptz
)
language sql
security definer set search_path = public
as $$
  with friends as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as fid
    from friendships
    where status = 'accepted'
      and (requester_id = auth.uid() or addressee_id = auth.uid())
  )
  select s.id, s.user_id, p.username, p.display_name, p.avatar_url,
         m.title, m.difficulty, s.reviewed_at
  from submissions s
  join friends f on f.fid = s.user_id
  join profiles p on p.id = s.user_id
  join missions m on m.id = s.mission_id
  where s.status = 'approved'
  order by s.reviewed_at desc nulls last
  limit 30;
$$;

revoke execute on function public.friends_feed() from public, anon;
grant execute on function public.friends_feed() to authenticated;
