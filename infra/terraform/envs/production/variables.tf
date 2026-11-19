variable "region" {
  type    = string
  default = "us-east-1"
}

variable "account_id" {
  type        = string
  description = "AWS account id. The provider refuses to run against any other account."
}

variable "bootstrap_image" {
  type        = string
  description = "<registry>/nauricare-api@sha256:<digest>, used only when the task definition is first created."
}

variable "alert_emails" {
  type    = list(string)
  default = []
}

variable "uploads_bucket_name" {
  type    = string
  default = null
}

variable "secret_names" {
  type = list(string)
  default = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "DATA_ENCRYPTION_KEY",
    "CRON_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "TURNSTILE_SECRET_KEY",
    "RESEND_API_KEY",
  ]
}

variable "environment_variables" {
  type    = map(string)
  default = {}
}

variable "reminders_enabled" {
  type    = bool
  default = false
}

variable "monthly_budget_usd" {
  type    = number
  default = null
}

variable "execution_role_name" {
  type        = string
  default     = null
  description = "Name of the existing execution role, to import it instead of creating a new one."
}

variable "task_role_name" {
  type    = string
  default = null
}
