# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
}

# Public Subnet for EC2
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = var.availability_zone_a
  map_public_ip_on_launch = true
}

# Public Subnet for RDS
resource "aws_subnet" "public_rds_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.private_subnet_cidr_a
  availability_zone       = var.availability_zone_a
  map_public_ip_on_launch = true
}

# Public Subnet for RDS - second AZ
resource "aws_subnet" "public_rds_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.private_subnet_cidr_b   
  availability_zone       = var.availability_zone_b
  map_public_ip_on_launch = true
}

# Internet Gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
}

# Public Route Table Associations
resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "rds_public_assoc_a" {
  subnet_id      = aws_subnet.public_rds_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "rds_public_assoc_b" {
  subnet_id      = aws_subnet.public_rds_b.id
  route_table_id = aws_route_table.public.id
}

# Security Group for EC2
resource "aws_security_group" "ec2_sg" {
  name   = "ec2-sg"
  vpc_id = aws_vpc.main.id

  # Ingress rules for web access
  ingress {
    description = "Allow HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "rds_sg" {
  name   = "rds-sg"
  vpc_id = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}