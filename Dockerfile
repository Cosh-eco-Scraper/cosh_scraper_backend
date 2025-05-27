# Stage 1: Builder
FROM mcr.microsoft.com/playwright:v1.52.0-noble AS builder

# Install Node.js and npm
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Copy package.json
COPY package.json ./

# Install project dependencies using npm
# This will create a node_modules directory and a package-lock.json (if not present)
RUN npm install

# Copy the rest of the application code
COPY . .

# Run the build command
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
COPY --from=builder /app/server.js ./
COPY package.json ./

# Expose the port the application listens on
EXPOSE 3000

# Command to run the application
CMD ["node","server.js"]