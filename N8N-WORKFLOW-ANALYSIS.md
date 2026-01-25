# n8n Workflow Analysis: "Exploring Leads - LEADs"

## Overview
This is a comprehensive lead generation and personalized email outreach automation workflow that:
1. Receives lead data via webhook
2. Scrapes company websites
3. Uses AI to extract company intelligence
4. Generates personalized cold emails
5. Sends emails via Microsoft Outlook/Graph API

## Workflow Flow

### 1. **Entry Point: Webhook**
- **Node**: `Webhook1` (POST `/get-leads`)
- **Receives**: 
  - `userId` - User ID from your application
  - `signatureId`, `signatureName`, `signatureContent` - Email signature data
  - Signature metadata (createdAt, updatedAt)

### 2. **Data Extraction**
- **Node**: `Extract from File`
- **Purpose**: Extracts business emails and website URLs from Excel file
- **Output**: 
  - `Business Emails` (e.g., "rajan@microwebtec.com")
  - `Website URLs` (e.g., "https://nova-tech.io")

### 3. **Lead Processing Loop**
- **Node**: `Loop Over Items`
- **Purpose**: Iterates through each lead from the Excel file

### 4. **Website Scraping**
- **Node**: `Website Data Scrapping`
- **Purpose**: Fetches homepage HTML content
- **URL**: Constructs from email domain: `https://www.{{ $json["Business Emails"].split("@")[1] }}`

### 5. **AI-Powered Intelligence Extraction**

#### Phase 1: Discover Important Pages
- **Node**: `AI – Discover Important Pages`
- **Model**: Groq Chat Model (llama-3.1-8b-instant)
- **Purpose**: Identifies important internal links (about, team, services, etc.)
- **Output**: List of important URLs with reasons

#### Phase 2: Extract Company Facts
- **Node**: `AI – Extract Company Facts From Page`
- **Model**: Groq Chat Model (llama-3.1-8b-instant)
- **Purpose**: Extracts factual company data from each page
- **Extracts**: company_name, founders, CEO, services, products, industries, location, social links

#### Phase 3: Company Intelligence Agent
- **Node**: `AI – Company Intelligence Agent`
- **Model**: Groq Chat Model (llama-3.3-70b-versatile)
- **Purpose**: Aggregates all extracted data into a single company profile
- **Output**: Structured company intelligence JSON

### 6. **User Credentials Retrieval** ⚠️ **KEY INTEGRATION POINT**
- **Node**: `HTTP Request3`
- **URL**: `https://hwcwkmlgvxbetjsmnafv.supabase.co/functions/v1/get-all-credentials`
- **Method**: POST
- **Authentication**: HTTP Header Auth (Credential ID: `iu2kIF9sMs89cLQH`)
- **Body**: 
  ```json
  {
    "userId": "{{ $('Webhook1').item.json.body.userId }}"
  }
  ```
- **Purpose**: Fetches user's personal details, company info, and integrations to personalize the email

### 7. **Email Generation**
- **Node**: `Basic LLM Chain`
- **Model**: Groq Chat Model (llama-3.1-8b-instant)
- **Purpose**: Generates personalized cold email based on:
  - Company intelligence (from website scraping)
  - User's company details (from Supabase function)
  - User's services catalog
- **Output**: 
  ```json
  {
    "subject": "Email subject",
    "body": "HTML email body"
  }
  ```

### 8. **Email Sending**
- **Node**: `Send Email via Graph API`
- **Method**: POST to Microsoft Graph API
- **Purpose**: Sends the generated email with signature appended
- **Recipient**: Business email from Excel file
- **Includes**: Generated subject, body, and user's signature

## Key Integration Points

### Supabase Edge Function Call
The workflow calls your `get-all-credentials` function at node `HTTP Request3`:

**Current Configuration:**
- URL: `https://hwcwkmlgvxbetjsmnafv.supabase.co/functions/v1/get-all-credentials`
- Auth: HTTP Header Auth credential named "Header LEADs Account"
- Body: `{ "userId": "{{ $('Webhook1').item.json.body.userId }}" }`

