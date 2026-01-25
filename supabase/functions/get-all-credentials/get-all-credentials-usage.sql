-- =====================================================
-- Usage Examples for get_all_credentials Function
-- =====================================================

-- 1. Basic usage (without secrets)
SELECT get_all_credentials('your-user-id-here', false);

-- 2. Usage with secrets included
SELECT get_all_credentials('your-user-id-here', true);

-- 3. Get result as formatted JSON (pretty print)
SELECT jsonb_pretty(get_all_credentials('your-user-id-here', false));

-- 4. Extract specific parts of the response
SELECT 
  get_all_credentials('your-user-id-here', false)->'data'->'personal' as personal_data,
  get_all_credentials('your-user-id-here', false)->'data'->'company' as company_data;

-- 5. Use in a query to get data for multiple users
-- (Note: This calls the function multiple times, consider optimizing if needed)
SELECT 
  id as user_id,
  get_all_credentials(id, false) as credentials_data
FROM "User"
WHERE id IN ('user-id-1', 'user-id-2');

-- =====================================================
-- Optional: Create HTTP Endpoint Wrapper
-- =====================================================
-- If you want to call this function via HTTP (like the Edge Function),
-- you can create a PostgREST view or use Supabase's REST API directly

-- Option 1: Call via Supabase REST API
-- POST to: https://<project-ref>.supabase.co/rest/v1/rpc/get_all_credentials
-- Body: {"p_user_id": "user-id", "p_include_secrets": false}
-- Headers: 
--   - apikey: <your-anon-key>
--   - Authorization: Bearer <your-anon-key>
--   - Content-Type: application/json

-- Option 2: Create a view for easier REST API access
CREATE OR REPLACE VIEW user_credentials_view AS
SELECT 
  id as user_id,
  get_all_credentials(id, false) as credentials
FROM "User";

-- Then query via REST API:
-- GET https://<project-ref>.supabase.co/rest/v1/user_credentials_view?user_id=eq.user-id-here

-- =====================================================
-- Testing the Function
-- =====================================================

-- Test with a real user ID (replace with actual user ID from your database)
-- SELECT get_all_credentials(
--   (SELECT id FROM "User" LIMIT 1),
--   false
-- );

-- Test error handling with invalid user ID
-- SELECT get_all_credentials('invalid-user-id', false);

-- Test error handling with null/empty user ID
-- SELECT get_all_credentials('', false);
-- SELECT get_all_credentials(NULL, false);
