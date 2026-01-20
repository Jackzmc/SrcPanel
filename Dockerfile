ARG IMAGE=node:24-slim
FROM $IMAGE AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

# Build time dependencies
RUN apt-get update && apt-get install -y git curl
RUN corepack enable pnpm && corepack install -g pnpm@latest-10

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile

# Setup dependencies
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --offline  -r

FROM base AS build
COPY . /app
COPY .git/ .git/
RUN pnpm install -r --offline

# Build
RUN cd /app/ui/ && pnpm build
RUN cd /app/server/ && pnpm build

FROM $IMAGE AS prod

COPY --from=prod-deps --chown=node /app/node_modules /app/node_modules

COPY --from=build --chown=node /app/server /app/server
COPY --from=build --chown=node /app/ui/dist /app/ui

# RUN chown -R node:node /app

WORKDIR /app


ENV NODE_ENV=production
ENV STATIC_PATH=/app/ui/

EXPOSE 80
CMD ["node", "/app/server/dist/server/src/index.js"]
