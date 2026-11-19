# GitHub Actions -> AWS without long-lived keys.
#   deploy role : CI image push + ECS deploys (main, develop, staging/production environments)
#   plan role   : read-only `terraform plan` on pull requests
#   apply role  : optional `terraform apply`, only from the protected `infrastructure` environment
# Permissions mirror exactly the AWS CLI calls in .github/workflows/*.yml and
# .github/scripts/*.sh. Add a permission here when a workflow needs a new call.

variable "repository" {
  type        = string
  description = "owner/name of the GitHub repository."
}

variable "create_provider" {
  type        = bool
  default     = true
  description = "Create the account's GitHub OIDC provider. Set false if it already exists (one per account)."
}

variable "ecr_repository_arn" { type = string }

variable "ecs_services" {
  type = map(object({
    cluster_name       = string
    service_name       = string
    task_family        = string
    execution_role_arn = string
    task_role_arn      = string
  }))
  description = "Services the deploy role may update, keyed by environment."
}

variable "state_bucket_arn" {
  type        = string
  description = "Terraform state bucket (plan/apply roles)."
}

variable "state_kms_key_arn" {
  type    = string
  default = null
}

variable "create_apply_role" {
  type    = bool
  default = false
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account = data.aws_caller_identity.current.account_id
  region  = data.aws_region.current.region
  issuer  = "token.actions.githubusercontent.com"
  provider_arn = var.create_provider ? aws_iam_openid_connect_provider.github[0].arn : (
    "arn:aws:iam::${local.account}:oidc-provider/${local.issuer}"
  )
  services = values(var.ecs_services)
}

resource "aws_iam_openid_connect_provider" "github" {
  count          = var.create_provider ? 1 : 0
  url            = "https://${local.issuer}"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_policy_document" "trust" {
  for_each = {
    deploy = [
      "repo:${var.repository}:ref:refs/heads/main",
      "repo:${var.repository}:ref:refs/heads/develop",
      "repo:${var.repository}:environment:staging",
      "repo:${var.repository}:environment:production",
    ]
    plan  = ["repo:${var.repository}:pull_request", "repo:${var.repository}:ref:refs/heads/main"]
    apply = ["repo:${var.repository}:environment:infrastructure"]
  }
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${local.issuer}:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "${local.issuer}:sub"
      values   = each.value
    }
  }
}

# ------------------------------------------------------------------ deploy
resource "aws_iam_role" "deploy" {
  name                 = "nauricare-github-deploy"
  assume_role_policy   = data.aws_iam_policy_document.trust["deploy"].json
  max_session_duration = 3600
}

data "aws_iam_policy_document" "deploy" {
  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  statement {
    sid = "EcrPush"
    actions = [
      "ecr:BatchCheckLayerAvailability", "ecr:BatchGetImage", "ecr:CompleteLayerUpload",
      "ecr:DescribeImages", "ecr:GetDownloadUrlForLayer", "ecr:InitiateLayerUpload",
      "ecr:PutImage", "ecr:UploadLayerPart",
    ]
    resources = [var.ecr_repository_arn]
  }
  statement {
    sid     = "EcsDeploy"
    actions = ["ecs:DescribeServices", "ecs:UpdateService"]
    resources = [
      for s in local.services : "arn:aws:ecs:${local.region}:${local.account}:service/${s.cluster_name}/${s.service_name}"
    ]
  }
  statement {
    sid     = "EcsMigrationTask"
    actions = ["ecs:RunTask"]
    resources = [
      for s in local.services : "arn:aws:ecs:${local.region}:${local.account}:task-definition/${s.task_family}:*"
    ]
  }
  statement {
    # These calls do not support resource-level permissions.
    sid = "EcsRead"
    actions = [
      "ecs:DescribeTaskDefinition", "ecs:RegisterTaskDefinition", "ecs:DescribeTasks",
      "ecs:ListTasks", "ecs:ListServices", "ecs:ListClusters", "ec2:DescribeNetworkInterfaces",
    ]
    resources = ["*"]
  }
  statement {
    sid       = "PassTaskRoles"
    actions   = ["iam:PassRole"]
    resources = distinct(flatten([for s in local.services : [s.execution_role_arn, s.task_role_arn]]))
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "deploy"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}

# ------------------------------------------------------------------ plan
resource "aws_iam_role" "plan" {
  name                 = "nauricare-github-terraform-plan"
  assume_role_policy   = data.aws_iam_policy_document.trust["plan"].json
  max_session_duration = 3600
}

resource "aws_iam_role_policy_attachment" "plan_readonly" {
  role       = aws_iam_role.plan.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

data "aws_iam_policy_document" "plan_extra" {
  statement {
    sid       = "StateRead"
    actions   = ["s3:GetObject", "s3:ListBucket"]
    resources = [var.state_bucket_arn, "${var.state_bucket_arn}/*"]
  }
  statement {
    # `plan` takes a lock, so it must be able to write and delete .tflock files.
    sid       = "StateLock"
    actions   = ["s3:PutObject", "s3:DeleteObject"]
    resources = ["${var.state_bucket_arn}/*.tflock"]
  }
  dynamic "statement" {
    for_each = var.state_kms_key_arn == null ? [] : [1]
    content {
      sid       = "StateKms"
      actions   = ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey"]
      resources = [var.state_kms_key_arn]
    }
  }
  statement {
    # ReadOnlyAccess allows ssm:GetParameter*, and the aws/ssm key policy lets
    # any principal in the account decrypt via SSM. Deny that decrypt, so
    # PR-triggered code can list parameter names but never read secret values.
    sid       = "NoSsmSecretValues"
    effect    = "Deny"
    actions   = ["kms:Decrypt"]
    resources = ["*"]
    condition {
      test     = "StringLike"
      variable = "kms:ViaService"
      values   = ["ssm.*.amazonaws.com"]
    }
  }
  statement {
    # Plans need resource metadata, not data: no user media, no app logs.
    sid           = "NoUserData"
    effect        = "Deny"
    actions       = ["s3:GetObject", "s3:GetObjectVersion"]
    not_resources = ["${var.state_bucket_arn}/*"]
  }
  statement {
    sid       = "NoLogContents"
    effect    = "Deny"
    actions   = ["logs:GetLogEvents", "logs:FilterLogEvents", "logs:StartQuery", "logs:StartLiveTail"]
    resources = ["*"]
  }
  statement {
    sid       = "NoSecretsManagerValues"
    effect    = "Deny"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "plan_extra" {
  name   = "terraform-state-and-guards"
  role   = aws_iam_role.plan.id
  policy = data.aws_iam_policy_document.plan_extra.json
}

# ------------------------------------------------------------------ apply
resource "aws_iam_role" "apply" {
  count                = var.create_apply_role ? 1 : 0
  name                 = "nauricare-github-terraform-apply"
  assume_role_policy   = data.aws_iam_policy_document.trust["apply"].json
  max_session_duration = 3600
}

resource "aws_iam_role_policy_attachment" "apply_admin" {
  count      = var.create_apply_role ? 1 : 0
  role       = aws_iam_role.apply[0].name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess" #trivy:ignore:AVD-AWS-0057 -- gated by the protected `infrastructure` environment
}

output "deploy_role_arn" { value = aws_iam_role.deploy.arn }
output "plan_role_arn" { value = aws_iam_role.plan.arn }
output "apply_role_arn" { value = var.create_apply_role ? aws_iam_role.apply[0].arn : null }
