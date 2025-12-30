# Gabarita.ai 🎓

**Plataforma de estudos inteligente com geração automática de flashcards via IA.**

## 📖 O Problema

Estudantes e concurseiros frequentemente precisam criar material de estudo a partir de PDFs extensos (apostilas, livros, editais). O processo manual de criar flashcards é:

- ⏰ **Demorado** - horas para extrair conceitos importantes
- 😴 **Tedioso** - trabalho repetitivo que poderia ser automatizado
- 🎯 **Inconsistente** - qualidade varia conforme o cansaço

## 💡 A Solução

O Gabarita.ai automatiza a criação de flashcards usando IA:

1. **Upload de PDF** → Faça upload da sua apostila ou material
2. **Extração inteligente** → IA extrai o texto e identifica conceitos-chave
3. **Geração de cards** → Flashcards são criados automaticamente no estilo da banca
4. **Estudo eficiente** → Revise usando Active Recall com algoritmo FSRS

## 🏗️ Arquitetura

### Postgres Everything

Este projeto utiliza a abordagem **"Postgres Everything"** - onde o PostgreSQL é usado como:

| Função | Solução Tradicional | Nossa Abordagem |
|--------|---------------------|-----------------|
| Banco de dados | PostgreSQL | PostgreSQL |
| Fila de jobs | Redis + BullMQ | **pg-boss** (PostgreSQL) |
| Pub/Sub (real-time) | Redis | **LISTEN/NOTIFY** (PostgreSQL) |
| Sessões | Redis | **PostgreSQL table** |
| Rate limiting | Redis | **PostgreSQL table** |

**Benefícios:**
- 🎯 **Simplicidade** - Apenas um serviço de banco de dados
- 💰 **Economia** - Sem custos extras com Redis/Upstash
- 🔒 **Transacional** - Jobs na mesma transação que os dados
- 🚀 **VPS-friendly** - Ideal para deploy em servidor dedicado

### Stack Tecnológico

- **Frontend**: Nuxt 3 + Vue 3 + Nuxt UI + TailwindCSS
- **Backend**: Nitro (API Server)
- **Database**: PostgreSQL 16 + pgvector (embeddings)
- **Queue**: pg-boss
- **Real-time**: PostgreSQL LISTEN/NOTIFY + WebSocket
- **IA**: Google Gemini (geração de cards + embeddings)
- **Storage**: Cloudflare R2 (PDFs)
- **Auth**: JWT + Session cookies

## 📋 Requisitos

- Node.js 22.x (LTS)
- pnpm
- Docker (para PostgreSQL local)

## 🚀 Instalação

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/gabarita-ai.git
cd gabarita-ai

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais
```

## ⚙️ Configuração

### Variáveis de Ambiente

```env
# Database
DATABASE_URL="postgres://user:password@localhost:5432/gabarita_ai"

# Auth
JWT_SECRET="sua-chave-secreta-aqui"

# Google AI
GOOGLE_API_KEY="sua-api-key-gemini"

# Cloudflare R2
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="gabarita-pdfs"

# WebSocket
NUXT_PUBLIC_WS_URL="ws://localhost:3002"
```

## 🛠️ Desenvolvimento

### Iniciar serviços

```bash
# 1. Subir PostgreSQL
docker compose up -d

# 2. Rodar migrations
pnpm db:push

# 3. Iniciar app (terminal 1)
pnpm dev

# 4. Iniciar worker de processamento (terminal 2)
pnpm worker

# 5. Iniciar WebSocket server (terminal 3)
pnpm ws
```

### Comandos úteis

```bash
# Gerar migrations
pnpm db:generate

# Aplicar migrations
pnpm db:push

# Abrir Drizzle Studio
pnpm db:studio

# Build para produção
pnpm build

# Preview da build
pnpm preview
```

## 🏭 Deploy em VPS

### Docker Compose (produção)

```yaml
services:
  db:
    image: ankane/pgvector:latest
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: gabarita_ai
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"

volumes:
  postgres_data:
```

### PM2 (processos)

```bash
# Instalar PM2
npm install -g pm2

# Iniciar todos os serviços
pm2 start ecosystem.config.cjs

# Ver logs
pm2 logs

# Monitorar
pm2 monit
```

## 📁 Estrutura do Projeto

```
gabarita-ai/
├── components/          # Componentes Vue
├── composables/         # Composables Vue
├── pages/               # Páginas (file-based routing)
├── server/
│   ├── api/             # API endpoints
│   ├── db/              # Schema Drizzle
│   ├── domain/          # Lógica de domínio
│   ├── utils/           # Utilitários (queue, pubsub, auth)
│   ├── websocket/       # WebSocket server
│   └── workers/         # Background workers
├── stores/              # Pinia stores
├── types/               # TypeScript types
└── docker/              # Docker configs
```

## 🔄 Fluxo de Processamento de PDF

```
┌──────────────┐     ┌───────────┐     ┌──────────────┐
│   Frontend   │────▶│  API      │────▶│  Cloudflare  │
│   Upload     │     │  /upload  │     │  R2 Storage  │
└──────────────┘     └─────┬─────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │  (pg-boss)   │
                    └─────┬────────┘
                          │
                          ▼
                    ┌──────────────┐
                    │   Worker     │
                    │  - Download  │
                    │  - Extract   │
                    │  - AI Gen    │
                    │  - Save      │
                    └─────┬────────┘
                          │
                          ▼
                    ┌──────────────┐
                    │  NOTIFY      │───▶  WebSocket  ───▶  Frontend
                    └──────────────┘
```

## 📄 Licença

Proprietário - Todos os direitos reservados.

---

Desenvolvido com 💜 para estudantes brasileiros.
