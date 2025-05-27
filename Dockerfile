# Stage 1: Builder
# Use a Node.js image suitable for building your application.
FROM mcr.microsoft.com/playwright:v1.52.0-noble
# If you need Node.js, you'll need to install it in this image
RUN apt-get update && apt-get install -y nodejs npm

WORKDIR /app

# Install pnpm globally.
RUN npm install -g pnpm

# Copy package.json only.
# WARNING: pnpm-lock.yaml is NOT copied, meaning pnpm will resolve dependencies
# dynamically. This can lead to non-reproducible builds.
COPY package.json ./

# Install project dependencies using pnpm.
# WARNING: --frozen-lockfile is removed, allowing pnpm to potentially install
# different dependency versions each time the image is built.
RUN pnpm install

COPY . .

RUN pnpm run build

COPY --from=builder /app/dist/ .

COPY --from=builder /app/node_modules ./node_modules


EXPOSE 3000

CMD ["node","server.js"]