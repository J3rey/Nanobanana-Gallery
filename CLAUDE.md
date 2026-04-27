# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Package manager:** pnpm is preferred. In shell environments where pnpm is unavailable, use `npm run` as a drop-in replacement — all scripts are identical.

```powershell
npm run dev          # Start dev server (Express + Vite HMR, port 3000)
npm run build        # Build client (Vite → dist/public/) + server (esbuild → dist/index.js)
npm run start        # Run production server from dist/
npm run check        # TypeScript type checking (no emit)
npm run format       # Format with Prettier
npm run test         # Run Vitest tests
npm run db:push      # Run Drizzle migrations (generate + migrate)
```

Run a single test file:
```powershell
npx vitest run server/someFile.test.ts
```

**Shell environment:** PowerShell (Windows). Use the PowerShell tool, not Bash. `pnpm` is not on PATH — use `npm run` or `npx` instead.

## Architecture

**Stack:** React 19 + TypeScript frontend, Express + tRPC v11 backend, Drizzle ORM + MySQL, Google Gemini API for AI image generation.

**Package manager:** pnpm. Use pnpm for all installs.

### Directory Layout

```
client/src/
  pages/          # Home (upload), BatchConvert, Gallery, NotFound
  components/     # UI components (shadcn/ui + custom)
  contexts/       # GalleryContext (primary app state), ThemeContext
  hooks/          # Custom hooks
  lib/            # Utilities

server/
  _core/          # index.ts (entry), trpc.ts (router/middleware), context.ts,
                  # imageGeneration.ts, llm.ts, oauth.ts, cookies.ts, vite.ts
  geminiProxy.ts  # Proxies Gemini API requests from client
  routers.ts      # Aggregates all tRPC routers
  db.ts           # Drizzle database connection

shared/
  const.ts        # Global constants (cookie names, timeouts)
  types.ts        # Types shared between client and server

drizzle/
  schema.ts       # Database schema (users table)
  relations.ts    # Drizzle table relations
```

### Data Flow

1. **Client state** lives in `GalleryContext` — uploaded images, converted photos, and user API keys are persisted to `localStorage` as base64 data URLs (no external file storage).
2. **API layer** is tRPC, mounted at `/api/trpc`. The tRPC router is composed in `server/routers.ts` and initialized in `server/_core/trpc.ts`.
3. **Gemini proxy** (`server/geminiProxy.ts`) receives image generation/editing requests from the client, forwards them to Google Gemini using the user's API key (sent in request headers), and returns base64 images directly.
4. **Auth** uses OAuth + JWT session cookies managed in `server/_core/oauth.ts` and `server/_core/cookies.ts`.
5. **Database** (MySQL via Drizzle) currently stores user records. `DATABASE_URL` must be set in `.env`.

### Path Aliases

- `@/` → `client/src/`
- `@shared/` → `shared/`

### Key Design Decisions

- Images are never uploaded to a server or S3 — everything is base64 in localStorage.
- The user supplies their own Gemini API key via the UI; the backend proxies it without storing it.
- Client-side routing uses **Wouter** (not React Router).
- `vite.config.ts` contains a custom "Manus Debug Collector" plugin that logs browser console output to `.manus-logs/` — this is intentional, not dead code.

## Environment

Create a `.env` file at the project root with at minimum:

```
DATABASE_URL=mysql://user:password@host:port/dbname
```

The server listens on `PORT` if set, otherwise defaults to 3000 (or the next available port).

## Code Style

Prettier config (`.prettierrc`): 80-char line width, 2-space indentation, trailing commas, double quotes. Run `pnpm format` before committing.

TypeScript strict mode is enabled. Avoid `any`; prefer types defined in `shared/types.ts` for anything crossing the client/server boundary.
