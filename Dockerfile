# Use a Node.js base image
FROM node:20

# Set the working directory inside the container
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install system dependencies required by Playwright browsers
# These are for Debian-based systems (like the default Node.js images)
# Check Playwright documentation for the most up-to-date list for your desired browser(s)
# This example includes dependencies for Chromium, Firefox, and WebKit to be safe.
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    procps \
    libnss3 \
    libfontconfig1 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm-dev \
    libgbm-dev \
    libasound2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    libxi6 \
    libxss1 \
    libxtst6 \
    libgconf-2-4 \
    libnotify4 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libexpat1 \
    libjpeg-turbo8 \
    libpangocairo-1.0-0 \
    libxinerama1 \
    libwebp-dev \
    libharfbuzz-icu0 \
    libegl1 \
    libgles2 \
    fonts-liberation \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./

# Install application dependencies, including Playwright's browser binaries
# `playwright install` downloads the browser binaries inside the container
RUN pnpm install
RUN npx playwright install --with-deps

# Copy the rest of the application code
COPY . .

# Set environment variable to run browsers in headless mode by default
ENV HEADLESS=true

# Expose the port your Express app listens on
EXPOSE 3000

# Command to run the application when the container starts
CMD ["pnpm", "start"]