# The app's ECS cluster, IAM roles, log group, bootstrap task definition and
# service. Ownership is split with CI on purpose:
#   Terraform owns: cluster settings, roles, log group, networking, the
#     deployment policy (circuit breaker + rollback), desired count.
#   CI owns: task definition revisions (.github/workflows/deploy-ecs.yml copies
#     the running revision, swaps in the new image digest and SSM secrets).
# Hence `ignore_changes = [task_definition]` on the service: `terraform apply`
# never redeploys or rolls back the app.

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

locals {
  log_group = "/ecs/${var.name}"
  ssm_arn   = "arn:aws:ssm:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:parameter${trimsuffix(var.ssm_prefix, "/")}/*"
}

resource "aws_ecs_cluster" "this" {
  name = var.cluster_name
  setting {
    name  = "containerInsights"
    value = "enhanced"
  }
}

resource "aws_cloudwatch_log_group" "app" {
  name              = local.log_group
  retention_in_days = var.log_retention_days
  kms_key_id        = var.log_kms_key_arn
}

# --- Execution role: pulls the image, writes logs, reads SSM at task start ---
data "aws_iam_policy_document" "ecs_tasks_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = coalesce(var.execution_role_name, "${var.name}-execution")
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_trust.json
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution_secrets" {
  statement {
    sid       = "ReadAppSecrets"
    actions   = ["ssm:GetParameters"]
    resources = [local.ssm_arn]
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "read-app-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets.json
}

# --- Task role: what the running app may call (no static AWS keys needed) ---
resource "aws_iam_role" "task" {
  name               = coalesce(var.task_role_name, "${var.name}-task")
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_trust.json
}

data "aws_iam_policy_document" "task" {
  count = var.uploads_bucket_arn == null ? 0 : 1
  statement {
    sid       = "UserMedia"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
    resources = ["${var.uploads_bucket_arn}/*"]
  }
}

resource "aws_iam_role_policy" "task" {
  count  = var.uploads_bucket_arn == null ? 0 : 1
  name   = "user-media"
  role   = aws_iam_role.task.id
  policy = data.aws_iam_policy_document.task[0].json
}

# --- Bootstrap task definition (CI registers every later revision) ---
resource "aws_ecs_task_definition" "bootstrap" {
  family                   = var.name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([
    {
      name         = var.container_name
      image        = var.image
      essential    = true
      portMappings = [{ containerPort = var.container_port, protocol = "tcp" }]
      environment = [
        for k, v in merge({ APP_ENV = var.environment, NODE_ENV = "production" }, var.environment_variables) :
        { name = k, value = v }
      ]
      secrets         = [for k, arn in var.secret_arns : { name = k, valueFrom = arn }]
      linuxParameters = { initProcessEnabled = true }
      stopTimeout     = 30
      healthCheck = {
        command     = ["CMD-SHELL", "wget -qO- http://127.0.0.1:${var.container_port}/api/health >/dev/null || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.app.name
          awslogs-region        = data.aws_region.current.region
          awslogs-stream-prefix = "app"
          mode                  = "non-blocking"
          max-buffer-size       = "4m"
        }
      }
    }
  ])

  # CI registers new revisions in this family; Terraform must not fight them.
  lifecycle { ignore_changes = [container_definitions] }
}

resource "aws_ecs_service" "this" {
  name                   = var.name
  cluster                = aws_ecs_cluster.this.id
  task_definition        = aws_ecs_task_definition.bootstrap.arn
  desired_count          = var.desired_count
  launch_type            = "FARGATE"
  platform_version       = "LATEST"
  propagate_tags         = "SERVICE"
  enable_execute_command = false

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = true # no NAT gateway or load balancer; ingress is locked to Cloudflare by the security group
  }

  lifecycle { ignore_changes = [task_definition] }
}
