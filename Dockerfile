# Stage 1: Builder
FROM mcr.microsoft.com/playwright:v1.52.0-noble AS builder

# Install Node.js and npm
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Copy package.json to install dependencies first
COPY package.json ./

# Install project dependencies using npm
RUN npm install

# Copy the rest of the application code (including your .ts source files in 'src/', etc.)
# This is where your server.ts and src/ files get copied into the builder.
COPY . .

# Run the build command (this will now use your updated tsconfig.json to compile .ts to .js in 'dist')
RUN npm run build

# Stage 2: Runner
FROM mcr.microsoft.com/playwright:v1.52.0-noble

# Install Node.js and npm (same as builder, as this is a fresh stage)
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Copy built application files from the builder stage
# Copy the entire 'dist' directory, which contains your compiled JavaScript files
COPY --from=builder /app/dist/ ./dist/

# Copy node_modules
COPY --from=builder /app/node_modules ./node_modules

# Copy the compiled server.js file from 'dist' in the builder stage to the current directory (./server.js)
COPY --from=builder /app/dist/server.js ./server.js

# Copy package.json (often useful for scripts or metadata, though not strictly required for execution if dependencies are copied)
COPY package.json ./

# Expose the port the application listens on
EXPOSE 3000

# Command to run the application (assuming server.js is now directly in /app)
CMD ["node","server.js"]