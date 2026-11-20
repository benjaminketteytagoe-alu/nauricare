# Production: adopts the existing hand-built resources (cluster `default`,
# service `nauricare-api-0acf`, reminders schedule). Run the imports in
# imports.tf.example before the first apply; see ../../README.md.

module "app" {
  source = "../../modules/app-environment"

  environment     = "production"
  cluster_name    = "default"
  service_name    = "nauricare-api-0acf"
  domain          = "nauricare.org"
  bootstrap_image = var.bootstrap_image
  desired_count   = 1
  cpu             = 512
  memory          = 1024

  secret_names          = var.secret_names
  environment_variables = merge({ EMAIL_FROM = "appointments@nauricare.com" }, var.environment_variables)
  uploads_bucket_name   = var.uploads_bucket_name
  execution_role_name   = var.execution_role_name
  task_role_name        = var.task_role_name

  # Same names as .github/scripts/setup-reminder-scheduler.sh, for import.
  reminders_name    = "nauricare-reminders"
  reminders_enabled = var.reminders_enabled

  alert_emails       = var.alert_emails
  monthly_budget_usd = var.monthly_budget_usd
  log_retention_days = 365
}

output "app" { value = module.app }
