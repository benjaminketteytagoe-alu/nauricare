# Networking for the app tasks. Today's service runs Fargate tasks with public
# IPs in an existing VPC (no load balancer; Cloudflare proxies to the task IPs,
# kept current by .github/scripts/cloudflare-ecs-dns.sh). This module does not
# create a VPC: it looks one up and owns the app's security group, which only
# accepts traffic from Cloudflare's published edge ranges, so nobody can
# bypass Cloudflare's WAF and TLS by hitting a task IP directly.

variable "name" { type = string }

variable "vpc_id" {
  type        = string
  default     = null
  description = "VPC to use. Null means the account's default VPC."
}

variable "subnet_ids" {
  type        = list(string)
  default     = null
  description = "Subnets for the tasks. Null means every subnet in the VPC."
}

variable "app_port" {
  type    = number
  default = 3000
}

variable "restrict_ingress_to_cloudflare" {
  type        = bool
  default     = true
  description = "Allow the app port only from Cloudflare edge IPs. Turn off only for debugging."
}

data "aws_vpc" "this" {
  id      = var.vpc_id
  default = var.vpc_id == null ? true : null
}

data "aws_subnets" "this" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.this.id]
  }
}

data "http" "cloudflare_v4" {
  url = "https://www.cloudflare.com/ips-v4"
  lifecycle {
    postcondition {
      condition     = self.status_code == 200
      error_message = "Could not fetch Cloudflare's IPv4 ranges."
    }
  }
}

data "http" "cloudflare_v6" {
  url = "https://www.cloudflare.com/ips-v6"
  lifecycle {
    postcondition {
      condition     = self.status_code == 200
      error_message = "Could not fetch Cloudflare's IPv6 ranges."
    }
  }
}

locals {
  cloudflare_v4 = [for c in split("\n", trimspace(data.http.cloudflare_v4.response_body)) : trimspace(c) if trimspace(c) != ""]
  cloudflare_v6 = [for c in split("\n", trimspace(data.http.cloudflare_v6.response_body)) : trimspace(c) if trimspace(c) != ""]
}

resource "aws_security_group" "app" {
  name        = "${var.name}-app"
  description = "NauriCare app tasks: app port from Cloudflare only; all egress"
  vpc_id      = data.aws_vpc.this.id
  tags        = { Name = "${var.name}-app" }
}

resource "aws_vpc_security_group_ingress_rule" "cloudflare_v4" {
  for_each          = var.restrict_ingress_to_cloudflare ? toset(local.cloudflare_v4) : toset([])
  security_group_id = aws_security_group.app.id
  description       = "Cloudflare edge"
  ip_protocol       = "tcp"
  from_port         = var.app_port
  to_port           = var.app_port
  cidr_ipv4         = each.value
}

resource "aws_vpc_security_group_ingress_rule" "cloudflare_v6" {
  for_each          = var.restrict_ingress_to_cloudflare ? toset(local.cloudflare_v6) : toset([])
  security_group_id = aws_security_group.app.id
  description       = "Cloudflare edge"
  ip_protocol       = "tcp"
  from_port         = var.app_port
  to_port           = var.app_port
  cidr_ipv6         = each.value
}

resource "aws_vpc_security_group_ingress_rule" "open" {
  count             = var.restrict_ingress_to_cloudflare ? 0 : 1
  security_group_id = aws_security_group.app.id
  description       = "Debug only: app port open to the internet"
  ip_protocol       = "tcp"
  from_port         = var.app_port
  to_port           = var.app_port
  cidr_ipv4         = "0.0.0.0/0" #trivy:ignore:AVD-AWS-0107
}

# Egress is open: the app calls Neon/RDS, Resend, Google, Cloudflare Turnstile,
# the AI endpoints and AWS APIs, several without fixed IPs.
resource "aws_vpc_security_group_egress_rule" "all_v4" {
  security_group_id = aws_security_group.app.id
  description       = "All outbound (third-party APIs without fixed IPs)"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0" #trivy:ignore:AVD-AWS-0104
}

resource "aws_vpc_security_group_egress_rule" "all_v6" {
  security_group_id = aws_security_group.app.id
  description       = "All outbound (third-party APIs without fixed IPs)"
  ip_protocol       = "-1"
  cidr_ipv6         = "::/0" #trivy:ignore:AVD-AWS-0104
}

output "vpc_id" { value = data.aws_vpc.this.id }
output "subnet_ids" { value = coalesce(var.subnet_ids, data.aws_subnets.this.ids) }
output "app_security_group_id" { value = aws_security_group.app.id }
