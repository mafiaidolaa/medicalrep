#!/bin/bash

# AWS EC2 Setup Script for Next.js Application
# Run this script on your Ubuntu EC2 instance after SSH connection

echo "🚀 Starting AWS EC2 setup for Next.js application..."

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x (LTS)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installations
echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Nginx for reverse proxy
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Install certbot for SSL certificates (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx

# Create application directory
sudo mkdir -p /var/www/nextn
sudo chown -R $USER:$USER /var/www/nextn
sudo chmod 755 /var/www/nextn

# Configure firewall
echo "🔒 Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000  # For Next.js development
sudo ufw --force enable

# Start and enable services
sudo systemctl start nginx
sudo systemctl enable nginx

echo "✅ Server setup completed!"
echo ""
echo "🎯 Next steps:"
echo "1. Clone your repository: git clone <your-repo-url> /var/www/nextn"
echo "2. Navigate to app directory: cd /var/www/nextn"
echo "3. Install dependencies: npm install"
echo "4. Set up environment variables"
echo "5. Build the application: npm run build"
echo "6. Start with PM2: pm2 start ecosystem.config.js"