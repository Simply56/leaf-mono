# leaf-ng-nest-mono

Leaf tracks when houseplants were last watered. This repository holds both halves of it:

| Path       | Workspace | What it is                                                   |
| ---------- | --------- | ------------------------------------------------------------ |
| `apps/web` | `web`     | Angular 22 PWA (formerly the `leaf-ng` repository)           |
| `apps/api` | `api`     | NestJS REST API with SQLite (formerly the `leaf-nest` repository) |

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
| `npm run dev:web`   | Angular dev server on http://localhost:4200      |
| `npm run dev:api`   | API in watch mode on http://localhost:3000       |
| `npm run build`     | Build both apps (`build:web` / `build:api` for one) |
| `npm test`          | API test suite (the web app has no tests)        |
| `npm run lint`      | ESLint over the whole repository (`lint:fix` to autofix) |
| `npm run format`    | Prettier over the whole repository (`format:check` to verify) |

Any other script of an app runs with `-w <workspace>`, e.g. `npm run start:prod -w api`, or from inside the app's folder.

Both apps share one ESLint and one Prettier configuration at the root: 4-space indentation and double quotes everywhere.

The web app talks to the deployed API by default. To use a local API, see "Backend and auth" in `apps/web/CLAUDE.md`.

## More

- `apps/api/README.md`: API endpoints, environment variables, Docker
- `apps/web/CLAUDE.md`: frontend architecture, theming, PWA and deployment notes
