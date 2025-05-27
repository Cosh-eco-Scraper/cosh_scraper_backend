# Stage 1: Builder
# Use a Node.js image suitable for building your application.
FROM mcr.microsoft.com/playwright/chromium:latest
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


# Set the working directory for the production environment.
WORKDIR /app

COPY --from=builder /app/dist/ .


COPY --from=builder /app/node_modules ./node_modules

# Expose the port your application listens on.
# Replace '3000' with the actual port your application uses.
EXPOSE 3000
# Define the command to run your application when the container starts.
RUN echo '#!/bin/bash\nnode server.js &\ntrap "pkill node" SIGINT SIGTERM EXIT\nwait' > /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
CMD ["/app/entrypoint.sh"]