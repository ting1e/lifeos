### --- deps ---
FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && \
    (pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile)

### --- prod-deps (production deps only, no devDeps) ---
FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --prod --frozen-lockfile

### --- builder ---
FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && \
    pnpm drizzle-kit generate && \
    pnpm build && \
    pnpm exec tsc -p tsconfig.scripts.json

### --- runner ---
FROM node:24-alpine AS runner
WORKDIR /app
ARG VERSION=latest
LABEL org.opencontainers.image.version="${VERSION}"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV TZ=Asia/Shanghai

RUN apk add --no-cache bash su-exec && \
    addgroup -S nodejs && adduser -S nextjs -G nodejs -u 1001 && \
    mkdir -p /data/uploads && chown -R nextjs:nodejs /data

# Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Compiled scripts (CJS) + migrations
COPY --from=builder --chown=nextjs:nodejs /app/dist-scripts ./dist-scripts
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

# Production node_modules (superset of standalone's slim deps)
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Entrypoint: ensure uploads perms, then drop to non-root nextjs
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ENV UPLOADS_DIR=/data/uploads

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["sh", "-c", "node dist-scripts/scripts/migrate.js && node dist-scripts/scripts/bootstrap-admin.js && node dist-scripts/scripts/seed-exercises.js && node dist-scripts/scripts/apply-exercise-zh.js && node dist-scripts/scripts/seed-templates.js && node server.js"]
