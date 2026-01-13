FROM node:22-alpine

# Instala ferramentas globais
RUN npm install -g pnpm pm2 tsx

WORKDIR /app

# Copia arquivos de definição de dependências
COPY package.json pnpm-lock.yaml ./

# Instala dependências
RUN pnpm install

# Copia o restante do código
COPY . .

# Build da aplicação Nuxt para produção
RUN pnpm build

# Expõe a porta do Nuxt
EXPOSE 3000

# Comando para rodar em produção usando PM2-runtime
# O ecosystem.config.cjs gerencia API, WS e Worker
CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]
