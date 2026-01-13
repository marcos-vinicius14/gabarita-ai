<div align="center">
  <h1>🎓 Gabarita.ai</h1>
  <p><strong>AI-Powered Flashcard Generation Platform</strong></p>
  <p>Transform PDFs into study-ready flashcards with Active Recall & Spaced Repetition</p>
  
  <p>
    <img src="https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript" alt="TypeScript">
    <img src="https://img.shields.io/badge/Nuxt-3.20-00DC82?logo=nuxt.js" alt="Nuxt 3">
    <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql" alt="PostgreSQL">
    <img src="https://img.shields.io/badge/Gemini-AI-8E75B2?logo=google" alt="Gemini AI">
    <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker" alt="Docker">
  </p>
</div>

---

## 🎯 Overview

Gabarita.ai is a **full-stack AI application** that automates flashcard creation from PDF documents. Built with modern TypeScript patterns and a "Postgres Everything" architecture, it demonstrates production-ready practices for AI-integrated web applications.

### Key Features

- 📄 **PDF Processing** — Parallel text extraction with Worker Threads
- 🤖 **AI Generation** — Google Gemini for flashcard creation + vector embeddings
- 🧠 **FSRS Algorithm** — Scientifically-proven spaced repetition scheduling
- ⚡ **Real-time Updates** — WebSocket push notifications via PostgreSQL LISTEN/NOTIFY
- 🔐 **Secure Auth** — JWT + HTTP-only session cookies (BFF pattern)
- 📊 **Gamification** — Streaks, XP, and study statistics

---

## 🏗️ Architecture Highlights

### Postgres Everything

This project uses PostgreSQL as the **single source of truth** for all data needs:

| Function | Traditional Stack | This Project |
|----------|-------------------|--------------|
| Database | PostgreSQL | PostgreSQL |
| Job Queue | Redis + BullMQ | **Graphile Worker** (PostgreSQL) |
| Pub/Sub | Redis | **LISTEN/NOTIFY** (PostgreSQL) |
| Sessions | Redis | **PostgreSQL table** |
| Vector Search | Pinecone | **pgvector** (PostgreSQL) |

**Why?**
- 🎯 **Simplicity** — Single database service to manage
- 💰 **Cost-effective** — No Redis/managed queue costs
- 🔒 **ACID Transactions** — Jobs commit with data atomically
- 🚀 **VPS-friendly** — Easy deployment on any Linux server

---

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Nuxt 3, Vue 3, Nuxt UI, TailwindCSS, Pinia, TanStack Query |
| **Backend** | Nitro, Drizzle ORM, Zod validation |
| **AI/ML** | Google Gemini 2.5 Flash, pgvector embeddings |
| **Database** | PostgreSQL 16 + pgvector |
| **Queue** | Graphile Worker |
| **Real-time** | PostgreSQL NOTIFY + WebSocket |
| **Storage** | Cloudflare R2 |
| **Gateway** | Nginx (rate limiting, geo-blocking) |
| **Deploy** | Docker Compose + PM2 |

---

## 📐 Code Architecture

### Service-Oriented Backend

```
server/
├── api/                    # HTTP endpoints (thin controllers)
├── domain/                 # Business logic (DDD-lite)
│   ├── auth/
│   ├── billing/
│   ├── decks/
│   ├── gamification/
│   └── study/
├── services/               # Reusable services
│   ├── ai-parser.service.ts
│   ├── embedding.service.ts
│   ├── flashcard-generator.service.ts
│   └── pdf-extractor.service.ts
├── tasks/                  # Background jobs
├── utils/                  # Infrastructure (db, cache, auth)
└── workers/                # Worker threads (PDF processing)
```

### Design Patterns Used

| Pattern | Usage |
|---------|-------|
| **Repository Pattern** | Data access abstraction (`*.repository.ts`) |
| **Service Layer** | Business logic encapsulation (`*.service.ts`) |
| **Zod Schemas** | Runtime validation with TypeScript inference |
| **Composables** | Vue reactivity abstractions (`use*.ts`) |
| **BFF Pattern** | Tokens stored server-side, never exposed to client |

---

## 🔄 PDF Processing Pipeline

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Upload    │ ──▶  │   R2        │ ──▶  │  Job Queue  │
│   (API)     │      │   Storage   │      │  (pg)       │
└─────────────┘      └─────────────┘      └──────┬──────┘
                                                  │
                     ┌────────────────────────────▼────────────────────────────┐
                     │                    WORKER THREAD                         │
                     │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌───────┐ │
                     │  │ Download │ → │ Extract  │ → │ AI Gen   │ → │ Save  │ │
                     │  │ (R2)     │   │ (pdfjs)  │   │ (Gemini) │   │ (pg)  │ │
                     │  └──────────┘   └──────────┘   └──────────┘   └───────┘ │
                     └────────────────────────────┬────────────────────────────┘
                                                  │
                     ┌────────────────────────────▼────────────────────────────┐
                     │                  PostgreSQL NOTIFY                       │
                     │                        ↓                                 │
                     │                   WebSocket                              │
                     │                        ↓                                 │
                     │                    Frontend                              │
                     └─────────────────────────────────────────────────────────┘
```

### Performance Optimizations

- **Parallel PDF Extraction** — Dynamic worker count based on CPU cores
- **Batch Embeddings** — Single API call for all card embeddings (`embedMany`)
- **Worker Timeout** — 60s timeout with proper cleanup
- **Response Caching** — AI responses cached by content hash

---

## 🔐 Security Features

- **Nginx API Gateway** — Rate limiting, connection limiting, geo-blocking
- **BFF Authentication** — Tokens never exposed to browser (HTTP-only cookies)
- **Zod Validation** — All inputs validated at runtime
- **CORS + CSP Headers** — Proper security headers configured

---

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/seu-usuario/gabarita-ai.git
cd gabarita-ai && pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start with Docker
docker compose up -d

# Access at http://localhost:8080
```

### Environment Variables

```env
DATABASE_URL="postgres://user:pass@localhost:5432/gabarita_ai"
JWT_SECRET="your-secret-key"
GOOGLE_API_KEY="your-gemini-api-key"
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="gabarita-pdfs"
```

---

## 📊 Database Commands

```bash
pnpm db:generate    # Generate migrations
pnpm db:push        # Apply schema changes
pnpm db:studio      # Open Drizzle Studio
```

---

## 🧪 Testing

```bash
pnpm test           # Run unit tests
pnpm test:watch     # Watch mode
```

---

## 📚 Documentation

- [Nginx Gateway Guide](docs/nginx-guide.md)
- [AI Rules & Coding Patterns](AI_RULES.md)
- [Workflow Definitions](.agent/workflows/)

---

## 📄 License

Proprietary — All rights reserved.

---

<div align="center">
  <p>Developed with 💜 for Brazilian students</p>
  <p><strong>Marcos Vinicius</strong> — Full-Stack Developer</p>
</div>
