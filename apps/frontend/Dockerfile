FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY packages/shared/src packages/shared/src
COPY packages/shared/tsconfig.json packages/shared/tsconfig.json
COPY apps/frontend/src apps/frontend/src
COPY apps/frontend/public apps/frontend/public
COPY apps/frontend/next-env.d.ts apps/frontend/next-env.d.ts
COPY apps/frontend/next.config.ts apps/frontend/next.config.ts
COPY apps/frontend/tsconfig.json apps/frontend/tsconfig.json
RUN pnpm --filter @volatility/shared build
RUN pnpm --filter @volatility/frontend build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN corepack enable
COPY --from=build /app/apps/frontend/.next/standalone ./
COPY --from=build /app/apps/frontend/.next/static apps/frontend/.next/static
COPY --from=build /app/apps/frontend/public apps/frontend/public
EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]
