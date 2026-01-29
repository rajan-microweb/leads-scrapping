# update-integration Edge Function

A Supabase Edge Function that performs partial updates on a single integration record in the `integrations` table by `integrationId`. Designed for backend-to-backend use from n8n HTTP Request nodes or other automation.

## Purpose

- Update specific fields (`credentials`, `metadata`, `isConnected`) of one integration without overwriting the entire record
- Accept `integrationId` (primary key) as the condition and only the fields to change
- Return a success payload without exposing credentials
- Intended for n8n workflows (e.g. refreshing tokens, syncing metadata, toggling `isConnected`)

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

### Method

`POST`

### Headers

- `Authorization: Bearer <N8N_SECRET>`
- `Content-Type: application/json`

### Body (JSON)

```json
{
  "integrationId": "clx...",
  "credentials": { "access_token": "...", "refresh_token": "..." },
  "metadata": { "email": "...", "displayName": "..." },
  "isConnected": true
}
```

### Parameters

- `integrationId` (required): Primary key of the integration row to update. Must be a non-empty string.
- `credentials` (optional): Object; replaces `integrations.credentials` entirely. When provided, must be a non-array object (can be `{}`). Never returned in the response.
- `metadata` (optional): Object or `null`; replaces `integrations.metadata`. When provided and not `null`, must be a non-array object.
- `isConnected` (optional): Boolean.

At least one of `credentials`, `metadata`, or `isConnected` must be present. Any other keys in the body are ignored.

## Response Format

### Success (200)

```json
{
  "success": true,
  "id": "clx...",
  "platformName": "outlook",
  "isConnected": true,
  "metadata": { "email": "...", "displayName": "..." },
  "updatedAt": "2025-01-28T12:00:00.000Z"
}
```

- `credentials` is never included in the response.
- `updatedAt` is set automatically on every update.

### Errors

- **400** – `{ "success": false, "error": "..." }`  
  Missing or invalid `integrationId`; no updatable fields provided; invalid `credentials` or `metadata` type (e.g. `"integrationId is required and must be a non-empty string"`, `"At least one of credentials, metadata, or isConnected is required"`, `"credentials must be an object when provided"`).
- **401** – `{ "success": false, "error": "Unauthorized. Bearer token required." }` or `"Unauthorized. Invalid token."`, plus optional `hint`
- **404** – `{ "success": false, "error": "Integration not found" }` when `integrationId` does not exist
- **405** – `{ "success": false, "error": "Method not allowed" }` when the method is not POST
- **500** – `{ "success": false, "error": "..." }` (e.g. `"N8N_SECRET not configured"`, `"Missing Supabase configuration"`, `"Failed to update integration"`)

## Usage in n8n

### HTTP Request node (POST)

- **Method**: POST
- **URL**: `https://<project-ref>.supabase.co/functions/v1/update-integration`
- **Headers**:
  - `Authorization`: `Bearer {{ $env.N8N_SECRET }}`
  - `Content-Type`: `application/json`
- **Body** (JSON):
  ```json
  {
    "integrationId": "{{ $json.integrationId }}",
    "credentials": { "access_token": "{{ $json.access_token }}", "refresh_token": "{{ $json.refresh_token }}", "expires_at": "{{ $json.expires_at }}" }
  }
  ```

  Or to update only `metadata` or `isConnected`:
  ```json
  {
    "integrationId": "{{ $json.integrationId }}",
    "metadata": { "email": "{{ $json.email }}", "displayName": "{{ $json.displayName }}" }
  }
  ```
  ```json
  {
    "integrationId": "{{ $json.integrationId }}",
    "isConnected": false
  }
  ```

## Deployment

```bash
supabase functions deploy update-integration
```

Secrets:

```bash
supabase secrets set N8N_SECRET=your-secure-secret-key
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase.

## Testing

### cURL (deployed)

```bash
curl -s -X POST "https://<project-ref>.supabase.co/functions/v1/update-integration" \
  -H "Authorization: Bearer <N8N_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"integrationId": "clx...", "isConnected": true}'
```

### cURL (local)

```bash
supabase functions serve update-integration
curl -s -X POST "http://localhost:54321/functions/v1/update-integration" \
  -H "Authorization: Bearer <N8N_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"integrationId": "clx...", "metadata": {"email": "user@example.com"}}'
```
