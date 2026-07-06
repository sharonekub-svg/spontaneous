-- ----------------------------------------------------------------------------
-- Moderation: user blocking (App Store Guideline 1.2 — UGC safety).
--
-- The `friendships` table already carries a `blocked` status and the `reports`
-- table already accepts user-submitted reports (see rls_policies.sql). This
-- migration adds the two RPCs the client needs to block/unblock a user safely,
-- and teaches friends_feed to hide anyone in a blocked relationship with the
-- caller (in either direction).
--
-- block_user() is SECURITY DEFINER so it can clear the reverse-direction
-- friendship row (which the caller may not own) and collapse everything into a
-- single canonical blocked row (requester = blocker, addressee = blocked).
-- ----------------------------------------------------------------------------

create or replace function public.block_user(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if target_id is null or target_id = uid then
    raise exception 'invalid target';
  end if;

  -- Remove any existing relationship in either direction so the unique
  -- (requester_id, addressee_id) constraint can't collide, then record the
  -- block from the caller's point of view.
  delete from friendships
  where (requester_id = uid and addressee_id = target_id)
     or (requester_id = target_id and addressee_id = uid);

  insert into friendships (requester_id, addressee_id, status)
  values (uid, target_id, 'blocked');
end;
$$;

create or replace function public.unblock_user(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from friendships
  where requester_id = uid
    and addressee_id = target_id
    and status = 'blocked';
end;
$$;

revoke execute on function public.block_user(uuid) from public, anon;
revoke execute on function public.unblock_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- is_blocked(a, b): true if either user has blocked the other. Used to keep
-- blocked users out of shared surfaces.
-- ----------------------------------------------------------------------------
create or replace function public.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from friendships
    where status = 'blocked'
      and ((requester_id = a and addressee_id = b)
        or (requester_id = b and addressee_id = a))
  );
$$;

revoke execute on function public.is_blocked(uuid, uuid) from public, anon;
grant execute on function public.is_blocked(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- friends_feed(): unchanged behaviour, but now also excludes any user in a
-- blocked relationship with the caller (defensive — blocking already removes
-- the accepted friendship, but this guarantees blocked content never surfaces).
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
    and not public.is_blocked(auth.uid(), s.user_id)
  order by s.reviewed_at desc nulls last
  limit 30;
$$;

revoke execute on function public.friends_feed() from public, anon;
grant execute on function public.friends_feed() to authenticated;
