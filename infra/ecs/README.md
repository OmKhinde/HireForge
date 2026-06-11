# ECS Deployment

This folder contains a practical AWS deployment starting point for HireForge on ECS Fargate.

Recommended shape:

- `frontend` on ECS Fargate behind an ALB
- `backend` on ECS Fargate behind the same ALB
- `agent` on ECS Fargate without a public listener
- MongoDB Atlas or Amazon DocumentDB for `MONGODB_URI`
- S3 for resume storage
- SQS for async jobs
- Secrets Manager for runtime secrets

## Files

- `taskdef-frontend.json`
- `taskdef-backend.json`
- `taskdef-agent.json`
- `deploy.env.example`
- `render-taskdefs.sh`
- `build-and-push.sh`
- `deploy.sh`

## Required placeholders

Copy `deploy.env.example` to `deploy.env` and fill the values there.

## Secrets strategy

Pass secrets through ECS task definitions using either:

- `secrets` entries from AWS Secrets Manager / SSM Parameter Store
- plain `environment` values for non-sensitive config

Use task roles for AWS access. Static `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are no longer required in ECS.

## Deploy flow

1. Build and push images:
   `bash infra/ecs/build-and-push.sh`
2. Render filled task definitions:
   `bash infra/ecs/render-taskdefs.sh`
3. Create or update services:
   `bash infra/ecs/deploy.sh`
4. Verify:
   - frontend loads
   - backend `/api/health` returns `200`
   - upload flow works
   - worker drains SQS messages
