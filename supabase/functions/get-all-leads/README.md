# get-all-leads Edge Function

A Supabase Edge Function that fetches lead records from the `LeadsData` table, optionally filtered by `hasReplied`. Designed for backend-to-backend use from n8n HTTP Request nodes or other automation.

## Purpose

- Retrieve lead rows from `LeadsData`
- Optionally filter by the `hasReplied` column (`YES` / `NO`)
- Return structured JSON (`{ success, leads, count }`) suitable for automation
- Avoid exposing unnecessary or sensitive columns (only core lead fields are returned)

## Authentication

Requires `Authorization: Bearer <N8N_SECRET>`. The token must match the `N8N_SECRET` Edge Function secret.

- Missing or invalid `Authorization` / Bearer token: **401**
- `N8N_SECRET` not set in secrets: **500**

```text
Authorization: Bearer <N8N_SECRET>
```

Set the secret:

```bash
supabase secrets set N8N_SECRET=your-secure-secret-key
```

## Request Format

### GET

- **URL**: `https://<project-ref>.supabase.co/functions/v1/get-all-leads`
- **Headers**: `Authorization: Bearer <N8N_SECRET>` (and optionally `Content-Type: application/json`)
- **Query parameters** (all optional):
  - `hasReplied`: `"YES"` or `"NO"` (case-insensitive). When omitted or empty, no filter is applied and all leads are returned.
  - `emailStatus`: string. When omitted or empty, no filter is applied. Must be a string if provided.

Examples:

```text
https://<project-ref>.supabase.co/functions/v1/get-all-leads
https://<project-ref>.supabase.co/functions/v1/get-all-leads?hasReplied=YES
https://<project-ref>.supabase.co/functions/v1/get-all-leads?hasReplied=no
```

### POST

- **URL**: `https://<project-ref>.supabase.co/functions/v1/get-all-leads`
- **Headers**:
  - `Authorization: Bearer <N8N_SECRET>`
  - `Content-Type: application/json`
- **Body** (JSON, all fields optional):

```json
{
  "hasReplied": "YES",
  "emailStatus": "Sent"
}
```

- `hasReplied`: `"YES"` or `"NO"` (case-insensitive). When omitted or empty, no filter is applied.
- `emailStatus`: string. When omitted or empty, no filter is applied.

### Invalid filters

- If `hasReplied` is provided but not `"YES"` or `"NO"` (after trimming and uppercasing), the function returns **400** with a clear error:

```json
{
  "success": false,
  "error": "hasReplied must be either 'YES' or 'NO' when provided"
}
```

- If `emailStatus` is provided but not a string, the function returns **400**:

```json
{
  "success": false,
  "error": "emailStatus must be a string when provided"
}
```

## Response Format

### Success (200)

```json
{
  "success": true,
  "leads": [
    {
      "id": "...",
      "leadSheetId": "...",
      "sheetName": "...",
      "rowIndex": 1,
      "businessEmail": "example@company.com",
      "websiteUrl": "https://example.com",
      "emailStatus": "Pending",
      "hasReplied": "NO"
    }
  ],
  "count": 1
}
```

- `leads`: array of lead rows
- `count`: number of rows returned

If no rows match the filter, `leads` will be `[]` and `count` will be `0`, still with **200**.

### Errors

- **400**
  - `{ "success": false, "error": "Request body must be a JSON object" }`
  - `{ "success": false, "error": "Invalid JSON in request body" }`
  - `{ "success": false, "error": "hasReplied must be either 'YES' or 'NO' when provided" }`
  - `{ "success": false, "error": "hasReplied must be a string when provided" }`
- **401**
  - `{ "success": false, "error": "Unauthorized. Bearer token required." }`
  - `{ "success": false, "error": "Unauthorized. Invalid token.", "hint": "..." }`
- **405**
  - `{ "success": false, "error": "Method not allowed" }`
- **500**
  - `{ "success": false, "error": "Missing Supabase configuration" }`
  - `{ "success": false, "error": "Server configuration error: N8N_SECRET not configured" }`
  - `{ "success": false, "error": "Failed to fetch leads" }`
  - `{ "success": false, "error": "Internal server error" }`

## Usage in n8n

### HTTP Request node (GET)

- **Method**: GET
- **URL**: `https://<project-ref>.supabase.co/functions/v1/get-all-leads`
- **Headers**:
  - `Authorization`: `Bearer {{ $env.N8N_SECRET }}`

Optional query param:

- `hasReplied=YES` or `hasReplied=NO`
- `emailStatus=Sent` (or any other status string)

### HTTP Request node (POST)

- **Method**: POST
- **URL**: `https://<project-ref>.supabase.co/functions/v1/get-all-leads`
- **Headers**:
  - `Authorization`: `Bearer {{ $env.N8N_SECRET }}`
  - `Content-Type`: `application/json`
- **Body** (JSON):

```json
{
  "hasReplied": "{{ $json.hasReplied }}",
  "emailStatus": "{{ $json.emailStatus }}"
}
```

Where `hasReplied` is `"YES"` or `"NO"`.

## Deployment

```bash
supabase functions deploy get-all-leads
```

Secrets:

```bash
supabase secrets set N8N_SECRET=your-secure-secret-key
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase.

