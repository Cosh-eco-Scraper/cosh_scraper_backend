# Stage 1: Runtime
FROM mcr.microsoft.com/playwright:v1.52.0-noble

# Install Node.js and npm (needed for 'node' command to run the app)
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Copy the pre-built application files (dist and node_modules) from the build context.
# These files are downloaded by the GitHub Action's 'download-artifact' step.
# IMPORTANT: These COPY commands rely on 'dist/' and 'node_modules/' being present
# in the build context (i.e., in the same directory as the Dockerfile when 'docker build .' is run).
COPY dist/ ./dist/
COPY node_modules/ ./node_modules/

# Copy package.json (useful for context, though not strictly needed for runtime if dependencies are copied)
COPY package.json ./

# Expose the port the application listens on
EXPOSE 3000

# Command to run the application.
# Based on the 'ls -lR ./dist' output, server.js is located at 'dist/src/server.js'.
CMD ["node","dist/src/server.js"]