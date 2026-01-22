# Vercel Deployment Guide

This guide helps you fix and troubleshoot deploying **leads-scrapping** (Next.js + Prisma + NextAuth) to Vercel.

---

## 1. Use a Cloud PostgreSQL Database

**Your local PostgreSQL (`localhost`) will NOT work on Vercel.** Vercel runs in the cloud and cannot reach your machine.

Use one of these **free-tier** options:

| Provider | Notes |
|----------|--------|
| [Neon](https://neon.tech) | Serverless Postgres, great for Vercel. Use the **pooled** connection string. |
| [Supabase](https://supabase.com) | Postgres + auth. Use **Connection pooling** → "Transaction" mode URL. |
| [Railway](https://railway.app) | Simple setup. Use the public URL they provide. |
| [Vercel Postgres](https://vercel.com/storage/postgres) | Integrates directly with Vercel. |

Create a project, get the **connection string**, and use it as `DATABASE_URL` in Vercel.

---

## 2. Environment Variables in Vercel

Set these in **Vercel Dashboard → Your Project → Settings → Environment Variables**:

| Variable | Required | Example / Notes |
|----------|----------|------------------|
| `DATABASE_URL` | **Yes** | Your cloud Postgres URL (e.g. Neon, Supabase). **Not** `localhost`. |
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

- **Build command:** `prisma generate && next build` (in `package.json` and `vercel.json`)
- **Output:** Next.js (auto-detected via `vercel.json` / framework)
- **Prisma:** Runs `prisma generate` before every build to avoid "outdated Prisma Client" errors.

No extra Vercel build settings are required.

---

## 4. After Deploying

1. **Run migrations on your cloud DB:**  
   Locally, point `.env` at your **cloud** `DATABASE_URL`, then run:
   ```bash
   npx prisma db push
   ```
   Or use `prisma migrate deploy` if you use migrations.

2. **Test the app:**  
   Open `https://your-app.vercel.app`. Sign up, sign in, and test main flows.

3. **Check logs:**  
   Vercel Dashboard → Your Project → **Logs** (Runtime) and **Deployments** → **Build Logs** for errors.

---

## 5. Common Errors & Fixes

### Build fails: "Prisma Client not generated" or "schema out of sync"

- Ensure **Build Command** is `prisma generate && next build` (already in `vercel.json`).
- In Vercel **Settings → General**, clear **Build Cache** and redeploy.

### Runtime: "Can't reach database server" / connection timeouts

- `DATABASE_URL` must be a **cloud** Postgres URL (Neon, Supabase, etc.), not `localhost`.
- If using Neon/Supabase, use their **pooled** connection string for serverless.

### Runtime: "AUTH_SECRET is missing" or auth redirect issues

- Add `AUTH_SECRET` (from `openssl rand -base64 32`) in Vercel env vars.
- Set `AUTH_URL` to your production URL, e.g. `https://your-app.vercel.app`.

### 500 errors on API routes

- Check **Logs** in Vercel for the real error (often DB or env related).
- Confirm all required env vars are set for **Production** and that `DATABASE_URL` is correct.

### Password reset emails not sending

- Configure SMTP env vars (`SMTP_*`, `APP_URL`) as in `SMTP-CONFIGURATION-GUIDE.md`.
- Without SMTP, the app may still run; only email-dependent features (e.g. reset) will fail.

---

## 6. Quick Checklist

- [ ] Database is **cloud Postgres** (Neon, Supabase, etc.), not localhost.
- [ ] `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` set in Vercel.
- [ ] `AUTH_URL` and `APP_URL` use your **production** Vercel URL (HTTPS).
- [ ] Migrations / `prisma db push` run against the **cloud** database.
- [ ] Build uses `prisma generate && next build`.
- [ ] (Optional) SMTP configured for password reset.

---

If you still see build or runtime errors, check **Vercel → Deployments → [latest] → Build Logs** and **Logs**, and use the error message to match against the **Common Errors** section above.
