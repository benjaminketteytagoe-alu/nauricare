# Optional managed PostgreSQL (production currently uses Neon; see
# docs/runbooks/db-restore.md). Encrypted, backed up with point-in-time
# recovery, deletion-protected, not publicly reachable, TLS enforced, and the
# master password is generated and held by AWS Secrets Manager (never in state).

variable "name" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }

variable "app_security_group_id" {
  type        = string
  description = "Only this security group may connect on 5432."
}

variable "instance_class" {
  type    = string
  default = "db.t4g.small"
}

variable "allocated_storage_gb" {
  type    = number
  default = 20
}

variable "engine_version" {
  type    = string
  default = "17"
}

variable "backup_retention_days" {
  type    = number
  default = 14
}

variable "multi_az" {
  type    = bool
  default = false
}

resource "aws_kms_key" "db" {
  description         = "${var.name} database storage and backups"
  enable_key_rotation = true
}

resource "aws_db_subnet_group" "this" {
  name       = var.name
  subnet_ids = var.subnet_ids
}

resource "aws_security_group" "db" {
  name        = "${var.name}-db"
  description = "PostgreSQL from the app tasks only"
  vpc_id      = var.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "app" {
  security_group_id            = aws_security_group.db.id
  description                  = "App tasks"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = var.app_security_group_id
}

resource "aws_db_parameter_group" "this" {
  name   = "${var.name}-pg${split(".", var.engine_version)[0]}"
  family = "postgres${split(".", var.engine_version)[0]}"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # log statements slower than 1 s (no parameters are logged)
  }
}

resource "aws_db_instance" "this" {
  identifier     = var.name
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  db_name                     = "nauricare"
  username                    = "nauricare_admin"
  manage_master_user_password = true # rotated by Secrets Manager; DATABASE_URL in SSM is built from it

  allocated_storage     = var.allocated_storage_gb
  max_allocated_storage = var.allocated_storage_gb * 5
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.db.arn

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false
  multi_az               = var.multi_az
  parameter_group_name   = aws_db_parameter_group.this.name

  backup_retention_period   = var.backup_retention_days
  backup_window             = "01:00-02:00"
  maintenance_window        = "sun:02:30-sun:03:30"
  copy_tags_to_snapshot     = true
  delete_automated_backups  = false
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.name}-final"

  auto_minor_version_upgrade            = true
  performance_insights_enabled          = true
  performance_insights_kms_key_id       = aws_kms_key.db.arn
  performance_insights_retention_period = 7
  iam_database_authentication_enabled   = true
  enabled_cloudwatch_logs_exports       = ["postgresql"]

  lifecycle { prevent_destroy = true }
}

output "endpoint" { value = aws_db_instance.this.address }
output "master_secret_arn" { value = aws_db_instance.this.master_user_secret[0].secret_arn }
