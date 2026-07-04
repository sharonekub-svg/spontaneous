-- ----------------------------------------------------------------------------
-- RLS performance: wrap auth.*() calls in scalar subqueries so Postgres
-- evaluates them once per statement (initplan) instead of once per row.
-- Semantically identical to the original policies — pure performance — and
-- resolves the `auth_rls_initplan` advisor findings across all public tables.
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
  nq text;
  nc text;
begin
  for r in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
  loop
    nq := r.qual;
    nc := r.with_check;

    if nq is not null and nq not ilike '%select auth.%' then
      nq := replace(nq, 'auth.uid()', '(select auth.uid())');
      nq := replace(nq, 'auth.role()', '(select auth.role())');
      nq := replace(nq, 'auth.jwt()', '(select auth.jwt())');
    end if;
    if nc is not null and nc not ilike '%select auth.%' then
      nc := replace(nc, 'auth.uid()', '(select auth.uid())');
      nc := replace(nc, 'auth.role()', '(select auth.role())');
      nc := replace(nc, 'auth.jwt()', '(select auth.jwt())');
    end if;

    if nq is distinct from r.qual or nc is distinct from r.with_check then
      if nq is not null and nc is not null then
        execute format('alter policy %I on public.%I using (%s) with check (%s)',
                       r.policyname, r.tablename, nq, nc);
      elsif nq is not null then
        execute format('alter policy %I on public.%I using (%s)',
                       r.policyname, r.tablename, nq);
      elsif nc is not null then
        execute format('alter policy %I on public.%I with check (%s)',
                       r.policyname, r.tablename, nc);
      end if;
    end if;
  end loop;
end $$;
