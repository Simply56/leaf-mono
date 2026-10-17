FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev


FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --chown=node:node static ./static

# Runtime data lives in volumes; the directories must be writable by `node`
# so that fresh named volumes inherit the right ownership.
RUN mkdir data && chown node:node data
ENV DATABASE_PATH=/app/data/plants.db

USER node
EXPOSE 3000
CMD ["node", "dist/main"]
