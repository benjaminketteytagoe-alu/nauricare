variable "name" {
  type        = string
  description = "Service name, e.g. nauricare-api-0acf (production) or nauricare-staging."
}

variable "environment" {
  type        = string
  description = "staging | production (used for APP_ENV and naming)."
}

variable "cluster_name" {
  type        = string
  description = "ECS cluster name. Production's existing cluster is `default`."
}

variable "image" {
  type        = string
  description = "Bootstrap image for the first task definition only. CI registers every later revision (by digest); Terraform never rolls the service back to this."
}

variable "container_name" {
  type    = string
  default = "nauricare-api"
}

variable "container_port" {
  type    = number
  default = 3000
}

variable "cpu" {
  type    = number
  default = 512
}

variable "memory" {
  type    = number
  default = 1024
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "subnet_ids" { type = list(string) }

variable "security_group_ids" { type = list(string) }

variable "environment_variables" {
  type        = map(string)
  default     = {}
  description = "Non-secret runtime configuration (NEXTAUTH_URL, EMAIL_FROM, AWS_S3_BUCKET_NAME…)."
}

variable "secret_arns" {
  type        = map(string)
  default     = {}
  description = "Env var name => SSM parameter ARN, injected at task start. Values never pass through Terraform."
}

variable "ssm_prefix" {
  type        = string
  description = "SSM path the execution role may read, e.g. /nauricare/production/."
}

variable "uploads_bucket_arn" {
  type        = string
  default     = null
  description = "S3 bucket for user media. The task role gets object read/write on it (replaces static AWS keys)."
}

variable "log_retention_days" {
  type    = number
  default = 90
}

variable "log_kms_key_arn" {
  type    = string
  default = null
}

variable "execution_role_name" {
  type        = string
  default     = null
  description = "Override to adopt an existing execution role via `import` (default: <name>-execution)."
}

variable "task_role_name" {
  type        = string
  default     = null
  description = "Override to adopt an existing task role via `import` (default: <name>-task)."
}
