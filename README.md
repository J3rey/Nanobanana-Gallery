# NanoBanana Gallery

A polished web app for photo management and AI-powered image conversion using Google Gemini.

NanoBanana Gallery lets you upload photos, generate or edit images with Gemini, and organize the results in a responsive gallery.

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
- `pnpm` as package manager

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Run the app in development:

```bash
pnpm dev
```

3. Build for production:

```bash
pnpm build
```

4. Start the production server:

```bash
pnpm start
```

## Available scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build the client app and bundle the server
- `pnpm start` - Run the production server from `dist`
- `pnpm check` - TypeScript type check
- `pnpm format` - Format files with Prettier
- `pnpm test` - Run Vitest
- `pnpm db:push` - Run Drizzle kit generate and migrate (database helper scripts)

## Gemini API key

This app requires a Google AI Studio (Gemini) API key to generate or edit images.

- Open the API key dialog in the app
- Paste your Gemini API key
- Verify and save the key
- The key is stored locally in the browser

The backend proxy sends requests to Gemini via `server/geminiProxy.ts`.

## Local development flow

1. Start `pnpm dev`
2. Open `http://localhost:4173` (or the port shown in the terminal)
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
