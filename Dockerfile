# Stage 1: Runtime
FROM mcr.microsoft.com/playwright:v1.52.0-noble

# Install Node.js and npm (needed for 'node' command and dependency management)
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Copy only package.json and the lock file to install dependencies
# This ensures that dependencies are installed fresh within the container.
COPY package.json ./
# Since you use npm, we'll copy package-lock.json.
# IMPORTANT: Ensure 'package-lock.json' exists in your project's root directory.
# If you do not have a lock file, you can remove this line, but it's highly recommended for reproducible builds.
COPY package-lock.json ./ # <--- CHANGED FROM pnpm-lock.yaml

# Install production dependencies only.
# --prod ensures only dependencies are installed, not devDependencies.
# --frozen-lockfile ensures the exact versions from the lock file are used, for reproducibility.
RUN npm install --prod --frozen-lockfile # <--- CHANGED FROM pnpm install

# Copy the pre-built application files (dist) from the build context.
# These files are downloaded by the GitHub Action's 'download-artifact' step.
COPY dist/ ./dist/

# Expose the port the application listens on
EXPOSE 3000

# Command to run the application.
# Based on the 'ls -lR ./dist' output, server.js is located at 'dist/src/server.js'.
CMD ["node","dist/src/server.js"]
