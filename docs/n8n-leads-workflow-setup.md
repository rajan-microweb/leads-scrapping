# n8n Leads Workflow Setup

This document describes the changes needed in your n8n "Exploring Leads - LEADs" workflow to support per-row status callbacks from the app.

## Overview

The app sends a JSON payload to the n8n webhook with:

- `userId`: current user id
- `callbackUrl`: URL to POST when each row completes (e.g. `https://your-app.com/api/n8n-callback?token=xxx`)
- `callbackToken`: used for verification
- `signatureContent`: HTML signature content (or empty string)
- `leads`: array of lead objects with `row_id`, `Business Emails`, `Website URL`

When each row is processed (email sent), n8n should POST to `callbackUrl` with `{ "rowId": "<row_id>", "status": "completed" }` so the app can update the UI.

## Example JSON payload

```json
{
  "userId": "user_abc123",
  "callbackUrl": "https://your-app.com/api/n8n-callback?token=xxx",
  "callbackToken": "xxx",
  "signatureContent": "<p>Best regards,<br>John</p>",
  "leads": [
    { "row_id": "clxyz...", "Business Emails": "john@acme.com", "Website URL": "https://acme.com" },
    { "row_id": "clabc...", "Business Emails": "jane@corp.com", "Website URL": "https://corp.com" }
  ]
}
```

## n8n Workflow Modifications

### 1. Webhook node

- Accept **JSON** body (not multipart/form-data)
- The webhook receives: `userId`, `callbackUrl`, `callbackToken`, `signatureContent`, `leads` (array)

### 2. Replace Extract from File with Split In Batches or Split Out

- **Remove** the "Extract from File" node (no longer needed)
- Add a **Split Out** node on `{{ $json.leads }}` to process each lead as a separate item
- Each item will have: `row_id`, `Business Emails`, `Website URL`

### 3. Pass callbackUrl through the flow

- `callbackUrl` is available as `$('Webhook1').first().json.callbackUrl`
- Use this in the HTTP Request node that calls the callback

### 4. Add HTTP Request node after Send Email (UI Callback)

- **Position**: After "Send Email via Graph API", before the EMAIL Loop continues to the next row
- **Method**: POST
- **URL**: `{{ $('Webhook1').first().json.body.callbackUrl }}` (or `$('Webhook1').item.json.body.callbackUrl` if in a loop context)
- **Body**: Must be **JSON** (the app does not accept form-encoded). In the HTTP Request node:
  - Set **Body Content Type** to **JSON**
  - **JSON body**:
```json
{
  "rowId": "{{ $('EMAIL Loop').item.json.row_id }}",
  "status": "completed"
}
```
- Do **not** use form body parameters or a field named `Callback` — the API expects exactly `rowId` (string) and `status` (string: `"completed"` or `"failed"`).

### 5. Ensure row_id flows through

- The EMAIL Loop processes items from the Split Out node
- Each item includes `row_id` (from the leads array)
- The "Send Email via Graph API" node receives items that include `row_id`
- The callback HTTP Request node must run in the same execution path, so it has access to `$json.row_id`

### 6. Error handling (optional)

- If you add an error branch for failed emails, add another HTTP Request node to call:

```json
{
  "rowId": "{{ $json.row_id }}",
  "status": "failed"
}
```

## Connection flow

```
Webhook1 (JSON: userId, callbackUrl, signatureContent, leads[])
  -> Split Out (on leads array)
  -> EMAIL Loop
      -> If2 (business email filter)
      -> Website Data Scrapping
      -> ... (company intelligence, etc.)
      -> Send Email via Graph API
      -> HTTP Request (POST to callbackUrl: { rowId, status: "completed" })  <-- ADD THIS
      -> EMAIL Loop (next)
```

## Lead object format

Each item in the `leads` array:

| Field           | Description                          |
|-----------------|--------------------------------------|
| `row_id`        | CUID from LeadsData table (for callback) |
| `Business Emails` | email address                      |
| `Website URL`   | optional website URL                 |

## How the UI receives updates

When n8n calls the callback URL:

1. The callback API updates `ActionRuns.statuses` in Supabase
2. A database trigger (`action_runs_broadcast_trigger`) fires
3. The trigger calls `realtime.send()` to broadcast to channel `action-run:{jobId}`
4. The frontend is subscribed to that channel and updates the UI immediately

This means the frontend no longer polls; it receives real-time updates via Supabase Realtime Broadcast.

## Troubleshooting

### "The service refused the connection - perhaps it is offline" (UI Callback node)

This usually means **n8n cannot reach your app’s callback URL**.

- The app builds `callbackUrl` from **APP_URL** (or AUTH_URL), e.g. `{APP_URL}/api/n8n-callback?token=...`.
- If your app runs locally with `APP_URL=http://localhost:3000`, that URL is only valid on your machine. n8n runs on **its** server (e.g. `n8n.srv1248804.hstgr.cloud`), so from n8n’s perspective “localhost” is the n8n host, not your PC — the connection is refused.

**Fix:**

1. **Use a URL that n8n can reach:**
   - **Production:** Deploy the app (e.g. Vercel) and set **APP_URL** (and AUTH_URL if used) to the deployed URL, e.g. `https://your-app.vercel.app`. Restart the app so run-action uses this when building `callbackUrl`.
   - **Local testing:** Expose your local app with a tunnel (e.g. [ngrok](https://ngrok.com)) and set **APP_URL** to the tunnel URL (e.g. `https://abc123.ngrok.io`) in `.env`. Restart the app.

2. **UI Callback node must send JSON:**  
   The `/api/n8n-callback` endpoint expects a **JSON** body with `rowId` and `status`. If the node uses form body parameters or a field named `Callback` instead of `status`, the API will reject the request. In the UI Callback HTTP Request node:
   - **Send Body**: On  
   - **Body Content Type**: JSON  
   - **JSON body**: `{ "rowId": "{{ $('EMAIL Loop').item.json.row_id }}", "status": "completed" }`  
   Do not use form parameters or the key `Callback`.

## References

- Original workflow: `Exploring Leads - LEADs (7).json`
- App callback endpoint: `POST /api/n8n-callback?token=<callbackToken>`
- Env: `N8N_LEADS_WEBHOOK_URL` in the app
- Database trigger: `supabase/migrations/20250131150000_action_runs_realtime_broadcast.sql`
