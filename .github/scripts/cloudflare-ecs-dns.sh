#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Point Cloudflare DNS (proxied A records) at the public IPs of the healthy,
# running tasks of an ECS Fargate service. Used by the production deploy and
# by the scheduled "Cloudflare DNS Sync" workflow.
#
# Required env:
#   ECS_CLUSTER, ECS_SERVICE, AWS_REGION   which service to read
#   CF_API_TOKEN, CF_ZONE_ID               Cloudflare token (Zone > DNS > Edit)
#   DNS_NAMES                              space-separated, e.g. "nauricare.org www.nauricare.org"
# Optional env:
#   MODE=add|reconcile   add: only create missing records (safe mid-rollout)
#                        reconcile (default): also delete records for IPs that
#                        are no longer serving
#   TASK_DEF=<arn>       only consider tasks running this task definition
#
# Safety rules:
#   * never deletes the last record: if no healthy task is found, it exits 1
#     and leaves DNS untouched
#   * only HEALTHY tasks count (the deploy adds an ECS container health check)
#   * IPs are masked in logs (the repo is public; don't advertise the origin)
#   * a name that is a CNAME (e.g. www -> apex) is left alone
#   * only records this script created (tagged with MANAGED_COMMENT) are ever
#     deleted. Records it didn't create -- e.g. the old server's A record --
#     are left in place and reported, so the first cutover can't take the
#     site down; delete them in Cloudflare once ECS is confirmed serving.
# ----------------------------------------------------------------------------
set -euo pipefail

: "${ECS_CLUSTER:?}" "${ECS_SERVICE:?}" "${AWS_REGION:?}" "${DNS_NAMES:?}"
: "${CF_API_TOKEN:?CF_API_TOKEN is empty. Add the CLOUDFLARE_API_TOKEN secret (repository-level).}"
: "${CF_ZONE_ID:?CF_ZONE_ID is empty. Add the CLOUDFLARE_ZONE_ID secret (repository-level).}"
MODE="${MODE:-reconcile}"
TASK_DEF="${TASK_DEF:-}"
CF_API="https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records"
MANAGED_COMMENT="managed by CI: ECS task"

cf() { # cf METHOD PATH [JSON]  -> prints response body, fails on API error
  local method="$1" path="$2" body="${3:-}" resp
  resp=$(curl -sS --fail-with-body --retry 3 --retry-delay 2 -X "$method" "${CF_API}${path}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json" \
    ${body:+--data "$body"}) || { echo "::error::Cloudflare API $method failed: $(echo "$resp" | jq -c '.errors' 2>/dev/null || echo "$resp")" >&2; return 1; }
  if [ "$(echo "$resp" | jq -r '.success' 2>/dev/null)" != "true" ]; then
    echo "::error::Cloudflare API $method returned errors: $(echo "$resp" | jq -c '.errors' 2>/dev/null || echo "$resp")" >&2; return 1
  fi
  echo "$resp"
}

# --- 1. Public IPs of healthy running tasks ---------------------------------
mapfile -t TASK_ARNS < <(aws ecs list-tasks --cluster "$ECS_CLUSTER" --service-name "$ECS_SERVICE" \
  --desired-status RUNNING --query 'taskArns[]' --output text | tr '\t' '\n' | sed '/^$/d')
if [ "${#TASK_ARNS[@]}" -eq 0 ]; then
  echo "::error::No running tasks for $ECS_SERVICE. DNS left unchanged."; exit 1
fi

ENIS=$(aws ecs describe-tasks --cluster "$ECS_CLUSTER" --tasks "${TASK_ARNS[@]}" --output json | jq -r --arg td "$TASK_DEF" '
  .tasks[]
  | select(.lastStatus == "RUNNING" and .healthStatus == "HEALTHY")
  | select($td == "" or .taskDefinitionArn == $td)
  | .attachments[] | select(.type == "ElasticNetworkInterface")
  | .details[] | select(.name == "networkInterfaceId") | .value')
if [ -z "$ENIS" ]; then
  echo "::error::No HEALTHY running tasks${TASK_DEF:+ on $TASK_DEF}. DNS left unchanged."; exit 1
fi

# shellcheck disable=SC2086
mapfile -t DESIRED < <(aws ec2 describe-network-interfaces --network-interface-ids $ENIS \
  --query 'NetworkInterfaces[].Association.PublicIp' --output text | tr '\t' '\n' | sed '/^$/d;/^None$/d' | sort -u)
if [ "${#DESIRED[@]}" -eq 0 ]; then
  echo "::error::Healthy tasks have no public IP. Enable 'assignPublicIp' in the service's network configuration."; exit 1
fi
for ip in "${DESIRED[@]}"; do echo "::add-mask::$ip"; done
echo "Healthy task IPs: ${#DESIRED[@]} (mode: $MODE)"

# --- 2. Reconcile each DNS name ---------------------------------------------
changed=0
for name in $DNS_NAMES; do
  # Assign first so an API failure stops the script (set -e) with its message.
  cnames=$(cf GET "?type=CNAME&name=${name}")
  if [ "$(echo "$cnames" | jq '.result | length')" -gt 0 ]; then
    echo "$name is a CNAME; leaving it as is."; continue
  fi
  existing=$(cf GET "?type=A&name=${name}&per_page=100")
  while read -r ip; do echo "::add-mask::$ip"; done < <(echo "$existing" | jq -r '.result[].content')

  for ip in "${DESIRED[@]}"; do
    if ! echo "$existing" | jq -e --arg ip "$ip" '.result[] | select(.content == $ip)' >/dev/null; then
      cf POST "" "$(jq -nc --arg n "$name" --arg ip "$ip" --arg mc "$MANAGED_COMMENT" '{type:"A",name:$n,content:$ip,ttl:1,proxied:true,comment:$mc}')" >/dev/null
      echo "$name: added a record for a new task"; changed=1
    fi
  done

  if [ "$MODE" = "reconcile" ]; then
    # Only reached when DESIRED is non-empty, so a name can never end up empty.
    while read -r id ip; do
      [ -z "$id" ] && continue
      if ! printf '%s\n' "${DESIRED[@]}" | grep -qxF "$ip"; then
        cf DELETE "/$id" >/dev/null
        echo "$name: removed a record for a task that is no longer serving"; changed=1
      fi
    done < <(echo "$existing" | jq -r --arg mc "$MANAGED_COMMENT" '.result[] | select(.comment == $mc) | "\(.id) \(.content)"')
  fi

  unmanaged=$(echo "$existing" | jq --arg mc "$MANAGED_COMMENT" '[.result[] | select(.comment != $mc)] | length')
  if [ "$unmanaged" -gt 0 ]; then
    echo "::notice::$name still has $unmanaged A record(s) not created by CI (e.g. the old server). Traffic is shared with it until you delete those records in Cloudflare."
  fi
done

[ "$changed" -eq 1 ] && echo "DNS updated." || echo "DNS already up to date."
