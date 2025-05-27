# Stage 1: Builder
FROM mcr.microsoft.com/playwright:v1.52.0-noble AS builder
# If you need Node.js, you'll need to install it in this image
RUN apt-get update && apt-get install -y nodejs npm

WORKDIR /app

# Install pnpm globally.
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install project dependencies using pnpm
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

# Stage 2: Runner
FROM mcr.microsoft.com/playwright:v1.52.0-noble
RUN apt-get update && apt-get install -y nodejs npm

WORKDIR /app

COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3000

CMD ["node","server.js"]