**Expected Response Structure:**
The workflow expects the function to return:
```json
{
  "success": true,
  "userId": "...",
  "data": {
    "personal": { ... },
    "company": { ... },
    "integrations": [ ... ],
    "websiteSubmissions": [ ... ]
  }
}
```

## Issues & Recommendations

### 1. **Authentication Configuration**
- ✅ The workflow uses HTTP Header Auth credential
- ⚠️ **Action Required**: Ensure the credential is configured with:
  - Header name: `x-api-key`
  - Header value: Your `N8N_SECRET` value

### 2. **Response Data Usage**
The workflow currently doesn't explicitly parse the Supabase function response. You may need to add a Code node after `HTTP Request3` to:
- Extract user's company details
- Extract user's services catalog
- Format data for the email generation prompt

### 3. **Disabled Nodes**
- `HTTP Request2` (line 621) - Old API endpoint, correctly disabled
- `Code in JavaScript` (line 544) - Appears to be an alternative data parser, disabled

### 4. **Email Personalization**
The email generation prompt (line 88) references:
- `{{ $json.company_intelligence.company_name }}`
- `{{ $json.company_intelligence.what_they_do }}`
- `{{ JSON.stringify($json.company_intelligence.key_services) }}`

But it should also reference user's data from the Supabase function response.

## Recommended Workflow Updates

### 1. Add Data Parsing Node After HTTP Request3
Add a Code node to extract and format the Supabase response:

```javascript
const supabaseResponse = $input.first().json;

return {
  json: {
    // User's personal details
    user_name: supabaseResponse.data.personal.fullName || supabaseResponse.data.personal.name,
    user_email: supabaseResponse.data.personal.email,
    user_company: supabaseResponse.data.company?.companyName,
    
    // User's company intelligence
    user_what_they_do: supabaseResponse.data.company?.whatTheyDo,
    user_services: supabaseResponse.data.company?.serviceCatalog || [],
    
    // Signature
    signature: supabaseResponse.data.signature || null,
    
    // Company intelligence from website scraping (from previous nodes)
    company_intelligence: $('Converting into Structured Output').first().json.company_intelligence
  }
};
```

### 2. Update Email Generation Prompt
Modify the prompt to include user's company context:
- Reference user's services from `user_services`
- Reference user's company description from `user_what_they_do`
- Use user's name for signature

### 3. Verify Authentication
Ensure the HTTP Header Auth credential in n8n is set to:
- **Header Name**: `x-api-key`
- **Header Value**: Your `N8N_SECRET` (the value you set in Supabase secrets)

## Workflow Dependencies

### External Services:
1. **Supabase Edge Function** - `get-all-credentials`
2. **Groq API** - For AI model inference
3. **Microsoft Graph API** - For sending emails
4. **Microsoft Outlook OAuth** - For email authentication

### Required Credentials in n8n:
1. Groq API (`MlyWbDs5KOwPul7i`)
2. Microsoft Outlook OAuth (`nAhu1P7dy32nm4Fa`)
3. HTTP Header Auth for Supabase (`iu2kIF9sMs89cLQH`) ⚠️ **Needs verification**

## Testing Checklist

- [ ] Verify Supabase Edge Function is deployed and accessible
- [ ] Test HTTP Request3 node with a valid userId
- [ ] Verify response structure matches expected format
- [ ] Check HTTP Header Auth credential configuration
- [ ] Test email generation with real company intelligence
- [ ] Verify email sending via Graph API
- [ ] Test with multiple leads from Excel file

## Next Steps

1. **Verify Authentication**: Check that the HTTP Header Auth credential uses `x-api-key` header
2. **Add Data Parsing**: Insert a Code node after HTTP Request3 to format the response
3. **Update Email Prompt**: Modify the email generation prompt to use user's company data
4. **Test End-to-End**: Run the workflow with a test lead to verify all integrations work
