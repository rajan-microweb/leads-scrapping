## SMTP configuration guide

This project uses SMTP for sending transactional emails such as:

- Password reset emails (`/auth/forgot-password`)
- (Optional) User invitation emails from the admin users page

### 1. Required environment variables

Set the following variables in `.env` (see `env.example` for defaults and comments):

- `SMTP_HOST` – SMTP server hostname  
- `SMTP_PORT` – Port number (`587` for TLS, `465` for SSL, others as required)  
- `SMTP_USER` – SMTP username (email address or `apikey` for some providers)  
- `SMTP_PASSWORD` – SMTP password, app password, or API key  
- `SMTP_FROM` – From address shown in emails (e.g. `noreply@example.com`)  
- `APP_URL` – Public URL of this app (used to build links in emails, such as password reset links)  

When these variables are **not** configured, the app falls back to a
development mode where email contents are printed to the server console
instead of being sent. This is handled by `src/lib/email.ts`.

### 2. Example configuration snippets

#### Gmail (via app password)

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="you@example.com"
SMTP_PASSWORD="your-gmail-app-password"
SMTP_FROM="you@example.com"
APP_URL="https://your-app.example.com"
```

#### SendGrid

```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASSWORD="your-sendgrid-api-key"
SMTP_FROM="noreply@your-domain.com"
APP_URL="https://your-app.example.com"
```

### 3. How emails are sent in the app

- All SMTP sending is centralized in `src/lib/email.ts` using `nodemailer`.
- Password reset flow:
  - `/api/auth/forgot-password` creates a `PasswordResetToken` row.
  - A reset link pointing to `${APP_URL}/auth/reset-password?token=...` is sent.
  - `/api/auth/reset-password` verifies the token and updates the user’s password.

If you add new email flows (e.g. user invitations), prefer using the same
`sendEmail` helper so configuration and error handling remain consistent.

