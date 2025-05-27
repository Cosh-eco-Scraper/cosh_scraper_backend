# Stage 1: Builder
# Use a Node.js image suitable for building your application.
FROM node:20-slim AS builder

# Set the working directory inside the container.
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

# Install Playwright browsers and their dependencies.
# This is crucial if your application uses Playwright for testing or automation.
# Using 'npx playwright install --with-deps' ensures all necessary browser binaries
# and system dependencies are installed.
RUN npx playwright install --with-deps

# Copy the rest of your application source code.
# This includes all your source files, server entry points, etc.
COPY . .

# Build your application.
# This command should produce your production-ready assets/code, typically
# in a 'dist' directory (e.g., for a frontend or a compiled backend).
RUN pnpm run build

# Stage 2: Production
# Use a smaller, production-ready base image.
# For a Node.js backend, 'node:20-slim' is often a good choice as it includes Node.js runtime.
# For a static frontend, you might use 'nginx:alpine' or 'scratch' if you only serve static files.
FROM node:20-slim AS production

# Set the working directory for the production environment.
WORKDIR /app

# Copy only the necessary files from the builder stage to the final image.
# This keeps your final Docker image small and secure.
# Adjust paths based on your project's build output and runtime needs.
# Copy the built application (e.g., 'dist' folder for frontend or compiled backend).
COPY --from=builder /app/dist ./dist

# If your backend application requires 'node_modules' at runtime (e.g., Express, etc.), copy them.
# If your 'dist' already bundles everything, this might not be necessary.
COPY --from=builder /app/node_modules ./node_modules

# Copy your main server entry point file.
# IMPORTANT: Verify the correct path and filename of your main server entry point.
# It might be 'index.js', 'app.js', or located in a build output directory like 'dist/server.js'.
# Adjust '/app/server.js' to match the actual path in the builder stage.
COPY --from=builder /app/dist/server.js .

# Expose the port your application listens on.
# Replace '3000' with the actual port your application uses.
EXPOSE 3000

# Define the command to run your application when the container starts.
# Replace 'server.js' with your application's entry file.
CMD ["node", "server.js"]