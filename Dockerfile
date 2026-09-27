ARG IMAGE=node:24-slim
FROM $IMAGE AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

# Use Corepack for pnpm
RUN apt-get update && apt-get install -y git
RUN corepack enable pnpm && corepack install -g pnpm@latest-10
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY common-types common-types/

RUN pnpm store path 
RUN --mount=type=cache,target=/pnpm/store pnpm fetch --frozen-lockfile -r

FROM base AS builder-common
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY common-types common-types/

RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile --offline
WORKDIR /app/common-types
RUN pnpm build

# Builder stage for Nuxt UI
FROM base AS builder-ui
WORKDIR /app
COPY --from=builder-common /app/common-types/dist /app/common-types/dist/
COPY --from=builder-common /app/common-types/package.json /app/common-types/
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY nuxt nuxt/
COPY .git .git/

# Use 6GB heap space cuz nuxt be like that ig

RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile --offline
WORKDIR /app/nuxt
ENV NODE_OPTIONS="--max-old-space-size=12288"
RUN pnpm build

# Builder stage for Server
FROM base AS builder-server
WORKDIR /app
COPY --from=builder-common /app/common-types/dist /app/common-types/dist/
COPY --from=builder-common /app/common-types/package.json /app/common-types/
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY server server/

RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile --offline
WORKDIR /app/server
RUN pnpm build


# Production image for Server
FROM $IMAGE AS final-server

RUN apt-get update && apt-get install -y curl && apt-get clean

WORKDIR /app
COPY --from=builder-server /app/node_modules ./node_modules
COPY --from=builder-server /app/server ./server/
COPY --from=builder-server /app/common-types ./common-types
WORKDIR /app/server

ENV NODE_ENV=production

# We run as root - needs docker access anyway

EXPOSE 8080
EXPOSE 7676
CMD ["node", "./dist/src/index.js"]

# Production image for Nuxt UI
FROM $IMAGE AS final-ui
WORKDIR /app
USER node
COPY --from=builder-ui --chown=node /app/node_modules ./node_modules
COPY --from=builder-ui --chown=node /app/nuxt/ ./ui/
COPY --from=builder-ui --chown=node /app/common-types common-types/

WORKDIR /app/ui

EXPOSE 3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV NUXT_API_INTERNAL_URL=http://localhost:8080
ENV NUXT_PUBLIC_API_PUBLIC_URL=
ENV NUXT_PUBLIC_API_AUTH_URL=http://localhost:8080
CMD ["./.output/server/index.mjs"]
# CMD ["serve", "-s", "-p", "3000", "dist"]
