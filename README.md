# HireForge

AI-assisted resume optimization platform that tailors resumes to specific job descriptions.

**Features:** ATS score analysis · keyword gap detection · LLM-powered resume rewriting · gap-closure suggestions · LaTeX PDF generation

## Architecture

| Service | Stack | Role |
|---------|-------|------|
| **frontend** | React 19, Vite, Nginx | Dashboard, upload UI, results view |
| **backend** | Node.js 20, Express, Mongoose | Auth, REST API, S3/SQS integration, WebSocket |
| **agent** | Python 3.13, LangGraph, Groq | SQS worker — scores, rewrites, generates PDF |
| **mongo** | MongoDB 7 | Users and job lifecycle data |
| **AWS S3** | Cloud | Stores uploaded and generated resume PDFs |
| **AWS SQS** | Cloud | Queues processing jobs for the agent |

**Flow:** User uploads resume + JD → backend stores PDF in S3 and enqueues job in SQS → agent polls SQS, runs LangGraph pipeline (parse → score → rewrite/suggest → verify), compiles LaTeX PDF, uploads to S3 → frontend polls and renders results.

## Repository Structure

```text
HireForge/
├── frontend/            # React app + Nginx reverse proxy
│   ├── src/             # components, pages, hooks, api, context
│   ├── nginx.conf       # Proxies /api and /ws to backend
│   └── Dockerfile
├── backend/             # Express API server
│   ├── src/             # routes, services, models, middleware
│   └── Dockerfile
├── agent/               # Python LangGraph worker
│   ├── graph/           # State, nodes, edges, graph assembly
│   ├── tools/           # ATS scorer
│   ├── templates/       # LaTeX resume template
│   ├── worker.py        # SQS poll loop + PDF pipeline
│   └── Dockerfile
├── infra/               # AWS setup guide + ECS deployment scripts
├── docker-compose.yml
├── .env.example
└── DEPLOY_AWS.md
```

## Running Locally (Docker Compose)

**Prerequisites:** Docker and Docker Compose installed. An AWS account with an S3 bucket and SQS queue created. A [Groq API key](https://console.groq.com).

```bash
# 1. Create env file from template
cp .env.example .env.deploy

# 2. Edit .env.deploy — fill in these values:
#    JWT_SECRET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
#    S3_BUCKET, SQS_QUEUE_URL, GROQ_API_KEY
#
#    (MONGODB_URI is NOT needed — Compose uses its own Mongo container)

# 3. Build and start all four services
docker compose up --build -d

# 4. Verify
docker compose ps
# Should show: mongo (healthy), backend, agent, frontend

# 5. Open http://localhost in your browser

# To stop
docker compose down
```

## Local Dev (Without Docker)

For hot-reloading during development, run each service in a separate terminal:

```bash
# Setup env files
cp backend/.env.example backend/.env     # fill in AWS keys, JWT_SECRET, etc.
cp agent/.env.example agent/.env         # fill in AWS keys, GROQ_API_KEY, etc.
echo 'VITE_API_URL=http://localhost:3001' > frontend/.env

# Set MONGODB_URI=mongodb://127.0.0.1:27017/resumeforge in backend/.env and agent/.env
# Set FRONTEND_URL=http://localhost:5173 in backend/.env (for CORS)
```

```bash
# Terminal 0 — MongoDB
docker run -d -p 27017:27017 --name hireforge-mongo mongo:7

# Terminal 1 — Backend (http://localhost:3001)
cd backend && npm ci && npm run dev

# Terminal 2 — Agent (polls SQS)
cd agent && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && python worker.py

# Terminal 3 — Frontend (http://localhost:5173)
cd frontend && npm ci && npm run dev
```

## Environment Variables

| Variable | Used By | Required |
|----------|---------|----------|
| `MONGODB_URI` | backend, agent | Only for local dev (Compose auto-sets it) |
| `JWT_SECRET` | backend | ✅ |
| `AWS_REGION` | backend, agent | ✅ |
| `AWS_ACCESS_KEY_ID` | backend, agent | ✅ (or use IAM roles in cloud) |
| `AWS_SECRET_ACCESS_KEY` | backend, agent | ✅ (or use IAM roles in cloud) |
| `S3_BUCKET` | backend, agent | ✅ |
| `SQS_QUEUE_URL` | backend, agent | ✅ |
| `GROQ_API_KEY` | agent | ✅ |
| `GROQ_MODEL` | agent | Default: `llama-3.3-70b-versatile` |
| `FRONTEND_URL` | backend | Default: `http://localhost` |
| `VITE_API_URL` | frontend | Default: `/api` |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Login, returns JWT |
| POST | `/api/upload` | ✅ | Upload resume PDF + JD (multipart) |
| GET | `/api/jobs` | ✅ | List user's jobs |
| GET | `/api/jobs/:jobId` | ✅ | Job details + presigned PDF URLs |
| GET | `/api/health` | — | Health check |
| WS | `/ws?jobId=<id>` | — | Live progress updates |

## Deployment

- **Single EC2 host:** see [`DEPLOY_AWS.md`](DEPLOY_AWS.md)
- **ECS Fargate:** see [`infra/ecs/README.md`](infra/ecs/README.md)

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Upload fails with AWS errors | Verify S3 bucket, SQS URL, IAM permissions, and region alignment |
| Jobs stay queued | Check agent logs (`docker compose logs agent`) and SQS reachability |
| PDF generation fails | Ensure LaTeX is installed in agent image (included in `agent/Dockerfile`) |
| Auth/CORS issues | Ensure `FRONTEND_URL` in backend matches the actual frontend origin |