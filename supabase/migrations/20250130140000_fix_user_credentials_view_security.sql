-- Fix: Recreate user_credentials_view without SECURITY DEFINER so it respects RLS.
-- The view was flagged by Supabase lint because SECURITY DEFINER bypasses per-user RLS
-- and can expose data the calling user should not see.
-- See: https://www.postgresql.org/docs/current/sql-createview.html (security_invoker)

DROP VIEW IF EXISTS public.user_credentials_view;

CREATE VIEW public.user_credentials_view
WITH (security_invoker = true)
AS
SELECT
  id AS user_id,
  get_all_credentials(id, false) AS credentials
FROM "User";

-- Grant SELECT so authenticated and service_role can query the view.
-- With security_invoker = true, rows are filtered by RLS on "User" for the calling user.
GRANT SELECT ON public.user_credentials_view TO authenticated;
GRANT SELECT ON public.user_credentials_view TO service_role;
