# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in `apps/web`. Repository-wide notes are in the root `CLAUDE.md`.

## What this is

Leaf (`leaf-ng`, workspace `web`) is an Angular 22 PWA for tracking when houseplants were last watered. It is a frontend only: all data lives in the NestJS REST API in `../api` (see `../api/README.md` for its endpoints).

## Commands

Dependencies are installed once at the repository root (`npm install` there). Run these from `apps/web`, or from the root with `-w web` (e.g. `npm run build -w web`):

```bash
npm start              # ng serve, development config, http://localhost:4200, against the local api
npm run start:vps      # the same, against the deployed api
npm run build          # production build to dist/leaf_ng (includes the service worker)
npm run watch          # development build in watch mode
npm run deploy         # build + publish to GitHub Pages with --base-href=/leaf-mono/
```

Linting and formatting run from the repository root for the whole repository: `npm run lint` (`lint:fix` to autofix) and `npm run format` (`format:check` to verify).

There is no test suite, on purpose: no spec files, no test runner installed, and no `test` target in `angular.json`. Verify changes with `npm run lint`, `npm run format:check` (both at the root), and `npm run build`.

## Backend and auth

- `environment.url` is the API base URL. `src/app/environments/environments.ts` (production builds, and the `development-vps` configuration behind `npm run start:vps`) points at the deployed VPS. The `development` configuration swaps in `environments.development.ts` through `fileReplacements` in `angular.json`: its empty `url` keeps requests on the dev server's origin, and `proxy.conf.json` forwards `/plants` and `/static` to the local api on port 3000 (`npm run dev` at the root starts both).
- Every request carries the API key as an `?apiKey=` query parameter (`PlantsService.buildUrl`). `AuthService.key` is a signal read from `localStorage['apiKey']`, or on first visit from `?apiKey=` in the page URL (then persisted). While it is null the root `App` shows the key form (`components/api-key`) instead of the router outlet. A 401 from any request calls `AuthService.reject()`, which forgets the key and brings the form back with an error; it does not show the error banner. `retryInterceptor` does not retry 4xx responses, so a refused key is reported at once.
- The `parse` step of the plants resource in `PlantsService` first checks the response against `PlantListSchema` from `@leaf/shared` (the contract the API is tested against); a mismatch fails the load, which shows the error banner, and logs the schema's issues to the console. It then prefixes the server-relative `imagePath` with `environment.url` and converts `lastWatered` strings to `Date`. The app's `Plant` (`models/plantInfo.model.ts`) is derived from the shared type with those two changes; request bodies are typed with the shared `CreatePlantRequest` / `UpdatePlantRequest`.

## Architecture

Standalone components, no NgModules, no state library. Zoneless change detection (`zone.js` is not installed), so anything a template shows must be a signal or change in response to a template event — a plain field mutated from a timer, promise or subscription will not re-render.

Components use the Angular 22 default change detection strategy, `OnPush` (none sets `changeDetection`), so a component only re-renders when a signal it reads changes, an event fires in its template, or an `@Input` gets a new reference. Keep state in signals and never mutate an `@Input` object in place; every load already hands out fresh `Plant` objects.

`PlantsService` (root-provided) is the single store and the only place that talks to HTTP. It exposes three signals — `plants`, `loading`, `error` — and components read them directly in templates. The data flow is deliberately simple:

- The list is an `httpResource` on `GET /plants`. Its URL function returns `undefined` until `AuthService` has resolved the API key, so no request goes out before then; `loading` covers that wait as well as the request itself, which `PlantDetails` relies on to avoid redirecting home too early.
- Retries are not in the service: `retryInterceptor` (`src/app/interceptors/`) retries every `GET` 5 times, 1s apart. Mutations are never retried.
- Every mutation (`addPlant`, `renamePlant`, `waterPlant`, `setWateringInterval`, `deletePlant`, `updatePlantImage`) is a plain `HttpClient` call passed to the private `mutate()` helper, which on success reloads the resource and on failure sets `error`, and returns a `Promise<boolean>` of whether it succeeded so a component can close a dialog or confirm with a toast. There are no optimistic updates and no per-plant fetch; new mutations should follow the same path. `waterPlant` also shows the "Watered … / Undo" toast itself; Undo writes back the previous date.
- The list is reloaded, and `PlantsService.now` (the "today" every watering status is computed against) refreshed, whenever the page becomes visible again: an installed app can sit in the background for days.
- `plants` and `error` are `linkedSignal`s over the resource: `plants` keeps the last loaded list while reloading and after a failed reload; `error` follows the load status but is also set by failed mutations and cleared by the user.
- `error` is rendered as a dismissible banner with "Try again" in the root `App` template, so components do not handle request errors themselves. Confirmations go through `ToastService` (one toast at a time, optional action), also rendered by `App`.

