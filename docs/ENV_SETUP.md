# Environment Variables Setup

Complete environment configuration for V-Chat. Copy these to your `.env` files.

---

## Database (`packages/database/.env`)

```env
# Supabase PostgreSQL
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

---

## Backend (`packages/vchat-be/.env`)

```env
# Database - Supabase
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Better Auth
BETTER_AUTH_SECRET="generate-with-openssl-rand-base64-32"
BETTER_AUTH_URL="http://localhost:3001"

# OpenAI
OPENAI_API_KEY="sk-proj-your-key-here"

# Server
PORT=3001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:3000"
```

---

## Frontend (`packages/vchat-fe/.env`)

```env
# Backend API
NEXT_PUBLIC_API_URL="http://localhost:3001"

# Database - Supabase (for Better Auth)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Better Auth - MUST match backend
BETTER_AUTH_SECRET="generate-with-openssl-rand-base64-32"
BETTER_AUTH_URL="http://localhost:3001"
```

---

## Quick Setup

```bash
# 1. Copy example files
cp packages/database/.env.example packages/database/.env
cp packages/vchat-be/.env.example packages/vchat-be/.env
cp packages/vchat-fe/.env.example packages/vchat-fe/.env

# 2. Update all DATABASE_URL values with your Supabase connection string
# 3. Add your OPENAI_API_KEY to backend
# 4. Run
pnpm install
pnpm db:push
pnpm dev
```

---

## Critical Notes

| Variable | Must Match Across |
|----------|-------------------|
| `DATABASE_URL` | All 3 packages |
| `BETTER_AUTH_SECRET` | Backend + Frontend |
| `BETTER_AUTH_URL` | Backend + Frontend (use `localhost:3001`) |

---

## Troubleshooting

### "Package @prisma/client can't be external" Error

If you see this error when running `pnpm dev`:

```
Package @prisma/client can't be external
The request could not be resolved by Node.js from the project directory
```

**Fix:** Install `@prisma/client` in the frontend package:

```bash
pnpm add @prisma/client --filter vchat-fe
```

This happens because Next.js needs Prisma client resolvable from the frontend's `node_modules` directly, not just through the shared `database` package.
