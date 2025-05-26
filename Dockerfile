# syntax=docker/dockerfile:1.4

ARG NODE_VERSION=20.10.0
ARG PNPM_VERSION=10.11.0

ARG AI_API_KEY
ARG DB_PORT=5432
ARG DB_USER
ARG DB_PASSWORD
ARG DB_NAME
ARG HOST

ENV AI_API_KEY=$AI_API_KEY
ENV DB_PORT=$DB_PORT
ENV DB_USER=$DB_USER
ENV DB_PASSWORD=$DB_PASSWORD
ENV DB_NAME=$DB_NAME
ENV HOST=$HOST

FROM node:${NODE_VERSION}-alpine as base
WORKDIR /usr/src/app

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
RUN pnpm run build

################################################################################
FROM base as final

ENV NODE_ENV=production
USER node
WORKDIR /usr/src/app

COPY package.json ./
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

EXPOSE 8080
CMD ["pnpm", "start"]
