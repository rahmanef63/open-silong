FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
# corepack reads `packageManager` from package.json to pin pnpm version.
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack prepare --activate && pnpm install --frozen-lockfile --prod=false

FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_CONVEX_URL=https://api-notion-page-clone.rahmanef.com
ARG NEXT_PUBLIC_DEPLOYMENT_ID
# Build id powers the version-watcher reload prompt + chunk-error recovery.
# Dokploy passes the commit SHA via DOKPLOY_COMMIT_SHA; fall back to a
# build-time timestamp when missing so production never ships an empty id.
ARG DOKPLOY_COMMIT_SHA
ARG GITHUB_SHA
ARG NEXT_PUBLIC_BUILD_ID
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_DEPLOYMENT_ID=$NEXT_PUBLIC_DEPLOYMENT_ID
ENV DOKPLOY_COMMIT_SHA=$DOKPLOY_COMMIT_SHA
ENV GITHUB_SHA=$GITHUB_SHA
ENV NEXT_PUBLIC_BUILD_ID=$NEXT_PUBLIC_BUILD_ID
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm exec next build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
