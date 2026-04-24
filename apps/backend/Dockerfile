FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY packages packages
COPY apps/backend apps/backend
RUN pnpm --filter @volatility/shared build
RUN pnpm --filter @volatility/backend db:generate
RUN pnpm --filter @volatility/backend build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/packages packages
COPY --from=build /app/apps/backend apps/backend
WORKDIR /app/apps/backend
EXPOSE 4000
CMD ["sh", "-c", "pnpm prisma migrate deploy --schema prisma/schema.prisma && node dist/server.js"]
