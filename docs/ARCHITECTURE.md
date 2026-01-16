# Architecture Guide

A comprehensive explanation of V-Chat's structure, modules, and how everything connects.

---

## What is V-Chat?

V-Chat is a **RAG (Retrieval-Augmented Generation) chatbot** that answers questions based on documents you upload. Think of it as having a smart assistant that has read all your company documents and can answer questions about them.

**How it works:**
1. You upload documents (PDFs, text files, etc.)
2. The system breaks them into chunks and creates "embeddings" (numerical representations)
3. When you ask a question, it finds the most relevant chunks
4. An AI (GPT) generates an answer based on those chunks

---

## Monorepo Structure

This project uses a **monorepo** – multiple packages in a single repository managed by **pnpm workspaces**.

```
v-chat/
├── packages/
│   ├── vchat-fe/          # 🎨 Frontend (Next.js)
│   ├── vchat-be/          # ⚙️ Backend (Express)
│   └── database/          # 🗄️ Shared Database (Prisma)
├── docs/                  # 📚 Documentation
├── docker-compose.yml     # 🐳 PostgreSQL container
├── package.json           # 📦 Root workspace config
├── eslint.config.mjs      # 🔍 Linting rules
├── tsconfig.base.json     # ⚡ Shared TypeScript config
└── pnpm-workspace.yaml    # 🔗 Workspace definition
```

### Why a Monorepo?

| Benefit | Explanation |
|---------|-------------|
| **Shared Code** | The `database` package is used by both frontend and backend |
| **Single Install** | One `pnpm install` sets up everything |
| **Unified Linting** | Same code style across all packages |
| **Easy Scripts** | Run commands across all packages at once |

---

## Package Deep Dive

### 📦 `packages/database`

**Purpose:** Shared database schema and Prisma client.

```
database/
├── prisma/
│   └── schema.prisma      # Database models
├── src/
│   └── index.ts           # Exports Prisma client
└── package.json
```

**What it contains:**
- **Prisma Schema:** Defines all database tables (Users, Conversations, Messages, Documents, Chunks)
- **Prisma Client:** Type-safe database queries

**Key Models:**
| Model | Purpose |
|-------|---------|
| `User` | User accounts and authentication |
| `Session` | Login sessions (managed by Better Auth) |
| `Conversation` | Chat threads |
| `Message` | Individual chat messages |
| `Document` | Uploaded files metadata |
| `DocumentChunk` | Text chunks with vector embeddings |

---

### 🎨 `packages/vchat-fe` (Frontend)

**Purpose:** The user interface – what users see and interact with.

**Tech:** Next.js 15, React 19, TypeScript, Tailwind CSS

```
vchat-fe/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # Login, Register pages
│   │   ├── (dashboard)/        # Authenticated pages
│   │   │   ├── chat/           # Chat interface
│   │   │   ├── documents/      # Document management
│   │   │   └── dashboard/      # Overview page
│   │   └── api/                # Next.js API routes (auth proxy)
│   ├── config/                 # Environment config
│   ├── features/               # Feature-specific code
│   │   ├── auth/               # Auth-related hooks
│   │   ├── chat/               # Chat store (Zustand)
│   │   └── documents/          # Document store
│   └── shared/                 # Shared utilities
│       ├── components/         # Reusable UI components
│       ├── hooks/              # Custom React hooks
│       ├── lib/                # Utilities (API client, auth)
│       └── types/              # TypeScript types
└── package.json
```

**Key Features:**

| Feature | Location | Description |
|---------|----------|-------------|
| **Chat Interface** | `app/(dashboard)/chat/` | Real-time streaming chat with RAG |
| **Document Upload** | `app/(dashboard)/documents/` | Upload and manage documents |
| **Authentication** | `app/(auth)/` | Login/Register with Better Auth |
| **API Client** | `shared/lib/request.ts` | Axios wrapper for all API calls |

---

### ⚙️ `packages/vchat-be` (Backend)

**Purpose:** The API server – handles business logic, AI, and database operations.

**Tech:** Express 5, TypeScript, OpenAI, Prisma

```
vchat-be/
├── src/
│   ├── app.ts                  # Express app setup
│   ├── server.ts               # Server entry point
│   ├── config/
│   │   └── env.ts              # Environment validation
│   ├── features/               # Feature modules
│   │   ├── auth/               # Better Auth configuration
│   │   ├── chat/               # Chat & conversations
│   │   │   ├── chat.routes.ts      # API endpoints
│   │   │   ├── chat.controller.ts  # Request handlers
│   │   │   ├── chat.service.ts     # Business logic
│   │   │   └── completion.service.ts # OpenAI integration
│   │   ├── documents/          # Document management
│   │   │   ├── documents.routes.ts
│   │   │   └── documents.service.ts
│   │   └── retrieval/          # Vector search
│   │       ├── embeddings.service.ts  # OpenAI embeddings
│   │       └── retrieval.service.ts   # pgvector search
│   └── shared/                 # Shared utilities
│       ├── constants/          # Error codes, config values
│       ├── middleware/         # Auth, error handling
│       ├── schemas/            # Zod validation schemas
│       └── utils/              # Logger, response helpers
└── package.json
```

**Key Services:**

| Service | File | Purpose |
|---------|------|---------|
| **Chat Service** | `chat.service.ts` | CRUD for conversations/messages |
| **Completion Service** | `completion.service.ts` | OpenAI chat with RAG context |
| **Documents Service** | `documents.service.ts` | Document upload, chunking |
| **Embeddings Service** | `embeddings.service.ts` | Convert text → vectors |
| **Retrieval Service** | `retrieval.service.ts` | Vector similarity search |

