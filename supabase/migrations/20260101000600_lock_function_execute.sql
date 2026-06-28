-- ============================================================================
-- Spontani — Correctly lock down function EXECUTE grants
--
-- Postgres grants EXECUTE to PUBLIC by default, so the previous REVOKE from
-- anon/authenticated had no effect (they inherit via PUBLIC). This migration
-- revokes from PUBLIC and grants back only where needed.
--
-- is_admin() is deliberately left executable by PUBLIC: RLS policies on
-- world-readable tables evaluate it for both anon and authenticated roles.
-- ============================================================================

-- Client RPCs: callable only by signed-in users (internal guards handle admin).
do $$
declare fn text;
begin
  foreach fn in array array[
    'approve_submission(uuid, uuid)',
    'reject_submission(uuid, uuid, text)',
    'assign_daily_mission(uuid, mood)',
    'submit_proof(uuid, proof_type, text, text, text)',
    'admin_grant_xp(uuid, int, int, text)',
    'admin_reset_streak(uuid)'
  ]
  loop
    execute format('revoke execute on function %s from public, anon;', fn);
    execute format('grant execute on function %s to authenticated;', fn);
  end loop;
end $$;

-- Internal-only functions: no client role may call them directly. Trigger and
-- SECURITY DEFINER internal calls run as the owner and are unaffected.
revoke execute on function evaluate_badges(uuid) from public, anon, authenticated;
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function set_updated_at() from public, anon, authenticated;

-- Public avatars are served via their public object URL, which does not require
-- a SELECT policy. Dropping the broad SELECT policy prevents clients from
-- listing every file in the bucket while keeping avatar URLs working.
drop policy if exists "avatars public read" on storage.objects;
