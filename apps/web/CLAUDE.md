# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in `apps/web`. Repository-wide notes are in the root `CLAUDE.md`.

## What this is

Leaf (`leaf-ng`, workspace `web`) is an Angular 22 PWA for tracking when houseplants were last watered. It is a frontend only: all data lives in the NestJS REST API in `../api` (see `../api/README.md` for its endpoints).

## Commands

Dependencies are installed once at the repository root (`npm install` there). Run these from `apps/web`, or from the root with `-w web` (e.g. `npm run lint -w web`):

```bash
npm start              # ng serve, development config, http://localhost:4200
npm run build          # production build to dist/leaf_ng (includes the service worker)
npm run watch          # development build in watch mode
npm run lint           # eslint src   (lint:fix to autofix)
npm run format         # prettier --write on src  (format:check to verify)
npm run deploy         # build + publish to GitHub Pages with --base-href=/leaf_ng/
```

There is no test suite, on purpose: no spec files, no test runner installed, and no `test` target in `angular.json`. Verify changes with `npm run lint`, `npm run format:check`, and `npm run build`.

## Backend and auth

- `src/app/environments/environments.ts` holds a hardcoded `useVps` flag that picks the API base URL: the deployed VPS (`true`, the committed default) or the api from `apps/api` running locally at `http://127.0.0.1:3000` (`false`; start it with `npm run dev:api` at the root). There are no Angular `fileReplacements`; flip the flag by hand for local backend work and do not commit it flipped.
- Every request carries the API key as an `?apiKey=` query parameter (`PlantsService.buildUrl`). `AuthService.getApiKey()` resolves it in order: in-memory → `localStorage['apiKey']` → `?apiKey=` in the page URL (then persisted) → a blocking `window.prompt`. The resolved key is written onto the mutable `environment.apiKey`.
- `imagePath` from the API is server-relative; the `parse` step of the plants resource in `PlantsService` prefixes it with `environment.url` and converts `lastWatered` strings to `Date`.

## Architecture

Standalone components, no NgModules, no state library. Zoneless change detection (`zone.js` is not installed), so anything a template shows must be a signal or change in response to a template event — a plain field mutated from a timer, promise or subscription will not re-render.

Components use the Angular 22 default change detection strategy, `OnPush` (none sets `changeDetection`), so a component only re-renders when a signal it reads changes, an event fires in its template, or an `@Input` gets a new reference. Keep state in signals and never mutate an `@Input` object in place; every load already hands out fresh `Plant` objects.

`PlantsService` (root-provided) is the single store and the only place that talks to HTTP. It exposes three signals — `plants`, `loading`, `error` — and components read them directly in templates. The data flow is deliberately simple:

- The list is an `httpResource` on `GET /plants`. Its URL function returns `undefined` until `AuthService` has resolved the API key, so no request goes out before then; `loading` covers that wait as well as the request itself, which `PlantDetails` relies on to avoid redirecting home too early.
- Retries are not in the service: `retryInterceptor` (`src/app/interceptors/`) retries every `GET` 5 times, 1s apart. Mutations are never retried.
- Every mutation (`addPlant`, `renamePlant`, `waterPlant`, `deletePlant`, `updatePlantImage`) is a plain `HttpClient` call passed to the private `mutate()` helper, which on success reloads the resource and on failure sets `error`. There are no optimistic updates and no per-plant fetch; new mutations should follow the same path.
- `plants` and `error` are `linkedSignal`s over the resource: `plants` keeps the last loaded list while reloading and after a failed reload; `error` follows the load status but is also set by failed mutations and cleared by the user.
- `error` is rendered as a dismissible banner in the root `App` template, so components do not handle request errors themselves.

Routes (`app.routes.ts`): `''` → `PlantsOverview`, `plant/:id` → `PlantDetails`. `PlantDetails` does not fetch; it derives its plant with a `computed` over `service.plants()` and redirects home via an `effect` once loading finishes without a match. The detail page URL is what users encode into a QR code for the pot, so the `plant/:id` URL shape (and the `?apiKey=` bootstrap) must stay stable.

The "days since watered" display is two chained pipes: `computeWateredDaysAgo` (Date → whole days) then `valueToColor` (days → green-to-red `hsl()` over a 10-day scale, using the `--status-lightness` CSS variable so it works in both themes).

## Styling and theming

- Almost all CSS is global in `src/styles.css`; component stylesheets are tiny and several components have none. The production build errors on any component stylesheet over 8kB (warns at 4kB), so shared styles belong in `styles.css`.
- Colors are CSS custom properties on `:root`. Dark values are defined twice and must be kept in sync: once under `@media (prefers-color-scheme: dark)` for `:root:not([data-theme="light"])`, and once for `:root[data-theme="dark"]`.
- `ThemeService` follows the OS preference until the user toggles, then stores the override in `localStorage['theme']` and sets `data-theme` on `<html>`. An inline script in `src/index.html` applies the stored theme before Angular boots to avoid a flash; changes to the storage key or attribute must be made in both places.

## PWA / deployment

`InstallService` listens for the Chromium-only `beforeinstallprompt` event, and the root `App` template shows an install banner while one is pending and the user has not dismissed it (`localStorage['installDismissed']`). iOS never fires the event in any browser, so there the same banner shows the manual steps instead (Share → "Add to Home Screen") unless the app is already running standalone. Other browsers that never fire it (desktop Safari, Firefox) simply show no banner.

The service worker (`ngsw-config.json`) is enabled only in production builds (`!isDevMode()`), so caching behavior cannot be reproduced under `npm start`. The app is served from the `/leaf_ng/` sub-path on GitHub Pages, so asset and manifest paths must stay relative (no leading `/`).

`npm run deploy` publishes to the `gh-pages` branch of `Simply56/leaf_ng` through an explicit `--repo`, not to this repository's own remote. Keep it that way: deploying from another repository moves the site to a different URL and breaks every QR code already printed for a pot.

## Conventions

- 4-space indentation everywhere, single quotes in TypeScript (`.editorconfig`; Prettier picks it up). HTML is formatted with Prettier's `angular` parser.
- Naming: files and classes have no `.component`/`Component` suffix (`plants-overview.ts` exports `PlantsOverview`); services are `*-service.ts`, pipes `*-pipe.ts`.
- Templates use the built-in control flow (`@if`, `@for`, `@let`), not structural directives.
