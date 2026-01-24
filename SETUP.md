# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Environment Variables

1. Copy the example environment file:
```bash
cp env.example .env
```

2. Edit `.env` and configure:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (keep secret)
   - `DATABASE_URL`: Your Supabase Postgres connection string
   - `AUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `AUTH_URL`: Your application URL (default: `http://localhost:3000`)

## Step 3: Set Up Database

1. In Supabase, open the **SQL Editor**
2. Run the schema from `SUPABASE-MIGRATION-COMPLETE.md` to create all tables

## Step 4: Set Up Supabase Storage

1. In Supabase Dashboard, go to **Storage**
2. Create a new bucket named `signatures`:
   - Click **"New bucket"**
   - Name: `signatures`
   - Public bucket: **Yes** (so images can be accessed via public URLs)
   - File size limit: 5MB (or your preferred limit)
   - Allowed MIME types: `image/*` (or leave empty for all types)
3. Set up Storage Policies (optional but recommended):
   - Go to **Storage** → **Policies** for the `signatures` bucket
   - Create a policy to allow authenticated users to upload to their own folder:
     - Policy name: "Users can upload to their own folder"
     - Allowed operation: INSERT
     - Policy definition:
       ```sql
       (bucket_id = 'signatures'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
       ```
   - Create a policy to allow public read access:
     - Policy name: "Public read access"
     - Allowed operation: SELECT
     - Policy definition:
       ```sql
       (bucket_id = 'signatures'::text)
       ```

Note: The application uses the service role key for uploads (server-side), so RLS policies are bypassed. However, the API route ensures users can only upload to their own folder by using `session.user.id`.

## Step 5: Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your application!

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── api/         # API routes
│   ├── auth/        # Authentication pages
│   └── dashboard/   # Protected pages
├── components/      # React components
│   └── ui/         # ShadCN/UI components
├── lib/            # Utility functions and configurations
├── types/          # TypeScript type definitions
└── middleware.ts   # Next.js middleware for route protection
```

## Available Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Next Steps

1. Customize the authentication flow if needed
2. Add your business logic and features
3. Add more ShadCN/UI components as needed
4. Configure additional NextAuth providers if required
