# Alerts for one environment. Everything notifies one SNS topic:
#   - server errors (structured logs -> metric filters), see apps/web/src/lib/logger.ts
#   - ECS: CPU, memory, running tasks below desired, tasks that crash or fail to start
#   - uptime + latency from Route 53 health checks against /api/health/ready
#   - reminder sweep: EventBridge failures, dead letters, and "no successful run"
# Responses to each alarm: docs/runbooks/observability.md.

locals {
  ns          = "NauriCare/${var.environment}"
  alarm_topic = [aws_sns_topic.alerts.arn]
}

data "aws_caller_identity" "current" {}

resource "aws_sns_topic" "alerts" {
  name              = "${var.name}-alerts"
  kms_master_key_id = aws_kms_key.alerts.arn
}

resource "aws_sns_topic_subscription" "email" {
  for_each  = toset(var.alert_emails)
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

data "aws_iam_policy_document" "alerts" {
  statement {
    sid       = "AccountPublish"
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.alerts.arn]
    principals {
      type        = "Service"
      identifiers = ["cloudwatch.amazonaws.com", "events.amazonaws.com", "budgets.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_sns_topic_policy" "alerts" {
  arn    = aws_sns_topic.alerts.arn
  policy = data.aws_iam_policy_document.alerts.json
}

# The aws/sns key cannot grant other services; CloudWatch and EventBridge need
# a key they may use. A dedicated CMK keeps the topic encrypted at rest.
resource "aws_kms_key" "alerts" {
  description         = "${var.name} alerts topic"
  enable_key_rotation = true
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "Account"
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Sid       = "Publishers"
        Effect    = "Allow"
        Principal = { Service = ["cloudwatch.amazonaws.com", "events.amazonaws.com", "budgets.amazonaws.com"] }
        Action    = ["kms:Decrypt", "kms:GenerateDataKey*"]
        Resource  = "*"
      },
    ]
  })
}

