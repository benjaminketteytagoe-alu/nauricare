# Staging: a separate cluster, service, secrets path and database (never
# production data). CI deploys `develop` here once vars.STAGING_ECS_SERVICE is
# set to the service name below.

module "app" {
  source = "../../modules/app-environment"

  environment     = "staging"
  cluster_name    = "nauricare-staging"
  service_name    = "nauricare-staging"
  domain          = "staging.nauricare.org"
  bootstrap_image = var.bootstrap_image
  desired_count   = 1
  cpu             = 256
  memory          = 512

  secret_names          = var.secret_names
  environment_variables = merge({ EMAIL_FROM = "onboarding@resend.dev" }, var.environment_variables)
  uploads_bucket_name   = var.uploads_bucket_name

  reminders_enabled = var.reminders_enabled

  alert_emails       = var.alert_emails
  monthly_budget_usd = var.monthly_budget_usd
  log_retention_days = 30
}

output "app" { value = module.app }
