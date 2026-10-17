# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

An npm workspaces monorepo with two apps and one shared package:

- `apps/web` (workspace `web`): Angular 22 PWA. Its own `CLAUDE.md` covers architecture and conventions; read it before working there.
- `apps/api` (workspace `api`): NestJS 12 REST API on SQLite. `apps/api/README.md` documents endpoints, auth and environment variables; its `CLAUDE.md` covers request flow, the database, images and the test setup. Read it before working there.
- `packages/shared` (workspace `@leaf/shared`): the API contract as Zod schemas, used by both apps. See "Shared contract" below.

There is no monorepo tool (no Nx, Turborepo); that is deliberate. Each app keeps its own CLI (`ng`, `nest`) and build config; linting and formatting are shared.

## Commands

`npm install` runs at the root only; there is one `package-lock.json`, at the root. To add a dependency to an app, run `npm install <pkg> -w web` (or `-w api`) at the root, never `npm install` inside an app folder. Repo-wide dev tools (ESLint, Prettier) are root `devDependencies`.

Root scripts: `npm run dev` (the shared package's watcher, the api in watch mode and the web dev server together; the web app reaches the local api through its dev-server proxy), or one at a time `npm run dev:web`, `npm run dev:api`, `npm run dev:shared` (rebuilds the shared package on change), `npm run build` (shared package first, then both apps), `npm test` (api only; the web app has no tests on purpose), `npm run typecheck` (the api's `src` and `test`; the builds type-check the web app and the shared package), and the repo-wide `npm run lint` / `lint:fix` and `npm run format` / `format:check`. Any other app script runs from the root with `-w <workspace>`, or from inside the app folder.

The apps import `@leaf/shared` from its compiled `packages/shared/dist`. `npm install` builds it (its `prepare` script); after changing `packages/shared/src`, run `npm run build:shared` or keep `npm run dev:shared` running, or the apps keep seeing the old schemas. The web dev server picks up the rebuilt package; the api's watcher does not, so restart it (or `npm run dev`) after changing the schemas.

Verify a change with `npm run lint` and `npm run format:check`, plus the build (and for the api, `npm test` and `npm run typecheck`) of the app it touches. CI (`.github/workflows/ci.yml`) runs all of these on every push to `main` and on pull requests.

## Linting and formatting

One configuration for the whole repository, at the root:

- Prettier (`.prettierrc.json`): 4-space indentation and **double quotes** everywhere; HTML templates use the `angular` parser. `.prettierignore` skips build output, the lockfile and Markdown.
- ESLint (`eslint.config.mjs`): `typescript-eslint`'s recommended rules on every `.ts` file in both apps, plus `angular-eslint` for the web app: its TypeScript rules, and the recommended and accessibility rules for templates (`== null` / `!= null` are allowed on purpose, to cover `undefined` too).
- `.editorconfig` matches the Prettier settings for editors.

## Shared contract (`packages/shared`)

`packages/shared/src/plant.ts` defines what the API accepts and returns, as Zod schemas with the TypeScript types inferred from them. Change the contract there, never in one app:

- The API validates request bodies with them (`ZodValidationPipe`, `apps/api/src/validation/`) and generates its Swagger document from them (`apps/api/src/plants/plants.openapi.ts`). The TypeORM entity is only the database row.
- The web app checks every `GET /plants` response against them in `PlantsService` (a mismatch shows the error banner) and types its request bodies with them.
- The api's contract test (`test/contract.e2e-spec.ts`) checks every plant response against the same schema.

Use `zod/mini` with `import * as z from "zod/mini"`, not `zod` or `import { z }`: anything else defeats tree-shaking and adds 70–400 kB to the web bundle. `zod/mini` has no error messages unless a locale is loaded; the API loads English, the browser deliberately does not.

The package is an ES module (`"type": "module"`); the CommonJS api, its Jest tests and Angular all load it as built output.

## Things that span both apps

- Auth is a shared key sent as `?apiKey=`; the API checks it against `LEAF_API_KEY` in `apps/api/.env`.
- Native install scripts are allowed through `allowScripts` in the root `package.json` (npm ignores it in workspace manifests). `better-sqlite3` needs it.

## Deployment

Nothing in this repository deploys on its own, and nothing should be deployed without being asked.

- web: `npm run deploy -w web` publishes to the `gh-pages` branch of this repository, served at `https://simply56.github.io/leaf-mono/`.
- api: production runs with Docker Compose from a clone of this repository on the VPS (`cd apps/api && git pull && docker compose up -d --build`). The image builds from the repository root (`apps/api/compose.yaml` sets the context), and `name: leaf-nest` in `compose.yaml` keeps the existing `leaf-nest_db` and `leaf-nest_uploads` volumes, which hold the live database and images. Do not rename the project.
