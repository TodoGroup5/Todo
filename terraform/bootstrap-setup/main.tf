terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# S3 bucket for Terraform state
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.bucket_name}"

  tags = {
    Name        = "Terraform State Bucket"
    Purpose     = "terraform-state"
  }
}

# Enable versioning for the state bucket
resource "aws_s3_bucket_versioning" "terraform_state_versioning" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state_encryption" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "terraform_state_pab" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# OIDC Identity Provider for GitHub Actions
resource "aws_iam_openid_connect_provider" "github_actions" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com",
  ]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
  ]

  tags = {
    Name = "GitHub Actions OIDC"
  }
}

# IAM role for GitHub Actions
resource "aws_iam_role" "github_actions" {
  name = "${var.github_actions_role_name}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_actions.arn
        }
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" =  "repo:${var.github_repository}:*"
          }
        }
      }
    ]
  })

  tags = {
    Name = "GitHub Actions Role"
  }
}

# IAM policy for Terraform state management
resource "aws_iam_policy" "terraform_state_policy" {
  name        = "${var.terraform_policy_name}"
  description = "Policy for GitHub Actions to manage Terraform state"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*"
        ]
      }
    ]
  })
}

# IAM policy for infrastructure resources
resource "aws_iam_policy" "infrastructure_policy" {
  name        = "${var.infrastructure_policy_name}"
  description = "Policy for GitHub Actions to manage infrastructure"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          # EC2 full access
          "ec2:*",
          # RDS full access
          "rds:*",
          "iam:CreateServiceLinkedRole",
          # SSM full access
           "ssm:*",
        ]
        Resource = "*"
      }
    ]
  })
}

# Attach policies to the GitHub Actions role
resource "aws_iam_role_policy_attachment" "terraform_state_policy_attachment" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.terraform_state_policy.arn
}

resource "aws_iam_role_policy_attachment" "infrastructure_policy_attachment" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.infrastructure_policy.arn
}
