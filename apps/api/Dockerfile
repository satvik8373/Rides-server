FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@10.11.0 && pnpm install --frozen-lockfile --prod

# Copy source
COPY . .

# Build
RUN pnpm build

# Set port
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Run
CMD ["node", "dist/server.js"]
