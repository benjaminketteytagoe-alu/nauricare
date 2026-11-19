# Everything one environment (staging or production) needs, composed from the
# single-purpose modules. envs/<env>/main.tf only sets inputs.

variable "environment" {
  type = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

variable "service_name" { type = string }
variable "cluster_name" { type = string }

variable "domain" {
  type        = string
  description = "Public hostname, e.g. nauricare.org or staging.nauricare.org."
}

variable "bootstrap_image" {
  type        = string
  description = "Image for the first task definition (any existing digest). CI deploys every later one."
}

variable "vpc_id" {
  type    = string
  default = null
}

variable "subnet_ids" {
  type    = list(string)
  default = null
}

variable "restrict_ingress_to_cloudflare" {
  type    = bool
  default = true
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "cpu" {
  type    = number
  default = 512
}

variable "memory" {
  type    = number
  default = 1024
}

variable "secret_names" {
  type        = list(string)
  description = "SSM SecureString names under /nauricare/<env>/ injected as env vars."
}

variable "environment_variables" {
  type    = map(string)
  default = {}
}

variable "uploads_bucket_name" {
  type    = string
  default = null
}

variable "execution_role_name" {
  type    = string
  default = null
}

variable "task_role_name" {
  type    = string
  default = null
}

variable "reminders_name" {
  type    = string
  default = null
}

variable "reminders_enabled" {
  type    = bool
  default = false
}

variable "alert_emails" {
  type    = list(string)
  default = []
}

variable "monthly_budget_usd" {
  type    = number
  default = null
}

variable "log_retention_days" {
  type    = number
  default = 90
}

locals {
  ssm_prefix     = "/nauricare/${var.environment}/"
  reminders_name = coalesce(var.reminders_name, "nauricare-${var.environment}-reminders")
}

module "network" {
  source                         = "../network"
  name                           = var.service_name
  vpc_id                         = var.vpc_id
  subnet_ids                     = var.subnet_ids
  restrict_ingress_to_cloudflare = var.restrict_ingress_to_cloudflare
}

module "secrets" {
  source = "../ssm-params"
  prefix = local.ssm_prefix
  names  = var.secret_names
}

module "service" {
  source              = "../ecs-service"
  name                = var.service_name
  environment         = var.environment
  cluster_name        = var.cluster_name
  image               = var.bootstrap_image
  desired_count       = var.desired_count
  cpu                 = var.cpu
  memory              = var.memory
  subnet_ids          = module.network.subnet_ids
  security_group_ids  = [module.network.app_security_group_id]
  ssm_prefix          = local.ssm_prefix
  secret_arns         = module.secrets.arns
  log_retention_days  = var.log_retention_days
  execution_role_name = var.execution_role_name
  task_role_name      = var.task_role_name
  uploads_bucket_arn  = var.uploads_bucket_name == null ? null : "arn:aws:s3:::${var.uploads_bucket_name}"
  environment_variables = merge(
    {
      NEXTAUTH_URL = "https://${var.domain}"
      AWS_REGION   = data.aws_region.current.region
    },
    var.uploads_bucket_name == null ? {} : { AWS_S3_BUCKET_NAME = var.uploads_bucket_name },
    var.environment_variables,
  )
}

module "reminders" {
  source   = "../reminders-cron"
  name     = local.reminders_name
  endpoint = "https://${var.domain}/api/cron/execute"
  enabled  = var.reminders_enabled
}

module "observability" {
  source              = "../observability"
  name                = "nauricare-${var.environment}"
  environment         = var.environment
  alert_emails        = var.alert_emails
  cluster_name        = module.service.cluster_name
  service_name        = module.service.service_name
  log_group_name      = module.service.log_group_name
  desired_count       = var.desired_count
  health_check_fqdn   = var.domain
  reminders_rule_name = module.reminders.rule_name
  reminders_dlq_name  = module.reminders.dlq_name
  reminders_expected  = var.reminders_enabled
  monthly_budget_usd  = var.monthly_budget_usd
}

data "aws_region" "current" {}

output "cluster_name" { value = module.service.cluster_name }
output "service_name" { value = module.service.service_name }
output "task_family" { value = module.service.task_family }
output "execution_role_arn" { value = module.service.execution_role_arn }
output "task_role_arn" { value = module.service.task_role_arn }
output "log_group_name" { value = module.service.log_group_name }
output "alerts_topic_arn" { value = module.observability.alerts_topic_arn }
output "app_security_group_id" { value = module.network.app_security_group_id }
