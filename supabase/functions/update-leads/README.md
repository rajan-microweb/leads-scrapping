# update-leads Edge Function

A Supabase Edge Function that updates a single lead row in the `LeadsData` table by `leadId`. Designed for use from n8n HTTP Request nodes (e.g. after sending an email, update `emailStatus`).

## Purpose

- Update one lead by primary key `leadId`
- Accept partial data: only provided fields are updated
- Validate that the lead exists before updating
- Return a clear success or failure response

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

- **Method**: POST or PATCH
- **URL**: `https://<project-ref>.supabase.co/functions/v1/update-leads`
- **Headers**: `Authorization: Bearer <N8N_SECRET>`, `Content-Type: application/json`
- **Body** (JSON):

```json
{
  "leadId": "<leads-data-row-id>",
  "businessEmail": "new@example.com",
  "websiteUrl": "https://new.com",
  "emailStatus": "Sent"
}
```

- `leadId` (required): Primary key of the row in `LeadsData`.
- `businessEmail` (optional): string or null.
- `websiteUrl` (optional): string or null.
- `emailStatus` (optional): non-empty string (e.g. `Pending`, `Sent`, `Failed`).

At least one of `businessEmail`, `websiteUrl`, or `emailStatus` must be provided.

## Response Format

### Success (200)

```json
{
  "success": true,
  "lead": {
    "id": "...",
    "rowIndex": 0,
    "businessEmail": "new@example.com",
    "websiteUrl": "https://new.com",
    "emailStatus": "Sent"
  }
}
```

### Errors

- **400** – Missing `leadId`, no updatable fields provided, or invalid field types.
- **401** – Missing or invalid Bearer token.
- **404** – Lead not found for the given `leadId`.
- **405** – Method not POST or PATCH.
- **500** – Server/DB error or `N8N_SECRET` not configured.

## Usage in n8n

### HTTP Request node (update after email)

- **Method**: POST
- **URL**: `https://<project-ref>.supabase.co/functions/v1/update-leads`
- **Headers**:
  - `Authorization`: `Bearer {{ $env.N8N_SECRET }}`
  - `Content-Type`: `application/json`
- **Body** (JSON):
  ```json
  {
    "leadId": "{{ $json.id }}",
    "emailStatus": "Sent"
  }
  ```

## Deployment

```bash
supabase functions deploy update-leads
```

Secrets:

```bash
supabase secrets set N8N_SECRET=your-secure-secret-key
```

## Testing

### cURL

```bash
curl -s -X POST "https://<project-ref>.supabase.co/functions/v1/update-leads" \
  -H "Authorization: Bearer <N8N_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"leadId": "<lead-id>", "emailStatus": "Sent"}'
```
