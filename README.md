# hillview-assets-web

The HillviewTV equipment checkout kiosk at assets.hillview.tv.

> **Hillview platform** · Next.js app · `assets.hillview.tv` (Lattice stack 38)

---

## Overview

Students scan their ID card and the gear they're taking, choose on- or off-campus, and they're checked out; gear they already have can be checked back in from the cart. `/seeker` is the admin lookup: who has an asset, its recent history, and a forced check-in. Public, keyboard- and barcode-scanner-driven.

## Role in the Hillview ecosystem

Replaces the retired Angular app `hillviewAssets`. Reads and writes go through this app's own `/api` routes to `hillviewAssetsAPI` and `hillviewCoreAPI` at `api.hillview.tv`. Telemetry goes to Monitor zone `hillview` as `hillview-assets-web`.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · axios · dayjs · monitor-js · Docker on Lattice

## Getting started

### Prerequisites

- Node 24
- The `dev` CLI (optional)

### Setup

```bash
npm install
dev            # or: npm run dev
```

No env file is required. ⚠️ Locally the API routes talk to **production** `api.hillview.tv` — set `HILLVIEW_API_URL` to test writes against something else.

## Development

| Command     | What it does                         |
| ----------- | ------------------------------------ |
| `dev`       | Start the dev server                 |
| `dev build` | Production build                     |
| `dev check` | ESLint + Prettier check + `tsc`      |
| `dev lint`  | ESLint                               |
| `dev format`| Prettier write                       |

## Project structure

```
src/app/pos       # checkout kiosk
src/app/seeker    # admin lookup
src/app/api       # server-side proxy to the Hillview APIs, health, telemetry relay
src/components    # UI
src/lib           # upstream client, response envelope, Monitor
src/services      # browser API + Monitor services
```

## Deployment

Push to `main` → GitHub Actions builds `registry.appleby.cloud/hillview-assets-web:latest` and redeploys the `hillview-assets-web` container on Lattice stack 38 (worker-5, port 3013). Env/compose changes need a stack Deploy.

## Contributing & further reading

- [AGENTS.md](AGENTS.md) — conventions, architecture, Monitor events, operations
- Related: `hillviewAssetsAPI`, `hillviewCoreAPI`, `hillview-team-web`, `hillview-live-web`
