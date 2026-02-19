FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./

RUN pnpm fetch

RUN pnpm install --frozen-lockfile --offline

COPY . .

RUN pnpm build

RUN pnpm prune --prod

FROM node:24-alpine
WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 80
CMD ["node", "dist/app/src/server.js"]
