# Leads Scrapping - Full-Stack Application

A production-ready full-stack application built with modern technologies.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, ShadCN/UI
- **Backend**: Next.js API Routes (App Router), TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth v5 (Auth.js)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd leads-scrapping
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your database URL and NextAuth secret:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/leads_scrapping?schema=public"
AUTH_SECRET="your-secret-key-here"
AUTH_URL="http://localhost:3000"
```

Generate AUTH_SECRET:
```bash
openssl rand -base64 32
```

4. Set up the database:
```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Or run migrations
npm run db:migrate
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── prisma/
│   └── schema.prisma          # Prisma schema
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes
│   │   ├── auth/               # Auth pages
│   │   ├── dashboard/          # Protected pages
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   └── ui/                 # ShadCN/UI components
│   ├── lib/
│   │   ├── auth.ts             # NextAuth configuration
│   │   ├── prisma.ts           # Prisma client
│   │   └── utils.ts            # Utility functions
│   ├── store/                  # State management
│   └── types/                  # TypeScript types
├── .env.example                # Environment variables template
├── next.config.js              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## Features

- ✅ User authentication (Sign in/Sign up)
- ✅ Protected routes
- ✅ Database integration with Prisma
- ✅ Modern UI with ShadCN/UI components
- ✅ TypeScript for type safety
- ✅ Responsive design with Tailwind CSS
- ✅ Production-ready structure

## License

MIT