---

## How Everything Connects

```
┌─────────────┐     HTTP/SSE      ┌─────────────┐
│   Browser   │ ◄───────────────► │   Next.js   │
│    (User)   │                   │  Frontend   │
└─────────────┘                   └──────┬──────┘
                                         │
                                         │ API Calls
                                         ▼
                                  ┌─────────────┐
                                  │   Express   │
                                  │   Backend   │
                                  └──────┬──────┘
                                         │
               ┌─────────────────────────┼─────────────────────────┐
               │                         │                         │
               ▼                         ▼                         ▼
        ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
        │  PostgreSQL │          │   OpenAI    │          │   OpenAI    │
        │  + pgvector │          │   GPT-4o    │          │  Embeddings │
        └─────────────┘          └─────────────┘          └─────────────┘
```

---

## The RAG Pipeline (Step by Step)

### 1️⃣ Document Upload Flow

```
User uploads PDF
       │
       ▼
┌──────────────┐
│ Parse & Read │  Extract text from PDF
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Chunking   │  Split into ~1000 char chunks
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Embedding   │  Convert chunks to vectors (OpenAI)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    Store     │  Save in PostgreSQL + pgvector
└──────────────┘
```

### 2️⃣ Chat Flow

```
User asks: "What is our vacation policy?"
       │
       ▼
┌──────────────┐
│  Embed Query │  Convert question to vector
└──────┬───────┘
       │
       ▼
┌──────────────┐
│Vector Search │  Find top 5 similar chunks (pgvector)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Build Prompt │  System prompt + context chunks + question
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   OpenAI     │  Stream response from GPT-4o
└──────┬───────┘
       │
       ▼
User sees answer with sources
```

---

## Key Technologies Explained

### pnpm Workspaces

Allows multiple packages to share dependencies and be developed together.

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

**How it works:**
- `pnpm install` at root installs deps for ALL packages
- Packages can import each other (e.g., backend imports `database`)
- One `node_modules` at root (saves disk space)

### Better Auth

Modern authentication library that handles:
- User registration/login
- Session management
- Secure cookies

The backend exposes `/api/auth/*` endpoints, and the frontend uses the Better Auth React client.

### pgvector

PostgreSQL extension for storing and querying vector embeddings.

```sql
-- Vector similarity search
SELECT * FROM document_chunks
ORDER BY embedding <=> query_embedding  -- Cosine distance
LIMIT 5;
```

### SSE (Server-Sent Events)

Used for streaming chat responses in real-time:

```
Client: POST /messages/stream
Server: data: {"type":"content","data":"Hello"}
Server: data: {"type":"content","data":" world"}
Server: data: {"type":"done"}
```

---

## API Endpoints

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/conversations` | List all conversations |
| POST | `/api/chat/conversations` | Create new conversation |
| GET | `/api/chat/conversations/:id` | Get conversation with messages |
| DELETE | `/api/chat/conversations/:id` | Delete conversation |
| POST | `/api/chat/conversations/:id/messages/stream` | Send message (streaming) |
| PATCH | `/api/chat/conversations/:id/settings` | Update RAG settings |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List all documents |
| POST | `/api/documents` | Upload document |
| DELETE | `/api/documents/:id` | Delete document |
| GET | `/api/documents/stats` | Get document statistics |

---

## Environment Variables

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | ✅ | Session encryption key |
| `BETTER_AUTH_URL` | ✅ | Backend URL for auth |
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `PORT` | ❌ | Server port (default: 3001) |
| `FRONTEND_URL` | ❌ | Frontend URL for CORS |

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL |

---

## Code Patterns

### Feature-Based Organization

Each feature is self-contained:

```
features/chat/
├── chat.routes.ts      # Express routes
├── chat.controller.ts  # Request/response handling
├── chat.service.ts     # Business logic
└── chat.types.ts       # TypeScript types
```

### Controller → Service Pattern

Controllers handle HTTP, services handle business logic:

```typescript
// Controller: HTTP layer
async getConversations(req, res, next) {
  const conversations = await chatService.getConversations(req.userId);
  sendSuccess(res, conversations);
}

// Service: Business logic
async getConversations(userId: string) {
  return prisma.conversation.findMany({ where: { userId } });
}
```

### Typed API Client

Frontend uses a type-safe API wrapper:

```typescript
// Type-safe API calls
const conversations = await api.get<Conversation[]>('/api/chat/conversations');
const newConvo = await api.post<Conversation>('/api/chat/conversations', { title: 'New' });
```

---

## Useful Commands Reference

```bash
# Development
pnpm dev          # Start everything
pnpm dev:fe       # Frontend only
pnpm dev:be       # Backend only

# Database
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to DB
pnpm db:studio    # Visual DB browser

# Code Quality
pnpm lint         # Check for issues
pnpm lint:fix     # Auto-fix issues
pnpm format       # Format with Prettier
pnpm typecheck    # Check TypeScript

# Docker
pnpm docker:up    # Start PostgreSQL
pnpm docker:down  # Stop PostgreSQL
```

---

## Further Reading

- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Better Auth](https://www.better-auth.com)
- [pgvector](https://github.com/pgvector/pgvector)
- [OpenAI API](https://platform.openai.com/docs)
