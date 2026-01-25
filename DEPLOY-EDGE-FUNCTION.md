# Deploy Supabase Edge Function - Step by Step

## Quick Deployment Guide

Since you're getting "Requested Function is not found", the function needs to be deployed first.

### Step 1: Login to Supabase CLI

```powershell
npx supabase login
```

This will open your browser to authenticate.

### Step 2: Link Your Project

From your n8n workflow, I can see your project ref is: `hwcwkmlgvxbetjsmnafv`

```powershell
npx supabase link --project-ref hwcwkmlgvxbetjsmnafv
```

### Step 3: Deploy the Function

```powershell
npx supabase functions deploy get-all-credentials
```

### Step 4: Set the N8N_SECRET

Generate a secure secret first (or use an existing one):

```powershell
# Generate a random secret (PowerShell)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Then set it:

```powershell
npx supabase secrets set N8N_SECRET=your-generated-secret-here
```

**Important**: Copy this secret value - you'll need it for n8n!

### Step 5: Verify Deployment

Test the function:

```powershell
npx supabase functions invoke get-all-credentials --body '{"userId": "test-user-id"}'
```

Or test with curl:

```powershell
curl -X POST https://hwcwkmlgvxbetjsmnafv.supabase.co/functions/v1/get-all-credentials -H "x-api-key: YOUR_N8N_SECRET" -H "Content-Type: application/json" -d '{\"userId\": \"test-user-id\"}'
```

## Update n8n Configuration

After deployment, update your n8n HTTP Header Auth credential:

1. Go to n8n → Credentials → "Header LEADs Account"
2. Set:
   - **Header Name**: `x-api-key`
   - **Header Value**: The `N8N_SECRET` you just set

## Troubleshooting

### Error: "Project not found"
- Make sure you're using the correct project ref: `hwcwkmlgvxbetjsmnafv`
- Verify you're logged in: `npx supabase projects list`

### Error: "Function deployment failed"
- Check that you're in the project root directory
- Verify the function file exists: `supabase/functions/get-all-credentials/index.ts`

### Error: "Unauthorized" after deployment
- Verify `N8N_SECRET` is set: `npx supabase secrets list`
- Check that n8n credential uses the same secret value

## Verify Function is Deployed

You can check deployed functions in Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/hwcwkmlgvxbetjsmnafv
2. Navigate to: **Edge Functions** (in the left sidebar)
3. You should see `get-all-credentials` listed
