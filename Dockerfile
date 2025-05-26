# syntax=docker/dockerfile:1.4

ARG NODE_VERSION=20.10.0
ARG PNPM_VERSION=10.11.0

# Change base image from alpine to slim (Debian-based)
FROM node:${NODE_VERSION}-slim as base
WORKDIR /usr/src/app

# Install required dependencies for Playwright
RUN apt-get update && \
    apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

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
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0
RUN pnpm exec playwright install chromium
RUN pnpm run build


################################################################################
FROM base as final

ENV NODE_ENV=production
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY --from=build /root/.cache/ms-playwright /root/.cache/ms-playwright

USER node
WORKDIR /usr/src/app

COPY package.json ./
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

EXPOSE 8080
CMD ["pnpm", "start"]