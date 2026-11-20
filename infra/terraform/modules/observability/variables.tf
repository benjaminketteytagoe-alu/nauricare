variable "name" {
  type        = string
  description = "Prefix for alarm names, e.g. nauricare-production."
}

variable "environment" { type = string }

variable "alert_emails" {
  type        = list(string)
  default     = []
  description = "Addresses subscribed to the alerts topic (each must confirm by e-mail)."
}

variable "cluster_name" { type = string }
variable "service_name" { type = string }
variable "log_group_name" { type = string }

variable "desired_count" {
  type    = number
  default = 1
}

variable "health_check_fqdn" {
  type        = string
  default     = null
  description = "Public hostname for the uptime check (e.g. nauricare.org). Null disables it."
}

variable "health_check_path" {
  type    = string
  default = "/api/health/ready"
}

variable "reminders_rule_name" {
  type    = string
  default = null
}

variable "reminders_dlq_name" {
  type    = string
  default = null
}

variable "reminders_expected" {
  type        = bool
  default     = false
  description = "Alarm when no reminder sweep succeeded for an hour (enable once the schedule is on)."
}

variable "error_threshold" {
  type        = number
  default     = 5
  description = "Server errors per 5 minutes that page."
}

variable "monthly_budget_usd" {
  type        = number
  default     = null
  description = "Monthly cost budget for the account; alerts at 80% actual and 100% forecast. Null disables it."
}
