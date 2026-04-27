# PixelBoard

A polished web app for photo management and AI-powered image conversion using Google Gemini.

PixelBoard lets you upload photos, generate or edit images with Gemini, and organize the results in a responsive gallery.

## Features

- Batch image conversion with Gemini image generation/editing
- Local gallery storage in browser `localStorage`
- Gemini API key management with validation
- Mobile-friendly, glass-style UI built with React, Tailwind CSS, and Radix UI
- Client-side routing with Wouter
- Backend proxy server for Gemini requests using Express + tRPC

## What it includes

- `client/`: React + TypeScript front-end powered by Vite
- `server/`: Express server that serves the production build and proxies Gemini image requests
- `server/geminiProxy.ts`: Gemini API proxy and API-key validation logic
- `package.json`: scripts for development, build, and deployment

## Requirements

- Node.js 20+ recommended
- `pnpm` as package manager (or use `npx pnpm` if `pnpm` is not globally installed)

## Setup

1. Install dependencies:

```bash
npx pnpm install
```

2. Run the app in development:

```powershell
$env:NODE_ENV='development'
npx pnpm exec tsx watch server/_core/index.ts
```

3. Build for production:

```bash
npx pnpm build
```

4. Start the production server:

```bash
npx pnpm start
```

## Available scripts

- `npx pnpm dev` - Start development server with hot reload (may fail on Windows due to `NODE_ENV=...` shell syntax)
- `npx pnpm build` - Build the client app and bundle the server
- `npx pnpm start` - Run the production server from `dist`
- `npx pnpm check` - TypeScript type check
- `npx pnpm format` - Format files with Prettier
- `npx pnpm test` - Run Vitest
- `npx pnpm db:push` - Run Drizzle kit generate and migrate (database helper scripts)

## Gemini API key

This app requires a Google AI Studio (Gemini) API key to generate or edit images.

- Open the API key dialog in the app
- Paste your Gemini API key
- Verify and save the key
- The key is stored locally in the browser

The backend proxy sends requests to Gemini via `server/geminiProxy.ts`.

## Local development flow

1. Start PowerShell and run `$env:NODE_ENV='development'; npx pnpm exec tsx watch server/_core/index.ts`
2. Open `http://localhost:3000` (or the port shown in the terminal)
3. Add photos on the Home page
4. Set your Gemini API key using the dialog
5. Convert images on the Batch Convert page
6. Manage converted images in the Gallery page

## Notes

- The server is an Express app that serves the production client build and proxies Gemini image requests.
- Generated images are returned as base64 data URLs and displayed directly in the gallery.
- No external image storage is required.

## Project structure

- `client/src/` - front-end React app
- `client/src/pages/` - pages for home, convert, gallery, and not-found
- `client/src/components/` - reusable UI components
- `client/src/contexts/` - app state and gallery persistence logic
- `server/` - backend server and Gemini proxy router

## License

MIT
