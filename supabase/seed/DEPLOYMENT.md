# EuroPass — Deployment Guide

This project consists of two separately deployed services:

| Service | Recommended host | What it does |
|---|---|---|
| **Frontend** (`artifacts/europass`) | Cloudflare Pages | Static React/Vite SPA |
| **API Server** (`artifacts/api-server`) | Railway · Render · Fly.io | Express REST API |

You also need a managed **PostgreSQL** database (Railway, Neon, Supabase, etc.).

---

## 1 — Database

Provision a PostgreSQL database and note the connection string:

```
postgresql://user:password@host:5432/europass
```

Run migrations (from the monorepo root):

```bash
pnpm --filter @workspace/db run push
```

Optionally seed:

```bash
pnpm --filter @workspace/db run seed
```

---

## 2 — API Server (Railway / Render / Fly.io)

### Build & start commands

| | Command |
|---|---|
| Install | `pnpm install --frozen-lockfile` |
| Build | `pnpm --filter @workspace/api-server run build` |
| Start | `pnpm --filter @workspace/api-server run start` |

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Port to listen on (set automatically by most hosts) |
| `CORS_ORIGIN` | Frontend URL(s), comma-separated — e.g. `https://europass.pages.dev` |
| `NODE_ENV` | Set to `production` |

---

## 3 — Frontend (Cloudflare Pages)

### Build settings in the Cloudflare Pages dashboard

| Setting | Value |
|---|---|
| Framework preset | None (manual) |
| Build command | `pnpm --filter @workspace/europass run build` |
| Build output directory | `artifacts/europass/dist/public` |
| Root directory | `/` (monorepo root) |
| Node version | 20 |

### Environment variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | Full URL of the deployed API server, no trailing slash |
| `NODE_ENV` | `production` |

The `_redirects` file in `artifacts/europass/public/` handles SPA routing automatically — no extra config needed.

---

## 4 — GitHub → Cloudflare Pages connection

1. Push this repo to GitHub.
2. In Cloudflare Pages → **Create application** → **Connect to Git** → select the repo.
3. Apply the build settings from the table above.
4. Add the environment variables.
5. Deploy — Cloudflare Pages will rebuild on every push to `main`.

---

## Local development

```bash
# Install dependencies
pnpm install

# Copy and fill in env vars
cp .env.example .env

# Start the API server
pnpm --filter @workspace/api-server run dev

# Start the frontend (in a second terminal)
pnpm --filter @workspace/europass run dev
```

For local development without Replit, set in your `.env`:

```
PORT=5173
# Leave VITE_API_URL unset — the dev server proxies /api automatically
```
