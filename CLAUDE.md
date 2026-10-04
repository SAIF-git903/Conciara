# Conciara — Project Overview

Multi-agent AI chat platform. Users create workspaces, configure AI agents, train them on documents/websites/Q&A, then deploy them as embeddable chat widgets. Includes billing (Paddle), real-time training progress (Socket.IO), RAG (pgvector), and OAuth integrations.

## Repo Layout

```
backend/          Express API — port 3009
frontend/         Next.js 14 app — port 3002
design-prototype/ Static JSX mockups only, not deployed
```

## Running Locally

```powershell
# Backend (new terminal)
cd backend && npm run dev

# Frontend (new terminal)
cd frontend && npm run dev
```

Both need their respective `.env` files (see `.env.example` in each).

## Tech Stack


| Layer     | Tech                                      |
| --------- | ----------------------------------------- |
| Backend   | Node.js + Express + TypeScript, tsx watch |
| Database  | PostgreSQL + Prisma ORM + pgvector        |
| Real-time | Socket.IO                                 |
| LLM       | OpenAI SDK                                |
| Frontend  | Next.js 14 App Router + TypeScript        |
| Styling   | Tailwind CSS 3                            |
| Auth      | JWT (15m access / 7d refresh)             |
| Payments  | Paddle                                    |
| Storage   | AWS S3                                    |


## Key Env Vars (both sides)

Backend: `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `AWS_*`, `PADDLE_*`, `GOOGLE_*`, `APPLE_*`, `SLACK_*`, `SMTP_*`, `FRONTEND_URL`, `PORT=3009`

Frontend: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001/api` — **must match backend port**)

## Database Migrations

Do NOT use `prisma migrate`. Use the custom runner:

```bash
cd backend
npm run migrate           # run pending migrations
npm run migrate:status    # check migration state
npm run migrate:rollback  # rollback last
```

Migrations live in `backend/src/db/migrations/` as numbered SQL files.