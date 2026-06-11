#!/usr/bin/env bash
set -euo pipefail

: "${AWS_REGION:?Set AWS_REGION}"
: "${AWS_ACCOUNT_ID:?Set AWS_ACCOUNT_ID}"
: "${IMAGE_TAG:=latest}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_BASE}"

ensure_repo() {
  local repo="$1"
  aws ecr describe-repositories --region "${AWS_REGION}" --repository-names "${repo}" >/dev/null 2>&1 \
    || aws ecr create-repository --region "${AWS_REGION}" --repository-name "${repo}" >/dev/null
}

build_push() {
  local repo="$1"
  local context="$2"
  shift 2

  ensure_repo "${repo}"
  docker build "$@" -t "${repo}:${IMAGE_TAG}" "${ROOT_DIR}/${context}"
  docker tag "${repo}:${IMAGE_TAG}" "${ECR_BASE}/${repo}:${IMAGE_TAG}"
  docker push "${ECR_BASE}/${repo}:${IMAGE_TAG}"
}

build_push "hireforge-backend" "backend"
build_push "hireforge-agent" "agent"
build_push "hireforge-frontend" "frontend" \
  --build-arg "VITE_API_URL=${VITE_API_URL:?Set VITE_API_URL to your backend /api URL}"

echo "Pushed images with tag ${IMAGE_TAG} to ${ECR_BASE}"
