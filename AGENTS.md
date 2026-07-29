# Agent Instructions

## Demo app (`demo/`)

The `demo/` directory is a standalone localStorage-backed clone deployed
separately to Vercel. It is already excluded from `tsconfig.json` and
`eslint.config.mjs`.

**Do NOT sync changes to `demo/` unless the user explicitly asks.**
Only modify files under `app/`, `components/`, `lib/`, etc. If the user
wants demo parity they will say so (e.g. "sync demo", "also update demo").

## Build checks

Before considering a task done, run:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

All three must pass.
