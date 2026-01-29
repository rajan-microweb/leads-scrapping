# get-all-integrations Edge Function

A Supabase Edge Function that fetches integration records from the `integrations` table, filtered by platform. Designed for backend-to-backend use from n8n HTTP Request nodes or other automation.

## Purpose

- Retrieve integration rows filtered by `platform` (e.g. `outlook`)
- Return structured JSON (`{ success, integrations, count }`) suitable for automation
- Each integration includes the `credentials` column (tokens, keys, etc.) for use in n8n or other backends

## Authentication

Requires `Authorization: Bearer <N8N_SECRET>`. The token must match the `N8N_SECRET` Edge Function secret.

- Missing or invalid `Authorization` / Bearer token: **401**
- `N8N_SECRET` not set in secrets: **500**

```
Authorization: Bearer <N8N_SECRET>
```

Set the secret:

```bash
supabase secrets set N8N_SECRET=your-secure-secret-key
```

## Request Format

### GET

- **URL**: `https://<project-ref>.supabase.co/functions/v1/get-all-integrations?platform=outlook`
- **Headers**: `Authorization: Bearer <N8N_SECRET>` (and optionally `Content-Type: application/json`)
- **Body**: none
- **Query parameters**:
  - `platform` (optional): e.g. `outlook`. Normalized with `trim` and `toLowerCase`. Omit or leave empty to return all integrations.

### POST

- **URL**: `https://<project-ref>.supabase.co/functions/v1/get-all-integrations`
- **Headers**: `Authorization: Bearer <N8N_SECRET>`, `Content-Type: application/json`
- **Body** (JSON):

```json
{
  "platform": "outlook"
}
```

- `platform` (optional): same as GET. Empty or non-string is treated as “no filter”.

Both GET and POST responses include the `credentials` column in each integration.

## Response Format

### Success (200)

```json
{
  "success": true,
  "integrations": [
    {
      "id": "...",
      "userId": "...",
      "platformName": "outlook",
      "isConnected": true,
      "metadata": { "email": "...", "displayName": "..." },
      "credentials": { "access_token": "...", "refresh_token": "...", "expires_at": "..." },
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "count": 1
}
```

- Each integration includes the `credentials` column (JSON object or `null`).
- Empty result: `integrations: []`, `count: 0` (still 200).

### Errors

- **400** – `{ "success": false, "error": "Request body must be a JSON object" }` or `"Invalid JSON in request body"`
- **401** – `{ "success": false, "error": "Unauthorized. Bearer token required." }` or `"Unauthorized. Invalid token."`, plus optional `hint`
- **405** – `{ "success": false, "error": "Method not allowed" }`
- **500** – `{ "success": false, "error": "..." }` (e.g. `"N8N_SECRET not configured"`, `"Missing Supabase configuration"`, `"Failed to fetch integrations"`)

## Usage in n8n

### HTTP Request node (GET)

- **Method**: GET
- **URL**: `https://<project-ref>.supabase.co/functions/v1/get-all-integrations?platform=outlook`
- **Headers**: `Authorization`: `Bearer {{ $env.N8N_SECRET }}`

### HTTP Request node (POST)

- **Method**: POST
- **URL**: `https://<project-ref>.supabase.co/functions/v1/get-all-integrations`
- **Headers**:
  - `Authorization`: `Bearer {{ $env.N8N_SECRET }}`
  - `Content-Type`: `application/json`
- **Body** (JSON):
  ```json
  {
    "platform": "{{ $json.platform }}"
  }
  ```

## Deployment

```bash
supabase functions deploy get-all-integrations
```

Secrets:

```bash
supabase secrets set N8N_SECRET=your-secure-secret-key
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase.

## Future filters

The function is structured so additional filters can be added without changing auth or response shape, for example:

- `userId` – restrict to a specific user
- `status` / `isConnected` – filter by connection status
- `createdAfter` / `createdBefore` – date range on `createdAt`

These would be passed in the JSON body (POST) or as query params (GET) and applied in the same query builder.

## Testing

### cURL (GET)

```bash
curl -s "https://<project-ref>.supabase.co/functions/v1/get-all-integrations?platform=outlook" \
  -H "Authorization: Bearer <N8N_SECRET>"
```

### cURL (POST)

```bash
curl -s -X POST "https://<project-ref>.supabase.co/functions/v1/get-all-integrations" \
  -H "Authorization: Bearer <N8N_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"platform": "outlook"}'
```

### Local

```bash
supabase functions serve get-all-integrations
curl -s "http://localhost:54321/functions/v1/get-all-integrations?platform=outlook" \
  -H "Authorization: Bearer <N8N_SECRET>"
```
