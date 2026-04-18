FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.11.0

# Copy workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps

# Install and build
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @ahmedabadcar/shared build
RUN pnpm --filter @ahmedabadcar/api build

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "apps/api/dist/server.js"]

