variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default = "af-south-1"
}

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for public subnet"
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidr_a" {
  description = "CIDR block for private subnet"
  default     = "10.0.4.0/24"
}

variable "private_subnet_cidr_b" {
  description = "CIDR block for private subnet"
  default     = "10.0.10.0/24"
}

variable "availability_zone_a" {
  description = "Availability zone a"
  default     = "af-south-1a"
}

variable "availability_zone_b" {
  description = "Availability zone b"
  default     = "af-south-1b"
}

variable "db_name" {
    type = string
    default = "tododb"
}

variable "db_username" {
    default = "/db_config/db_username"
}

variable "db_password" {
    default = "/db_config/db_password"
}

