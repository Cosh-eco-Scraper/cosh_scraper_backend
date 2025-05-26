# syntax=docker/dockerfile:1.4

ARG NODE_VERSION=20.10.0
ARG PNPM_VERSION=10.11.0

# Change base image from alpine to slim (Debian-based)
FROM node:${NODE_VERSION}-slim as base
WORKDIR /usr/src/app

# Chromium is usually included or can be installed with apt-get
# You might not need this line if Playwright handles it, or use apt-get here
# RUN apt-get update && apt-get install -y chromium

RUN --mount=type=cache,target=/root/.npm \
    npm install -g pnpm@${PNPM_VERSION}

################################################################################
FROM base as deps

COPY package.json ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod --ignore-scripts


################################################################################
FROM base as build

COPY package.json ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install

COPY . .
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin
# This command should now work
RUN pnpm exec playwright install --with-deps
RUN pnpm run build


################################################################################
FROM base as final

ENV NODE_ENV=production
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin
USER node
WORKDIR /usr/src/app

COPY package.json ./
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

EXPOSE 8080
CMD ["pnpm", "start"]