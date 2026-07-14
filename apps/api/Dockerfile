# Build from monorepo root:
#   docker build -f apps/api/Dockerfile .
# Or via apps/api/docker-compose.yml (context set to ../..)

FROM node:20-alpine AS builder

WORKDIR /app

COPY apps/api/package.json apps/api/package-lock.json* ./
RUN npm ci

COPY apps/api/tsconfig.json ./
COPY apps/api/src ./src
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV DOCS_ROOT=/app/docs/FinalDoc

COPY apps/api/package.json apps/api/package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
# Seed docs for fallback boot when Mongo seed hasn't run yet
COPY docs/FinalDoc ./docs/FinalDoc

EXPOSE 6002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:6002/api/v1/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/index.js"]
