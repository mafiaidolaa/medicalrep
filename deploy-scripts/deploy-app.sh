#!/bin/bash

# Application deployment script
# Run this after server setup and cloning your repository

echo "🚀 Deploying Next.js application..."

# Navigate to application directory
cd /var/www/nextn

# Create logs directory
mkdir -p logs

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create production environment file
echo "📝 Setting up environment variables..."
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth Configuration
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_nextauth_secret

# Production settings
AUTH_TRUST_HOST=true
NODE_ENV=production
EOF
    echo "⚠️  Please edit .env.local with your actual values!"
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Configure Nginx
echo "🔧 Configuring Nginx..."
sudo cp deploy-scripts/nginx-config /etc/nginx/sites-available/nextn
sudo ln -sf /etc/nginx/sites-available/nextn /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    sudo systemctl reload nginx
else
    echo "❌ Nginx configuration error"
    exit 1
fi

# Start application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Deployment completed!"
echo ""
echo "🎯 Important next steps:"
echo "1. Edit /var/www/nextn/.env.local with your actual values"
echo "2. Update the server_name in /etc/nginx/sites-available/nextn"
echo "3. Get SSL certificate: sudo certbot --nginx -d your-domain.com"
echo "4. Check application: http://YOUR_EC2_IP"
echo ""
echo "📊 Useful commands:"
echo "- pm2 status          # Check PM2 status"
echo "- pm2 logs            # View application logs"
echo "- pm2 restart nextn-app  # Restart application"
echo "- sudo systemctl status nginx  # Check Nginx status"