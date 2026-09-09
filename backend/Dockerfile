FROM node:22-slim AS build
WORKDIR /app
COPY package.json ./package.json
COPY package-lock.json ./package-lock.json
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --workspace backend
# npm's workspace hoisting is arch-dependent (platform-specific optional deps can tip
# hoisting decisions differently) — this dir may end up empty, but must always exist so
# the runtime stage's COPY below is deterministic regardless of build architecture.
RUN mkdir -p /app/backend/node_modules
COPY backend ./backend
WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system okovision && useradd --system --gid okovision okovision
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/src/generated ./backend/src/generated
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/prisma7.config.ts ./backend/prisma7.config.ts
COPY --from=build /app/backend/package.json ./backend/package.json
USER okovision
WORKDIR /app/backend
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
