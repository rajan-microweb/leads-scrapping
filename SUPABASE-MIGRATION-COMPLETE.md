# Supabase Migration Complete ✅

## What Was Changed

### 1. **Dependencies Updated**
- ✅ Removed: `@prisma/client`, `@auth/prisma-adapter`, `prisma`
- ✅ Added: `@supabase/supabase-js`, `@supabase/ssr`, `@auth/supabase-adapter`, `@paralleldrive/cuid2`
- ✅ Updated `package.json` scripts (removed Prisma-related scripts)

### 2. **New Files Created**
- ✅ `src/lib/supabase.ts` - Client-side Supabase client
- ✅ `src/lib/supabase-server.ts` - Server-side Supabase admin client
- ✅ `src/lib/cuid.ts` - CUID generator helper

### 3. **Files Updated**
- ✅ `src/lib/auth.ts` - Updated to use Supabase adapter
- ✅ All API routes converted to Supabase:
  - `src/app/api/auth/signup/route.ts`
  - `src/app/api/auth/forgot-password/route.ts`
  - `src/app/api/auth/reset-password/route.ts`
  - `src/app/api/profile/route.ts`
  - `src/app/api/my-company-info/route.ts`
  - `src/app/api/signatures/route.ts`
  - `src/app/api/integrations/route.ts`
  - `src/app/api/lead-file/route.ts`
  - `src/app/api/leads/route.ts`
  - `src/app/api/user-data/route.ts`
  - `src/app/api/users/role/route.ts`
  - `src/app/api/profile/upload-avatar/route.ts`
  - `src/app/api/profile-status/route.ts`
  - `src/app/api/website-info/route.ts`
- ✅ Page components updated:
  - `src/app/(app)/layout.tsx`
  - `src/app/(app)/users/page.tsx`
  - `src/app/(app)/profile/page.tsx`
- ✅ `env.example` - Updated with Supabase environment variables
- ✅ `src/lib/prisma.ts` - Deleted (no longer needed)

## Next Steps

### 1. **Set Up Supabase Project**

1. Go to https://supabase.com and create an account
2. Create a new project
3. Get your credentials from Settings → API:
   - Project URL
   - `anon` public key
   - `service_role` key (keep this secret!)
4. Get database connection string from Settings → Database

### 2. **Create Database Schema**

Run this SQL in Supabase SQL Editor (Settings → SQL Editor):

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Role enum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CLIENT');

-- Account table (for NextAuth)
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Session table (for NextAuth)
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- User table
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT UNIQUE,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "avatarUrl" TEXT,
    "country" TEXT,
    "fullName" TEXT,
    "jobTitle" TEXT,
    "phone" TEXT,
    "timezone" TEXT
);

-- VerificationToken table (for NextAuth)
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "expires" TIMESTAMP(3) NOT NULL,
    PRIMARY KEY ("identifier", "token")
);

-- PasswordResetToken table
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- WebsiteSubmission table
CREATE TABLE "WebsiteSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "websiteName" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "extractedData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebsiteSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- LeadFile table
CREATE TABLE "LeadFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signatureId" TEXT,
    CONSTRAINT "LeadFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeadFile_signatureId_fkey" FOREIGN KEY ("signatureId") REFERENCES "signatures"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- MyCompanyInfo table
CREATE TABLE "my_company_info" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "websiteName" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "companyName" TEXT,
    "companyType" TEXT,
    "industryExpertise" JSONB,
    "fullTechSummary" JSONB,
    "serviceCatalog" JSONB,
    "theHook" TEXT,
    "whatTheyDo" TEXT,
    "valueProposition" TEXT,
    "brandTone" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "my_company_info_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Integration table
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    "userId" TEXT NOT NULL,
    "platformName" TEXT NOT NULL,
    "credentials" JSONB NOT NULL,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "integrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Signature table
CREATE TABLE "signatures" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "signatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX "PasswordResetToken_expires_idx" ON "PasswordResetToken"("expires");
CREATE INDEX "WebsiteSubmission_userId_idx" ON "WebsiteSubmission"("userId");
CREATE INDEX "WebsiteSubmission_createdAt_idx" ON "WebsiteSubmission"("createdAt");
CREATE INDEX "LeadFile_userId_idx" ON "LeadFile"("userId");
CREATE INDEX "LeadFile_uploadedAt_idx" ON "LeadFile"("uploadedAt");
CREATE INDEX "LeadFile_signatureId_idx" ON "LeadFile"("signatureId");
CREATE INDEX "my_company_info_userId_idx" ON "my_company_info"("userId");
CREATE INDEX "my_company_info_createdAt_idx" ON "my_company_info"("createdAt");
CREATE INDEX "integrations_userId_idx" ON "integrations"("userId");
CREATE INDEX "signatures_userId_idx" ON "signatures"("userId");

-- Create unique constraint for Account
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
```

### 3. **Install Dependencies**

```bash
npm install
```

### 4. **Update Environment Variables**

Create or update your `.env` file with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Database URL (for NextAuth adapter - use Supabase connection string)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres"

# NextAuth
AUTH_SECRET="your-secret-key-here"
AUTH_URL="http://localhost:3000"

# Email Configuration
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM="noreply@example.com"
APP_URL="http://localhost:3000"
```

### 5. **Test the Application**

```bash
npm run dev
```

Visit http://localhost:3000 and test:
- User signup
- User login
- Profile updates
- All API endpoints

### 6. **Deploy to Production**

When deploying to Vercel (or other platforms), make sure to add all environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (Supabase connection string)
- `AUTH_SECRET`
- `AUTH_URL`
- All SMTP variables

## Important Notes

1. **Row Level Security (RLS)**: The code uses the service role key which bypasses RLS. For production, consider enabling RLS policies for better security.

2. **Data Migration**: If you have existing data in your old database, you'll need to migrate it to Supabase. You can:
   - Export data from your old database
   - Import it into Supabase using the Table Editor or SQL

3. **Prisma Directory**: The old `prisma/` directory and its migration files have been removed; the project now relies solely on Supabase.

4. **Error Handling**: Supabase errors are different from Prisma errors. The code has been updated to handle Supabase-specific errors.

## Migration Complete! 🎉

Your application is now fully migrated to Supabase. All database operations now use Supabase instead of Prisma.
