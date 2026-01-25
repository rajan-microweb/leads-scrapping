# Fix "Missing authorization header" Error in n8n

## Problem
The HTTP Request node in n8n is not sending the `x-api-key` header, causing the Supabase Edge Function to return "Missing authorization header" error.

## Solution: Configure HTTP Request Node Properly

### Option 1: Use HTTP Header Auth Credential (Recommended)

1. **In n8n, open your workflow**
2. **Click on the `HTTP Request3` node**
3. **In the node settings, find "Authentication" section**
4. **Select**: `Generic Credential Type`
5. **Choose**: `HTTP Header Auth`
6. **Select your credential**: "Header LEADs Account" (or create a new one)

### Option 2: Manually Add Header (If credential doesn't work)

If the credential approach isn't working, add the header manually:

1. **In the HTTP Request node, go to "Headers" section**
2. **Click "Add Header"**
3. **Set**:
   - **Name**: `x-api-key`
   - **Value**: `co3duwW4Yq21eJ5HFvzr7BaCPTiO6X8g`

### Option 3: Verify Credential Configuration

If you're using the credential, verify it's set correctly:

1. **Go to n8n → Credentials**
2. **Find**: "Header LEADs Account" (ID: `iu2kIF9sMs89cLQH`)
3. **Verify**:
   - **Header Name**: `x-api-key` (exactly, case-sensitive)
   - **Header Value**: `co3duwW4Yq21eJ5HFvzr7BaCPTiO6X8g`
4. **Save the credential**

## Step-by-Step: Configure HTTP Request Node

### Method 1: Using Credential

1. Open `HTTP Request3` node
2. Scroll to **"Authentication"** section
3. Set:
   - **Authentication**: `Generic Credential Type`
   - **Credential Type**: `HTTP Header Auth`
   - **Credential for HTTP Header Auth**: Select "Header LEADs Account"
4. **Save the node**

### Method 2: Manual Headers (Alternative)

1. Open `HTTP Request3` node
2. Scroll to **"Headers"** section (or "Options" → "Headers")
3. **Disable** the credential authentication
4. **Add manual header**:
   - Click "Add Header" or "+"
   - **Name**: `x-api-key`
   - **Value**: `co3duwW4Yq21eJ5HFvzr7BaCPTiO6X8g`
5. **Also add**:
   - **Name**: `Content-Type`
   - **Value**: `application/json`
6. **Save the node**

## Verify Configuration

### Check Node Settings

Your HTTP Request3 node should have:

**URL:**
```
https://hwcwkmlgvxbetjsmnafv.supabase.co/functions/v1/get-all-credentials
```

**Method:**
```
POST
```

**Authentication:**
- Either: HTTP Header Auth credential selected
- Or: Manual headers with `x-api-key` set

**Body (JSON):**
```json
{
  "userId": "{{ $('Webhook1').item.json.body.userId }}"
}
```

**Headers:**
- `x-api-key`: `co3duwW4Yq21eJ5HFvzr7BaCPTiO6X8g`
- `Content-Type`: `application/json`

## Test the Node

1. **Click "Test step"** or execute the node
2. **Check the response**:
   - ✅ Success: You should get JSON with user data
   - ❌ Error: Check the error message

## Common Issues

### Issue 1: Credential Not Applied
**Symptom**: Header not being sent even with credential selected
**Fix**: 
- Remove the credential
- Add header manually in "Headers" section

### Issue 2: Wrong Header Name
**Symptom**: Still getting unauthorized
**Fix**: 
- Verify header name is exactly `x-api-key` (lowercase, with hyphen)
- Not `X-Api-Key` or `x_api_key` or `X-API-Key`

### Issue 3: Credential Value Wrong
**Symptom**: Unauthorized error
**Fix**:
- Verify credential value matches: `co3duwW4Yq21eJ5HFvzr7BaCPTiO6X8g`
- Check for extra spaces or characters

### Issue 4: Multiple Authentication Methods
**Symptom**: Conflicting headers
**Fix**:
- Use EITHER credential OR manual headers
- Don't use both at the same time

## Quick Test Script

You can test the function directly to verify it works:

```powershell
# Test from PowerShell
$headers = @{
    "x-api-key" = "co3duwW4Yq21eJ5HFvzr7BaCPTiO6X8g"
    "Content-Type" = "application/json"
}

$body = @{
    userId = "your-test-user-id"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://hwcwkmlgvxbetjsmnafv.supabase.co/functions/v1/get-all-credentials" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

If this works, the issue is in n8n configuration, not the function.

## Still Not Working?

1. **Check n8n execution logs**:
   - Look at the HTTP Request node execution
   - Check "Request" tab to see what headers were actually sent

2. **Verify function is deployed**:
   - Go to: https://supabase.com/dashboard/project/hwcwkmlgvxbetjsmnafv/functions
   - Verify `get-all-credentials` is listed

3. **Check function logs**:
   - In Supabase Dashboard → Edge Functions → get-all-credentials → Logs
   - See what error is being returned

4. **Try manual curl test**:
   ```bash
   curl -X POST https://hwcwkmlgvxbetjsmnafv.supabase.co/functions/v1/get-all-credentials \
     -H "x-api-key: co3duwW4Yq21eJ5HFvzr7BaCPTiO6X8g" \
     -H "Content-Type: application/json" \
     -d '{"userId": "test-user-id"}'
   ```

If curl works but n8n doesn't, the issue is definitely in n8n configuration.
