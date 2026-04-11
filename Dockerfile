FROM node:20-slim AS builder

WORKDIR /app

# Instalar pnpm
RUN corepack enable pnpm

# Copiar arquivos de dependência
COPY package.json pnpm-lock.yaml .npmrc ./

# Instalar dependências (incluindo dev para o build)
RUN pnpm install --no-frozen-lockfile

# Copiar todo o código fonte
COPY . .

# Build do frontend e backend
RUN pnpm build

# ── Estágio de produção ──
FROM node:20-slim AS runner

WORKDIR /app

RUN corepack enable pnpm

# Copiar arquivos de dependência
COPY package.json pnpm-lock.yaml .npmrc ./

# Instalar dependências de produção
# IMPORTANTE: Vite e plugins agora estão em 'dependencies' para estarem disponíveis no runtime
RUN pnpm install --no-frozen-lockfile --prod

# Copiar o build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/shared ./shared
# Precisamos do vite.config.ts e das pastas client/server/shared na imagem final 
# porque o servidor as referencia para o Vite (mesmo que não as use em produção)
COPY --from=builder /app/vite.config.ts ./vite.config.ts
COPY --from=builder /app/client ./client
COPY --from=builder /app/server ./server

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]
