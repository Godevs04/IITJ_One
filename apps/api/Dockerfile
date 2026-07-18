# Build from monorepo root:
#   docker build -f apps/api/Dockerfile .
# Or via apps/api/docker-compose.yml (context set to ../..)

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/
# Workspace globs require sibling package.json files to exist
COPY apps/admin/package.json ./apps/admin/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/

RUN npm ci --workspace=@iitj1/types --workspace=@iitj1/api --include-workspace-root=false --ignore-scripts

COPY packages/types ./packages/types
COPY apps/api ./apps/api

RUN npm run build -w @iitj1/types && npm run build -w @iitj1/api

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV DOCS_ROOT=/app/docs/FinalDoc
ENV PORT=6002

COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/
COPY apps/admin/package.json ./apps/admin/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/

RUN npm ci --workspace=@iitj1/types --workspace=@iitj1/api --include-workspace-root=false --omit=dev --ignore-scripts \
  && npm cache clean --force

COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
# Seed docs for fallback boot when Mongo seed hasn't run yet
COPY docs/FinalDoc ./docs/FinalDoc

EXPOSE 6002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||6002)+'/api/v1/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["npm", "run", "start", "-w", "@iitj1/api"]
