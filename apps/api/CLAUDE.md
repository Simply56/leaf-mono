# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in `apps/api`. Repository-wide notes are in the root `CLAUDE.md`; endpoints, auth and environment variables are documented in `README.md` next to this file.

## What this is

The Leaf REST API (workspace `api`, formerly the `leaf-nest` repository): NestJS 12 with TypeORM on SQLite (`better-sqlite3`). The web app in `../web` is its only client. Production runs in Docker on the VPS behind Caddy (see "Deployment" in the root `CLAUDE.md`).

## Commands

Run from `apps/api`, or from the root with `-w api`:

```bash
npm run start:dev      # watch mode on http://localhost:3000 (needs .env, see README)
npm run build          # nest build to dist/
npm test               # the Jest suite (e2e only, see below)
NODE_OPTIONS=--experimental-vm-modules npx jest test/plants.e2e-spec.ts   # one file
```

Jest does not type-check (ts-jest with `isolatedModules`) and `nest build` skips `test/`; `npm run typecheck` at the root type-checks `src` and `test` together.

## Request flow

- `src/configure-app.ts` holds everything set on the app instance (CORS for any origin, static files, Swagger). `main.ts` and the tests both call it, so the tests run against the production setup.
- Auth is `ApiKeyGuard`, applied per controller with `@UseGuards(ApiKeyGuard)`, not globally: that is what leaves `/static/` and the Swagger UI at `/api` open. A new controller needs `@UseGuards(ApiKeyGuard)` and `@ApiSecurity("apiKey")` (the latter for Swagger's "Authorize" button), or it is public and undocumented.
- There is no global validation pipe. Each `@Body()` validates against a schema from `@leaf/shared` with `new ZodValidationPipe(schema)` (`src/validation/`); a `@Body()` without it is not validated at all. Route parameters use Nest's pipes (`ParseIntPipe`).
- Swagger request and response schemas come from the same Zod schemas (`src/plants/plants.openapi.ts`), passed to `@ApiBody`/`@ApiOkResponse`/`@ApiCreatedResponse`. There is no Swagger compiler plugin and no DTO classes; `Plant` in `src/plants/entities/` is only the database row.
- `PlantsService` turns `lastWatered` strings into `Date`s before saving, so every response (write or read) serializes them with `toISOString()`, which is what the shared response schema requires.

## Database

- The file is `DATABASE_PATH` (default `plants.db` in the working directory). In Docker it is `/app/data/plants.db` on the `leaf-nest_db` volume, which holds the live data.
- `synchronize: true` is on, against a production database that already exists. `test/existing-database.e2e-spec.ts` builds a file with the production schema from before the `wateringIntervalDays` column, plus rows, and pins exactly what booting changes: that one column, nothing else, every row kept. Any change to the entity changes the production schema on the next deploy: keep that test passing, extend it for the change, and back up the volume before deploying. On SQLite, synchronize adds a column by rebuilding the table (copy, drop, rename), which keeps the rows but restarts the autoincrement sequence from the highest id.
- Dates are stored as UTC text, `YYYY-MM-DD HH:MM:SS.mmm`; `test/dates.e2e-spec.ts` pins the storage format and runs in a non-UTC time zone (`TZ=Asia/Kolkata`, set in `jest.config.cjs`) so a local-time mix-up fails instead of passing by accident.

## Images

- `POST /plants/:id/image` (multer, memory storage, jpg/jpeg/png/gif, 10 MB) writes `static/plant_<id>_<timestamp><ext>`, saves `imagePath`, responds, and only then compresses the file through TinyPNG in the background (`.tmp` file renamed over the original; on failure the raw upload stays and the error is logged).
- `imagePath` is set only by the upload; clients cannot send it. Replacing an image or deleting a plant deletes the old file, but `removeImage` only ever deletes a file directly inside `static/`, whatever the row says.
- Uploads are written relative to `process.cwd()/static`, while static files are served from `__dirname/../static`. Both resolve to `apps/api/static` only when the process runs from `apps/api` (the npm scripts do; in Docker both are `/app/static`, the `leaf-nest_uploads` volume). The tests assert the working directory.

## Tests

All tests are HTTP-level e2e tests in `test/*.e2e-spec.ts`; there are no unit tests.

- `useTestApp()` (`test/support/app.ts`) boots the real `AppModule` with `configureApp` once per test file and refuses to run against anything but a temporary database. One app per file: `AppModule` reads `DATABASE_PATH` when it is imported, and `test/support/env.ts` (Jest `setupFiles`) sets a fresh one, plus fake API keys, for every file.
- `tinify` is replaced by `test/support/tinify-mock.ts` (`moduleNameMapper`), so no request ever reaches TinyPNG.
- Uploads land in the real `static/`; register every file a test creates with `ctx.trackUpload(imagePath)` so it is removed afterwards.
- `expectPlant` / `expectPlantList` (`test/support/contract.ts`) check a response against the shared schema the web app enforces. Use them for any new endpoint that returns plants; `test/contract.e2e-spec.ts` covers the existing ones.
