<div align="center">

# LifeOS

**自托管个人生活追踪器 —— 训练、营养、Whoop、AI 拍照估卡、AI 饮食规划。**

一个 OpenAI 兼容 API key 即可驱动应用内所有 AI 功能。

[**▸ 在线演示**](https://lifeos-demo-nu.vercel.app)  ·  数据仅保存在你的浏览器中，不会上传至服务器

[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)
![Node 24+](https://img.shields.io/badge/node-%E2%89%A524-black)
![Next.js 15](https://img.shields.io/badge/next.js-15-black)
![PostgreSQL 16](https://img.shields.io/badge/postgres-16-black)
![AI: OpenAI-compatible](https://img.shields.io/badge/AI-OpenAI--compatible-black)

![Dashboard](docs/screenshots/dashboard.png)

</div>

> 🌐 **语言：** [English](docs/README.md) · 简体中文

## 界面预览

| | |
|---|---|
| ![Workouts](docs/screenshots/workouts.png) | ![Food log](docs/screenshots/food.png) |
| 训练 —— 记录组数、休息计时器、训练计划、1RM 追踪 | 饮食记录 —— 手动记录或 AI 拍照，每日宏量营养素对比目标 |
| ![Whoop](docs/screenshots/whoop.png) | ![Programs](docs/screenshots/programs.png) |
| Whoop —— 30 天恢复 / 睡眠 / 强度历史 | 训练计划 —— 保存的方案或 AI 生成 |

<details>
<summary>移动端（应用为移动优先设计）</summary>

| Dashboard | Food log |
|---|---|
| <img src="docs/screenshots/mobile-dashboard.png" width="320" /> | <img src="docs/screenshots/mobile-food.png" width="320" /> |

</details>


---

LifeOS 是我为自己搭建的自托管个人操作系统：记录每一次训练、每一餐、每一个 Whoop 恢复分数，并让一个 OpenAI 兼容的 AI 服务商处理所有智能部分（拍照估卡、饮食规划、每周洞察、语音转饮食记录、训练计划生成）。

它被刻意设计为**单管理员**模式：一个用户、一个 Postgres 数据库、一个 Docker 容器、一个 OpenAI 兼容 API key。把它部署在一台 $5 的 VPS 上，指向一个域名，你就拥有全部的健身/营养数据。MIT 许可证。

> 项目内部代号是 `lifetracker`（包名、docker 卷名、数据库名）。公开/仓库名称是 **LifeOS**。

## 为什么 AI 层是服务商无关的

本应用中的每一个 AI 功能 —— 无一例外 —— 都调用同一个 OpenAI 兼容的 `/chat/completions` 端点。一个 base URL + API key，整套功能即可点亮。模型可按用途（文本 / 图像 / 音频）在个人资料页配置，或通过 `OPENAI_*` 环境变量作为服务端兜底（默认 `gpt-4o-mini`）：

| 功能 | 端点 | 模型 | 作用 |
|---|---|---|---|
| **食物照片 → 宏量营养素** | `/chat/completions`（视觉） | `OPENAI_IMAGE_MODEL` | 拍一餐，得到 kcal/蛋白质/碳水/脂肪拆解 |
| **自由文本饮食解析** | `/chat/completions` | `OPENAI_TEXT_MODEL` | "两个鸡蛋和一片吐司" → 结构化宏量营养素 |
| **语音 → 饮食记录** | `/chat/completions`（`input_audio`） | `OPENAI_AUDIO_MODEL` | 录音，转写并从语音中解析出这餐 |
| **饮食规划（3–14 天）** | `/chat/completions` | `OPENAI_TEXT_MODEL` | 目标 + 偏好 + 食材库存 → 完整计划 + 购物清单 |
| **训练计划生成器** | `/chat/completions` | `OPENAI_TEXT_MODEL` | 目标/水平/器材 → 多日周期化训练计划 |
| **每周洞察** | `/chat/completions` | `OPENAI_TEXT_MODEL` | 基于 30 天数据的亮点 / 警告 / 建议 |
| **联网搜索增强** | `/chat/completions`（`:online` 后缀） | 同模型，联网变体 | 实时的品牌/份量查询（仅 OpenRouter 端点支持） |

**为什么这点对自托管者很重要：**

- **自带服务商。** 将 `OPENAI_BASE_URL` 指向任意 OpenAI 兼容端点 —— OpenAI、OpenRouter、Groq、本地 Ollama/LM Studio 服务器，任何支持 `/chat/completions` 的服务均可。一个 key、一份账单、全部功能可用。
- **服务商无关的路由。** 把默认的 `OPENAI_TEXT_MODEL` 换成任何其他受支持模型（GPT、Llama、Gemini、Claude 等），只需传入不同的 `model` 字符串 —— 无需改代码，且可在个人资料页按用户覆盖。
- **每次调用都计量并记录。** `lib/ai/client.ts` 将每条 prompt、响应、模型 id 和成本（以分计）记录到 `ai_messages` 表中。你可以按功能审计和控制预算。
- **无供应商锁定。** 所有 AI 调用都经过一个轻薄的 `fetch()` 封装 —— 无 SDK 依赖。换一个 base URL 就完成了服务商切换。

在 `.env` 里设置 `OPENAI_BASE_URL` + `OPENAI_API_KEY`（或之后在 `/profile` 设置），即可。

## 功能特性

| | |
|---|---|
| 🏋️ **训练** | 1,324 个动作（en/tr/zh）来自公开的 `exercises-dataset`；创建训练计划、按组数/次数/重量记录并标注 RPE，休息计时器，上次表现叠加显示，Epley 1RM 追踪 |
| 🍳 **饮食** | 手动记录 + AI 拍照估算 + 语音转写。每日宏量营养素，kcal 目标 vs 实际 |
| 🥗 **规划与采购** | AI 生成 3–14 天饮食计划，综合考虑目标、喜欢/不喜欢/过敏偏好、食材库存以及最近吃过的餐食。购物清单自动扣除库存 |
| ⌚ **Whoop** | OAuth2 连接，全量同步（恢复、睡眠、强度、训练、身体测量），HMAC webhook，每日兜底定时任务 |
| 📱 **Apple Health** | [iPhone 快捷指令同步](docs/apple-health-shortcut.md)体重、体脂率、肌肉量、去脂体重 |
| 🧮 **分析** | 体重 90 天 · kcal 14 天 · 恢复 30 天 · 训练量 30 天。AI 每周洞察 |
| 🔐 **认证** | 单管理员，argon2id 哈希，加密的 httpOnly cookie，1 年有效期 |
| 🎨 **界面** | Nothing 设计美学 —— Doto/Space Grotesk/Space Mono，OLED 纯黑，点阵点缀。移动优先，底部导航 + 安全区域内边距 |

## 快速开始（本地）

### 方案 A —— 完整 Docker 栈（最快）

```bash
# 下载docker-compose.yml 并修改配置
docker compose up -d 
# 打开 http://localhost:3000  ·  使用 ADMIN_USERNAME / ADMIN_PASSWORD 登录
```

### 方案 B —— 开发模式（热重载）

需要 **Node 24+**、**pnpm** 和 **Docker**（用于 Postgres）。

```bash
git clone https://github.com/ting1e/lifeos.git
cd lifeos

cp .env.example .env

docker compose up -d db          # 仅启动 Postgres
pnpm install
pnpm db:migrate
pnpm bootstrap:admin
pnpm seed:exercises              # 约 1,324 条记录，约 30 秒，需要联网
pnpm apply:zh                    # 应用动作中文名称翻译（可选）
pnpm dev                         # http://localhost:3000
```

## 环境变量

| 变量 | 必需 | 用途 |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres 连接字符串 |
| `SESSION_SECRET` | ✅ | 64 字节 base64（`openssl rand -base64 64`），用于 `iron-session` |
| `ADMIN_USERNAME` | ✅ | 首次启动时引导创建唯一管理员账号 |
| `ADMIN_PASSWORD` | ✅ | 首次启动密码（之后在 `/profile` 修改） |
| `OPENAI_BASE_URL` | ✅（AI 功能） | 任意 OpenAI 兼容的 `/chat/completions` base URL（如 `https://api.openai.com/v1`、`https://openrouter.ai/api/v1`）—— 驱动**所有** AI 功能 |
| `OPENAI_API_KEY` | ✅（AI 功能） | 上述服务商的 API key |
| `OPENAI_TEXT_MODEL` | 可选 | 默认文本模型 id（默认 `gpt-4o-mini`）；可在 `/profile` 按用户覆盖 |
| `OPENAI_IMAGE_MODEL` | 可选 | 默认图像（视觉）模型 id（默认 `gpt-4o-mini`）；可在 `/profile` 按用户覆盖 |
| `OPENAI_AUDIO_MODEL` | 可选 | 默认音频（转写）模型 id（默认 `gpt-4o-mini`）；可在 `/profile` 按用户覆盖 |
| `EXERCISES_DATASET_BASE` | 可选 | `seed-exercises` 使用的动作数据集 base URL（默认为 GitHub raw）；GitHub 被墙时换成镜像 |
| `HTTPS_PROXY` | 可选 | 仅在填充/同步脚本拉取动作数据集时使用的 HTTP(S) 代理 |
| `WHOOP_CLIENT_ID` | 可选 | 来自 [developer.whoop.com](https://developer.whoop.com) |
| `WHOOP_CLIENT_SECRET` | 可选 | OAuth 客户端密钥 |
| `WHOOP_REDIRECT_URI` | 可选 | `https://yourdomain.com/api/whoop/callback` |
| `WHOOP_WEBHOOK_SECRET` | 可选 | 仅当你在 Whoop 门户设置了自定义 webhook 密钥时 |
| `NEXT_PUBLIC_APP_URL` | 可选 | 公开 origin（用于 OAuth 和邮件） |
| `ENABLE_CRON` | 可选 | `1` 以在 Node 进程中启用后台任务 |
| `TZ` | 可选 | 默认 `Asia/Shanghai`；设置你的时区 |
| `UPLOADS_DIR` | 可选 | 本地默认 `./uploads`，Docker 中默认 `/data/uploads` |

## 架构

```
┌──────────────────────────────────────────────────────────────┐
│  Next.js 15 (App Router, RSC, TypeScript strict)             │
│  └─ app/(app)/*    UI 路由（移动优先，Nothing 设计）          │
│  └─ app/api/*      REST 处理器                                │
│                                                              │
│  lib/ai/client.ts  ──────────────►  OpenAI 兼容 API          │
│    chat()                            /chat/completions       │
│    vision()                          /chat/completions       │
│    transcribeAudio()                 /chat/completions       │
│                                                              │
│  lib/auth         iron-session + argon2id                    │
│  lib/whoop        OAuth2 + HMAC webhook + sync               │
│  lib/nutrition    宏量营养素计算, BMR/TDEE, Epley 1RM         │
│                                                              │
│  Drizzle ORM  ────────────────►  PostgreSQL 16               │
│  node-cron    ────────────────►  每日 Whoop 兜底任务          │
└──────────────────────────────────────────────────────────────┘
```

（照片以 base64 data URI 内联发送；无单独存储上传，
当前客户端中不存在 `uploadBuffer()`。）


## 技术栈

- **运行时** —— Next.js 15 App Router · React 19 · TypeScript strict · Tailwind v4
- **数据库** —— PostgreSQL 16 · Drizzle ORM 0.36
- **AI** —— OpenAI 兼容 `/chat/completions`（文本 / 视觉 / 音频；模型通过 `OPENAI_*` 环境变量或 `/profile` 设置）
- **认证** —— `iron-session`（加密 httpOnly cookies）· `@node-rs/argon2`
- **界面** —— `recharts` 图表 · `lucide-react` 图标 · `vaul` 抽屉 · 自定义 Nothing 设计系统
- **任务** —— `node-cron`（Whoop 每日兜底任务）
- **包管理器** —— pnpm 9.15

## 贡献

欢迎提交 PR！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发配置、代码规范，以及哪些变更在/不在范围内。

请注意，LifeOS 被刻意设计为**单用户**。如果你想要多租户 SaaS 式认证，请先开一个 issue —— 那个方向很可能在 fork 中实现。

## 安全

如果你发现安全问题，**请不要公开 issue**。请查看 [SECURITY.md](SECURITY.md) 了解披露流程。

## 数据归属

动作数据集（1,324 条记录，含图片 + GIF）来自 [`hasaneyldrm/exercises-dataset`](https://github.com/hasaneyldrm/exercises-dataset)。仅供教育用途 —— 媒体直接引用上游 raw URL，不在本仓库中重新分发。商业使用前请核实许可一致性。

Nothing 风格的视觉语言灵感来自 [Nothing Design Skill](https://github.com/dominikmartn/nothing-design-skill)（瑞士派 + 工业风）。字体：Doto、Space Grotesk、Space Mono —— 均为开源。

## 致谢

本项目派生自 [egebese/lifeos](https://github.com/egebese/lifeos)，并将原本的 fal.ai 迁移为服务商无关的 OpenAI 兼容 API。感谢 [@egebese](https://github.com/egebese) 的原创工作。

## 许可证

MIT —— 见 [LICENSE](LICENSE)。

由 [@ting1e](https://github.com/ting1e) 用 ❤️ 打造，由任意 OpenAI 兼容服务商驱动。
