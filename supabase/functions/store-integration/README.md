# store-integration Edge Function

A Supabase Edge Function that creates or updates an integration row in the `integrations` table. Used by the Outlook OAuth callback (n8n webhook) and other backend services to persist credentials and optional metadata after a user authorizes an integration.

## Request Format

### Method
`POST`

### Headers
```
Content-Type: application/json
Authorization: Bearer <STORE_INTEGRATION_SECRET | N8N_SECRET | SUPABASE_ANON_KEY>
```

### Body
```json
{
  "userId": "user-id-from-oauth-state",
  "platformName": "outlook",
  "credentials": { ... },
  "metadata": { "email": "...", "name": "...", "displayName": "...", "accountId": "...", "account": "..." }
}
```

### Parameters
- `userId` (required): User ID. For Outlook OAuth, this is passed in the `state` query param and must be forwarded from the callback.
- `platformName` (required): e.g. `"outlook"`. Stored in lowercase.
- `credentials` (required): Object with tokens/keys (e.g. `access_token`, `refresh_token`, or `clientId`/`clientSecret`/`tenantId` for app credentials). Stored as-is in the `integrations.credentials` JSONB column.
- `metadata` (optional): Non-secret, display-only data. Stored in `integrations.metadata` and shown in the Integrations page “Connected account” details.

## Metadata for Integrations Page Details

When calling `store-integration` from an OAuth callback (e.g. Outlook), pass `metadata` so the app’s **IntegrationDetails** component can show the connected account. Recommended keys (all optional, string values):

| Key         | Label        | Example                    |
|------------|--------------|----------------------------|
| `email`    | Email        | `"user@example.com"`       |
| `name`     | Name         | `"Jane Doe"`               |
| `displayName` | Display name | `"Jane Doe (Work)"`     |
| `accountId`| Account ID   | `"AAMkAG..."`              |
| `account`  | Account      | `"user@contoso.com"`       |

Example for Outlook (from n8n after Microsoft Graph `/me`):

```json
{
  "userId": "{{ $json.state }}",
  "platformName": "outlook",
  "credentials": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_at": "..."
  },
  "metadata": {
    "email": "{{ $json.userPrincipalName }}",
    "name": "{{ $json.displayName }}",
    "displayName": "{{ $json.displayName }}",
    "accountId": "{{ $json.id }}",
    "account": "{{ $json.mail || $json.userPrincipalName }}"
  }
}
```

If `metadata` is omitted or empty, the Integrations page shows “No profile details available.”

## Authentication

Use `Authorization: Bearer <token>`. The expected token is (in order): `STORE_INTEGRATION_SECRET`, `N8N_SECRET`, or `SUPABASE_ANON_KEY`. Set at least one in the Edge Function secrets.

## Response

- **200/201**: `{ "success": true, "id": "...", "platformName": "...", "isConnected": true }`
- **400**: Missing `userId`, `platformName`, or `credentials`; invalid `metadata` type.
- **401**: Missing or invalid `Authorization` header.
- **404**: `User not found`.
- **500**: Database or server error.

## Deployment

```bash
supabase functions deploy store-integration
```

Set one of: `STORE_INTEGRATION_SECRET`, `N8N_SECRET`, or `SUPABASE_ANON_KEY` in Supabase Edge Function secrets.
