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
- **API Gateway**: Nginx (rate limiting, connection limiting, reverse proxy)
- **Database**: PostgreSQL 16 + pgvector (embeddings)
- **Queue**: pg-boss
- **Real-time**: PostgreSQL LISTEN/NOTIFY + WebSocket
- **IA**: Google Gemini (geração de cards + embeddings)
- **Storage**: Cloudflare R2 (PDFs)
- **Auth**: JWT + Session cookies

### Nginx API Gateway

O projeto utiliza Nginx como API Gateway, fornecendo:

- **Geographic IP Restriction**: Acesso restrito apenas a IPs brasileiros
- **Rate Limiting**: Proteção contra abuso de API
  - API geral: 100 requisições/minuto
  - Uploads: 10 requisições/minuto
  - Autenticação: 20 requisições/minuto
- **Connection Limiting**: Máximo de 20 conexões simultâneas por IP
- **Security Headers**: CORS, CSP, X-Frame-Options, etc.
- **Reverse Proxy**: Roteamento otimizado para aplicação Nuxt
- **Logs Estruturados**: JSON format para análise e monitoramento

**Arquitetura:**
```
Cliente (Brasil) → Nginx (porta 80/443) → Nuxt App (porta 3000 interna) → PostgreSQL
```

> [!NOTE]
> A aplicação é acessada via **porta 80** (Nginx), não mais diretamente pela porta 3000 do Nuxt.

> [!IMPORTANT]
> **Geo-Blocking Ativo**: Apenas IPs brasileiros podem acessar a aplicação. Acessos de outros países receberão erro 403.

📚 **Documentação completa**: [docs/nginx-guide.md](docs/nginx-guide.md)


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
# 1. Subir PostgreSQL e Nginx
docker compose up -d

# 2. Rodar migrations
pnpm db:push

# 3. Iniciar app (terminal 1)
pnpm dev

# 4. Iniciar worker de processamento (terminal 2)
pnpm worker

# 5. Iniciar WebSocket server (terminal 3)
pnpm ws

# Acessar aplicação
# http://localhost (via Nginx)
```

> [!IMPORTANT]
> A aplicação agora é acessada via **http://localhost** (porta 80 do Nginx), não mais pela porta 3000 direta.


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

## � Postgres Everything - Detalhes

### Por que essa abordagem?

A arquitetura "Postgres Everything" elimina a necessidade de serviços adicionais (Redis, RabbitMQ) ao aproveitar recursos nativos do PostgreSQL:

| Componente | Implementação | Biblioteca |
|------------|---------------|------------|
| Job Queue | Tabelas com `SKIP LOCKED` | [pg-boss](https://github.com/timgit/pg-boss) |
| Pub/Sub | `NOTIFY`/`LISTEN` nativo | `pg` (node-postgres) |
| Sessions | Tabela `UNLOGGED` | Pool de conexões |
| Rate Limiting | Tabela `UNLOGGED` | Pool de conexões |

### Otimizações de Performance

#### UNLOGGED Tables

Tabelas `sessions` e `rate_limits` são criadas como `UNLOGGED`:

```sql
CREATE UNLOGGED TABLE sessions (...);
CREATE UNLOGGED TABLE rate_limits (...);
```

**Benefícios:**
- ~2-3x mais rápido em writes (sem WAL)
- Menos I/O no disco
- Aceitável perder em crash (usuário re-loga)

#### pg-boss Configuration

```typescript
await boss.work(QUEUE_NAME, {
    pollingIntervalSeconds: 2, // Adequado para PDFs
    batchSize: 1,              // Um job por vez (memory-intensive)
}, handler);
```

#### WebSocket Reconnection

Frontend implementa reconexão com backoff exponencial:

```
1s → 2s → 4s → 8s → 16s → 30s (máximo)
```

Ao reconectar, invalida queries para buscar status atual dos decks.

### Limitações e Mitigações

| Limitação | Mitigação |
|-----------|-----------|
| LISTEN/NOTIFY não persiste | Refresh de dados ao reconectar WebSocket |
| pg-boss mais lento que Redis | Polling de 2s é aceitável para PDFs |
| Cada LISTEN ocupa conexão | WebSocket server centraliza (1 conexão apenas) |
| UNLOGGED perde dados em crash | Sessões são efêmeras, ok re-logar |

### Quando escalar

| Métrica | Limite | Ação |
|---------|--------|------|
| Conexões simultâneas | > 100 | Adicionar PgBouncer |
| Jobs/segundo | > 100 | Múltiplos workers |
| Latência de fila | > 10s | Reduzir polling interval |

## �📄 Licença

Proprietário - Todos os direitos reservados.

---

Desenvolvido com 💜 para estudantes brasileiros.