# ------------------------------------------------------------- app errors
resource "aws_cloudwatch_log_metric_filter" "errors" {
  name           = "${var.name}-errors"
  log_group_name = var.log_group_name
  pattern        = "{ $.level >= 50 }"
  metric_transformation {
    name          = "ServerErrors"
    namespace     = local.ns
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "cron_runs" {
  name           = "${var.name}-cron-runs"
  log_group_name = var.log_group_name
  pattern        = "{ $.event = \"cron.reminders_run\" && $.ok IS TRUE }"
  metric_transformation {
    name      = "ReminderSweepsSucceeded"
    namespace = local.ns
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "errors" {
  alarm_name          = "${var.name}-server-errors"
  alarm_description   = "More than ${var.error_threshold} server errors in 5 minutes. Logs Insights: filter level >= 50."
  namespace           = local.ns
  metric_name         = "ServerErrors"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = var.error_threshold
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_topic
  ok_actions          = local.alarm_topic
}

# ------------------------------------------------------------- ECS
locals {
  ecs_dims = { ClusterName = var.cluster_name, ServiceName = var.service_name }
}

resource "aws_cloudwatch_metric_alarm" "cpu" {
  alarm_name          = "${var.name}-cpu-high"
  alarm_description   = "Service CPU above 80% for 15 minutes."
  namespace           = "AWS/ECS"
  metric_name         = "CPUUtilization"
  dimensions          = local.ecs_dims
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 3
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "missing"
  alarm_actions       = local.alarm_topic
  ok_actions          = local.alarm_topic
}

resource "aws_cloudwatch_metric_alarm" "memory" {
  alarm_name          = "${var.name}-memory-high"
  alarm_description   = "Service memory above 85% for 15 minutes (risk of OOM kills)."
  namespace           = "AWS/ECS"
  metric_name         = "MemoryUtilization"
  dimensions          = local.ecs_dims
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 3
  threshold           = 85
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "missing"
  alarm_actions       = local.alarm_topic
  ok_actions          = local.alarm_topic
}

resource "aws_cloudwatch_metric_alarm" "running_tasks" {
  alarm_name          = "${var.name}-tasks-below-desired"
  alarm_description   = "Fewer running tasks than desired for 5 minutes."
  namespace           = "ECS/ContainerInsights"
  metric_name         = "RunningTaskCount"
  dimensions          = local.ecs_dims
  statistic           = "Minimum"
  period              = 60
  evaluation_periods  = 5
  threshold           = var.desired_count
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "breaching"
  alarm_actions       = local.alarm_topic
  ok_actions          = local.alarm_topic
}

resource "aws_cloudwatch_event_rule" "task_crashed" {
  name        = "${var.name}-task-crashed"
  description = "An app task stopped unexpectedly or failed to start."
  event_pattern = jsonencode({
    source      = ["aws.ecs"]
    detail-type = ["ECS Task State Change"]
    detail = {
      clusterArn = [{ wildcard = "*:cluster/${var.cluster_name}" }]
      group      = ["service:${var.service_name}"]
      lastStatus = ["STOPPED"]
      stopCode   = ["TaskFailedToStart", "EssentialContainerExited"]
    }
  })
}

resource "aws_cloudwatch_event_target" "task_crashed" {
  rule = aws_cloudwatch_event_rule.task_crashed.name
  arn  = aws_sns_topic.alerts.arn
  input_transformer {
    input_paths = {
      reason = "$.detail.stoppedReason"
      code   = "$.detail.stopCode"
      task   = "$.detail.taskArn"
    }
    input_template = "\"${var.name}: task <task> stopped (<code>): <reason>\""
  }
}

# ------------------------------------------------------------- uptime
resource "aws_route53_health_check" "ready" {
  count             = var.health_check_fqdn == null ? 0 : 1
  fqdn              = var.health_check_fqdn
  type              = "HTTPS_STR_MATCH"
  resource_path     = var.health_check_path
  search_string     = "\"status\":\"ok\""
  port              = 443
  request_interval  = 30
  failure_threshold = 3
  measure_latency   = true
  enable_sni        = true
  tags              = { Name = "${var.name}-ready" }
}

resource "aws_cloudwatch_metric_alarm" "uptime" {
  count               = var.health_check_fqdn == null ? 0 : 1
  alarm_name          = "${var.name}-down"
  alarm_description   = "https://${var.health_check_fqdn}${var.health_check_path} is failing from Route 53 checkers (app or database down)."
  namespace           = "AWS/Route53"
  metric_name         = "HealthCheckStatus"
  dimensions          = { HealthCheckId = aws_route53_health_check.ready[0].id }
  statistic           = "Minimum"
  period              = 60
  evaluation_periods  = 2
  threshold           = 1
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "breaching"
  alarm_actions       = local.alarm_topic
  ok_actions          = local.alarm_topic
}

resource "aws_cloudwatch_metric_alarm" "latency" {
  count               = var.health_check_fqdn == null ? 0 : 1
  alarm_name          = "${var.name}-slow"
  alarm_description   = "Time to first byte above 1.5 s for 10 minutes."
  namespace           = "AWS/Route53"
  metric_name         = "TimeToFirstByte"
  dimensions          = { HealthCheckId = aws_route53_health_check.ready[0].id }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 1500
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_topic
  ok_actions          = local.alarm_topic
}

# ------------------------------------------------------------- reminders
resource "aws_cloudwatch_metric_alarm" "cron_failed_invocations" {
  count               = var.reminders_rule_name == null ? 0 : 1
  alarm_name          = "${var.name}-reminders-invocation-failed"
  alarm_description   = "EventBridge could not call /api/cron/execute (401/403/5xx or timeout). See docs/runbooks/reminder-scheduler.md."
  namespace           = "AWS/Events"
  metric_name         = "FailedInvocations"
  dimensions          = { RuleName = var.reminders_rule_name }
  statistic           = "Sum"
  period              = 900
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_topic
}

resource "aws_cloudwatch_metric_alarm" "cron_dlq" {
  count               = var.reminders_dlq_name == null ? 0 : 1
  alarm_name          = "${var.name}-reminders-dead-letters"
  alarm_description   = "Reminder sweep invocations exhausted their retries."
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  dimensions          = { QueueName = var.reminders_dlq_name }
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_topic
}

resource "aws_cloudwatch_metric_alarm" "cron_stalled" {
  count               = var.reminders_expected ? 1 : 0
  alarm_name          = "${var.name}-reminders-stalled"
  alarm_description   = "No successful reminder sweep in the last hour (schedule disabled, endpoint failing, or the sweep erroring)."
  namespace           = local.ns
  metric_name         = "ReminderSweepsSucceeded"
  statistic           = "Sum"
  period              = 3600
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "breaching"
  alarm_actions       = local.alarm_topic
  ok_actions          = local.alarm_topic
}

# ------------------------------------------------------------- cost
resource "aws_budgets_budget" "monthly" {
  count        = var.monthly_budget_usd == null ? 0 : 1
  name         = "${var.name}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.alerts.arn]
  }
  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_sns_topic_arns = [aws_sns_topic.alerts.arn]
  }
}

# ------------------------------------------------------------- dashboard
resource "aws_cloudwatch_dashboard" "this" {
  dashboard_name = var.name
  dashboard_body = jsonencode({
    widgets = concat(
      [
        {
          type = "metric", x = 0, y = 0, width = 12, height = 6
          properties = {
            title   = "Server errors (per 5 min)"
            region  = data.aws_region.current.region
            stat    = "Sum"
            period  = 300
            metrics = [[local.ns, "ServerErrors"]]
          }
        },
        {
          type = "metric", x = 12, y = 0, width = 12, height = 6
          properties = {
            title  = "CPU / memory (%)"
            region = data.aws_region.current.region
            period = 300
            metrics = [
              ["AWS/ECS", "CPUUtilization", "ClusterName", var.cluster_name, "ServiceName", var.service_name],
              ["AWS/ECS", "MemoryUtilization", "ClusterName", var.cluster_name, "ServiceName", var.service_name],
            ]
          }
        },
        {
          type = "log", x = 0, y = 6, width = 24, height = 8
          properties = {
            title  = "Latest server errors"
            region = data.aws_region.current.region
            query  = "SOURCE '${var.log_group_name}' | fields @timestamp, event, route, routeType, err.type, err.message, requestId | filter level >= 50 | sort @timestamp desc | limit 50"
            view   = "table"
          }
        },
      ],
      var.health_check_fqdn == null ? [] : [
        {
          type = "metric", x = 0, y = 14, width = 24, height = 6
          properties = {
            title   = "Uptime check: time to first byte (ms)"
            region  = "us-east-1"
            stat    = "Average"
            period  = 300
            metrics = [["AWS/Route53", "TimeToFirstByte", "HealthCheckId", aws_route53_health_check.ready[0].id]]
          }
        },
      ],
    )
  })
}

data "aws_region" "current" {}

output "alerts_topic_arn" { value = aws_sns_topic.alerts.arn }
output "dashboard_name" { value = aws_cloudwatch_dashboard.this.dashboard_name }
