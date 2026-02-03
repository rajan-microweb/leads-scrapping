# get-leads Edge Function

A Supabase Edge Function that fetches lead rows from the `LeadsData` table by `leadSheetId`. Designed for use from n8n HTTP Request nodes or other automation.

## Purpose

- Fetch leads (rows) from `LeadsData` for a given `leadSheetId`
- Support optional `limit` to control the number of rows returned
- Support optional `emailStatus` to filter by status (e.g. Pending, Sent, Completed, Failed)
- Return structured JSON suitable for n8n consumption
- Expose only necessary fields (id, leadSheetId, sheetName, rowIndex, businessEmail, websiteUrl, emailStatus)

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

- **URL**: `https://<project-ref>.supabase.co/functions/v1/get-leads?leadSheetId=<id>&limit=100`
- **Headers**: `Authorization: Bearer <N8N_SECRET>`
- **Query parameters**:
  - `leadSheetId` (required): ID of the lead sheet. Rows with this `leadSheetId` are returned.
  - `limit` (optional): Max number of rows (default 100, max 1000).
  - `emailStatus` (optional): Filter rows by this status (e.g. Pending, Sent, Completed, Failed).

### POST

- **URL**: `https://<project-ref>.supabase.co/functions/v1/get-leads`
- **Headers**: `Authorization: Bearer <N8N_SECRET>`, `Content-Type: application/json`
- **Body** (JSON):

```json
{
  "leadSheetId": "<lead-sheet-id>",
  "limit": 100,
  "emailStatus": "Pending"
}
```

- `leadSheetId` (required): same as GET.
- `limit` (optional): same as GET.
- `emailStatus` (optional): same as GET.

## Response Format

### Success (200)

```json
{
  "success": true,
  "leads": [
    {
      "id": "...",
      "leadSheetId": "...",
      "sheetName": "Sheet1",
      "rowIndex": 0,
      "businessEmail": "user@example.com",
      "websiteUrl": "https://example.com",
      "emailStatus": "Pending"
    }
  ],
  "count": 1
}
```

- Rows are ordered by `rowIndex` ascending.
- Empty result: `leads: []`, `count: 0` (still 200).

### Errors

- **400** – Missing or empty `leadSheetId`, or invalid body/query.
- **401** – Missing or invalid Bearer token.
- **405** – Method not GET or POST.
- **500** – Server/DB error or `N8N_SECRET` not configured.

## Usage in n8n

### HTTP Request node (GET)

- **Method**: GET
- **URL**: `https://<project-ref>.supabase.co/functions/v1/get-leads?leadSheetId={{ $json.leadSheetId }}&limit=50`
- **Headers**: `Authorization`: `Bearer {{ $env.N8N_SECRET }}`

### HTTP Request node (POST)

- **Method**: POST
- **URL**: `https://<project-ref>.supabase.co/functions/v1/get-leads`
- **Headers**:
  - `Authorization`: `Bearer {{ $env.N8N_SECRET }}`
  - `Content-Type`: `application/json`
- **Body** (JSON):
  ```json
  {
    "leadSheetId": "{{ $json.leadSheetId }}",
    "limit": 50
  }
  ```

## Deployment

```bash
supabase functions deploy get-leads
```

Secrets:

```bash
supabase secrets set N8N_SECRET=your-secure-secret-key
```

## Testing

### cURL (GET)

```bash
curl -s "https://<project-ref>.supabase.co/functions/v1/get-leads?leadSheetId=<id>&limit=10" \
  -H "Authorization: Bearer <N8N_SECRET>"
```

### cURL (POST)

```bash
curl -s -X POST "https://<project-ref>.supabase.co/functions/v1/get-leads" \
  -H "Authorization: Bearer <N8N_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"leadSheetId": "<id>", "limit": 10}'
```
