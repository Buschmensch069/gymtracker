# Gym Tracker

Personal, offline-first gym workout tracker PWA. See `CLAUDE.md` for the
stack, data model, and project conventions.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

Deploys to Vercel. No environment variables or backend required — the app
is fully client-side with local IndexedDB storage via Dexie.
