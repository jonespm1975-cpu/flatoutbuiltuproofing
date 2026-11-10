-- Applied 2026-11-10 to existing course_access table.
-- RLS remains enabled with the existing owner-only SELECT policy.
-- Only a trusted server may grant course access.
revoke all on public.course_access from anon, authenticated;
grant select on public.course_access to authenticated;
