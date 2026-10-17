# Next.js standalone image. Runs on Lattice stack 38 "Hillview Web".

# ---- Build ----
FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN mkdir -p public

ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=cache,id=hillview-assets-web-next,target=/app/.next/cache npm run build

# ---- Run ----
FROM node:24-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# next/image writes its cache here; owned by nextjs so a named volume mounted
# over it inherits the ownership on first mount.
RUN mkdir -p .next/cache && chown nextjs:nodejs .next .next/cache

USER nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# node:alpine has busybox wget, not curl.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
