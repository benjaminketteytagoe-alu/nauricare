terraform {
  required_version = ">= 1.10"

  required_providers {
    aws  = { source = "hashicorp/aws", version = "~> 6.73" }
    http = { source = "hashicorp/http", version = "~> 3.6" }
  }

  # Partial config: bucket and key come from backend.hcl (see backend.hcl.example).
  backend "s3" {
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region              = var.region
  allowed_account_ids = [var.account_id]
  default_tags {
    tags = { Project = "nauricare", Environment = "production", ManagedBy = "terraform", Repository = "nauricare" }
  }
}
