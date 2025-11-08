# Stage 1: Install dependencies
FROM oven/bun:1.3.1 AS deps
WORKDIR /app
COPY bun.lock package.json ./
RUN bun install --frozen-lockfile

# Stage 2: Build the application
FROM oven/bun:1.3.1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Stage 3: Production runtime
FROM oven/bun:1.3.1-slim
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy built application from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/bun.lock ./bun.lock

# Install production dependencies only
RUN bun install --production --frozen-lockfile

# Switch to non-root user for security
USER bun

# Expose the application port (adjust if needed)
EXPOSE 3000

# Health check (adjust endpoint as needed)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["bun", "run", "dist/index.js"]
