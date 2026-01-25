# SQL Function: get_all_credentials

This is a PostgreSQL function (SQL-based) that provides the same functionality as the Edge Function, but runs directly in your database.

## Quick Start

### 1. Run the SQL in Supabase SQL Editor

Copy and paste the contents of `get-all-credentials.sql` into your Supabase SQL Editor and execute it.

### 2. Use the Function

```sql
-- Basic usage (without secrets)
SELECT get_all_credentials('your-user-id', false);

-- With secrets included
SELECT get_all_credentials('your-user-id', true);
```

## SQL Function vs Edge Function

| Feature | SQL Function | Edge Function |
|---------|-------------|---------------|
| **Language** | SQL (PL/pgSQL) | TypeScript/Deno |
| **Deployment** | Run SQL in SQL Editor | Deploy via Supabase CLI |
| **HTTP Access** | Via PostgREST API | Direct HTTP endpoint |
| **Authentication** | Database-level (RLS) | Custom auth logic |
| **Performance** | Runs in database | Runs on edge |
| **Best For** | Direct SQL queries, internal use | External APIs, n8n integration |

## Calling via HTTP (PostgREST)

The SQL function can be called via Supabase's REST API:

### Request

```bash
POST https://<your-project-ref>.supabase.co/rest/v1/rpc/get_all_credentials
```

### Headers

```
apikey: <your-anon-key>
Authorization: Bearer <your-anon-key>
Content-Type: application/json
```

### Body

```json
{
  "p_user_id": "user-id-here",
  "p_include_secrets": false
}
```

### Example with cURL

```bash
curl -X POST \
  'https://<your-project-ref>.supabase.co/rest/v1/rpc/get_all_credentials' \
  -H "apikey: <your-anon-key>" \
  -H "Authorization: Bearer <your-anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "p_user_id": "user-id-here",
    "p_include_secrets": false
  }'
```

## Response Format

The SQL function returns the same JSON structure as the Edge Function:

```json
{
  "success": true,
  "userId": "user-id-here",
  "data": {
    "personal": { ... },
    "company": { ... },
    "websiteSubmissions": [ ... ],
    "integrations": [ ... ]
  }
}
```

## Security Considerations

1. **RLS Policies**: The function uses `SECURITY DEFINER`, which means it runs with the privileges of the function owner. Ensure proper Row Level Security (RLS) policies are in place.

2. **Access Control**: The function is granted to `authenticated` and `service_role` roles. Adjust permissions as needed for your security requirements.

3. **Secrets**: By default, integration credentials are excluded. Only set `p_include_secrets = true` when absolutely necessary.

## Usage in n8n

### Option 1: Use REST API (Recommended)

Configure an HTTP Request node in n8n:

- **Method**: `POST`
- **URL**: `https://<project-ref>.supabase.co/rest/v1/rpc/get_all_credentials`
- **Headers**:
  - `apikey`: `<your-anon-key>`
  - `Authorization`: `Bearer <your-anon-key>`
  - `Content-Type`: `application/json`
- **Body**:
  ```json
  {
    "p_user_id": "{{ $json.userId }}",
    "p_include_secrets": false
  }
  ```

### Option 2: Use Edge Function (Alternative)

If you prefer the Edge Function approach (TypeScript), see the main README.md file.

## Troubleshooting

### Function Not Found
- Ensure you've run the SQL script in the Supabase SQL Editor
- Check that the function exists: `SELECT proname FROM pg_proc WHERE proname = 'get_all_credentials';`

### Permission Denied
- Verify the function has been granted to your role
- Check RLS policies on the underlying tables

### Invalid User ID
- The function returns an error JSON if the user doesn't exist
- Check the `success` field in the response

## Advantages of SQL Function

1. ✅ No deployment needed - just run SQL
2. ✅ Runs directly in database (faster for internal queries)
3. ✅ Can be called from other SQL queries
4. ✅ Easier to debug and modify
5. ✅ No external dependencies

## Advantages of Edge Function

1. ✅ More flexible authentication logic
2. ✅ Better for external API access
3. ✅ Can include custom business logic
4. ✅ Better error handling and logging
5. ✅ Can call external APIs if needed

## Recommendation

- **Use SQL Function** if: You need direct database access, internal queries, or want simplicity
- **Use Edge Function** if: You need custom auth, external API integration, or more complex logic

Both approaches work well with n8n - choose based on your specific needs!
