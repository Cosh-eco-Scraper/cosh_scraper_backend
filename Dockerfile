# Use the official Playwright base image for Node.js
# This image comes with all necessary browser dependencies pre-installed.
# You can specify a browser (e.g., mcr.microsoft.com/playwright/node:20-chromium)
# or all browsers (mcr.microsoft.com/playwright/node:20)
FROM mcr.microsoft.com/playwright/node:20

# Set the working directory inside the container
WORKDIR /app

# Install pnpm globally in the container
# This makes the `pnpm` command available for subsequent steps.
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml (or package-lock.json if you switch from npm to pnpm)
# This allows Docker to cache the pnpm install step
COPY package.json pnpm-lock.yaml ./

# Install application dependencies using pnpm
# pnpm will read pnpm-lock.yaml for deterministic installs
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Expose the port your Express app listens on
EXPOSE 3000

# Command to run the application when the container starts
CMD ["pnpm", "start"]