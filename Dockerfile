ARG IMAGE=node:26-slim
FROM $IMAGE AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN apt-get update && apt-get install -y git
RUN npm install -g pnpm@10.34
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

RUN pnpm store path 
RUN --mount=type=cache,target=/pnpm/store pnpm fetch --frozen-lockfile -r

##################################
## COMMON
##################################

FROM base AS builder-common
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY common-types common-types/

RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile --offline
WORKDIR /app/common-types
RUN pnpm build

##################################
## NUXT
##################################

## Builder Stage
FROM base AS builder-ui
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY --from=builder-common /app/common-types/package.json /app/common-types/
COPY --from=builder-common /app/common-types/dist /app/common-types/dist/
COPY nuxt nuxt/
COPY .git .git/

RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile --offline
WORKDIR /app/nuxt

# Use 6GB heap space cuz nuxt be like that ig
ENV NODE_OPTIONS="--max-old-space-size=12288" 
RUN pnpm build

## Final Stage
FROM $IMAGE AS final-ui

ARG GIT_BRANCH=unknown
ENV GIT_BRANCH=$GIT_BRANCH

WORKDIR /app
USER node
COPY --from=builder-ui --chown=node /app/nuxt/.output/ ./ui/.output
WORKDIR /app/ui

EXPOSE 3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV NUXT_API_INTERNAL_URL=http://localhost:8080
ENV NUXT_PUBLIC_API_PUBLIC_URL=
ENV NUXT_PUBLIC_API_AUTH_URL=http://localhost:8080
CMD ["./.output/server/index.mjs"]

##################################
## SERVER
##################################

## Builder stage
FROM base AS builder-server
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY --from=builder-common /app/common-types/package.json /app/common-types/
COPY --from=builder-common /app/common-types/dist /app/common-types/dist/
COPY server server/

RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile --offline
WORKDIR /app/server
RUN pnpm build
RUN pnpm --filter=server --prod deploy /out


## Final Stage
FROM $IMAGE AS final-server

ARG GIT_BRANCH=unknown
ENV GIT_BRANCH=$GIT_BRANCH

WORKDIR /app
COPY --from=builder-server /out ./server/
WORKDIR /app/server

ENV NODE_ENV=production

# We run as root - needs docker access anyway

EXPOSE 8080
EXPOSE 7676
CMD ["node", "./dist/src/index.js"]