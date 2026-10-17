# leaf-ng-nest-mono

Leaf tracks when houseplants were last watered. This repository holds both halves of it:

| Path       | Workspace | What it is                                                   |
| ---------- | --------- | ------------------------------------------------------------ |
| `apps/web` | `web`     | Angular 22 PWA (formerly the `leaf-ng` repository)           |
| `apps/api` | `api`     | NestJS REST API with SQLite (formerly the `leaf-nest` repository) |
| `packages/shared` | `@leaf/shared` | The API contract as Zod schemas: the API validates requests with it, the web app validates responses |

The history of both original repositories is preserved. Files were moved into `apps/` in one commit each, so use `git log --follow <file>` to see history from before the move.

## Setup

Requires Node.js 24. The repository uses npm workspaces: dependencies for both apps are installed once, at the root, from a single `package-lock.json`.

```bash
npm install
cp apps/api/.env.example apps/api/.env   # then set LEAF_API_KEY and TINIFY_API_KEY
```

## Commands

Run from the repository root:

| Command             | What it does                                     |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Everything for local development: shared package watcher, API on http://localhost:3000, web app on http://localhost:4200 |
| `npm run dev:web`   | Angular dev server on http://localhost:4200      |
| `npm run dev:api`   | API in watch mode on http://localhost:3000       |
| `npm run dev:shared` | Rebuild `@leaf/shared` whenever its source changes |
| `npm run build`     | Build the shared package, then both apps (`build:shared` / `build:web` / `build:api` for one) |
| `npm test`          | API test suite (the web app has no tests)        |
| `npm run typecheck` | Type-check the API, including its tests          |
| `npm run lint`      | ESLint over the whole repository (`lint:fix` to autofix) |
| `npm run format`    | Prettier over the whole repository (`format:check` to verify) |

Any other script of an app runs with `-w <workspace>`, e.g. `npm run start:prod -w api`, or from inside the app's folder.

Both apps share one ESLint and one Prettier configuration at the root: 4-space indentation and double quotes everywhere.

In development the web app talks to the local API (its dev server proxies `/plants` and `/static` to port 3000), so `npm run dev` needs `apps/api/.env`; placeholder values are fine unless you upload images. To work on the web app against the deployed API instead, run `npm run start:vps -w web`. Production builds always use the deployed API.

GitHub Actions (`.github/workflows/ci.yml`) runs the format check, lint, type check, build and tests on every push to `main` and on pull requests.

## More

- `apps/api/README.md`: API endpoints, environment variables, Docker
- `apps/web/CLAUDE.md`: frontend architecture, theming, PWA and deployment notes
- `apps/api/CLAUDE.md`: API request flow, database, images and test setup
