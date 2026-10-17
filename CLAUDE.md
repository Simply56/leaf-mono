# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

An npm workspaces monorepo with two apps and no shared code (yet):

- `apps/web` (workspace `web`): Angular 22 PWA. Its own `CLAUDE.md` covers architecture and conventions; read it before working there.
- `apps/api` (workspace `api`): NestJS 12 REST API on SQLite. `apps/api/README.md` documents endpoints, auth and environment variables.

There is no monorepo tool (no Nx, Turborepo); that is deliberate. Each app keeps its own CLI (`ng`, `nest`) and its own config files.

## Commands

`npm install` runs at the root only; there is one `package-lock.json`, at the root. To add a dependency to an app, run `npm install <pkg> -w web` (or `-w api`) at the root, never `npm install` inside an app folder.

Root shortcuts: `npm run dev:web`, `npm run dev:api`, `npm run build` (both apps), `npm run lint` (both apps), `npm test` (api only; the web app has no tests on purpose). Any app script runs from the root with `-w <workspace>`, or from inside the app folder.

Verify a change with the scripts of the app it touches:

- web: `npm run lint -w web`, `npm run format:check -w web`, `npm run build -w web`
- api: `npm test`, `npm run build -w api`, and `npx @biomejs/biome check` in `apps/api` (the api's `lint`/`format`/`check` scripts write fixes)

## Formatting differs per app

- web: ESLint + Prettier, 4 spaces, **single quotes** (`apps/web/.editorconfig`)
- api: Biome, 4 spaces, **double quotes** (`apps/api/biome.json`)

Match the app you are editing; do not reformat one to the other's style.

## Things that span both apps

- The web app's `Plant` model (`apps/web/src/app/models/plantInfo.model.ts`) is a hand-written mirror of the API's response (`apps/api/src/plants/entities/plant.entity.ts`). A change to the API's response shape needs the matching change in the web app, including the `parse` step in `PlantsService`.
- Auth is a shared key sent as `?apiKey=`; the API checks it against `LEAF_API_KEY` in `apps/api/.env`.
- Native install scripts are allowed through `allowScripts` in the root `package.json` (npm ignores it in workspace manifests). `better-sqlite3` needs it.

## Deployment

Nothing in this repository deploys on its own, and nothing should be deployed without being asked.

- web: `npm run deploy -w web` publishes to the `gh-pages` branch of `Simply56/leaf_ng` (explicit `--repo`); the URL must not change because plant URLs are printed as QR codes.
- api: the production instance on the VPS still runs from a clone of the old `leaf-nest` repository, started and stopped by hand. The Docker image builds from the repository root (`apps/api/compose.yaml` sets the context).
