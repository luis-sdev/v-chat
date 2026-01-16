# V-Chat

Internal Knowledge Assistant - RAG Chatbot

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- [Supabase](https://supabase.com) account (free tier works)
- OpenAI API key

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd v-chat
pnpm install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Database** → **Extensions** → Enable `vector`
3. Go to **Settings** → **Database** → Copy the connection string (URI format)

### 3. Configure Environment

```bash
cp packages/database/.env.example packages/database/.env
cp packages/vchat-be/.env.example packages/vchat-be/.env
cp packages/vchat-fe/.env.example packages/vchat-fe/.env
```

Update all 3 `.env` files with your Supabase connection string and add your OpenAI key to backend.

> **Important:** `DATABASE_URL` must be the same in all 3 files. `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` must match between backend and frontend.

> **Note:** The frontend requires `@prisma/client` installed directly (already in `package.json`). If you get "Package @prisma/client can't be external" errors, run: `pnpm add @prisma/client --filter vchat-fe`

### 4. Push Database Schema

```bash
pnpm db:push
```

### 5. Run

```bash
pnpm dev
```

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3001

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services |
| `pnpm dev:fe` | Start frontend only |
| `pnpm dev:be` | Start backend only |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm build` | Build all packages |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format with Prettier |

## Project Structure

```
v-chat/
├── packages/
│   ├── database/     # Prisma schema & client
│   ├── vchat-be/     # Hono backend API
│   └── vchat-fe/     # Next.js frontend
├── docs/             # Documentation
└── package.json      # Root workspace config
```

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Environment Setup](./docs/ENV_SETUP.md)
