# NanoBanana Gallery

A modern web app for batch photo conversion using the NanoBanana API, with an editable gallery experience and smooth drag-and-drop interactions.

## Overview

NanoBanana Gallery is built as a Vite-powered React application with TypeScript, Tailwind CSS, and a small Express server for production hosting.

Key capabilities:
- Batch upload multiple images
- Convert photos via the NanoBanana AI image generation endpoint
- View converted results in a scalable gallery grid
- Drag, reorder, add, and remove images
- Lightbox preview and grid-layout controls
- API key support for remote conversion calls

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Express
- Framer Motion
- @dnd-kit for drag-and-drop
- Wouter for routing
- Sonner for toast notifications

## Project Structure

- `client/` — React application source
- `server/` — Node/Express production server entrypoint
- `shared/` — shared constants and utilities
- `package.json` — scripts and dependencies
- `vite.config.ts` — Vite configuration
- `tsconfig.json` / `tsconfig.node.json` — TypeScript settings

## Installation

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

Open the app in your browser at the address printed by Vite.

## Build

```bash
pnpm build
```

This command builds the client app with Vite and bundles the production server entrypoint from `server/index.ts` into `dist/index.js`.

## Production Preview

```bash
pnpm preview
```

## Start Production Server

```bash
pnpm start
```

> If you're on Windows PowerShell and the script does not pick up `NODE_ENV`, use:
>
> ```powershell
> $env:NODE_ENV = 'production'; pnpm start
> ```

## API Key

The app includes an API key dialog to store your NanoBanana API key locally in the browser context. Conversions rely on the remote endpoint:

- `https://api.magichour.ai/api/v1/ai-image-generator/generate`

## Available Scripts

- `pnpm dev` — Start the Vite development server
- `pnpm build` — Build client and bundle server
- `pnpm start` — Run the production server
- `pnpm preview` — Preview the production build locally via Vite
- `pnpm check` — Run TypeScript type checks
- `pnpm format` — Format the repository with Prettier

## Notes

- The gallery page supports dynamic grid sizes from 2x2 to 5x5.
- The conversion page supports batch photo upload, prompts, progress tracking, and result transfer into the gallery.
- The app uses local object URLs for previewing uploaded images.

## License

MIT
