# Base image
FROM node:20-alpine AS base

# 1. Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# 2. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# 3. Production image, copy all the files and run next
FROM base AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Use standalone output for smaller image
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema for migrations in production if needed
COPY --from=builder /app/prisma ./prisma

# Copy node_modules for serverExternalPackages (not included in standalone trace)
COPY --from=builder /app/node_modules/undici ./node_modules/undici
COPY --from=builder /app/node_modules/youtube-transcript-plus ./node_modules/youtube-transcript-plus
COPY --from=builder /app/node_modules/youtubei.js ./node_modules/youtubei.js
COPY --from=builder /app/node_modules/unpdf ./node_modules/unpdf
COPY --from=builder /app/node_modules/@bufbuild ./node_modules/@bufbuild
COPY --from=builder /app/node_modules/meriyah ./node_modules/meriyah

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
