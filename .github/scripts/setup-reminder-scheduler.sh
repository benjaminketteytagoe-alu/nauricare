#!/usr/bin/env bash
# Production setup for app secrets and the reminder scheduler (AWS EventBridge).
# Run by an AWS admin from a trusted machine. Idempotent; safe to re-run.
#
#   AWS_REGION=us-east-1 .github/scripts/setup-reminder-scheduler.sh <command>
#
# Commands (run in this order the first time):
#   secrets      Store DATA_ENCRYPTION_KEY and CRON_SECRET as SSM SecureString
#                parameters and let the ECS task execution role read them.
#                Values are read from hidden input or generated, never printed.
#   schedule     Create/update the EventBridge connection (Authorization header
#                = CRON_SECRET), API destination, IAM role, dead-letter queue
#                and a 15-minute rule. The rule is created DISABLED.
#   enable       Enable the rule (after a deploy that has CRON_SECRET).
#   disable      Pause the rule.
#   rotate-cron  Generate a new CRON_SECRET, keeping the old one as
#                CRON_SECRET_PREVIOUS. Then: redeploy, run `schedule`, and
#                after one healthy run, run `drop-previous`.
#   drop-previous  Delete CRON_SECRET_PREVIOUS once rotation is complete.
#   status       Show what exists (no secret values).
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
PREFIX="/nauricare/production"
CLUSTER="${ECS_CLUSTER:-default}"
SERVICE="${ECS_SERVICE:-nauricare-service}"
ENDPOINT="${CRON_ENDPOINT:-https://nauricare.org/api/cron/execute}"
SCHEDULE="${CRON_SCHEDULE:-rate(15 minutes)}"
NAME="nauricare-reminders"
export AWS_REGION="$REGION" AWS_PAGER=""

