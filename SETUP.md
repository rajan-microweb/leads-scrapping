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
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `AUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `AUTH_URL`: Your application URL (default: `http://localhost:3000`)

## Step 3: Set Up Database

1. Make sure PostgreSQL is running
2. Run Prisma migrations:
```bash
npm run db:push
# or for production
npm run db:migrate
```

3. Generate Prisma Client:
```bash
npm run db:generate
```

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
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## Next Steps

1. Customize the authentication flow if needed
2. Add your business logic and features
3. Extend the database schema in `prisma/schema.prisma`
4. Add more ShadCN/UI components as needed
5. Configure additional NextAuth providers if required
