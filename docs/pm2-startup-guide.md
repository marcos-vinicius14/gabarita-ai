# Guia de Startup - Desenvolvimento e Produção

Este documento descreve como iniciar o ambiente de desenvolvimento local e como funciona o deploy em produção.

---

## 🖥️ Desenvolvimento Local (Híbrido)

No ambiente de desenvolvimento local (especialmente com Podman rootless), usamos uma configuração híbrida:
- **Docker**: Apenas o banco de dados PostgreSQL
- **Host**: Nuxt App + PM2 (para ter acesso direto à rede e ao R2)

### Passo a Passo

```bash
# 1. Subir apenas o banco de dados
docker compose -f compose.dev.yaml up -d

# 2. Instalar dependências (se necessário)
pnpm install

# 3. Aplicar migrações do banco
pnpm db:push

# 4. Iniciar a aplicação com PM2
pnpm pm2

# 5. Acompanhar logs
pm2 logs
```

### Acessar Aplicação
- **App**: http://localhost:3000
- **WebSocket**: ws://localhost:3002

### Parar Ambiente
```bash
pm2 stop all
docker compose -f compose.dev.yaml down
```

---

## 🚀 Produção (VPS Dedicada)

Em uma VPS com Docker instalado com privilégios root (não rootless), **tudo roda dentro do Docker** sem problemas de conectividade.

### Por que funciona em produção?

| Característica | Podman Rootless (Dev) | Docker Root (Prod) |
|----------------|----------------------|-------------------|
| Isolamento de rede | Mais restritivo | Acesso completo |
| Cloudflare R2 | ⚠️ Pode falhar | ✅ Funciona |
| Nginx reverse proxy | ✅ | ✅ |
| PM2 dentro do container | ✅ | ✅ |

### Deploy em Produção

```bash
# Na VPS, clone o repositório e configure o .env

# Build e iniciar todos os serviços
docker compose up -d --build

# Verificar status
docker compose ps

# Ver logs
docker compose logs -f app
```

### Arquitetura em Produção

```
Usuário → Nginx (8080) → Nuxt App (3000)
                      ↘ WebSocket (3002)
                      
App Container (PM2):
  - API (cluster mode)
  - WebSocket (fork mode)
  - Worker (fork mode)

Conexões:
  - App → PostgreSQL (via Docker network)
  - App → Cloudflare R2 (via internet)
```

### Comandos Úteis em Produção

```bash
# Reiniciar app após mudanças
docker compose restart app

# Rebuild completo
docker compose down && docker compose up -d --build

# Ver processos PM2 dentro do container
docker exec gabarita_app pm2 list

# Logs do PM2
docker exec gabarita_app pm2 logs
```

---

## 📁 Arquivos de Configuração

| Arquivo | Uso |
|---------|-----|
| `compose.yaml` | Produção (VPS) - todos os serviços |
| `compose.dev.yaml` | Desenvolvimento - apenas DB |
| `ecosystem.config.cjs` | Configuração do PM2 |
| `docker/app/Dockerfile` | Imagem do App |
| `docker/nginx/` | Configuração do Nginx |
