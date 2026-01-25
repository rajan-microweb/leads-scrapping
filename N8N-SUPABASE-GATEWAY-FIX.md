# Fix: "Missing authorization header" - Supabase Gateway Issue

## Root Cause

The error "Missing authorization header" is coming from **Supabase's Edge Function gateway**, not from our function code. Supabase requires either:
- `apikey: <SUPABASE_ANON_KEY>` header, OR
- `Authorization: Bearer <SUPABASE_ANON_KEY>` header

These headers are required by Supabase's gateway to even reach your function. Then your function checks the `x-api-key` header.

## Solution: Add Both Headers

You need to add **TWO headers** in your n8n HTTP Request node:

1. **`apikey`** - Your Supabase Anon Key (required by Supabase gateway)
2. **`x-api-key`** - Your N8N_SECRET (required by your function)

## Step-by-Step Fix

### 1. Get Your Supabase Anon Key

1. Go to: https://supabase.com/dashboard/project/hwcwkmlgvxbetjsmnafv/settings/api
2. Copy the **`anon` `public`** key (not the service role key)

### 2. Update HTTP Request3 Node in n8n

1. Open your workflow
2. Click on **`HTTP Request3`** node
3. Go to **"Headers"** section
4. **Add/Update headers**:

   **Header 1:**
   - **Name**: `apikey`
   - **Value**: `<YOUR_SUPABASE_ANON_KEY>` (paste the anon key from step 1)

   **Header 2:**
   - **Name**: `x-api-key`
   - **Value**: `co3duwW4Yq21eJ5HFvzr7BaCPTiO6X8g`

   **Header 3:**
   - **Name**: `Content-Type`
   - **Value**: `application/json`

5. **Save the node**

## Why Both Headers?

- **`apikey`**: Supabase's gateway uses this to authenticate and route the request to your function
- **`x-api-key`**: Your function code uses this to validate the request (your custom authentication)

## Alternative: Use Authorization Header

Instead of `apikey`, you can use:

- **Name**: `Authorization`
- **Value**: `Bearer <YOUR_SUPABASE_ANON_KEY>`

## Verify Your Anon Key

Your Supabase anon key should look something like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3Y3drbWxndnhiZXRqc21uYWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTA...
```

It's different from your service role key and is safe to use in client-side/n8n workflows.

## Updated Node Configuration

Your HTTP Request3 node should have:

**URL:**
```
https://hwcwkmlgvxbetjsmnafv.supabase.co/functions/v1/get-all-credentials
```

**Method:**
```
POST
```

**Headers:**
- `apikey`: `<YOUR_SUPABASE_ANON_KEY>`
- `x-api-key`: `co3duwW4Yq21eJ5HFvzr7BaCPTiO6X8g`
- `Content-Type`: `application/json`

**Body (JSON):**
```json
{
  "userId": "{{ $('Webhook1').item.json.body.userId }}"
}
```

## Test After Update

1. Save the node
2. Test the node execution
3. You should now get a successful response instead of "Missing authorization header"

## Still Getting Errors?

If you still get errors after adding the `apikey` header:

1. **Verify the anon key** is correct (copy from Supabase dashboard)
2. **Check function logs** in Supabase Dashboard → Edge Functions → get-all-credentials → Logs
3. **Test with curl** to verify:
   ```bash
   curl -X POST https://hwcwkmlgvxbetjsmnafv.supabase.co/functions/v1/get-all-credentials \
     -H "apikey: YOUR_ANON_KEY" \
     -H "x-api-key: co3duwW4Yq21eJ5HFvzr7BaCPTiO6X8g" \
     -H "Content-Type: application/json" \
     -d '{"userId": "test-user-id"}'
   ```
