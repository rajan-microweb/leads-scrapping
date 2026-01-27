# get-all-credentials Edge Function

A Supabase Edge Function that fetches complete user-related data in a single function call, designed for consumption by n8n or other backend services.

## Purpose

This function aggregates and returns:
- **Personal Details**: User profile information (name, email, avatar, role, etc.)
- **Company Details**: Website/company intelligence data from `my_company_info` table
- **Website Submissions**: Extracted company information from `WebsiteSubmission` table
- **Integration Details**: List of connected integrations with platform names and connection status

## Authentication

Same as `store-integration`: use `Authorization: Bearer <token>`. The expected token is (in order): `STORE_INTEGRATION_SECRET`, `N8N_SECRET`, or `SUPABASE_ANON_KEY`.

```
Authorization: Bearer <N8N_SECRET or STORE_INTEGRATION_SECRET or SUPABASE_ANON_KEY>
```

Set at least one of these in your Supabase project's Edge Function secrets.

## Request Format

### Method
`POST`

### Headers
```
Content-Type: application/json
Authorization: Bearer <N8N_SECRET or STORE_INTEGRATION_SECRET or SUPABASE_ANON_KEY>
```

### Body
```json
{
  "userId": "user-id-here",
  "includeSecrets": false  // Optional: set to true to include integration credentials
}
```

### Parameters
- `userId` (required): The user ID to fetch data for
- `includeSecrets` (optional, default: `false`): If `true`, includes sensitive integration credentials in the response

## Response Format

### Success Response (200)
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
      "role": "CLIENT" | "ADMIN",
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
      "fullTechSummary": {...},
      "serviceCatalog": {...},
      "theHook": "...",
      "whatTheyDo": "...",
      "valueProposition": "...",
      "brandTone": {...},
      "createdAt": "...",
      "updatedAt": "..."
    },
    "websiteSubmissions": [
      {
        "id": "...",
        "websiteName": "...",
        "websiteUrl": "...",
        "extractedData": {...},
        "createdAt": "..."
      }
    ],
    "integrations": [
      {
        "id": "...",
        "platformName": "...",
        "isConnected": true,
        "hasCredentials": true,  // Only if includeSecrets is false
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  }
}
```

### Error Responses

**400 Bad Request** - Missing or invalid userId:
```json
{
  "error": "userId is required and must be a non-empty string"
}
```

**401 Unauthorized** - Invalid or missing authentication:
```json
{
  "error": "Unauthorized. Bearer token required."
}
```

**404 Not Found** - User not found:
```json
{
  "error": "User not found"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal server error",
  "message": "Error details"
}
```

## Deployment

### Prerequisites
1. Install Supabase CLI: `npm install -g supabase`
2. Login to Supabase: `supabase login`
3. Link your project: `supabase link --project-ref <your-project-ref>`

### Deploy the Function

```bash
# From the project root
supabase functions deploy get-all-credentials
```

### Set Environment Secrets

The function uses these environment variables (automatically available):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (automatically injected)

Required (for n8n integration). Use one of (in priority order): `STORE_INTEGRATION_SECRET`, `N8N_SECRET`, or `SUPABASE_ANON_KEY`:
```bash
supabase secrets set N8N_SECRET=your-secure-secret-key-here
# or: STORE_INTEGRATION_SECRET=... or rely on SUPABASE_ANON_KEY
```

## Usage in n8n

### HTTP Request Node Configuration

1. **Method**: `POST`
2. **URL**: `https://<your-project-ref>.supabase.co/functions/v1/get-all-credentials`
3. **Headers**:
   - `Content-Type`: `application/json`
   - `Authorization`: `Bearer <N8N_SECRET or STORE_INTEGRATION_SECRET or SUPABASE_ANON_KEY>`
4. **Body** (JSON):
   ```json
   {
     "userId": "{{ $json.userId }}",
     "includeSecrets": false
   }
   ```

### Example Workflow

```json
{
  "nodes": [
    {
      "parameters": {
        "method": "POST",
        "url": "https://xxxxx.supabase.co/functions/v1/get-all-credentials",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "Bearer YOUR_N8N_SECRET"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "userId",
              "value": "={{ $json.userId }}"
            },
            {
              "name": "includeSecrets",
              "value": "false"
            }
          ]
        }
      }
    }
  ]
}
```

## Security Considerations

1. **Credentials**: By default, integration credentials are excluded from the response. Set `includeSecrets: true` only when absolutely necessary.

2. **Authentication**: Always use secure API keys. Never expose service role keys in client-side code.

3. **Authorization**: Consider adding additional authorization checks if you need to restrict which users can access which data.

4. **Rate Limiting**: Consider implementing rate limiting for production use.

## Testing

### Using cURL

```bash
curl -X POST \
  https://<your-project-ref>.supabase.co/functions/v1/get-all-credentials \
  -H "Authorization: Bearer <N8N_SECRET or STORE_INTEGRATION_SECRET or SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id-here",
    "includeSecrets": false
  }'
```

### Using Supabase CLI

```bash
supabase functions invoke get-all-credentials \
  --body '{"userId": "user-id-here", "includeSecrets": false}'
```

## Local Development

To test locally:

```bash
# Start Supabase locally
supabase start

# Serve the function locally
supabase functions serve get-all-credentials

# Test with curl
curl -X POST \
  http://localhost:54321/functions/v1/get-all-credentials \
  -H "Authorization: Bearer <N8N_SECRET or STORE_INTEGRATION_SECRET or SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-id-here"}'
```

## Notes

- The function returns the most recent company info from `my_company_info` table
- All website submissions are returned (ordered by creation date, newest first)
- Integration credentials are excluded by default for security
- The function handles missing data gracefully (returns null/empty arrays rather than failing)
