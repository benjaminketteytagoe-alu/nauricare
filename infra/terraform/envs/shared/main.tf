# Account-wide resources used by every environment: the image registry and the
# GitHub OIDC roles. Apply this root first (after ../../bootstrap).

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "account_id" { type = string }

variable "github_repository" {
  type    = string
  default = "benjaminketteytagoe-alu/nauricare"
}

variable "create_oidc_provider" {
  type    = bool
  default = true
}

variable "state_bucket_name" { type = string }

variable "state_kms_key_arn" {
  type    = string
  default = null
}

variable "create_apply_role" {
  type    = bool
  default = false
}

variable "services" {
  description = "ECS services CI may deploy. Role names must match the ecs-service module (or the imported production roles)."
  type = map(object({
    cluster_name        = string
    service_name        = string
    execution_role_name = string
    task_role_name      = string
  }))
  default = {
    production = {
      cluster_name        = "default"
      service_name        = "nauricare-api-0acf"
      execution_role_name = "nauricare-api-0acf-execution"
      task_role_name      = "nauricare-api-0acf-task"
    }
    staging = {
      cluster_name        = "nauricare-staging"
      service_name        = "nauricare-staging"
      execution_role_name = "nauricare-staging-execution"
      task_role_name      = "nauricare-staging-task"
    }
  }
}

module "ecr" {
  source = "../../modules/ecr"
}

module "github_oidc" {
  source             = "../../modules/github-oidc"
  repository         = var.github_repository
  create_provider    = var.create_oidc_provider
  ecr_repository_arn = module.ecr.repository_arn
  state_bucket_arn   = "arn:aws:s3:::${var.state_bucket_name}"
  state_kms_key_arn  = var.state_kms_key_arn
  create_apply_role  = var.create_apply_role
  ecs_services = {
    for env, s in var.services : env => {
      cluster_name       = s.cluster_name
      service_name       = s.service_name
      task_family        = s.service_name
      execution_role_arn = "arn:aws:iam::${var.account_id}:role/${s.execution_role_name}"
      task_role_arn      = "arn:aws:iam::${var.account_id}:role/${s.task_role_name}"
    }
  }
}

output "ecr_repository_url" { value = module.ecr.repository_url }
output "deploy_role_arn" {
  value       = module.github_oidc.deploy_role_arn
  description = "Set as the GitHub variable AWS_ROLE_ARN."
}
output "plan_role_arn" {
  value       = module.github_oidc.plan_role_arn
  description = "Set as the GitHub variable TF_PLAN_ROLE_ARN."
}
output "apply_role_arn" { value = module.github_oidc.apply_role_arn }
