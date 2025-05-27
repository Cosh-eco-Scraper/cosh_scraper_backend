# Stage 1: Runtime
FROM mcr.microsoft.com/playwright:v1.52.0-noble

# Install Node.js and pnpm (needed for 'node' command and dependency management)
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g pnpm # Install pnpm globally as used in your workflow

WORKDIR /app

# Copy only package.json and the lock file to install dependencies
# This ensures that dependencies are installed fresh within the container.
COPY package.json ./
# Assuming pnpm is used, copy pnpm-lock.yaml. If you use package-lock.json, change this line.
COPY pnpm-lock.yaml ./

# Install production dependencies only.
# --prod ensures only dependencies are installed, not devDependencies.
# --frozen-lockfile ensures the exact versions from the lock file are used, for reproducibility.
RUN pnpm install --prod --frozen-lockfile

# Copy the pre-built application files (dist) from the build context.
# These files are downloaded by the GitHub Action's 'download-artifact' step.
COPY dist/ ./dist/

# Expose the port the application listens on
EXPOSE 3000

# Command to run the application.
# Based on the 'ls -lR ./dist' output, server.js is located at 'dist/src/server.js'.
CMD ["node","dist/src/server.js"]
