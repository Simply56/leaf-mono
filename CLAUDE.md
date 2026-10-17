# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

An npm workspaces monorepo with two apps and no shared code (yet):

- `apps/web` (workspace `web`): Angular 22 PWA. Its own `CLAUDE.md` covers architecture and conventions; read it before working there.
- `apps/api` (workspace `api`): NestJS 12 REST API on SQLite. `apps/api/README.md` documents endpoints, auth and environment variables.

There is no monorepo tool (no Nx, Turborepo); that is deliberate. Each app keeps its own CLI (`ng`, `nest`) and build config; linting and formatting are shared.

## Commands

`npm install` runs at the root only; there is one `package-lock.json`, at the root. To add a dependency to an app, run `npm install <pkg> -w web` (or `-w api`) at the root, never `npm install` inside an app folder. Repo-wide dev tools (ESLint, Prettier) are root `devDependencies`.

Root scripts: `npm run dev:web`, `npm run dev:api`, `npm run build` (both apps), `npm test` (api only; the web app has no tests on purpose), and the repo-wide `npm run lint` / `lint:fix` and `npm run format` / `format:check`. Any other app script runs from the root with `-w <workspace>`, or from inside the app folder.

Verify a change with `npm run lint` and `npm run format:check`, plus the build (and for the api, the tests) of the app it touches.

## Linting and formatting

One configuration for the whole repository, at the root:

- Prettier (`.prettierrc.json`): 4-space indentation and **double quotes** everywhere; HTML templates use the `angular` parser. `.prettierignore` skips build output, the lockfile and Markdown.
- ESLint (`eslint.config.mjs`): `typescript-eslint`'s recommended rules on every `.ts` file in both apps.
- `.editorconfig` matches the Prettier settings for editors.

Commit formatting-only changes separately and add their hashes to `.git-blame-ignore-revs`.

## Things that span both apps

- The web app's `Plant` model (`apps/web/src/app/models/plantInfo.model.ts`) is a hand-written mirror of the API's response (`apps/api/src/plants/entities/plant.entity.ts`). A change to the API's response shape needs the matching change in the web app, including the `parse` step in `PlantsService`.
- Auth is a shared key sent as `?apiKey=`; the API checks it against `LEAF_API_KEY` in `apps/api/.env`.
- Native install scripts are allowed through `allowScripts` in the root `package.json` (npm ignores it in workspace manifests). `better-sqlite3` needs it.

## Deployment

Nothing in this repository deploys on its own, and nothing should be deployed without being asked.

- web: `npm run deploy -w web` publishes to the `gh-pages` branch of `Simply56/leaf_ng` (explicit `--repo`); the URL must not change because plant URLs are printed as QR codes.
- api: the production instance on the VPS still runs from a clone of the old `leaf-nest` repository, started and stopped by hand. The Docker image builds from the repository root (`apps/api/compose.yaml` sets the context).
