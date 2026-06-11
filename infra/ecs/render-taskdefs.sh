#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [[ -f "${SCRIPT_DIR}/deploy.env" ]]; then
  # shellcheck disable=SC1091
  source "${SCRIPT_DIR}/deploy.env"
fi

required_vars=(
  AWS_REGION AWS_ACCOUNT_ID IMAGE_TAG
  EXECUTION_ROLE_ARN TASK_ROLE_ARN
  S3_BUCKET SQS_QUEUE_URL FRONTEND_URL
  MONGODB_URI_SECRET_ARN JWT_SECRET_SECRET_ARN
  GROQ_API_KEY_SECRET_ARN GROQ_MODEL
)

for var_name in "${required_vars[@]}"; do
  : "${!var_name:?Set ${var_name} in infra/ecs/deploy.env or the shell environment}"
done

render_one() {
  local input_file="$1"
  local output_file="$2"

  sed \
    -e "s|__AWS_REGION__|${AWS_REGION}|g" \
    -e "s|__AWS_ACCOUNT_ID__|${AWS_ACCOUNT_ID}|g" \
    -e "s|__IMAGE_TAG__|${IMAGE_TAG}|g" \
    -e "s|__EXECUTION_ROLE_ARN__|${EXECUTION_ROLE_ARN}|g" \
    -e "s|__TASK_ROLE_ARN__|${TASK_ROLE_ARN}|g" \
    -e "s|__S3_BUCKET__|${S3_BUCKET}|g" \
    -e "s|__SQS_QUEUE_URL__|${SQS_QUEUE_URL}|g" \
    -e "s|__FRONTEND_URL__|${FRONTEND_URL}|g" \
    -e "s|__MONGODB_URI_SECRET_ARN__|${MONGODB_URI_SECRET_ARN}|g" \
    -e "s|__JWT_SECRET_SECRET_ARN__|${JWT_SECRET_SECRET_ARN}|g" \
    -e "s|__GROQ_API_KEY_SECRET_ARN__|${GROQ_API_KEY_SECRET_ARN}|g" \
    -e "s|__GROQ_MODEL__|${GROQ_MODEL}|g" \
    "${input_file}" > "${output_file}"
}

mkdir -p "${SCRIPT_DIR}/rendered"
render_one "${SCRIPT_DIR}/taskdef-frontend.json" "${SCRIPT_DIR}/rendered/taskdef-frontend.json"
render_one "${SCRIPT_DIR}/taskdef-backend.json" "${SCRIPT_DIR}/rendered/taskdef-backend.json"
render_one "${SCRIPT_DIR}/taskdef-agent.json" "${SCRIPT_DIR}/rendered/taskdef-agent.json"

echo "Rendered task definitions into ${SCRIPT_DIR}/rendered"
