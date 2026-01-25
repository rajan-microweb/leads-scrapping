# n8n Configuration: Authorization Bearer Header

## ✅ Function Updated

The Edge Function now accepts:
- **Header**: `Authorization`
- **Value**: `Bearer <YOUR_SUPABASE_ANON_KEY>`

## n8n HTTP Request3 Node Configuration

### Step 1: Get Your Supabase Anon Key

1. Go to: https://supabase.com/dashboard/project/hwcwkmlgvxbetjsmnafv/settings/api
2. Copy the **`anon` `public`** key (it starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### Step 2: Update HTTP Request3 Node

1. **Open your workflow** in n8n
2. **Click on `HTTP Request3` node**
3. **Go to "Headers" section**
4. **Remove all existing headers** (if any)
5. **Add these headers**:

   **Header 1:**
   - **Name**: `Authorization`
   - **Value**: `Bearer <YOUR_SUPABASE_ANON_KEY>` (paste your anon key after "Bearer ")

   **Header 2:**
   - **Name**: `Content-Type`
   - **Value**: `application/json`

6. **Save the node**

### Example Header Configuration

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3Y3drbWxndnhiZXRqc21uYWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTA...
Content-Type: application/json
```

## Complete Node Configuration

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
- `Authorization`: `Bearer <YOUR_SUPABASE_ANON_KEY>`
- `Content-Type`: `application/json`

**Body (JSON):**
```json
{
  "userId": "{{ $('Webhook1').item.json.body.userId }}"
}
```

## Important Notes

1. **No `x-api-key` header needed** - The function no longer uses this
2. **No `apikey` header needed** - The `Authorization: Bearer` header is sufficient
3. **Make sure there's a space** between "Bearer" and your anon key: `Bearer <key>`

## Test the Configuration

1. **Save the node**
2. **Test the node** execution
3. **You should get a successful response** with user data

## Troubleshooting

### Still Getting "Unauthorized"?

1. **Verify the anon key** is correct:
   - Copy it fresh from Supabase dashboard
   - Make sure there are no extra spaces
   - Ensure it starts with `eyJ...`

2. **Check the header format**:
   - Header name must be exactly: `Authorization` (case-sensitive)
   - Value must be: `Bearer <your-anon-key>` (with space after "Bearer")

3. **Check function logs**:
   - Go to: https://supabase.com/dashboard/project/hwcwkmlgvxbetjsmnafv/functions/get-all-credentials/logs
   - Look for error messages

### Test with curl

```bash
curl -X POST https://hwcwkmlgvxbetjsmnafv.supabase.co/functions/v1/get-all-credentials \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id"}'
```

If curl works but n8n doesn't, check the n8n node configuration again.