die() { echo "error: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null || die "$1 is required"; }
need aws; need jq; need openssl

ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
param_arn() { echo "arn:aws:ssm:${REGION}:${ACCOUNT}:parameter${PREFIX}/$1"; }
param_exists() { aws ssm get-parameter --name "${PREFIX}/$1" --query Parameter.Name --output text >/dev/null 2>&1; }
# Secret values never go in argv (visible in `ps`) or stdout. JSON is piped into
# aws_json, which hands it to the CLI through an owner-only temp file (CLI v2
# cannot read file:///dev/stdin). The directory is removed on exit.
SECRET_DIR=$(mktemp -d); chmod 700 "$SECRET_DIR"; trap 'rm -rf "$SECRET_DIR"' EXIT
aws_json() {
  local f; f=$(mktemp "$SECRET_DIR/in.XXXXXX")
  cat >"$f"
  aws "$@" --cli-input-json "file://$f" >/dev/null
  rm -f "$f"
}
put_param() {
  jq -n --arg n "${PREFIX}/$1" --arg v "$2" '{Name:$n, Value:$v, Type:"SecureString", Overwrite:true}' \
    | aws_json ssm put-parameter
  echo "  stored ${PREFIX}/$1"
}
read_param() { aws ssm get-parameter --name "${PREFIX}/$1" --with-decryption --query Parameter.Value --output text; }

exec_role_name() {
  local td role
  td=$(aws ecs describe-services --cluster "$CLUSTER" --services "$SERVICE" --query 'services[0].taskDefinition' --output text)
  [ -n "$td" ] && [ "$td" != "None" ] || die "ECS service $SERVICE not found in cluster $CLUSTER ($REGION)"
  role=$(aws ecs describe-task-definition --task-definition "$td" --query 'taskDefinition.executionRoleArn' --output text)
  [ -n "$role" ] && [ "$role" != "None" ] || die "task definition has no executionRoleArn (needed to read secrets)"
  echo "${role##*/}"
}

cmd_secrets() {
  echo "== App secrets in SSM Parameter Store (${PREFIX})"
  if param_exists DATA_ENCRYPTION_KEY; then
    echo "  DATA_ENCRYPTION_KEY exists: keeping it. Never change it without re-encrypting sealed data."
  else
    local key=""
    read -rsp "  Paste DATA_ENCRYPTION_KEY (hidden), or press Enter to generate a new one (recommended): " key; echo
    [ -n "$key" ] || key=$(openssl rand -base64 32)
    # Accept 32+ random bytes as base64 (e.g. `openssl rand -base64 32`).
    [ "$(printf '%s' "$key" | openssl base64 -d -A 2>/dev/null | wc -c)" -ge 32 ] || die "key must be base64 of at least 32 random bytes"
    put_param DATA_ENCRYPTION_KEY "$key"; unset key
  fi
  if param_exists CRON_SECRET; then echo "  CRON_SECRET exists: keeping it (use rotate-cron to change)."
  else put_param CRON_SECRET "$(openssl rand -hex 32)"; fi

  local role; role=$(exec_role_name)
  aws iam put-role-policy --role-name "$role" --policy-name nauricare-read-app-secrets --policy-document \
    "$(jq -nc --arg r "arn:aws:ssm:${REGION}:${ACCOUNT}:parameter${PREFIX}/*" '{Version:"2012-10-17", Statement:[{Effect:"Allow", Action:["ssm:GetParameters"], Resource:$r}]}')"
  echo "  ECS execution role '$role' can read ${PREFIX}/*"
  names="DATA_ENCRYPTION_KEY,CRON_SECRET"; param_exists CRON_SECRET_PREVIOUS && names="$names,CRON_SECRET_PREVIOUS"
  cat <<NEXT

Next:
  1. GitHub > Settings > Secrets and variables > Actions > Variables:
       APP_SSM_SECRETS = $names
     (If DATA_ENCRYPTION_KEY or CRON_SECRET are also set as plain environment
     variables in the task definition, the deploy replaces them.)
  2. Deploy (push to main). Then run: $0 schedule && $0 enable
NEXT
}

cmd_schedule() {
  echo "== EventBridge schedule -> $ENDPOINT"
  param_exists CRON_SECRET || die "run '$0 secrets' first"
  local conn_arn dest_arn rule_arn role_arn dlq_url dlq_arn
  # Connection: API-key auth sends "Authorization: <CRON_SECRET>". EventBridge
  # keeps the value in its own Secrets Manager secret.
  if aws events describe-connection --name "$NAME" >/dev/null 2>&1; then
    read_param CRON_SECRET | jq -Rn --arg n "$NAME" '{Name:$n, AuthorizationType:"API_KEY", AuthParameters:{ApiKeyAuthParameters:{ApiKeyName:"Authorization", ApiKeyValue:input}}}' \
      | aws_json events update-connection
  else
    read_param CRON_SECRET | jq -Rn --arg n "$NAME" '{Name:$n, AuthorizationType:"API_KEY", AuthParameters:{ApiKeyAuthParameters:{ApiKeyName:"Authorization", ApiKeyValue:input}}}' \
      | aws_json events create-connection
  fi
  for _ in $(seq 1 20); do
    [ "$(aws events describe-connection --name "$NAME" --query ConnectionState --output text)" = "AUTHORIZED" ] && break; sleep 3
  done
  conn_arn=$(aws events describe-connection --name "$NAME" --query ConnectionArn --output text)

  if aws events describe-api-destination --name "$NAME" >/dev/null 2>&1; then
    aws events update-api-destination --name "$NAME" --connection-arn "$conn_arn" --invocation-endpoint "$ENDPOINT" --http-method POST --invocation-rate-limit-per-second 1 >/dev/null
  else
    aws events create-api-destination --name "$NAME" --connection-arn "$conn_arn" --invocation-endpoint "$ENDPOINT" --http-method POST --invocation-rate-limit-per-second 1 >/dev/null
  fi
  dest_arn=$(aws events describe-api-destination --name "$NAME" --query ApiDestinationArn --output text)

  # Rule first (DISABLED unless it already exists, so re-runs keep its state).
  if aws events describe-rule --name "$NAME" >/dev/null 2>&1; then
    aws events put-rule --name "$NAME" --schedule-expression "$SCHEDULE" --state "$(aws events describe-rule --name "$NAME" --query State --output text)" >/dev/null
  else
    aws events put-rule --name "$NAME" --schedule-expression "$SCHEDULE" --state DISABLED --description "NauriCare reminder sweep" >/dev/null
  fi
  rule_arn=$(aws events describe-rule --name "$NAME" --query Arn --output text)

  # Role EventBridge assumes to call the API destination.
  if ! aws iam get-role --role-name "${NAME}-invoke" >/dev/null 2>&1; then
    aws iam create-role --role-name "${NAME}-invoke" --assume-role-policy-document \
      '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"events.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
  fi
  aws iam put-role-policy --role-name "${NAME}-invoke" --policy-name invoke-api-destination --policy-document \
    "$(jq -nc --arg d "$dest_arn" '{Version:"2012-10-17", Statement:[{Effect:"Allow", Action:"events:InvokeApiDestination", Resource:$d}]}')"
  role_arn=$(aws iam get-role --role-name "${NAME}-invoke" --query Role.Arn --output text)

  # Dead-letter queue for invocations that fail after retries (alarm on it).
  dlq_url=$(aws sqs create-queue --queue-name "${NAME}-dlq" --attributes MessageRetentionPeriod=1209600 --query QueueUrl --output text)
  dlq_arn=$(aws sqs get-queue-attributes --queue-url "$dlq_url" --attribute-names QueueArn --query Attributes.QueueArn --output text)
  aws sqs set-queue-attributes --queue-url "$dlq_url" --attributes "$(jq -nc --arg q "$dlq_arn" --arg r "$rule_arn" \
    '{Policy: ({Version:"2012-10-17", Statement:[{Effect:"Allow", Principal:{Service:"events.amazonaws.com"}, Action:"sqs:SendMessage", Resource:$q, Condition:{ArnEquals:{"aws:SourceArn":$r}}}]} | tostring)}')"

  sleep 8 # IAM propagation
  aws events put-targets --rule "$NAME" --targets "$(jq -nc --arg d "$dest_arn" --arg r "$role_arn" --arg q "$dlq_arn" \
    '[{Id:"cron-execute", Arn:$d, RoleArn:$r, Input:"{}", RetryPolicy:{MaximumRetryAttempts:2, MaximumEventAgeInSeconds:3600}, DeadLetterConfig:{Arn:$q}}]')" >/dev/null
  echo "  rule '$NAME' ($SCHEDULE) -> $ENDPOINT, state: $(aws events describe-rule --name "$NAME" --query State --output text)"
  echo "  Cloudflare: add a WAF custom rule 'Skip' (Bot Fight Mode / managed challenges) for: http.request.uri.path eq \"/api/cron/execute\""
}

cmd_enable() { aws events enable-rule --name "$NAME"; echo "enabled $NAME"; }
cmd_disable() { aws events disable-rule --name "$NAME"; echo "disabled $NAME"; }

cmd_rotate_cron() {
  param_exists CRON_SECRET || die "no CRON_SECRET to rotate"
  read_param CRON_SECRET | { IFS= read -r old; put_param CRON_SECRET_PREVIOUS "$old"; }
  put_param CRON_SECRET "$(openssl rand -hex 32)"
  echo "Next: set APP_SSM_SECRETS=DATA_ENCRYPTION_KEY,CRON_SECRET,CRON_SECRET_PREVIOUS, deploy, run '$0 schedule',"
  echo "      confirm a healthy run (GET /api/admin/cron), then '$0 drop-previous' and remove it from APP_SSM_SECRETS."
}
cmd_drop_previous() { aws ssm delete-parameter --name "${PREFIX}/CRON_SECRET_PREVIOUS"; echo "deleted CRON_SECRET_PREVIOUS"; }

cmd_status() {
  for p in DATA_ENCRYPTION_KEY CRON_SECRET CRON_SECRET_PREVIOUS; do
    if param_exists "$p"; then echo "  $p: set ($(param_arn "$p"))"; else echo "  $p: missing"; fi
  done
  aws events describe-rule --name "$NAME" --query '{rule:Name,state:State,schedule:ScheduleExpression}' --output table 2>/dev/null || echo "  rule: missing"
  aws events describe-connection --name "$NAME" --query '{connection:Name,state:ConnectionState}' --output table 2>/dev/null || echo "  connection: missing"
}

case "${1:-}" in
  secrets) cmd_secrets ;; schedule) cmd_schedule ;; enable) cmd_enable ;; disable) cmd_disable ;;
  rotate-cron) cmd_rotate_cron ;; drop-previous) cmd_drop_previous ;; status) cmd_status ;;
  *) sed -n '2,25p' "$0"; exit 1 ;;
esac
