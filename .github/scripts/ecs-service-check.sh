#!/usr/bin/env bash
# Find or verify the ECS service the pipeline deploys to. Read-only.
#
#   .github/scripts/ecs-service-check.sh scan
#       Run once by an AWS admin (e.g. after `aws login`). Lists every ECS
#       cluster and service in every enabled region and prints the exact
#       GitHub repository variables to set.
#
#   .github/scripts/ecs-service-check.sh check
#       Used by CI before deploying. Verifies ECS_SERVICE exists and is ACTIVE
#       in ECS_CLUSTER / AWS_REGION for the current credentials. ECS_SERVICE may
#       be a name or a full ARN (an ARN must agree with region, account and
#       cluster). On failure, prints what does exist instead of a bare
#       "not found".
set -euo pipefail
export AWS_PAGER=""

err() { if [ -n "${GITHUB_ACTIONS:-}" ]; then echo "::error::$*"; else echo "error: $*" >&2; fi; }

identity() {
  aws sts get-caller-identity --query '[Account,Arn]' --output text
}

# Prints "cluster<TAB>service<TAB>status<TAB>running/desired" for one region.
services_in_region() {
  local region=$1 cluster svcs
  for cluster in $(aws ecs list-clusters --region "$region" --query 'clusterArns[]' --output text 2>/dev/null); do
    svcs=$(aws ecs list-services --region "$region" --cluster "$cluster" --query 'serviceArns[]' --output text 2>/dev/null || true)
    if [ -z "$svcs" ]; then printf '%s\t(no services)\n' "${cluster##*/}"; continue; fi
    # describe-services takes at most 10 services per call.
    printf '%s\n' $svcs | xargs -n 10 aws ecs describe-services --region "$region" --cluster "$cluster" \
      --query 'services[].[serviceName,status,runningCount,desiredCount]' --output text --services 2>/dev/null \
      | while read -r name status running desired; do
          printf '%s\t%s\t%s\t%s/%s running\n' "${cluster##*/}" "$name" "$status" "$running" "$desired"
        done
  done
}

cmd_scan() {
  read -r account arn < <(identity)
  echo "== Account $account ($arn)"
  local regions found=0 out
  regions=$(aws ec2 describe-regions --query 'Regions[].RegionName' --output text 2>/dev/null) \
    || regions="us-east-1 us-east-2 us-west-1 us-west-2 eu-west-1 eu-west-2 eu-central-1 af-south-1"
  for region in $regions; do
    out=$(services_in_region "$region")
    [ -n "$out" ] || continue
    found=1
    echo "-- $region"
    printf '%s\n' "$out" | sed 's/^/   /'
  done
  if [ "$found" = 0 ]; then
    echo "No ECS clusters in any region. Create the service first (see docs/runbooks)."
    return 1
  fi
  cat <<'EOF'

Pick the ACTIVE service that runs the nauricare-api image, then set (no commit needed):
  gh variable set AWS_REGION  --body <region>
  gh variable set ECS_CLUSTER --body <cluster>
  gh variable set ECS_SERVICE --body <service>
EOF
}

cmd_check() {
  : "${AWS_REGION:?}" "${ECS_CLUSTER:?}" "${ECS_SERVICE:?}"
  local account arn cluster="$ECS_CLUSTER" service="$ECS_SERVICE"
  read -r account arn < <(identity)

  # arn:aws:ecs:<region>:<account>:service/<cluster>/<name>
  if [[ "$service" == arn:* ]]; then
    IFS=: read -r _ _ _ s_region s_account s_res <<<"$service"
    IFS=/ read -r _ s_cluster s_name <<<"$s_res"
    [ "$s_region" = "$AWS_REGION" ] || { err "ECS_SERVICE ARN is in $s_region but AWS_REGION is $AWS_REGION."; exit 1; }
    [ "$s_account" = "$account" ] || { err "ECS_SERVICE ARN is in account $s_account but the credentials are for $account ($arn)."; exit 1; }
    [ "$s_cluster" = "${cluster##*/}" ] || { err "ECS_SERVICE ARN is in cluster $s_cluster but ECS_CLUSTER is $cluster."; exit 1; }
    service=$s_name
  fi

  local result status reason
  result=$(aws ecs describe-services --region "$AWS_REGION" --cluster "$cluster" --services "$service" \
    --query '[services[0].status, failures[0].reason]' --output text)
  read -r status reason <<<"$result"
  if [ "$status" = "ACTIVE" ]; then
    echo "ECS service $service is ACTIVE in cluster $cluster ($AWS_REGION, account $account)."
    return 0
  fi

  if [ "$status" != "None" ]; then
    err "ECS service $service in cluster $cluster is $status (deleted or being deleted), not ACTIVE."
  else
    err "ECS service $service not found in cluster $cluster ($AWS_REGION, account $account): ${reason:-unknown}."
  fi
  echo "What exists in $AWS_REGION for these credentials:"
  local out
  out=$(services_in_region "$AWS_REGION")
  if [ -n "$out" ]; then printf '%s\n' "$out" | sed 's/^/   /'
  else echo "   nothing (or the CI user lacks ecs:ListClusters / ecs:ListServices)"; fi
  echo "Fix: run '.github/scripts/ecs-service-check.sh scan' as an admin, then set the"
  echo "AWS_REGION / ECS_CLUSTER / ECS_SERVICE repository variables to what it reports."
  exit 1
}

case "${1:-}" in
  scan)  cmd_scan ;;
  check) cmd_check ;;
  *) echo "usage: $0 scan|check" >&2; exit 2 ;;
esac
