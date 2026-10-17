# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

An npm workspaces monorepo with two apps and one shared package:

- `apps/web` (workspace `web`): Angular 22 PWA. Its own `CLAUDE.md` covers architecture and conventions; read it before working there.
- `apps/api` (workspace `api`): NestJS 12 REST API on SQLite. `apps/api/README.md` documents endpoints, auth and environment variables.
- `packages/shared` (workspace `@leaf/shared`): the API contract as Zod schemas, used by both apps. See "Shared contract" below.

There is no monorepo tool (no Nx, Turborepo); that is deliberate. Each app keeps its own CLI (`ng`, `nest`) and build config; linting and formatting are shared.

## Commands

`npm install` runs at the root only; there is one `package-lock.json`, at the root. To add a dependency to an app, run `npm install <pkg> -w web` (or `-w api`) at the root, never `npm install` inside an app folder. Repo-wide dev tools (ESLint, Prettier) are root `devDependencies`.

Root scripts: `npm run dev:web`, `npm run dev:api`, `npm run dev:shared` (rebuilds the shared package on change), `npm run build` (shared package first, then both apps), `npm test` (api only; the web app has no tests on purpose), and the repo-wide `npm run lint` / `lint:fix` and `npm run format` / `format:check`. Any other app script runs from the root with `-w <workspace>`, or from inside the app folder.

The apps import `@leaf/shared` from its compiled `packages/shared/dist`. `npm install` builds it (its `prepare` script); after changing `packages/shared/src`, run `npm run build:shared` or keep `npm run dev:shared` running, or the apps keep seeing the old schemas.

Verify a change with `npm run lint` and `npm run format:check`, plus the build (and for the api, the tests) of the app it touches.

## Linting and formatting

One configuration for the whole repository, at the root:

- Prettier (`.prettierrc.json`): 4-space indentation and **double quotes** everywhere; HTML templates use the `angular` parser. `.prettierignore` skips build output, the lockfile and Markdown.
- ESLint (`eslint.config.mjs`): `typescript-eslint`'s recommended rules on every `.ts` file in both apps.
- `.editorconfig` matches the Prettier settings for editors.

Commit formatting-only changes separately and add their hashes to `.git-blame-ignore-revs`.

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

- web: `npm run deploy -w web` publishes to the `gh-pages` branch of `Simply56/leaf_ng` (explicit `--repo`); the URL must not change because plant URLs are printed as QR codes.
- api: the production instance on the VPS still runs from a clone of the old `leaf-nest` repository, started and stopped by hand. The Docker image builds from the repository root (`apps/api/compose.yaml` sets the context).
