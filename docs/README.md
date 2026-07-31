<div align="center">

# LifeOS

**Self-hosted personal life tracker — workouts, nutrition, Whoop, AI photo calories, AI diet planner.**

One OpenAI-compatible API key powers every AI feature in the app.

[**▸ Live demo**](https://lifeos-demo-nu.vercel.app)  ·  data stays in your browser, nothing is sent server-side

[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](../LICENSE)
![Node 20+](https://img.shields.io/badge/node-%E2%89%A520-black)
![Next.js 15](https://img.shields.io/badge/next.js-15-black)
![PostgreSQL 16](https://img.shields.io/badge/postgres-16-black)
![AI: OpenAI-compatible](https://img.shields.io/badge/AI-OpenAI--compatible-black)

![Dashboard](screenshots/dashboard.png)

</div>

> 🌐 **Languages:** English · [简体中文](../README.md)

## Screens

| | |
|---|---|
| ![Workouts](screenshots/workouts.png) | ![Food log](screenshots/food.png) |
| Workouts — log sets, rest timer, programs, 1RM tracking | Food log — manual or AI photo, daily macros vs target |
| ![Whoop](screenshots/whoop.png) | ![Programs](screenshots/programs.png) |
| Whoop — 30-day recovery / sleep / strain history | Programs — saved splits or AI-generated |

<details>
<summary>Mobile (the app is mobile-first)</summary>

| Dashboard | Food log |
|---|---|
| <img src="screenshots/mobile-dashboard.png" width="320" /> | <img src="screenshots/mobile-food.png" width="320" /> |

</details>


---

LifeOS is the self-hosted personal OS I built for myself: log every workout, every meal, every Whoop recovery score, and let one OpenAI-compatible AI provider handle the smart parts (photo-to-calories, meal planning, weekly insights, voice-to-meal transcription, workout program generation).

It is intentionally **single-admin**: one user, one Postgres database, one Docker container, one OpenAI-compatible API key. Deploy it on a $5 VPS, point a domain at it, and you own all your fitness/nutrition data. MIT licensed.

> The project is internally called `lifetracker` (package name, docker volumes, db name). The public/repo name is **LifeOS**.

## Why the AI layer is provider-agnostic

Every AI surface in this app — without exception — calls a single OpenAI-compatible `/chat/completions` endpoint. One base URL + API key, the entire feature set lights up. Models are configurable per usage (text / image / audio) from your Profile page, or via `OPENAI_*` env vars as a server fallback (default `gpt-4o-mini`):

| Feature | Endpoint | Model | What it does |
|---|---|---|---|
| **Food photo → macros** | `/chat/completions` (vision) | `OPENAI_IMAGE_MODEL` | Snap a meal, get kcal/protein/carbs/fat breakdown |
| **Free-form meal parser** | `/chat/completions` | `OPENAI_TEXT_MODEL` | "two eggs and toast" → structured macros |
| **Voice → meal log** | `/chat/completions` (`input_audio`) | `OPENAI_AUDIO_MODEL` | Record audio, transcribe + parse the meal from speech |
| **Meal planner (3–14 days)** | `/chat/completions` | `OPENAI_TEXT_MODEL` | Goal + preferences + pantry → full plan + shopping list |
| **Workout program generator** | `/chat/completions` | `OPENAI_TEXT_MODEL` | Goal/level/equipment → multi-day periodised program |
| **Weekly insights** | `/chat/completions` | `OPENAI_TEXT_MODEL` | Highlights / warnings / recommendations from 30d data |
| **Web-search augmentation** | `/chat/completions` (`:online` suffix) | same model, web variant | Up-to-date brand/portion lookups (OpenRouter endpoints only) |

**Why this matters as a self-hoster:**

- **Bring your own provider.** Point `OPENAI_BASE_URL` at any OpenAI-compatible endpoint — OpenAI, OpenRouter, Groq, a local Ollama/LM Studio server, anything that speaks `/chat/completions`. One key, one bill, every feature works.
- **Provider-agnostic routing.** Swap the default `OPENAI_TEXT_MODEL` for any other supported model (GPT, Llama, Gemini, Claude, etc.) by passing a different `model` string — no code changes required, and overridable per-user from the Profile page.
- **Every call is metered & logged.** `lib/ai/client.ts` records every prompt, response, model id, and cost (in cents) into the `ai_messages` table. You can audit and budget per-feature.
- **No vendor lock-in.** All AI calls go through one thin `fetch()` wrapper — no SDK dependency. Point it at a different base URL and you've switched providers.

Set `OPENAI_BASE_URL` + `OPENAI_API_KEY` in `.env` (or later from `/profile`), done.

## Features

| | |
|---|---|
| 🏋️ **Workouts** | 1,324 exercises (en/tr/zh) from the public `exercises-dataset`; create programs, log sets/reps/weight with RPE, rest timer, last-time overlay, Epley 1RM tracking |
| 🍳 **Food** | Manual log + AI photo estimate + voice transcription. Daily macros, kcal targets vs actuals |
| 🥗 **Plan & Shop** | AI-generated 3–14 day meal plans factoring goal, liked/disliked/allergy preferences, pantry inventory, and recently-eaten meals. Shopping list auto-subtracts pantry |
| ⌚ **Whoop** | OAuth2 connect, full sync (recovery, sleep, strain, workouts, body measurement), HMAC webhook, daily safety-net cron |
| 🧮 **Analysis** | Weight 90d · kcal 14d · recovery 30d · workout volume 30d. AI weekly insights |
| 🔐 **Auth** | Single admin, argon2id hash, sealed httpOnly cookie, 1-year expiry |
| 🎨 **UI** | Nothing-design aesthetic — Doto/Space Grotesk/Space Mono, OLED black, dot-matrix accents. Mobile-first with bottom nav + safe-area insets |

## Quick start (local)

### Option A — full Docker stack (fastest)

```bash
# Download docker-compose.yml and tweak the config
docker compose up -d 
# Open http://localhost:3000  ·  login with ADMIN_EMAIL / ADMIN_PASSWORD
```

### Option B — dev mode (hot reload)

Requires **Node 20+**, **pnpm**, and **Docker** (for Postgres).

```bash
git clone https://github.com/ting1e/lifeos.git
cd lifeos

cp .env.example .env

docker compose up -d db          # just Postgres
pnpm install
pnpm db:migrate
pnpm bootstrap:admin
pnpm seed:exercises              # ~1,324 records, ~30s, needs internet
pnpm apply:zh                    # apply Chinese exercise name translations (optional)
pnpm dev                         # http://localhost:3000
```

## Environment variables

| Var | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `SESSION_SECRET` | ✅ | 64-byte base64 (`openssl rand -base64 64`) for `iron-session` |
| `ADMIN_EMAIL` | ✅ | Bootstraps the single admin account on first boot |
| `ADMIN_PASSWORD` | ✅ | First-boot password (change from `/profile` after) |
| `OPENAI_BASE_URL` | ✅ (for AI) | Any OpenAI-compatible `/chat/completions` base URL (e.g. `https://api.openai.com/v1`, `https://openrouter.ai/api/v1`) — powers **all** AI features |
| `OPENAI_API_KEY` | ✅ (for AI) | API key for the provider above |
| `OPENAI_TEXT_MODEL` | optional | Default text model id (defaults to `gpt-4o-mini`); overridable per-user from `/profile` |
| `OPENAI_IMAGE_MODEL` | optional | Default image (vision) model id (defaults to `gpt-4o-mini`); overridable per-user from `/profile` |
| `OPENAI_AUDIO_MODEL` | optional | Default audio (transcription) model id (defaults to `gpt-4o-mini`); overridable per-user from `/profile` |
| `EXERCISES_DATASET_BASE` | optional | Base URL of the exercises dataset for `seed-exercises` (defaults to GitHub raw); swap to a mirror if GitHub is blocked |
| `HTTPS_PROXY` | optional | HTTP(S) proxy used only by seed/sync scripts when fetching the exercises dataset |
| `WHOOP_CLIENT_ID` | optional | From [developer.whoop.com](https://developer.whoop.com) |
| `WHOOP_CLIENT_SECRET` | optional | OAuth client secret |
| `WHOOP_REDIRECT_URI` | optional | `https://yourdomain.com/api/whoop/callback` |
| `WHOOP_WEBHOOK_SECRET` | optional | Only if you set a custom webhook secret in the Whoop portal |
| `NEXT_PUBLIC_APP_URL` | optional | Public origin (used in OAuth + emails) |
| `ENABLE_CRON` | optional | `1` to enable background jobs in the Node process |
| `TZ` | optional | Defaults to `Asia/Shanghai`; set yours |
| `UPLOADS_DIR` | optional | Defaults to `./uploads` locally, `/data/uploads` in Docker |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Next.js 15 (App Router, RSC, TypeScript strict)             │
│  └─ app/(app)/*    UI routes (mobile-first, Nothing design)  │
│  └─ app/api/*      REST handlers                             │
│                                                              │
│  lib/ai/client.ts  ──────────────►  OpenAI-compatible API   │
│    chat()                            /chat/completions       │
│    vision()                          /chat/completions       │
│    transcribeAudio()                 /chat/completions       │
│                                                              │
│  lib/auth         iron-session + argon2id                    │
│  lib/whoop        OAuth2 + HMAC webhook + sync               │
│  lib/nutrition    macro math, BMR/TDEE, Epley 1RM            │
│                                                              │
│  Drizzle ORM  ────────────────►  PostgreSQL 16               │
│  node-cron    ────────────────►  daily Whoop safety-net      │
└──────────────────────────────────────────────────────────────┘
```

(Photos are sent inline as base64 data URIs; no separate storage
upload, no `uploadBuffer()` exists in the current client.)

## Deploy on Coolify

Tested on Coolify v4 with a single $5 VPS:

1. **DB** — create a Postgres 16 resource; copy connection string.
2. **App** — from your GitHub repo, build pack = Dockerfile, port `3000`.
3. **Volume** — persistent volume mounted at `/data/uploads`.
4. **Env vars** — `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `OPENAI_BASE_URL`, `OPENAI_API_KEY`, optional `WHOOP_*`, `ENABLE_CRON=1`, `TZ=Europe/Istanbul`.
5. **Domain** — your subdomain with Let's Encrypt.
6. **DNS** (Cloudflare) — A record → Coolify server IP (proxy=off until LE cert issues, then flip on).
7. **Whoop (optional)** — register at [developer.whoop.com](https://developer.whoop.com) with redirect URI `https://<your-domain>/api/whoop/callback`. Add webhook `https://<your-domain>/api/whoop/webhook` and copy secret into env.
8. **Daily Whoop sync (optional)** — schedule a Coolify task hitting `POST /api/whoop/sync` once a day (or rely on webhook + manual sync).

First deploy auto-runs: migrate → bootstrap admin → seed 1,324 exercises → apply zh names → seed default 3-day full-body template.

## Tech

- **Runtime** — Next.js 15 App Router · React 19 · TypeScript strict · Tailwind v4
- **Database** — PostgreSQL 16 · Drizzle ORM 0.36
- **AI** — OpenAI-compatible `/chat/completions` (text / vision / audio; model set via `OPENAI_*` env or `/profile`)
- **Auth** — `iron-session` (sealed httpOnly cookies) · `@node-rs/argon2`
- **UI** — `recharts` charts · `lucide-react` icons · `vaul` drawers · custom Nothing-design system
- **Jobs** — `node-cron` (Whoop daily safety-net)
- **Package manager** — pnpm 9.15

## Contributing

PRs welcome! See [CONTRIBUTING.md](../CONTRIBUTING.md) for dev setup, code conventions, and what kinds of changes are in/out of scope.

Note that LifeOS is intentionally **single-user**. If you want multi-tenant SaaS-style auth, please open an issue first — that direction will likely live in a fork.

## Security

If you find a security issue, **do not open a public issue**. See [SECURITY.md](../SECURITY.md) for disclosure instructions.

## Data attribution

Exercise dataset (1,324 records with images + GIFs) is from [`hasaneyldrm/exercises-dataset`](https://github.com/hasaneyldrm/exercises-dataset). It is provided for educational use only — media is referenced directly from the upstream raw URLs and not redistributed in this repo. Verify license alignment before commercial use.

Nothing-style visual language inspired by the [Nothing Design Skill](https://github.com/dominikmartn/nothing-design-skill) (Swiss + industrial). Fonts: Doto, Space Grotesk, Space Mono — all open-source.

## Acknowledgements

This project is forked from [egebese/lifeos](https://github.com/egebese/lifeos) and migrated from fal.ai to a provider-agnostic OpenAI-compatible API. Full credit to [@egebese](https://github.com/egebese) for the original work.

## License

MIT — see [LICENSE](../LICENSE).

Built with ❤️ by [@ting1e](https://github.com/ting1e), powered by any OpenAI-compatible provider.
