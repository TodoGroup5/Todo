terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  //get from bootstrap
    backend "s3" {
    bucket = "terraform-state-app-todo-app-v0"
    key    = "terraform.tfstate"
    region = "af-south-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}