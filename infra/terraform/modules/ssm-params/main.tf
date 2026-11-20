# Maps app secret names to their SSM Parameter Store ARNs for the task
# definition, and fails the plan if any is missing.
#
# Terraform deliberately never creates or reads secret *values*: they would
# land in plan output and state. Values are written out-of-band from hidden
# input or generated (see .github/scripts/setup-reminder-scheduler.sh and
# docs/runbooks/credential-rotation.md), e.g.
#   read -rs V && printf %s "$V" | aws ssm put-parameter --type SecureString \
#     --name /nauricare/production/RESEND_API_KEY --value file:///dev/stdin

variable "prefix" {
  type        = string
  description = "SSM path ending in a slash, e.g. /nauricare/production/."
  validation {
    condition     = startswith(var.prefix, "/") && endswith(var.prefix, "/")
    error_message = "prefix must start and end with '/'."
  }
}

variable "names" {
  type        = list(string)
  description = "Secret names under the prefix, e.g. [\"NEXTAUTH_SECRET\", \"DATABASE_URL\"]."
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# Names only: decryption stays off, so no plaintext reaches state.
data "aws_ssm_parameters_by_path" "existing" {
  path            = trimsuffix(var.prefix, "/")
  with_decryption = false
  recursive       = false
}

locals {
  existing = toset([for n in data.aws_ssm_parameters_by_path.existing.names : trimprefix(n, var.prefix)])
  missing  = setsubtract(toset(var.names), local.existing)
  arns = {
    for n in var.names :
    n => "arn:aws:ssm:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:parameter${var.prefix}${n}"
  }
}

resource "terraform_data" "require_all" {
  input = sort(var.names)
  lifecycle {
    precondition {
      condition     = length(local.missing) == 0
      error_message = "Missing SSM parameters under ${var.prefix}: ${join(", ", sort(tolist(local.missing)))}. Create them out-of-band (see the comment at the top of modules/ssm-params/main.tf)."
    }
  }
}

output "arns" {
  value       = local.arns
  description = "Env var name => parameter ARN."
}
