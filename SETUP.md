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

## Step 4: Run Development Server

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
