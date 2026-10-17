# Build from the repository root: docker build -f apps/api/Dockerfile .
FROM node:24-slim AS build
WORKDIR /app

# The lockfile covers every workspace, so npm needs all their manifests, but
# only the api's dependencies are installed. The shared package comes in
# whole: its `prepare` script builds it during the install.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/shared packages/shared
RUN npm ci -w api

COPY apps/api apps/api
RUN npm run build -w api && npm prune --omit=dev -w api


FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/apps/api/package.json ./
COPY --from=build /app/node_modules ./node_modules
# node_modules/@leaf/shared is a link to ../../packages/shared.
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/dist ./dist
COPY --chown=node:node apps/api/static ./static

# Runtime data lives in volumes; the directories must be writable by `node`
# so that fresh named volumes inherit the right ownership.
RUN mkdir data && chown node:node data
ENV DATABASE_PATH=/app/data/plants.db

USER node
EXPOSE 3000
CMD ["node", "dist/main"]
