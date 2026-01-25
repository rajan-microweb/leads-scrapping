# Supabase Edge Function Deployment Guide

## Quick Start

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link Your Project

```bash
supabase link --project-ref <your-project-ref>
```

You can find your project ref in your Supabase dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`

### 4. Deploy the Function

```bash
supabase functions deploy get-all-credentials
```

### 5. Set Required Secret (for n8n Integration)

Set the N8N_SECRET that will be used with the `x-api-key` header:

```bash
supabase secrets set N8N_SECRET=your-secure-secret-key-here
```

## Function Details

The `get-all-credentials` function is located at:
- **Path**: `supabase/functions/get-all-credentials/`
- **Endpoint**: `https://<your-project-ref>.supabase.co/functions/v1/get-all-credentials`

## Testing

### Using Supabase CLI

```bash
supabase functions invoke get-all-credentials \
  --body '{"userId": "your-user-id", "includeSecrets": false}'
```

### Using cURL

**Using x-api-key header (recommended for n8n):**
```bash
curl -X POST \
  https://<your-project-ref>.supabase.co/functions/v1/get-all-credentials \
  -H "x-api-key: <N8N_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "includeSecrets": false
  }'
```

**Using service role key (alternative):**
```bash
curl -X POST \
  https://<your-project-ref>.supabase.co/functions/v1/get-all-credentials \
  -H "Authorization: Bearer <YOUR_SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "includeSecrets": false
  }'
```

## Environment Variables

The function automatically has access to:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (automatically injected)

Required for n8n integration:
- `N8N_SECRET` - Secret key for n8n integration (set via `supabase secrets set`), used with `x-api-key` header

## Documentation

For detailed usage instructions, see:
- `supabase/functions/get-all-credentials/README.md`

## Troubleshooting

### Function Not Found
- Ensure you've deployed the function: `supabase functions deploy get-all-credentials`
- Check that you're using the correct project ref in the URL

### Unauthorized Error
- Verify you're using the correct `x-api-key` header with `N8N_SECRET` value
- Or verify you're using the correct service role key with `Authorization: Bearer <key>` header
- Check that the secret was set: `supabase secrets list`

### User Not Found
- Verify the userId exists in your database
- Check that the userId is passed as a string in the request body
