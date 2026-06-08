# syntax=docker/dockerfile:1
# Builds Next.js and writes output to /build.
# Used by the frontend-builder service in docker-compose.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# Stage artifacts at /artifacts (NOT /build — the frontend_build volume mounts over
# /build and, once non-empty, shadows image content on every later run). At runtime we
# wipe and repopulate the volume so each deploy actually ships the fresh bundle.
FROM alpine AS export
WORKDIR /artifacts
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
CMD ["sh", "-c", "rm -rf /build/* /build/.[!.]* 2>/dev/null; cp -a /artifacts/. /build/"]
