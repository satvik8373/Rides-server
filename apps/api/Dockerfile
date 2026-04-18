FROM node:20-alpine

WORKDIR /app

# Copy workspace files from repo root (parent directories)
COPY ../.. ./

# Install pnpm and dependencies
RUN npm install -g pnpm@10.11.0 && pnpm install --frozen-lockfile

# Build shared package
RUN pnpm --filter @ahmedabadcar/shared build

# Build API
RUN pnpm --filter @ahmedabadcar/api build

# Remove dev dependencies, keep only prod
RUN pnpm prune --prod

# Set port
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Run
CMD ["node", "apps/api/dist/server.js"]
