output "backend_configuration" {
  description = "Backend configuration to use in other Terraform projects"
  value = {
    bucket  = aws_s3_bucket.terraform_state.bucket
    key     = "terraform.tfstate"
    region  = var.aws_region
    encrypt = true
  }
}
output "github_actions_workflow_config" {
  description = "Configuration for GitHub Actions workflow"
  value = {
    role_arn    = aws_iam_role.github_actions.arn
    aws_region  = var.aws_region
    bucket_name = aws_s3_bucket.terraform_state.bucket
  }
}