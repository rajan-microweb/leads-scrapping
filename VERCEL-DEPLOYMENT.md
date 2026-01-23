# Vercel Deployment Guide

This guide helps you fix and troubleshoot deploying **leads-scrapping** (Next.js + Supabase + NextAuth) to Vercel.

---

## 1. Use Supabase as Your Database

This project is configured to use **Supabase** (hosted PostgreSQL).

1. Go to `https://supabase.com` and create a project.
2. In **Settings → API**, copy:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. In **Settings → Database**, copy the Postgres connection string and use it as `DATABASE_URL` in Vercel.

---

## 2. Environment Variables in Vercel

Set these in **Vercel Dashboard → Your Project → Settings → Environment Variables**:

| Variable | Required | Example / Notes |
|----------|----------|------------------|
| `DATABASE_URL` | **Yes** | Your Supabase Postgres URL. **Not** `localhost`. |
| `AUTH_SECRET` | **Yes** | Generate: `openssl rand -base64 32` |
| `AUTH_URL` | **Yes** | Your Vercel app URL, e.g. `https://your-app.vercel.app` |
| `APP_URL` | Recommended | Same as `AUTH_URL` (used for password reset emails) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Optional | For password reset emails. See `SMTP-CONFIGURATION-GUIDE.md`. |

**Important:**

- `AUTH_URL` and `APP_URL` must use **HTTPS** and your **real Vercel URL** (e.g. `https://leads-scrapping.vercel.app`).
- Add variables for **Production**, and optionally for Preview if you deploy branches.

---

## 3. Build Configuration

The project is already set up for Vercel:

- **Build command:** `next build` (in `vercel.json`)
- **Output:** Next.js (auto-detected via `vercel.json` / framework)

No extra Vercel build settings are required.

---

## 4. After Deploying

1. **Ensure schema exists in Supabase:**  
   - Run the SQL from `SUPABASE-MIGRATION-COMPLETE.md` in the Supabase SQL editor (locally or before first deploy).

2. **Test the app:**  
   Open `https://your-app.vercel.app`. Sign up, sign in, and test main flows.

3. **Check logs:**  
   Vercel Dashboard → Your Project → **Logs** (Runtime) and **Deployments** → **Build Logs** for errors.

---

## 5. Common Errors & Fixes

### Runtime: "Can't reach database server" / connection timeouts

- `DATABASE_URL` must be your **Supabase** Postgres URL, not `localhost`.

**If Vercel logs say `Can't reach database server at localhost:5432`:**  
Your `DATABASE_URL` in Vercel points to localhost. Vercel cannot reach your machine. Use your Supabase connection string instead and redeploy.

### Runtime: "AUTH_SECRET is missing" or auth redirect issues

- Add `AUTH_SECRET` (from `openssl rand -base64 32`) in Vercel env vars.
- Set `AUTH_URL` to your production URL, e.g. `https://your-app.vercel.app`.

### 500 errors on API routes

- Check **Logs** in Vercel for the real error (often DB or env related).
- Confirm all required env vars are set for **Production** and that `DATABASE_URL` points to Supabase.

### Password reset emails not sending

- Configure SMTP env vars (`SMTP_*`, `APP_URL`) as in `SMTP-CONFIGURATION-GUIDE.md`.
- Without SMTP, the app may still run; only email-dependent features (e.g. reset) will fail.

---

## 6. Quick Checklist

- [ ] Database is **Supabase Postgres**, not localhost.
- [ ] `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` set in Vercel.
- [ ] `AUTH_URL` and `APP_URL` use your **production** Vercel URL (HTTPS).
- [ ] Supabase schema created via the SQL in `SUPABASE-MIGRATION-COMPLETE.md`.
- [ ] Build uses `next build`.
- [ ] (Optional) SMTP configured for password reset.

---

If you still see build or runtime errors, check **Vercel → Deployments → [latest] → Build Logs** and **Logs**, and use the error message to match against the **Common Errors** section above.
