# syntax=docker/dockerfile:1
# ══════════════════════════════════════════════════════════════
# Quillo API — Multi-stage Dockerfile
# Target runtime: EC2 (Docker), Node.js 20, production
#
# Build stages:
#   builder  — install deps + prisma generate + tsc compile
#   runtime  — lean image with only production artifacts
#
# Usage:
#   docker build -f backend/Dockerfile backend/ -t quillo-api:latest
#   docker run -p 3001:3001 --env-file .env.production quillo-api:latest
# ══════════════════════════════════════════════════════════════

# ── Stage 1: builder ──────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install build essentials for native addons (e.g., bcrypt)
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
      openssl \
      ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy package manifests first (Docker layer cache)
# NOTE: Commit package-lock.json to the repo for reproducible builds.
# If missing, npm install is used as fallback (non-deterministic).
COPY package.json ./
COPY package-lock.json* ./

# Install ALL dependencies (including devDeps for tsc + prisma generate)
# Use npm ci if lockfile exists for reproducible installs, otherwise npm install
RUN if [ -f package-lock.json ]; then npm ci --ignore-scripts; else npm install --ignore-scripts; fi

# Copy prisma schema for generate
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Generate Prisma Client
# @prisma/adapter-pg / queryCompiler GA: no binary engine needed.
RUN npx prisma generate

# Copy full source
COPY tsconfig.json ./
COPY src ./src/

# Compile TypeScript → dist/
RUN npm run build

# Prune dev dependencies (keep only production deps)
RUN npm prune --production

# ── Stage 2: runtime ─────────────────────────────────────────
FROM node:20-slim AS runtime

# Security: run as non-root user
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nodejs

WORKDIR /app

# Install runtime system deps
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
      openssl \
      ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Production environment
ENV NODE_ENV=production
ENV PORT=3001

# Copy production node_modules from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules/

# Copy compiled application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist/

# Copy Prisma schema + generated client artifacts
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma/

# Copy prisma.config.ts (read by some prisma CLI commands at runtime if needed)
COPY --from=builder --chown=nodejs:nodejs /app/prisma.config.ts ./

# Expose API port
EXPOSE 3001

# Health check — hits the /api/v1/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

USER nodejs

# Start the API server (compiled JS entry)
CMD ["node", "dist/server.js"]