Routes (`app.routes.ts`): `''` → `PlantsOverview`, `plant/:id` → `PlantDetails`. `PlantDetails` does not fetch; it derives its plant with a `computed` over `service.plants()` and redirects home via an `effect` once loading finishes without a match.

Watering status is one plain function, `wateringStatus(plant, now)` in `models/watering-status.ts`, used by the home list (which sorts by it, thirstiest first) and the plant page. It counts calendar days in local time and returns the label ("Overdue by 2 days", "Watered yesterday"), a tone (`ok` / `soon` / `due`, the `.tone-*` classes that set `--tone`), the level (1 just watered → 0 due; it fills the bar along the foot of a plant's photo on the home grid) and `needsWater`. A plant without `wateringIntervalDays` uses a 10-day interval but is labelled by days since watering instead of a due date. Dates sent to the API are full ISO timestamps: now, or midday local time for a day picked in the date input; `toDateInputValue` gives the local date for date inputs (`toISOString` would give the UTC one).

Photos: people recognise a plant by its photo, not its name, so the home screen is a two-column grid of square photo cards (`PlantQuickInfo`, `.plant-card*` in `styles.css`) with the name and status as a caption, a round droplet button over the photo's corner (a check once watered today) and the level bar. Keep the photo the largest thing on a card. `PlantImage` (plant page only) shows the chosen photo at once, re-encodes it with `utils/shrink-image.ts` (JPEG, at most 1200px, named `photo.jpg`, which also gets past the API's lowercase-extension check) and keeps the preview until the reloaded plant points at the new file. Dialogs are native `<dialog>` elements opened with `showModal()`; `closedby="any"` closes them on a backdrop tap where the browser supports it, Escape everywhere. Icons are the `app-icon` component (`components/icon`), always decorative.

## Styling and theming

- Almost all CSS is global in `src/styles.css`; component stylesheets are tiny and several components have none. The production build errors on any component stylesheet over 8kB (warns at 4kB), so shared styles belong in `styles.css`.
- Colors are CSS custom properties on `:root`. Dark values are defined twice and must be kept in sync: once under `@media (prefers-color-scheme: dark)` for `:root:not([data-theme="light"])`, and once for `:root[data-theme="dark"]`. Fern green (`--primary`) is the app's color, water blue (`--water`) marks anything that logs a watering, and status colors (`--tone-*`) always come with words. Every pair used for text passes WCAG AA (4.5:1) in both themes; check new ones.
- Every `<button>` starts unstyled and takes one class: `primary-button`, `water-button`, `tonal-button`, `danger-button`, `text-button`, `danger-text-button`, `icon-button` (or a one-off like `water-chip`, `fab`). Tap targets are at least 44px (2.75rem). Hover styles sit under `@media (hover: hover)` so they do not stick on touch screens.
- The layout is phone-first: a sticky `.top-bar` and one centered `.page` column, padded with `env(safe-area-inset-*)` (the viewport has `viewport-fit=cover`).
- The `theme-color` meta tags (the status bar) are set to each theme's `--bg`: per OS scheme in `index.html`, then by `ThemeService` and the inline script for a chosen theme. Changing `--bg` means changing those values too.
- `ThemeService` follows the OS preference until the user toggles, then stores the override in `localStorage['theme']` and sets `data-theme` on `<html>`. An inline script in `src/index.html` applies the stored theme before Angular boots to avoid a flash; changes to the storage key or attribute must be made in both places.

## PWA / deployment

`InstallService` listens for the Chromium-only `beforeinstallprompt` event, and the home screen (`PlantsOverview`) shows an install tip below the list while one is pending and the user has not dismissed it (`localStorage['installDismissed']`). iOS never fires the event in any browser, so there the same tip shows the manual steps instead (Share → "Add to Home Screen") unless the app is already running standalone. Other browsers that never fire it (desktop Safari, Firefox) simply show no tip.

The service worker (`ngsw-config.json`) is enabled only in production builds (`!isDevMode()`), so caching behavior cannot be reproduced under `npm start`. The app is served from the `/leaf-mono/` sub-path on GitHub Pages, so asset and manifest paths must stay relative (no leading `/`).

`npm run deploy` publishes to the `gh-pages` branch of this repository (`Simply56/leaf-mono`), served at `https://simply56.github.io/leaf-mono/`.

## Conventions

- Formatting and linting are repository-wide (see the root `CLAUDE.md`): Prettier with 4-space indentation and double quotes; HTML uses Prettier's `angular` parser.
- Naming: files and classes have no `.component`/`Component` suffix (`plants-overview.ts` exports `PlantsOverview`); services are `*-service.ts`, pipes `*-pipe.ts` (there are none at the moment).
- Templates use the built-in control flow (`@if`, `@for`, `@let`), not structural directives.
