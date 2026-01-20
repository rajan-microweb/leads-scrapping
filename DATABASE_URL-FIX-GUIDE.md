# Fix "Invalid Port Number" Error

## The Problem
The error "invalid port number in database URL" means Prisma can't parse your connection string correctly.

## Common Causes & Fixes

### 1. Check Your .env File Format

Your `.env` file should have EXACTLY this format:

```env
DATABASE_URL="postgresql://postgres:YOUR_ENCODED_PASSWORD@localhost:5432/leads_scrapping?schema=public"
```

### 2. Common Issues to Check:

#### ❌ Issue 1: Missing Port Number
```env
# WRONG - Missing :5432
DATABASE_URL="postgresql://postgres:password@localhost/leads_scrapping?schema=public"
```
```env
# CORRECT - Has port number
DATABASE_URL="postgresql://postgres:password@localhost:5432/leads_scrapping?schema=public"
```

#### ❌ Issue 2: Colon (:) in Password Not Encoded
If your password contains `:`, it breaks the URL parsing because `:` separates username:password from host:port.

```env
# WRONG - Password has : character
DATABASE_URL="postgresql://postgres:Pass:123@localhost:5432/leads_scrapping?schema=public"
```
```env
# CORRECT - Colon encoded as %3A
DATABASE_URL="postgresql://postgres:Pass%3A123@localhost:5432/leads_scrapping?schema=public"
```

#### ❌ Issue 3: Multiple Special Characters
```env
# Example password: Admin:Pass@2024
# WRONG
DATABASE_URL="postgresql://postgres:Admin:Pass@2024@localhost:5432/leads_scrapping?schema=public"

# CORRECT - All special chars encoded
DATABASE_URL="postgresql://postgres:Admin%3APass%402024@localhost:5432/leads_scrapping?schema=public"
```

#### ❌ Issue 4: Wrong Quotes or Extra Spaces
```env
# WRONG - Single quotes or no quotes
DATABASE_URL='postgresql://...'
DATABASE_URL=postgresql://...

# CORRECT - Double quotes
DATABASE_URL="postgresql://postgres:password@localhost:5432/leads_scrapping?schema=public"
```

#### ❌ Issue 5: Wrong Hostname
```env
# WRONG - Using computer name or IP incorrectly
DATABASE_URL="postgresql://postgres:password@15May:5432/leads_scrapping?schema=public"

# CORRECT - Use localhost
DATABASE_URL="postgresql://postgres:password@localhost:5432/leads_scrapping?schema=public"
```

## Step-by-Step Fix

1. **Open your `.env` file**

2. **Find the DATABASE_URL line**

3. **Check each part:**
   - ✅ Starts with `postgresql://`
   - ✅ Has username: `postgres`
   - ✅ Has encoded password (no `@` or `:` unencoded)
   - ✅ Has `@localhost`
   - ✅ Has `:5432` (port number)
   - ✅ Has `/leads_scrapping` (database name)
   - ✅ Has `?schema=public`
   - ✅ Entire thing in double quotes

4. **Encode your password:**
   - `@` → `%40`
   - `:` → `%3A`
   - `#` → `%23`
   - Other special chars (see url-encoding-reference.txt)

5. **Example transformation:**
   ```
   Original password: Admin@Pass:2024
   
   Step 1: Replace @ with %40
   → Admin%40Pass:2024
   
   Step 2: Replace : with %3A
   → Admin%40Pass%3A2024
   
   Final DATABASE_URL:
   postgresql://postgres:Admin%40Pass%3A2024@localhost:5432/leads_scrapping?schema=public
   ```

## Quick Test Format

Copy this template and fill in your encoded password:

```env
DATABASE_URL="postgresql://postgres:YOUR_ENCODED_PASSWORD_HERE@localhost:5432/leads_scrapping?schema=public"
```

## After Fixing

Run:
```powershell
npm run db:push
```

If it still fails, check:
- Is PostgreSQL service running? (`Get-Service postgresql*`)
- Does the database `leads_scrapping` exist?
- Is your password correctly encoded?
