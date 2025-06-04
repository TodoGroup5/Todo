variable "aws_region" {
  description = "AWS region for resources"
  type        = string
}

variable "bucket_name" {
  description = "Base name for the S3 bucket"
  type        = string
}

variable "github_repository" {
  description = "GitHub repo that can assume the role (format: owner/repo)"
  type        = string
}

variable "github_actions_role_name" {
  description = "Name for the GitHub Actions IAM role"
  type        = string
}

variable "terraform_policy_name" {
  description = "Name for the Terraform state policy"
  type        = string
}

variable "infrastructure_policy_name" {
  description = "Name for the infrastructure management policy"
  type        = string
}
