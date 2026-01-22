# SMTP Configuration Guide

This guide explains how to configure SMTP settings for sending password reset emails.

## Quick Overview

- **SMTP_FROM**: The email address that appears as the sender (e.g., `noreply@yourdomain.com`)
- **SMTP_PASSWORD**: The password or app-specific password for your email account
- **SMTP_USER**: Usually your email address
- **SMTP_HOST**: Your email provider's SMTP server address
- **SMTP_PORT**: Usually `587` (TLS) or `465` (SSL)

---

## Option 1: Gmail (Easiest for Development)

### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification if not already enabled

### Step 2: Create an App Password
1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Other (Custom name)"
3. Enter "Leads Scrapping App" (or any name)
4. Click "Generate"
5. **Copy the 16-character password** (this is your `SMTP_PASSWORD`)

### Step 3: Configure `.env`
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="xxxx xxxx xxxx xxxx"  # The 16-character app password (spaces optional)
SMTP_FROM="your-email@gmail.com"      # Or "noreply@yourdomain.com" if you have a domain
APP_URL="http://localhost:3000"
```

**Note**: Gmail has sending limits (500 emails/day for free accounts). For production, consider other providers.

---

## Option 2: SendGrid (Recommended for Production)

### Step 1: Create SendGrid Account
1. Sign up at [SendGrid](https://sendgrid.com/) (free tier: 100 emails/day)
2. Verify your email address

### Step 2: Create API Key
1. Go to Settings → API Keys
2. Click "Create API Key"
3. Name it "Password Reset"
4. Select "Restricted Access" → "Mail Send" → "Full Access"
5. Click "Create & View"
6. **Copy the API key** (this is your `SMTP_PASSWORD`)

### Step 3: Verify Sender Identity
1. Go to Settings → Sender Authentication
2. Verify a Single Sender (for testing) or Domain (for production)
3. Use the verified email as your `SMTP_FROM`

### Step 4: Configure `.env`
```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"                    # Always "apikey" for SendGrid
SMTP_PASSWORD="SG.xxxxxxxxxxxxx"      # Your SendGrid API key
SMTP_FROM="noreply@yourdomain.com"   # Your verified sender email
APP_URL="http://localhost:3000"
```

---

## Option 3: AWS SES (Amazon Simple Email Service)

### Step 1: Set Up AWS SES
1. Sign in to [AWS Console](https://console.aws.amazon.com/)
2. Go to Amazon SES service
3. Verify your email address or domain

### Step 2: Create SMTP Credentials
1. Go to SES → SMTP Settings
2. Click "Create SMTP Credentials"
3. Enter IAM user name (e.g., "smtp-user")
4. Click "Create"
5. **Download the credentials** - you'll get:
   - SMTP Username (this is your `SMTP_USER`)
   - SMTP Password (this is your `SMTP_PASSWORD`)

### Step 3: Configure `.env`
```env
SMTP_HOST="email-smtp.us-east-1.amazonaws.com"  # Use your region's endpoint
SMTP_PORT="587"
SMTP_USER="AKIAIOSFODNN7EXAMPLE"                 # Your SMTP username
SMTP_PASSWORD="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"  # Your SMTP password
SMTP_FROM="noreply@yourdomain.com"               # Your verified email/domain
APP_URL="http://localhost:3000"
```

**Note**: AWS SES starts in "Sandbox Mode" - you can only send to verified emails. Request production access to send to any email.

---

## Option 4: Mailgun

### Step 1: Create Mailgun Account
1. Sign up at [Mailgun](https://www.mailgun.com/) (free tier: 5,000 emails/month)
2. Verify your email

### Step 2: Get SMTP Credentials
1. Go to Sending → Domain Settings
2. Select your domain (or use sandbox domain for testing)
3. Go to "SMTP credentials" section
4. **Copy the SMTP password** (this is your `SMTP_PASSWORD`)

### Step 3: Configure `.env`
```env
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT="587"
SMTP_USER="postmaster@yourdomain.mailgun.org"  # Your Mailgun SMTP username
SMTP_PASSWORD="xxxxxxxxxxxxxxxx"               # Your Mailgun SMTP password
SMTP_FROM="noreply@yourdomain.com"             # Your verified sender
APP_URL="http://localhost:3000"
```

---

## Option 5: Microsoft 365 / Outlook

### Step 1: Enable SMTP
1. Sign in to [Microsoft 365 Admin Center](https://admin.microsoft.com/)
2. Go to Settings → Mail → POP and IMAP
3. Enable SMTP AUTH if needed

### Step 2: Create App Password
1. Go to [Microsoft Account Security](https://account.microsoft.com/security)
2. Enable 2-Step Verification
3. Go to "App passwords"
4. Create a new app password for "Mail"
5. **Copy the password** (this is your `SMTP_PASSWORD`)

### Step 3: Configure `.env`
```env
SMTP_HOST="smtp.office365.com"
SMTP_PORT="587"
SMTP_USER="your-email@outlook.com"   # Or your Microsoft 365 email
SMTP_PASSWORD="xxxxxxxxxxxxxxxx"     # Your app password
SMTP_FROM="your-email@outlook.com"
APP_URL="http://localhost:3000"
```

---

## Option 6: Zoho Mail

### Step 1: Enable SMTP
1. Sign in to [Zoho Mail](https://mail.zoho.com/)
2. Go to Settings → Mail Accounts → POP/IMAP Access
3. Enable "IMAP Access" and "SMTP Access"

### Step 2: Generate App Password
1. Go to [Zoho Account Security](https://accounts.zoho.com/home#security/app-passwords)
2. Click "Generate New Password"
3. Select "Mail Client" and your email
4. **Copy the password** (this is your `SMTP_PASSWORD`)

### Step 3: Configure `.env`
```env
SMTP_HOST="smtp.zoho.com"
SMTP_PORT="587"
SMTP_USER="your-email@zoho.com"
SMTP_PASSWORD="xxxxxxxxxxxxxxxx"     # Your app password
SMTP_FROM="your-email@zoho.com"
APP_URL="http://localhost:3000"
```

---

## Development Mode (No Configuration Needed)

If you don't configure SMTP settings, the app will work in **development mode**:
- Emails will be **logged to the console** instead of being sent
- You can see the email content in your terminal
- Perfect for testing without setting up email

Just leave these empty in your `.env`:
```env
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM="noreply@example.com"
```

---

## Testing Your Configuration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to `/auth/forgot-password`
3. Enter an email address
4. Check:
   - **Development mode**: Check your terminal/console for the email
   - **Production mode**: Check the recipient's inbox (and spam folder)

---

## Common Issues

### "Invalid login" or "Authentication failed"
- Double-check your `SMTP_USER` and `SMTP_PASSWORD`
- For Gmail: Make sure you're using an **App Password**, not your regular password
- For SendGrid: Make sure `SMTP_USER` is exactly `"apikey"` (lowercase)

### "Connection timeout"
- Check your firewall/network settings
- Try port `465` with SSL instead of `587` with TLS
- Verify the `SMTP_HOST` is correct for your provider

### Emails going to spam
- Use a verified domain email for `SMTP_FROM`
- Set up SPF, DKIM, and DMARC records (for production)
- Use a professional email service (SendGrid, AWS SES) instead of personal Gmail

### "Too many emails" error
- Gmail: 500 emails/day limit (free account)
- SendGrid: 100 emails/day (free tier)
- Consider upgrading or using a different provider

---

## Security Best Practices

1. **Never commit `.env` to git** - it's already in `.gitignore`
2. **Use environment-specific credentials** - different for dev/staging/production
3. **Rotate passwords regularly** - especially if compromised
4. **Use app-specific passwords** - never use your main account password
5. **Limit SMTP access** - use restricted API keys when possible

---

## Quick Reference Table

| Provider | SMTP_HOST | SMTP_PORT | SMTP_USER | SMTP_PASSWORD |
|----------|-----------|-----------|-----------|--------------|
| Gmail | `smtp.gmail.com` | `587` | Your email | App Password |
| SendGrid | `smtp.sendgrid.net` | `587` | `apikey` | API Key |
| AWS SES | `email-smtp.REGION.amazonaws.com` | `587` | SMTP Username | SMTP Password |
| Mailgun | `smtp.mailgun.org` | `587` | `postmaster@domain.mailgun.org` | SMTP Password |
| Outlook | `smtp.office365.com` | `587` | Your email | App Password |
| Zoho | `smtp.zoho.com` | `587` | Your email | App Password |

---

## Need Help?

- Check your email provider's documentation for SMTP settings
- Verify your credentials are correct
- Test with a simple email client first (like Thunderbird) to confirm SMTP works
- Check server logs for detailed error messages
