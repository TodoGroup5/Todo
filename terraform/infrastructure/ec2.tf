# EC2 Instance (placeholder AMI/instance type)
resource "aws_instance" "web" {
  ami                         = "ami-0c55b159cbfafe1f0" # Use a valid AMI for your region
  instance_type               = "t3.micro"
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.ec2_sg.id]
  associate_public_ip_address = true

  tags = {
    Name = "WebServer"
  }
}
