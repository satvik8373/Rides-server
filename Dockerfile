# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.11.0

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./

# Copy packages
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared package
RUN pnpm --filter @ahmedabadcar/shared build

# Build API
RUN pnpm --filter @ahmedabadcar/api build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init and bash for startup script
RUN apk add --no-cache dumb-init bash

# Copy entire node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy built shared package (for workspace resolution)
COPY --from=builder /app/packages/shared ./packages/shared

# Copy built API
COPY --from=builder /app/apps/api/dist ./dist

# Copy startup script
COPY apps/api/start.sh ./start.sh
RUN chmod +x ./start.sh

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/v1/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Start the application with diagnostic wrapper
CMD ["/app/start.sh"]

# Expose port
EXPOSE 3000
