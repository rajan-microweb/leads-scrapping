# n8n Guide: Getting Personal, Company & Integration Details

This guide shows you **multiple ways** to retrieve personal, company, and integration details in your n8n workflow.

## Overview

Your system provides user data in three main categories:
- **Personal Details**: User profile (name, email, phone, job title, etc.)
- **Company Details**: Company information (company name, services, value proposition, etc.)
- **Integration Details**: Connected platforms (Outlook, etc.) with connection status

---

## Method 1: HTTP Request to Edge Function (Current Setup) ✅

This is the **recommended method** and is already configured in your workflow.

### Configuration

**Node**: `HTTP Request3` (or create a new HTTP Request node)

**Settings:**
- **Method**: `POST`
- **URL**: `https://hwcwkmlgvxbetjsmnafv.supabase.co/functions/v1/get-all-credentials`
- **Headers**:
  - `Authorization`: `Bearer <YOUR_SUPABASE_ANON_KEY>`
  - `Content-Type`: `application/json`
- **Body** (JSON):
  ```json
  {
    "userId": "{{ $('Webhook1').item.json.body.userId }}",
    "includeSecrets": false
  }
  ```

### Response Structure

The response will be:
```json
{
  "success": true,
  "userId": "user-id-here",
  "data": {
    "personal": {
      "id": "...",
      "name": "...",
      "fullName": "...",
      "email": "...",
      "phone": "...",
      "jobTitle": "...",
      "country": "...",
      "timezone": "...",
      "image": "...",
      "avatarUrl": "...",
      "role": "CLIENT",
      "createdAt": "...",
      "updatedAt": "..."
    },
    "company": {
      "id": "...",
      "websiteName": "...",
      "websiteUrl": "...",
      "companyName": "...",
      "companyType": "...",
      "industryExpertise": {...},
      "serviceCatalog": {...},
      "theHook": "...",
      "whatTheyDo": "...",
      "valueProposition": "...",
      "brandTone": {...},
      "createdAt": "...",
      "updatedAt": "..."
    },
    "websiteSubmissions": [...],
    "integrations": [
      {
        "id": "...",
        "platformName": "outlook",
        "isConnected": true,
        "hasCredentials": true,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  }
}
```

### Accessing Data in n8n

After the HTTP Request node, you can access the data using expressions:

**Personal Details:**
```
{{ $json.data.personal.name }}
{{ $json.data.personal.email }}
{{ $json.data.personal.fullName }}
{{ $json.data.personal.jobTitle }}
```

**Company Details:**
```
{{ $json.data.company.companyName }}
{{ $json.data.company.whatTheyDo }}
{{ $json.data.company.serviceCatalog }}
{{ $json.data.company.valueProposition }}
```

**Integration Details:**
```
{{ $json.data.integrations[0].platformName }}
{{ $json.data.integrations[0].isConnected }}
```

---

## Method 2: Using Code Node to Parse & Format Data

Add a **Code** node after your HTTP Request to extract and format the data for easier use:

### Code Node (JavaScript)

```javascript
// Get the response from HTTP Request node
const response = $input.first().json;

// Extract data sections
const personal = response.data?.personal || {};
const company = response.data?.company || null;
const integrations = response.data?.integrations || [];

// Format for easy access in subsequent nodes
return {
  json: {
    // Personal details
    userName: personal.name || personal.fullName || 'Unknown',
    userEmail: personal.email || '',
    userPhone: personal.phone || '',
    userJobTitle: personal.jobTitle || '',
    userCountry: personal.country || '',
    userTimezone: personal.timezone || '',
    
    // Company details
    companyName: company?.companyName || '',
    companyWebsite: company?.websiteUrl || '',
    companyType: company?.companyType || '',
    whatTheyDo: company?.whatTheyDo || '',
    serviceCatalog: company?.serviceCatalog || {},
    valueProposition: company?.valueProposition || '',
    brandTone: company?.brandTone || {},
    
    // Integration details
    hasOutlook: integrations.some(i => i.platformName === 'outlook' && i.isConnected),
    outlookConnected: integrations.find(i => i.platformName === 'outlook')?.isConnected || false,
    allIntegrations: integrations.map(i => ({
      platform: i.platformName,
      connected: i.isConnected
    })),
    
    // Full data (for reference)
    fullPersonal: personal,
    fullCompany: company,
    fullIntegrations: integrations
  }
};
```

### Usage After Code Node

