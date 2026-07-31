# Contributing to LifeOS

Thanks for your interest! LifeOS is a self-hosted, single-admin personal tracker — small in scope on purpose. PRs and issues are welcome; please read this first to save us both time.

## Scope — what's in / what's out

**In scope** (PRs likely to be accepted):

- Bug fixes (auth, sync, parsing, UI regressions)
- Performance & a11y improvements
- New exercise dataset translations / corrections
- New `lib/ai/prompts.ts` improvements (better food/plan/program prompts)
- Documentation, screenshots, deployment guides for other PaaS (Railway, Fly, Render, Hetzner Coolify, etc.)
- Additional fal.ai endpoint integrations (e.g. swapping the default model, adding a new vision pipeline)
- New chart types in `/analysis`
- Whoop sync edge cases

**Out of scope** (please open an issue / discussion first; will likely be declined as a PR):

- Multi-tenant / multi-user auth — LifeOS is intentionally single-admin. If you need this, fork it.
- Replacing fal.ai with another AI provider at the framework level. (Adding a *configurable* alternative behind the same `chat()` / `vision()` interface is fine; ripping fal out isn't.)
- Switching the database away from Postgres.
- Mobile native apps (iOS/Android shells). The PWA is intentionally web-first.
- Major UI redesigns away from the Nothing-design aesthetic.

If unsure, **open an issue before writing code**. Saves rejection cycles.

## Dev setup

```bash
git clone https://github.com/egebese/lifeos.git
cd lifeos

cp .env.example .env
# Fill in SESSION_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD, FAL_KEY

docker compose up -d db
pnpm install
pnpm db:migrate
pnpm bootstrap:admin
pnpm seed:exercises
pnpm dev
```

You'll need a [fal.ai](https://fal.ai/dashboard/keys) key to test any AI feature. The free trial credits are enough for development — every call gets logged to the `ai_messages` table so you can audit usage.

## Code conventions

- **TypeScript strict.** No `any` unless absolutely necessary (and comment why).
- **Server Components by default.** Drop to `"use client"` only when you need state, effects, or browser APIs.
- **Drizzle for all DB access.** No raw SQL except in migrations.
- **Zod schemas at API boundaries.** Look at `lib/ai/schemas.ts` for the pattern.
- **No new env vars without a default + `.env.example` update.**
- **AI calls go through `lib/ai/client.ts`.** Don't call `@fal-ai/client` directly from route handlers — the wrapper logs cost and errors to `ai_messages`.
- **Mobile-first.** Test at 375px width before desktop. Use the existing `components/nothing/*` primitives where possible.

## Before you push

```bash
pnpm lint
pnpm typecheck
pnpm build
```

All three must pass. CI runs the same on PRs.

## Commit / PR style

- One concern per PR. A bug fix + a refactor + a new feature = three PRs.
- Commit messages: imperative present tense — `add voice transcription endpoint`, not `added` / `adds`.
- PR description: what changed, why, and **how you tested it** (screenshots for UI, curl/log snippets for API).
- If you touched a fal.ai endpoint, mention the cost impact (rough $/call) in the PR.

## Reporting bugs

Open an issue with:

1. What you did (step-by-step).
2. What you expected.
3. What actually happened.
4. Environment: Node version, deploy target (Docker/Coolify/local), browser if UI.
5. Relevant logs — `docker compose logs web` is your friend.

**Do not include `FAL_KEY`, session cookies, or DB connection strings** in issues. Redact them.

## Reporting security issues

See [SECURITY.md](SECURITY.md). **Do not** open a public issue for security.

## License

By contributing you agree your contributions are MIT-licensed under the same terms as the rest of the project.
