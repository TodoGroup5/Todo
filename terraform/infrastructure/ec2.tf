# EC2 Instance
resource "aws_instance" "web" {   
  ami = "ami-0722f955ef0cb4675"                  
  instance_type               = "t3.micro"
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.ec2_sg.id]
  associate_public_ip_address = true
  key_name = "todo-key-pair"

  user_data = <<-EOF
      #!/bin/bash
      set -e

      # Update the instance
      sudo yum update -y

      # Install Node.js 18 from NodeSource
      curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
      sudo yum install -y nodejs gcc-c++ make

      # Install PM2 globally
      sudo npm install -g pm2

      # Install nginx
      sudo yum install -y nginx

      # Generate self-signed SSL cert and key
      sudo mkdir -p /etc/nginx/ssl
      sudo openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/privatessl.key \
        -out /etc/nginx/ssl/certificate.crt \
        -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=localhost"

      # Write nginx config
      sudo tee /etc/nginx/nginx.conf > /dev/null <<'NGINX_CONF'
      user nginx;
      worker_processes auto;
      error_log /var/log/nginx/error.log;
      pid /run/nginx.pid;

      events {
          worker_connections 1024;
      }

      http {
          server {
              listen 80;
              server_name _;

              # Redirect HTTP to HTTPS
              return 301 https://\$host\$request_uri;
          }

          server {
              listen 443 ssl;
              server_name _;

              ssl_certificate /etc/nginx/ssl/certificate.crt;
              ssl_certificate_key /etc/nginx/ssl/privatessl.key;

              location / {
                  proxy_pass http://localhost:8080;
                  proxy_set_header Host \$host;
                  proxy_set_header X-Real-IP \$remote_addr;
              }
          }
      }
      NGINX_CONF

      # Enable and start nginx
      sudo systemctl enable nginx
      sudo systemctl start nginx
    EOF


  tags = {
    Name = "TodoGroup5-EC2"
  }
}