Now you can use simple expressions:
```
{{ $json.userName }}
{{ $json.companyName }}
{{ $json.hasOutlook }}
```

---

## Method 3: Direct Supabase REST API (Alternative)

If you prefer to call the SQL function directly via Supabase REST API:

### Configuration

**Node**: HTTP Request

**Settings:**
- **Method**: `POST`
- **URL**: `https://hwcwkmlgvxbetjsmnafv.supabase.co/rest/v1/rpc/get_all_credentials`
- **Headers**:
  - `apikey`: `<YOUR_SUPABASE_ANON_KEY>`
  - `Authorization`: `Bearer <YOUR_SUPABASE_ANON_KEY>`
  - `Content-Type`: `application/json`
- **Body** (JSON):
  ```json
  {
    "p_user_id": "{{ $('Webhook1').item.json.body.userId }}",
    "p_include_secrets": false
  }
  ```

**Note**: This requires the SQL function to be deployed and accessible via RPC.

---

## Method 4: Multiple HTTP Requests (Not Recommended)

You could make separate requests for each data type, but this is **inefficient**:

1. **Personal Details**: Query `User` table
2. **Company Details**: Query `my_company_info` table
3. **Integration Details**: Query `integrations` table

**Why not recommended**: Multiple API calls = slower workflow, more complexity, higher costs.

---

## Recommended Workflow Structure

```
1. Webhook (receives userId)
   ↓
2. HTTP Request → get-all-credentials Edge Function
   ↓
3. Code Node → Parse & Format Data (Optional but recommended)
   ↓
4. Use formatted data in subsequent nodes
   (Email generation, etc.)
```

---

## Example: Using Data in Email Generation

After parsing the data, use it in your email generation prompt:

```javascript
// In your AI/LLM node prompt
const prompt = `
Generate a personalized cold email for:
- Company: ${$json.companyName}
- What they do: ${$json.whatTheyDo}
- My company: ${$json.userName}'s company
- My services: ${JSON.stringify($json.serviceCatalog)}
- Value proposition: ${$json.valueProposition}
- Brand tone: ${JSON.stringify($json.brandTone)}
`;
```

---

## Getting Integration Credentials (Sensitive Data)

If you need actual integration credentials (like Outlook tokens), set `includeSecrets: true`:

**⚠️ Security Warning**: Only use this when absolutely necessary and ensure the workflow is secure.

```json
{
  "userId": "{{ $('Webhook1').item.json.body.userId }}",
  "includeSecrets": true
}
```

This will return:
```json
{
  "integrations": [
    {
      "id": "...",
      "platformName": "outlook",
      "isConnected": true,
      "credentials": {
        "accessToken": "...",
        "refreshToken": "..."
      }
    }
  ]
}
```

---

## Troubleshooting

### Issue: "Unauthorized" Error
- **Solution**: Verify your `Authorization: Bearer` header has the correct Supabase Anon Key
- Check: https://supabase.com/dashboard/project/hwcwkmlgvxbetjsmnafv/settings/api

### Issue: "User not found"
- **Solution**: Verify the `userId` is correct and exists in your database
- Check: The userId should match exactly (case-sensitive)

### Issue: Company data is null
- **Solution**: The user may not have filled in company information yet
- Handle: Use `{{ $json.data.company || {} }}` or provide defaults

### Issue: Integrations array is empty
- **Solution**: User may not have connected any integrations yet
- Handle: Check `{{ $json.data.integrations.length > 0 }}` before accessing

---

## Quick Reference: Data Access Expressions

| Data | Expression |
|------|-----------|
| User Name | `{{ $json.data.personal.name }}` |
| User Email | `{{ $json.data.personal.email }}` |
| Company Name | `{{ $json.data.company.companyName }}` |
| Company Services | `{{ $json.data.company.serviceCatalog }}` |
| Outlook Connected | `{{ $json.data.integrations[0].isConnected }}` |
| All Integrations | `{{ $json.data.integrations }}` |

---

## Next Steps

1. ✅ **Verify** your HTTP Request3 node is configured correctly
2. ✅ **Add** a Code node to parse the response (optional but recommended)
3. ✅ **Test** the workflow with a real userId
4. ✅ **Use** the parsed data in your email generation and other nodes

---

## Support

If you encounter issues:
1. Check the Edge Function logs in Supabase Dashboard
2. Verify the userId exists in your database
3. Test the endpoint directly with cURL or Postman
4. Check n8n execution logs for detailed error messages
