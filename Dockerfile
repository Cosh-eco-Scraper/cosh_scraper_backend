# Stage 1: Runtime
FROM mcr.microsoft.com/playwright:v1.52.0-noble

# Install Node.js and npm (needed for 'node' command and dependency management)
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Copy package.json to install dependencies.
# We are removing the lock file copy due to persistent build errors.
COPY package.json ./

# Install production dependencies only.
# Removed --frozen-lockfile as we are no longer copying the lock file.
RUN npm install --prod # <--- CHANGED: Removed --frozen-lockfile

# Copy the pre-built application files (dist) from the build context.
# These files are downloaded by the GitHub Action's 'download-artifact' step.
COPY dist/ ./dist/

# Expose the port the application listens on
EXPOSE 3000

# Command to run the application.
# Based on the 'ls -lR ./dist' output, server.js is located at 'dist/src/server.js'.
CMD ["node","dist/src/server.js"]
