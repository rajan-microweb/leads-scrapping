# Supabase Deploy Commands

Reference for deploying database migrations and Edge Functions using `npx` and the Supabase CLI.

---

## 1. Prerequisites

### Check CLI (optional)
```bash
npx supabase --version
```

### Login (once per machine)
```bash
npx supabase login
```

### Link project (once per project)
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```
- `YOUR_PROJECT_REF`: **Dashboard → Project Settings → General → Reference ID**
- Use your database password when prompted

---

## 2. Database (migrations)

### Push migrations to remote
```bash
npx supabase db push
```

### See DB diff (dry run)
```bash
npx supabase db diff
```

---

## 3. Edge Functions

### Deploy one function
```bash
npx supabase functions deploy store-integration
```

```bash
npx supabase functions deploy get-all-credentials
```

### Deploy all functions
```bash
npx supabase functions deploy
```

---

## 4. Secrets (env for Edge Functions)

### Set one secret
```bash
npx supabase secrets set MY_SECRET=my_value
```

### Set multiple secrets
```bash
npx supabase secrets set SUPABASE_URL=https://YOUR_REF.supabase.co SUPABASE_SERVICE_ROLE_KEY=your_service_role_key SUPABASE_ANON_KEY=your_anon_key
```

### Optional: store-integration and get-all-credentials auth
Both `store-integration` and `get-all-credentials` accept (in order): `STORE_INTEGRATION_SECRET`, `N8N_SECRET`, or `SUPABASE_ANON_KEY`. Use `Authorization: Bearer <key>`.
```bash
npx supabase secrets set STORE_INTEGRATION_SECRET=your_secret
# or use N8N_SECRET (e.g. anon key for n8n): already in your project
```

### List secrets (names only)
```bash
npx supabase secrets list
```

---

## 5. Common workflows

### Only DB changed
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### Only Edge Function changed
```bash
npx supabase functions deploy store-integration
```

### DB + Edge Functions changed
```bash
npx supabase db push
npx supabase functions deploy
```

### First-time / after changing secrets
```bash
npx supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=...
npx supabase secrets set STORE_INTEGRATION_SECRET=...   # optional
npx supabase functions deploy
```

---

## 6. Quick reference

| Purpose             | Command                                      |
|---------------------|----------------------------------------------|
| Login               | `npx supabase login`                         |
| Link project        | `npx supabase link --project-ref <ref>`      |
| Push migrations     | `npx supabase db push`                       |
| Deploy one function | `npx supabase functions deploy <name>`       |
| Deploy all functions| `npx supabase functions deploy`              |
| Set secrets         | `npx supabase secrets set KEY=value [...]`   |
| List secrets        | `npx supabase secrets list`                  |
| DB diff             | `npx supabase db diff`                       |
| Serve functions locally | `npx supabase functions serve`           |

---

## 7. Function URLs (after deploy)

- `https://<project-ref>.supabase.co/functions/v1/store-integration`
- `https://<project-ref>.supabase.co/functions/v1/get-all-credentials`

---

## 8. Troubleshooting: "Invalid authorization token" (n8n / HTTP)

For `store-integration` and `get-all-credentials`, the function expects:

**Header:** `Authorization: Bearer <token>`

**Which token to use (priority):**
- `STORE_INTEGRATION_SECRET` (if set), or
- `N8N_SECRET` (if set; e.g. anon key stored for n8n), or
- **Supabase Anon (public) key** — **Dashboard → Project Settings → API → `anon` `public`**

**In n8n HTTP Request node:**

1. **Headers**
   - Name: `Authorization`
   - Value: `Bearer eyJhbGci...` (literally the word `Bearer`, one space, then the key with **no** extra spaces or `Bearer ` in front of the key).

2. **Typical mistakes**
   - Using **Service Role** key instead of **Anon** key.
   - Value set to `Bearer Bearer eyJ...` → wrong (double `Bearer`).
   - Trailing space or newline when pasting the key into n8n.

3. **If you use `N8N_SECRET` or `STORE_INTEGRATION_SECRET`**
   - n8n must send that exact value in `Authorization: Bearer <value>`.

4. **Redeploy after changing secrets**
   - `npx supabase secrets set STORE_INTEGRATION_SECRET=...` or `N8N_SECRET=...`
   - `npx supabase functions deploy store-integration` and/or `npx supabase functions deploy get-all-credentials`
