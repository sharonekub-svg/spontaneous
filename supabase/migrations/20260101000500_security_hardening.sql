-- ============================================================================
-- Spontani — Security hardening (addresses Supabase advisor findings)
--
-- 1. Make leaderboard_all_time a SECURITY INVOKER view so it honors the
--    querying user's RLS instead of the creator's (advisor ERROR).
-- 2. Pin search_path on the remaining functions that lacked it.
-- 3. Lock down direct RPC access to internal/admin functions.
--
-- Notes on what is intentionally left callable:
--   * is_admin() stays executable by anon + authenticated because RLS policies
--     evaluate it as the querying role.
--   * approve/reject/admin_* stay callable by `authenticated` (admins are
--     authenticated and the functions gate on is_admin internally); only the
--     anon role is revoked.
--   * Trigger / internal-only functions are revoked from both roles — trigger
--     execution and SECURITY DEFINER internal calls run as the owner and are
--     unaffected.
-- ============================================================================

alter view leaderboard_all_time set (security_invoker = on);

alter function level_for_xp(int) set search_path = public;
alter function xp_for_level(int) set search_path = public;
alter function set_updated_at() set search_path = public;
alter function leaderboard_period(timestamptz) set search_path = public;

-- Internal-only: never called directly by clients.
revoke execute on function evaluate_badges(uuid) from anon, authenticated;
revoke execute on function handle_new_user() from anon, authenticated;
revoke execute on function set_updated_at() from anon, authenticated;

-- Client RPCs: authenticated users only (anon has no business calling them).
revoke execute on function approve_submission(uuid, uuid) from anon;
revoke execute on function reject_submission(uuid, uuid, text) from anon;
revoke execute on function assign_daily_mission(uuid, mood) from anon;
revoke execute on function submit_proof(uuid, proof_type, text, text, text) from anon;
revoke execute on function admin_grant_xp(uuid, int, int, text) from anon;
revoke execute on function admin_reset_streak(uuid) from anon;
