FROM node:20-slim AS builder

WORKDIR /app

# Instalar pnpm
RUN corepack enable pnpm

# Copiar arquivos de dependência
COPY package.json pnpm-lock.yaml .npmrc ./

# Instalar dependências
RUN pnpm install --no-frozen-lockfile

# Copiar todo o código fonte
COPY . .

# Verificar estrutura sem quebrar o build
RUN ls -la && (ls -la client/ || echo "ERRO: Pasta client/ não encontrada no Docker!")

# Build do frontend e backend
RUN pnpm build

# ── Estágio de produção ──
FROM node:20-slim AS runner

WORKDIR /app

RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --no-frozen-lockfile --prod

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/shared ./shared

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]
