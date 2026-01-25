# Fix: "Unauthorized. Invalid authorization token"

## Problem
The `Authorization: Bearer` token you're sending from n8n doesn't match the `SUPABASE_ANON_KEY` stored in the Edge Function.

## Solution: Verify and Update the Anon Key

### Step 1: Get the Correct Anon Key

1. **Go to Supabase Dashboard**:
   - https://supabase.com/dashboard/project/hwcwkmlgvxbetjsmnafv/settings/api

2. **Copy the `anon` `public` key**:
   - It's in the "Project API keys" section
   - Look for the key labeled **`anon` `public`**
   - It starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Copy the **entire key** (it's long, make sure you get it all)

### Step 2: Verify in n8n HTTP Request3 Node

1. **Open your workflow** in n8n
2. **Click on `HTTP Request3` node**
3. **Go to "Headers" section**
4. **Check the `Authorization` header**:
   - **Name**: Should be exactly `Authorization`
   - **Value**: Should be `Bearer <your-anon-key>`
   - Make sure there's a **space** between "Bearer" and the key
   - Make sure the key is **complete** (no truncation)

### Step 3: Common Issues to Check

#### Issue 1: Incomplete Key
- The anon key is very long (usually 200+ characters)
- Make sure you copied the **entire key** from Supabase dashboard
- Check if n8n truncated it

#### Issue 2: Extra Spaces
- The format should be: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- No extra spaces before or after "Bearer"
- Only one space between "Bearer" and the key

#### Issue 3: Wrong Key
- Make sure you're using the **`anon` `public`** key
- NOT the `service_role` key
- NOT the `anon` key from a different project

#### Issue 4: Key Changed
- If you regenerated API keys in Supabase, the old key won't work
- You need to update both:
  1. The secret in Supabase: `npx supabase secrets set SUPABASE_ANON_KEY=<new-key>`
  2. The header value in n8n

### Step 4: Update Supabase Secret (If Key Changed)

If you regenerated your anon key in Supabase, update the Edge Function secret:

```powershell
# Get your new anon key from Supabase dashboard
# Then set it:
npx supabase secrets set SUPABASE_ANON_KEY=<your-new-anon-key>
```

### Step 5: Test the Configuration

1. **Verify the key in Supabase Dashboard**:
   - Settings → API → Project API keys → `anon` `public`

2. **Copy the key exactly** (use Ctrl+A to select all)

3. **Paste it in n8n**:
   - Header: `Authorization`
   - Value: `Bearer <paste-key-here>`

4. **Save and test** the node

## Quick Verification

### Check Function Logs

1. Go to: https://supabase.com/dashboard/project/hwcwkmlgvxbetjsmnafv/functions/get-all-credentials/logs
2. Look for recent executions
3. Check the error messages - they now show:
   - Expected token length
   - Received token length
   - First 20 characters of each (to help identify the mismatch)

### Test with curl

Replace `<YOUR_ANON_KEY>` with your actual anon key:

```bash
curl -X POST https://hwcwkmlgvxbetjsmnafv.supabase.co/functions/v1/get-all-credentials \
  -H "Authorization: Bearer <YOUR_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id"}'
```

If curl works, the issue is in n8n configuration. If curl doesn't work, the anon key might be wrong.

## Still Not Working?

1. **Double-check the anon key**:
   - Copy it fresh from Supabase dashboard
   - Make sure it's the `anon` `public` key (not service_role)
   - Verify it's from the correct project: `hwcwkmlgvxbetjsmnafv`

2. **Check for hidden characters**:
   - Try copying the key again
   - Paste it in a text editor first to see if there are any hidden characters
   - Then copy from the text editor to n8n

3. **Verify the secret is set correctly**:
   ```powershell
   npx supabase secrets list
   ```
   - Make sure `SUPABASE_ANON_KEY` is listed

4. **Check function logs** for more details about the mismatch
