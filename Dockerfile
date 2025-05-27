# Stage 1: Builder
FROM mcr.microsoft.com/playwright:v1.52.0-noble AS builder

# Install Node.js and npm
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Copy package.json and server.js directly to ensure they are available from the start
# This assumes server.js is in the same directory as your Dockerfile.
COPY package.json ./
COPY server.js ./ # <--- ADDED THIS LINE

# Install project dependencies using npm
# This will create a node_modules directory and a package-lock.json (if not present)
RUN npm install

# Copy the rest of the application code
# This will bring in your 'src/', 'dist/' (if pre-existing), 'config/', 'database/', etc.
COPY . .

# Run the build command (e.g., transpiling TypeScript, bundling assets)
# If 'npm run build' outputs a new server.js to 'dist/', you might need to adjust the runner stage.
RUN npm run build

# Stage 2: Runner
FROM mcr.microsoft.com/playwright:v1.52.0-noble

# Install Node.js and npm
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Copy built application files from the builder stage
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js ./ # This line should now find server.js from the builder
COPY package.json ./

# Expose the port the application listens on
EXPOSE 3000

# Command to run the application
CMD ["node","server.js"]