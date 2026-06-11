#!/usr/bin/env bash
set -euo pipefail

: "${AWS_REGION:?Set AWS_REGION}"
: "${CLUSTER_NAME:?Set CLUSTER_NAME}"
: "${SERVICE_PREFIX:=hireforge}"

register_task() {
  local file="$1"
  aws ecs register-task-definition \
    --region "${AWS_REGION}" \
    --cli-input-json "file://${file}" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text
}

update_service() {
  local service_name="$1"
  local task_def_arn="$2"

  aws ecs update-service \
    --region "${AWS_REGION}" \
    --cluster "${CLUSTER_NAME}" \
    --service "${service_name}" \
    --task-definition "${task_def_arn}" \
    --force-new-deployment >/dev/null
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TASKDEF_DIR="${SCRIPT_DIR}/rendered"
if [[ ! -d "${TASKDEF_DIR}" ]]; then
  echo "Missing rendered task definitions. Run bash infra/ecs/render-taskdefs.sh first."
  exit 1
fi

FRONTEND_TASK="$(register_task "${TASKDEF_DIR}/taskdef-frontend.json")"
BACKEND_TASK="$(register_task "${TASKDEF_DIR}/taskdef-backend.json")"
AGENT_TASK="$(register_task "${TASKDEF_DIR}/taskdef-agent.json")"

update_service "${SERVICE_PREFIX}-frontend" "${FRONTEND_TASK}"
update_service "${SERVICE_PREFIX}-backend" "${BACKEND_TASK}"
update_service "${SERVICE_PREFIX}-agent" "${AGENT_TASK}"

echo "Updated services:"
echo "- ${SERVICE_PREFIX}-frontend -> ${FRONTEND_TASK}"
echo "- ${SERVICE_PREFIX}-backend -> ${BACKEND_TASK}"
echo "- ${SERVICE_PREFIX}-agent -> ${AGENT_TASK}"
