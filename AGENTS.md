# AGENTS.md — hillview-assets-web

## 1. What this repo is

The equipment checkout kiosk at **assets.hillview.tv**: a student scans their ID card, scans the gear they're taking, picks on- or off-campus, and is done. `/seeker` is the admin lookup: scan any asset to see who has it, its last 10 checkouts, and force a check-in.

It replaced the Angular 19 app `aidenappl/hillviewAssets` (retired) in October 2026, with full feature parity. It is **public and unauthenticated**, as the Angular kiosk was. It owns no data: everything comes from `hillviewAssetsAPI` (assets, checkouts) and `hillviewCoreAPI` (student type-ahead), called **server-side** through this app's `/api` routes.

The team dashboard (team.hillview.tv/team/dashboard/assets) is the back-office for the same data and is separate; this repo does not replace it.

## 2. Stack & dependencies

- Next.js 16 (**App Router**), React 19, Tailwind CSS v4, TypeScript strict, axios, dayjs, `@aidenappleby/monitor-js`
- Node 24 (Docker `node:24-alpine`), `output: "standalone"`
- Font: Inter via `next/font/google` (the Angular kiosk's font)
- Telemetry: `@aidenappleby/monitor-js` ^1.2.1 → Monitor zone **hillview** (§6)

## 3. Project structure

```
hillview-assets-web/
  src/app/
    page.tsx                   # / → redirect /pos
    pos/                       # the 4-step checkout kiosk (PosKiosk.tsx holds all its state)
    seeker/                    # admin lookup + force check-in (Seeker.tsx)
    not-found.tsx, error.tsx, global-error.tsx
    api/health/                # Docker HEALTHCHECK
    api/monitor/               # browser telemetry relay
    api/users/[tag]            # GET student by card ID      → assets read/userByTag
    api/users/search           # GET ?q= type-ahead (top 5)   → core list/mobileUsers
    api/assets/[tag]           # GET asset by tag             → assets read/assetByTag
    api/assets/[tag]/history   # GET last 10 checkouts        → assets read/assetCheckoutHistory
    api/checkout               # POST a whole cart; per-asset results → assets /checkout ×N
    api/checkin                # POST {asset_id, source: pos|seeker}  → assets /checkin
  src/components/              # Button, Field, AssetCard, StatusPill, NotesOverlay, Spinner
  src/components/pos/          # StepIndicator, StepPanel, CartList, LocationSelect
  src/lib/upstream.ts          # server-side client for api.hillview.tv; one Monitor event per call
  src/lib/respond.ts           # standard {success,data}/{success:false,error…} envelope, tag sanitising
  src/lib/monitor-*.ts         # shared with the sibling Hillview web repos — keep in step
  src/services/                # api.service (fetchApi), assets.service (req*), monitor.service, sound.service
  src/types/                   # API shapes (match the Go json tags) + ApiResponse
  public/                      # favicons, logo, sounds/alert.wav
  Dockerfile                   # node:24-alpine build → standalone runner as uid 1001, HEALTHCHECK /api/health
  .github/workflows/push-to-registry.yml   # main → registry.appleby.cloud → Lattice redeploy
```

## 4. Running, building & testing

```bash
dev            # next dev (http://localhost:3000)
dev build      # next build
dev check      # lint + prettier --check + tsc --noEmit
```

No `.env` is needed locally: the API routes default to `https://api.hillview.tv`. ⚠️ That is **production data** — scanning and checking out locally writes real checkouts.

| Variable             | Kind    | Purpose                                                                                                                    |
| -------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `HILLVIEW_API_URL`   | runtime | Base of the Hillview APIs (default `https://api.hillview.tv`); point at a local API stack to test writes safely             |
| `MONITOR_INGEST_URL` | runtime | Monitor ingest, `https://hillview-monitor-api.appleby.cloud/v1/events`. Unset = telemetry discarded (logged once a minute) |
| `MONITOR_API_KEY`    | runtime | Ingest-scoped key minted on the **hillview** zone; server-side only                                                        |
| `MONITOR_ENV`        | runtime | Event `env` (default `production`)                                                                                         |

There are no `NEXT_PUBLIC_*` variables: the browser only ever calls its own origin.

## 5. How code is written here

- **The browser never calls api.hillview.tv.** Add a route under `src/app/api/` that calls `upstream()` from `lib/upstream.ts`, and a `req*` function in `services/assets.service.ts`. Pass `upstream()` the route *pattern* (`"read/assetByTag"`), never a URL with a tag in it, so events group by route.
- Routes answer with `ok()` / `fail()` from `lib/respond.ts`; user-facing text goes in `error_message`. Sanitise scanned values with `cleanTag()`.
- Data fetching is imperative (`useState` + `req*` calls); no SWR/React Query, no Redux (the kiosk's state lives in `PosKiosk.tsx`).
- The kiosk is keyboard- and scanner-driven: keep autofocus moving with the step, and keep the shortcuts working (POS: `\` back a step, Ctrl+S → seeker; seeker: `c` check in, `b` → POS).
- `window.alert`/`confirm` are deliberate — they are the Angular kiosk's UX and work with a scanner gun. Keep the message texts.
- Components are hand-built Tailwind; colours are the `@theme` tokens in `globals.css` (`brand`, `ink`, `muted`, `line`, …).

## 6. Domain & architecture

**Request flow:** Cloudflare (proxied, `hillview.tv` zone) → NPM proxy host → worker-5 `10.15.10.79:3013` → Next.js standalone server → (server-side) `api.hillview.tv`.

**Checkout flow:** student (`read/userByTag`, by `users.nfc_identifier`) → cart of assets (`read/assetByTag`, by `assets.identifier`) → on/off-campus → `POST /api/checkout`, which calls the assets API once per asset **in order** and returns a result per asset. The kiosk only reports "All Set" for what succeeded and lists anything that failed.

- Asset `status.id === 1` is "Active"; anything else is a warning (alert sound on scan, confirm before checkout, notes overlay).
- An asset already checked out to *this* student (`active_tab.associated_user === student.id`) shows **Check In** in the cart, so a student can return gear at the kiosk. Checked out to anyone else = "Unavailable" and blocks checkout.
- Off-campus return dates are sent as **local midnight in the kiosk's timezone**. On-campus checkouts send no return date (the API stores its zero time), as the Angular kiosk did.
- Seeker check-ins carry the note `checked in by admin`.

### Fixed vs. the Angular kiosk

1. Return dates were recorded a month late (1-based month passed to `new Date`).
2. Checkouts were fired in an un-awaited `forEach`, so "All Set" showed before they finished and failures were silent.
3. "Pending Check In" compared `active_tab.user.identifier`, which the API never sends, so students could never return gear at the kiosk.
4. Picking a name from the type-ahead filled in `identifier` (undefined on mobile users) instead of `nfc_identifier`.

### Monitor telemetry

Service **`hillview-assets-web`**, zone **`hillview`** (Lattice stack 37). Server-side events ship directly from the container; browser events go through `/api/monitor`. Unlike the sibling web apps this one also records business events. Student IDs, names and notes are never put in event data.

| Event                                         | Level | Meaning                                                                                                            |
| --------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------ |
| `assets.api.request`                          | info  | one call to a Hillview API: `endpoint` (route pattern), `method`, `status_code`, `duration_ms`                     |
| `assets.api.error`                            | error | the API answered 5xx                                                                                               |
| `assets.api.unreachable`                      | error | the API timed out or the connection failed                                                                         |
| `assets.checkout`                             | info  | one asset checked out: `asset_id`, `offsite`, `expected_in`; `user_id` = student id                                |
| `assets.checkout.failed`                      | error | one asset's checkout was refused or failed                                                                         |
| `assets.checkout.partial`                     | warn  | a cart where some, not all, assets failed                                                                          |
| `assets.checkin` / `assets.checkin.failed`    | info / error | a check-in; `source` is `pos` (student) or `seeker` (admin)                                                 |
| `assets.lookup.not_found`                     | warn  | a scanned tag matched nothing (`kind`: asset with `tag`, or user without) — at most once a minute per tag          |
| `assets.cart.warning_scanned`                 | info  | (browser) a warning-status asset was scanned                                                                       |
| `assets.cart.warning_override`                | info  | (browser) the student confirmed past the warning prompt                                                            |
| `server.request.error`                        | error | a server render / API route threw (`instrumentation.ts`)                                                           |
| `client.error.boundary / client.error.global` | error | a render error reached an error boundary                                                                           |
| `assets.pos.unhandled`, uncaught errors       | error | browser-side failures                                                                                              |
| `monitor.relay.rejected`                      | warn  | the relay refused a browser batch                                                                                  |

## 7. Ecosystem & related repos

- **Calls:** hillviewAssetsAPI (`/assets/v1.1`), hillviewCoreAPI (`/core/v1.1/list/mobileUsers`), both server-side.
- **Siblings:** hillview-tv-web (hillview.tv), hillview-team-web (team.hillview.tv), hillview-live-web (watch.hillview.tv) — same Dockerfile, CI and Monitor wiring.
- **Replaces:** `aidenappl/hillviewAssets` (Angular, retired — do not redeploy).
- **Monitor:** zone `hillview`; agents query it with `mcp__monitor_hillview__*`.

## 8. Operations

- **Lattice stack 38 "Hillview Web"** on worker-5 (id 8, `10.15.10.79`), container `hillview-assets-web`, host port `3013`. Stack env: `MONITOR_HILLVIEW_INGEST_URL` / `MONITOR_HILLVIEW_INGEST_KEY`.
- **CI:** push to `main` → `push-to-registry.yml`: registry credentials from Keyring (token `hillview-web-ci`, via `aidenappl/keyring-actions`), build on the shared `lattice-builder`, push `registry.appleby.cloud/hillview-assets-web:latest`, then `LATTICE_DEPLOY_URL?container=hillview-assets-web`. GitHub secrets: `KEYRING_URL`, `KEYRING_ACCESS_KEY_ID`, `KEYRING_SECRET_ACCESS_KEY`, `LATTICE_DEPLOY_URL`.
- Env or compose changes need a **stack Deploy** in Lattice; a CI container redeploy reuses the old config.
- **Edge:** Cloudflare proxied A record `assets` → NPM proxy host → `10.15.10.79:3013`, cert 68 (`*.hillview.tv`). The old Cloudflare redirect rule (`assets.` → team dashboard) is removed.
- **Health:** `GET /api/health`. **Errors:** Monitor zone hillview, `service: hillview-assets-web`. **Logs:** `lattice_get_container_logs`.
- **Every lookup 502s:** check `hillview-assets-api` in Monitor first — its `DATABASE_DSN` must point at `hillview_assets` (stack 19's `${ASSET_DATABASE_DSN}`), not `hillviewtv`.

## 9. Rules & guardrails

- Never call api.hillview.tv from the browser, and never add `NEXT_PUBLIC_` API URLs — route through `/api`.
- Never expose `MONITOR_API_KEY` to the browser.
- Never put student IDs, names or notes in Monitor event data.
- Don't proxy the assets API's `create/*` routes — the kiosk is public.
- Keep `lib/monitor-relay.ts` / `lib/monitor-server.ts` in step with the sibling Hillview web repos.
- Local dev hits production data: don't complete checkouts locally unless you mean to.

## 10. Verification

```bash
npx tsc --noEmit
npm run lint
npx prettier --check src
npx next build
```

There is no PR CI here: run these yourself. For UI changes, tophat `/pos` and `/seeker` with Vantage.

## 11. Keeping this file updated

Any change to structure, stack, commands, conventions, routes, env vars, events or deployment updates this file (and `README.md` where setup or role changed) in the same change.
