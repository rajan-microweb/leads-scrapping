# n8n Quick Start: Get User Data

## 🎯 What You Need

To get **personal**, **company**, and **integration** details in your n8n workflow, you have **4 methods** available.

## ✅ Recommended: Method 1 (Already Set Up)

Your workflow already uses this method via `HTTP Request3` node.

### Current Setup Check

1. **Open** your n8n workflow
2. **Find** the `HTTP Request3` node
3. **Verify** it has:
   - URL: `https://hwcwkmlgvxbetjsmnafv.supabase.co/functions/v1/get-all-credentials`
   - Method: `POST`
   - Header: `Authorization: Bearer <YOUR_SUPABASE_ANON_KEY>`
   - Body: `{ "userId": "{{ $('Webhook1').item.json.body.userId }}" }`

### Accessing the Data

After `HTTP Request3`, the data is available as:

```javascript
// Personal
{{ $json.data.personal.name }}
{{ $json.data.personal.email }}

// Company
{{ $json.data.company.companyName }}
{{ $json.data.company.whatTheyDo }}

// Integrations
{{ $json.data.integrations[0].platformName }}
{{ $json.data.integrations[0].isConnected }}
```

---

## 🚀 Quick Improvement: Add Code Node

**Add a Code node** after `HTTP Request3` to format the data for easier use:

1. **Add** a new **Code** node after `HTTP Request3`
2. **Copy** the code from `N8N-CODE-NODE-SNIPPET.js`
3. **Paste** it into the Code node
4. **Save** and connect it

Now you can use simpler expressions:
```javascript
{{ $json.userName }}           // Instead of {{ $json.data.personal.name }}
{{ $json.companyName }}        // Instead of {{ $json.data.company.companyName }}
{{ $json.hasOutlook }}         // Boolean check for Outlook
```

---

## 📋 All Available Methods

| Method | When to Use | Complexity |
|--------|-------------|------------|
| **1. HTTP Request to Edge Function** | ✅ Recommended | Easy |
| **2. Code Node to Parse** | ✅ Recommended addition | Easy |
| **3. Direct Supabase REST API** | Alternative | Medium |
| **4. Multiple HTTP Requests** | ❌ Not recommended | Hard |

---

## 📖 Full Documentation

- **Complete Guide**: See `N8N-GET-USER-DATA-GUIDE.md`
- **Code Snippet**: See `N8N-CODE-NODE-SNIPPET.js`

---

## 🔧 Troubleshooting

### "Unauthorized" Error
- Check your `Authorization: Bearer` header has the correct Supabase Anon Key
- Get it from: https://supabase.com/dashboard/project/hwcwkmlgvxbetjsmnafv/settings/api

### "User not found"
- Verify the `userId` is correct
- Check it exists in your database

### Company data is null
- User may not have filled company information
- Use defaults: `{{ $json.data.company || {} }}`

---

## 💡 Example Usage in Email Generation

After parsing with Code node:

```javascript
// In your AI/LLM prompt
Generate a personalized email for {{ $json.companyName }}.

My company: {{ $json.userName }}'s company
My services: {{ $json.companyServicesText }}
Value proposition: {{ $json.companyValueProposition }}
```

---

## ✅ Next Steps

1. ✅ Verify `HTTP Request3` is configured correctly
2. ✅ Add Code node with the snippet (optional but recommended)
3. ✅ Test with a real userId
4. ✅ Use the data in your email generation

---

**Need help?** Check the full guide: `N8N-GET-USER-DATA-GUIDE.md`
