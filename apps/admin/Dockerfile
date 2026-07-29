# Build from monorepo root:
#   docker build -f apps/admin/Dockerfile -t iitj1-admin .
# Or via the root docker-compose.yml (context set to the repo root).
#
# Uses Next.js's `output: 'standalone'` (next.config.mjs) so the runtime
# stage only needs the pruned standalone server + static assets, not the
# full node_modules tree.

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/admin/package.json ./apps/admin/
# Workspace globs require sibling package.json files to exist
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/

RUN npm ci --workspace=@iitj1/types --workspace=@iitj1/admin --include-workspace-root=false --ignore-scripts

COPY packages/types ./packages/types
COPY apps/admin ./apps/admin

RUN npm run build -w @iitj1/types && npm run build -w @iitj1/admin

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Standalone output includes a minimal server.js + its own pruned
# node_modules — no separate `npm ci` needed in this stage.
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /app/apps/admin/public ./apps/admin/public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "apps/admin/server.js"]
