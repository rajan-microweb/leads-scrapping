# ✅ Edge Function Deployment Complete!

## What Was Done

1. ✅ **Function Deployed**: `get-all-credentials` is now live
2. ✅ **Secret Set**: `N8N_SECRET` has been configured

## Function Details

- **Endpoint**: `https://hwcwkmlgvxbetjsmnafv.supabase.co/functions/v1/get-all-credentials`
- **Project Ref**: `hwcwkmlgvxbetjsmnafv`
- **Status**: ✅ Deployed and ready to use

## N8N Configuration Required

### ⚠️ IMPORTANT: Update n8n Credentials

You need to update your n8n HTTP Header Auth credential with the secret:

1. **Go to n8n Dashboard**
2. **Navigate to**: Credentials → "Header LEADs Account" (ID: `iu2kIF9sMs89cLQH`)
3. **Update the credential**:
   - **Header Name**: `x-api-key`
   - **Header Value**: `co3duwW4Yq21eJ5HFvzr7BaCPTiO6X8g`

### Alternative: Use Service Role Key

If you prefer to use the service role key instead:
- **Header Name**: `Authorization`
- **Header Value**: `Bearer <YOUR_SERVICE_ROLE_KEY>`

## Testing the Function

### Test from Command Line

```powershell
curl -X POST https://hwcwkmlgvxbetjsmnafv.supabase.co/functions/v1/get-all-credentials `
  -H "x-api-key: co3duwW4Yq21eJ5HFvzr7BaCPTiO6X8g" `
  -H "Content-Type: application/json" `
  -d '{\"userId\": \"your-user-id-here\"}'
```

### Test from n8n

1. Open your workflow: "Exploring Leads - LEADs"
2. Find the node: `HTTP Request3`
3. Test the node with a valid `userId`
4. You should now get a successful response instead of "Function not found"

## Expected Response

The function should return:

```json
{
  "success": true,
  "userId": "your-user-id",
  "data": {
    "personal": {
      "id": "...",
      "name": "...",
      "email": "...",
      ...
    },
    "company": {
      "companyName": "...",
      "whatTheyDo": "...",
      "serviceCatalog": [...],
      ...
    },
    "websiteSubmissions": [...],
    "integrations": [...]
  }
}
```

## Troubleshooting

### Still Getting "Function not found"?

1. **Verify the URL** in n8n matches exactly:
   ```
   https://hwcwkmlgvxbetjsmnafv.supabase.co/functions/v1/get-all-credentials
   ```

2. **Check function status** in Supabase Dashboard:
   - Go to: https://supabase.com/dashboard/project/hwcwkmlgvxbetjsmnafv/functions
   - Verify `get-all-credentials` is listed and active

3. **Verify authentication**:
   - Check that n8n credential uses header name: `x-api-key`
   - Check that the value matches: `co3duwW4Yq21eJ5HFvzr7BaCPTiO6X8g`

### Getting "Unauthorized" Error?

- Verify the `N8N_SECRET` in n8n matches the one set in Supabase
- Check that the header name is exactly `x-api-key` (case-sensitive)

### Function Returns Error?

- Check the function logs in Supabase Dashboard
- Verify the `userId` exists in your database
- Check that all required tables exist (User, my_company_info, integrations, etc.)

## Next Steps

1. ✅ **Update n8n credential** with the `N8N_SECRET` value
2. ✅ **Test the workflow** with a real `userId`
3. ✅ **Verify email generation** uses the user data correctly
4. ✅ **Monitor function logs** in Supabase Dashboard for any issues

## Security Note

⚠️ **Keep the `N8N_SECRET` secure**:
- Don't commit it to version control
- Only share it with authorized team members
- Consider rotating it periodically

If you need to change the secret:
```powershell
npx supabase secrets set N8N_SECRET=new-secret-value
```

Then update n8n credential with the new value.
