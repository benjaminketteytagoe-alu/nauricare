# EventBridge schedule that triggers the reminder sweep:
#   rule (rate) -> API destination -> POST <endpoint>  Authorization: <CRON_SECRET>
#   2 retries, then the SQS dead-letter queue (alarmed in the observability module).
# Mirrors .github/scripts/setup-reminder-scheduler.sh resource-for-resource so
# the existing setup can be imported (see envs/production/imports.tf.example).
#
# The connection's API key is CRON_SECRET. Terraform creates the connection
# with a placeholder and ignores the value afterwards, so the secret never
# enters state. Push the real value (and rotate it) with:
#   .github/scripts/setup-reminder-scheduler.sh schedule

variable "name" {
  type    = string
  default = "nauricare-reminders"
}

variable "endpoint" {
  type        = string
  description = "e.g. https://nauricare.org/api/cron/execute"
}

variable "schedule" {
  type    = string
  default = "rate(15 minutes)"
}

variable "enabled" {
  type        = bool
  default     = false
  description = "Rule state. Enable only after the connection holds the real CRON_SECRET."
}

data "aws_caller_identity" "current" {}

resource "aws_cloudwatch_event_connection" "this" {
  name               = var.name
  authorization_type = "API_KEY"
  auth_parameters {
    api_key {
      key   = "Authorization"
      value = "placeholder-set-by-setup-reminder-scheduler-sh"
    }
  }
  lifecycle { ignore_changes = [auth_parameters] }
}

resource "aws_cloudwatch_event_api_destination" "this" {
  name                             = var.name
  connection_arn                   = aws_cloudwatch_event_connection.this.arn
  invocation_endpoint              = var.endpoint
  http_method                      = "POST"
  invocation_rate_limit_per_second = 1
}

resource "aws_cloudwatch_event_rule" "this" {
  name                = var.name
  description         = "NauriCare reminder sweep"
  schedule_expression = var.schedule
  state               = var.enabled ? "ENABLED" : "DISABLED"
}

resource "aws_iam_role" "invoke" {
  name = "${var.name}-invoke"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = { StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id } }
    }]
  })
}

resource "aws_iam_role_policy" "invoke" {
  name = "invoke-api-destination"
  role = aws_iam_role.invoke.id
  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Action = "events:InvokeApiDestination", Resource = aws_cloudwatch_event_api_destination.this.arn }]
  })
}

resource "aws_sqs_queue" "dlq" {
  name                      = "${var.name}-dlq"
  message_retention_seconds = 1209600 # 14 days
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue_policy" "dlq" {
  queue_url = aws_sqs_queue.dlq.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.dlq.arn
      Condition = { ArnEquals = { "aws:SourceArn" = aws_cloudwatch_event_rule.this.arn } }
    }]
  })
}

resource "aws_cloudwatch_event_target" "this" {
  rule      = aws_cloudwatch_event_rule.this.name
  target_id = "cron-execute"
  arn       = aws_cloudwatch_event_api_destination.this.arn
  role_arn  = aws_iam_role.invoke.arn
  input     = "{}"

  retry_policy {
    maximum_retry_attempts       = 2
    maximum_event_age_in_seconds = 3600
  }

  dead_letter_config { arn = aws_sqs_queue.dlq.arn }
}

output "rule_name" { value = aws_cloudwatch_event_rule.this.name }
output "dlq_name" { value = aws_sqs_queue.dlq.name }
