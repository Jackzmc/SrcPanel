FROM node:24-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

# Build time dependencies for node-canvas
RUN apk update && apk add git && npm i -g pnpm@10


# Setup dependencies
COPY server/package*.json ./server/package.json
COPY ui/package*.json ./ui/package.json
COPY .git/ .git/
COPY pnpm-* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY common-types ./common-types
COPY server/ ./server
COPY ui/ ./ui

# Build
RUN cd /app/ui/ && pnpm build
RUN cd /app/server/ && pnpm tsc --version && pnpm build

FROM node:24-alpine AS prod

# Runtime dependencies for canvas
# RUN apt update

COPY --from=builder /app/server /app/server
COPY --from=builder /app/ui/dist /app/ui
WORKDIR /app/server

ENV NODE_ENV=production
ENV STATIC_PATH=/app/server/static

EXPOSE 80
CMD ["node", "/app/server/dist/server/src/index.js"]