# HireForge

HireForge is an AI-assisted resume optimization platform that helps candidates tailor resumes to specific job descriptions.

It provides:
- ATS score analysis against a target JD
- Keyword gap detection and heatmap-style matching data
- LLM-powered resume rewriting (without fabricating experience)
- Optional gap-closure suggestions when the resume/job mismatch is large
- Final LaTeX-based generated resume PDF

## System Architecture

HireForge is a multi-service application:
- `frontend` (React + Vite + Nginx): user dashboard, upload UI, score/results view
- `backend` (Node.js + Express + MongoDB + WebSocket): auth, upload API, job tracking, S3/SQS integration
- `agent` (Python + LangGraph + Groq): async worker that scores, rewrites, and generates final PDF
- `mongo`: stores users and job lifecycle data
- `AWS S3`: stores uploaded and generated resumes
- `AWS SQS`: queues processing jobs for the worker

High-level flow:
1. User logs in and uploads resume PDF + job description.
2. Backend stores PDF in S3, creates a job document in MongoDB, and enqueues `jobId` in SQS.
3. Agent polls SQS, processes the job through LangGraph nodes, and writes results back to MongoDB.
4. Frontend polls job status and renders scores, progress messages, rewrite output, suggestions, and final PDF link.

## Repository Structure

```text
HireForge/
├── frontend/            # React app + Nginx reverse proxy
├── backend/             # Express API, auth, upload, jobs, WebSocket server
├── agent/               # Python worker (LangGraph + ATS scoring + LaTeX PDF generation)
├── infra/
│   ├── aws-setup.md     # AWS architecture/setup guidance
│   └── ecs/             # ECS task defs + deployment scripts
├── docker-compose.yml   # Single-host full stack deployment
├── DEPLOY_AWS.md        # Quick EC2 deployment path
└── README.md            # You are here
```

## Core Workflow (What Happens Per Job)

1. `POST /api/upload` (authenticated)
- Accepts PDF resume (max 5 MB), JD text, template kind (`sde`, `ai`, `etc`), target score.
- Uploads source resume to `s3://<bucket>/resumes/<userId>/<jobId>.pdf`.
- Creates Mongo job with `status=queued`.
- Sends SQS message `{ jobId }`.

2. Agent processing
- Loads resume from S3 and extracts text using PyMuPDF.
- Runs LangGraph pipeline:
  - `parse_documents`
  - `ats_score`
  - Conditional route:
    - `rewrite_resume` if gap is moderate
    - `suggest_additions` if gap is very large
    - or direct verify if already at/above target
  - `verify_score` (with up to 3 rewrite passes)
- Builds structured resume JSON, fills LaTeX template, compiles PDF.
- Uploads generated PDF to `s3://<bucket>/generated-resumes/<userId>/<jobId>.pdf`.
- Marks job as `done` (or `failed` with error message).

3. Results retrieval
- Frontend fetches `GET /api/jobs/:jobId`.
- Backend returns job data + pre-signed URLs for source/generated PDFs when available.

## Tech Stack

- Frontend: React 19, Vite, Axios, React Router, React Dropzone
- Backend: Node.js 20, Express, Mongoose, JWT, AWS SDK v3, Multer, WS
- Agent: Python 3.13, LangGraph, LangChain Groq, boto3, PyMuPDF, PyMongo
- Storage/Queue: MongoDB, AWS S3, AWS SQS
- Rendering: LaTeX template compilation inside agent container

## Quick Start (Docker Compose)

Recommended fastest way to run the full stack locally/on one host.

1. Create deploy env:
```bash
cp .env.deploy.example .env.deploy
```

2. Fill real values in `.env.deploy`:
- `JWT_SECRET`
- `AWS_REGION`
- `S3_BUCKET`
- `SQS_QUEUE_URL`
- `GROQ_API_KEY`
- optional static AWS keys (or use IAM role in cloud)

3. Start services:
```bash
docker compose up --build -d
```

4. Open app:
```text
http://localhost
```

Services started by compose:
- `frontend` exposed on port `80` (or `APP_PORT`)
- `backend`, `agent`, `mongo` on internal Docker network

## Local Dev (Service-by-Service)

If you prefer separate terminals:

1. Environment files
- `backend/.env` from `backend/.env.example`
- `agent/.env` from `agent/.env.example`
- `frontend/.env` with `VITE_API_URL=/api` (or your backend API URL)

2. Start MongoDB (local or container).

3. Start backend
```bash
cd backend
npm ci
npm run dev
```

4. Start frontend
```bash
cd frontend
npm ci
npm run dev
```

5. Start agent
```bash
cd agent
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python worker.py
```

## Environment Variables

Shared/important:
- `MONGODB_URI`
- `MONGODB_DB`
- `AWS_REGION`
- `S3_BUCKET`
- `SQS_QUEUE_URL`

Backend:
- `JWT_SECRET`
- `FRONTEND_URL`
- `PORT` (default `3001`)
- optional `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

Agent:
- `GROQ_API_KEY`
- `GROQ_MODEL`
- optional `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

Frontend:
- `VITE_API_URL` (defaults well with `/api` proxy)

## API Summary

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/upload` (auth required, multipart form)
- `GET /api/jobs` (auth required)
- `GET /api/jobs/:jobId` (auth required)
- `GET /api/health`
- `WS /ws?jobId=<id>` (endpoint available; UI also polls `/api/jobs/:jobId`)

## Deployment

You have two deployment tracks in this repo:
- Quick single-host EC2 Docker deployment: see `DEPLOY_AWS.md`
- ECS Fargate deployment assets and scripts: see `infra/ecs/README.md`

Helpful files:
- `infra/aws-setup.md`
- `infra/ecs/build-and-push.sh`
- `infra/ecs/render-taskdefs.sh`
- `infra/ecs/deploy.sh`

## Troubleshooting

- Upload fails with AWS errors:
  - verify S3 bucket, SQS URL, IAM permissions, and region alignment.

- Jobs stay queued:
  - check agent container logs and SQS reachability.

- PDF generation fails:
  - verify LaTeX toolchain is present in worker image (included by `agent/Dockerfile`).

- Auth/CORS issues:
  - ensure backend `FRONTEND_URL` matches actual frontend origin.

## Notes

- Resume uploads are restricted to PDF and 5 MB.
- The system is designed to optimize wording and structure, not invent candidate history.
- For production, prefer IAM task roles and managed Mongo over embedded single-host Mongo.
