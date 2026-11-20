# The single image repository. One image per commit is promoted from staging to
# production by digest. Commit-SHA tags are immutable; only the convenience
# channels (`latest`, `develop`) and cosign's signature tags (`sha256-*.sig`,
# rewritten when an image is re-signed) may move. Deploys never read a tag.
# Consequence: re-running the image job of a commit that already pushed fails
# on purpose. Re-run the deploy job instead, which reuses the pushed digest.

variable "name" {
  type    = string
  default = "nauricare-api"
}

variable "keep_images" {
  type        = number
  default     = 50
  description = "How many images to keep. Old digests are what rollbacks use, so keep plenty."
}

#trivy:ignore:AVD-AWS-0031 -- only `latest`/`develop`/cosign signature tags may move; commit tags are immutable and deploys use digests
resource "aws_ecr_repository" "this" {
  name                 = var.name
  image_tag_mutability = "IMMUTABLE_WITH_EXCLUSION"

  dynamic "image_tag_mutability_exclusion_filter" {
    for_each = ["latest", "develop", "sha256-*"]
    content {
      filter      = image_tag_mutability_exclusion_filter.value
      filter_type = "WILDCARD"
    }
  }
  force_delete = false

  image_scanning_configuration { scan_on_push = true }

  encryption_configuration { encryption_type = "KMS" }
}

resource "aws_ecr_lifecycle_policy" "this" {
  repository = aws_ecr_repository.this.name
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Drop untagged images (signature/SBOM leftovers) after 14 days"
        selection    = { tagStatus = "untagged", countType = "sinceImagePushed", countUnit = "days", countNumber = 14 }
        action       = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep the newest ${var.keep_images} images"
        selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = var.keep_images }
        action       = { type = "expire" }
      },
    ]
  })
}

output "repository_url" { value = aws_ecr_repository.this.repository_url }
output "repository_arn" { value = aws_ecr_repository.this.arn }
output "repository_name" { value = aws_ecr_repository.this.name }
