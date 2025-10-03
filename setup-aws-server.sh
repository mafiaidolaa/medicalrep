#!/bin/bash

# 🚀 AWS EC2 Setup Script - مُحسن لـ Free Tier
# يُنفذ على Ubuntu 22.04 LTS (t2.micro)

set -e

echo "🚀 بدء إعداد EP Group System على AWS EC2 Free Tier..."

# ========================================
# 1. تحديث النظام وتثبيت الأساسيات
# ========================================
echo "📦 تحديث النظام..."
sudo apt update && sudo apt upgrade -y

echo "📦 تثبيت الحزم الأساسية..."
sudo apt install -y curl wget git unzip nginx certbot python3-certbot-nginx htop

# ========================================
# 2. تثبيت Node.js (أحدث LTS)
# ========================================
echo "📦 تثبيت Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# التحقق من التثبيت
echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# ========================================
# 3. تثبيت PM2 (Process Manager)
# ========================================
echo "📦 تثبيت PM2..."
sudo npm install -g pm2

# إعداد PM2 للتشغيل التلقائي
sudo pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

# ========================================
# 4. تحسين النظام للـ Free Tier (1GB RAM)
# ========================================
echo "⚡ تحسين النظام للذاكرة المحدودة..."

# إنشاء swap file (مهم للـ 1GB RAM)
if [ ! -f /swapfile ]; then
    echo "📋 إنشاء Swap File..."
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# تحسين kernel parameters
echo "⚙️ تحسين Kernel parameters..."
sudo tee -a /etc/sysctl.conf > /dev/null <<EOL

# تحسينات AWS Free Tier
vm.swappiness=10
vm.vfs_cache_pressure=50
net.core.rmem_default=262144
net.core.rmem_max=16777216
net.core.wmem_default=262144
net.core.wmem_max=16777216
net.ipv4.tcp_rmem=4096 87380 16777216
net.ipv4.tcp_wmem=4096 65536 16777216
EOL

sudo sysctl -p

# ========================================
# 5. إعداد Nginx مُحسن
# ========================================
echo "🌐 إعداد Nginx..."
sudo tee /etc/nginx/sites-available/ep-group > /dev/null <<'EOL'
# تحسين Nginx للـ AWS Free Tier
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression - مُحسن للـ Free Tier
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        image/svg+xml;
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Proxy للـ Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts مُحسنة للـ Free Tier
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOL

# تفعيل الموقع
sudo ln -sf /etc/nginx/sites-available/ep-group /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# تحسين Nginx config العام
sudo tee /etc/nginx/conf.d/optimizations.conf > /dev/null <<'EOL'
# تحسينات عامة للـ AWS Free Tier

# Worker processes
worker_processes 1;
worker_rlimit_nofile 1024;

# Events
events {
    worker_connections 512;
    use epoll;
    multi_accept on;
}

# HTTP
http {
    # Buffer sizes - مُخفضة للـ Free Tier
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    
    # Timeouts
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 15;
    send_timeout 10;
    
    # TCP optimization
    tcp_nopush on;
    tcp_nodelay on;
    
    # Hide server version
    server_tokens off;
}
EOL

# اختبار Nginx config
sudo nginx -t

# ========================================
# 6. إعداد Firewall
# ========================================
echo "🔐 إعداد Firewall..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# ========================================
# 7. إنشاء مُستخدم للتطبيق
# ========================================
echo "👤 إنشاء مُستخدم التطبيق..."
sudo useradd -m -s /bin/bash epgroup || true
sudo usermod -aG sudo epgroup

# ========================================
# 8. إعداد PM2 Ecosystem
# ========================================
echo "⚙️ إعداد PM2 Ecosystem..."
sudo -u epgroup tee /home/epgroup/ecosystem.config.js > /dev/null <<'EOL'
module.exports = {
  apps: [{
    name: 'ep-group',
    script: 'npm',
    args: 'start',
    cwd: '/home/epgroup/ep-group',
    
    // تحسينات الذاكرة للـ Free Tier
    node_args: '--max-old-space-size=750',
    
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_TELEMETRY_DISABLED: 1,
    },
    
    // PM2 settings محسنة للـ Free Tier
    instances: 1, // مثيل واحد فقط
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '700M', // restart إذا تجاوزت 700MB
    
    // Logging
    log_file: '/home/epgroup/logs/combined.log',
    out_file: '/home/epgroup/logs/out.log',
    error_file: '/home/epgroup/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    
    // Auto restart
    autorestart: true,
    restart_delay: 5000,
  }]
};
EOL

# إنشاء مجلد اللوغات
sudo mkdir -p /home/epgroup/logs
sudo chown -R epgroup:epgroup /home/epgroup/logs

# ========================================
# 9. إعداد Monitoring بسيط
# ========================================
echo "📊 إعداد Monitoring..."
sudo tee /usr/local/bin/system-monitor.sh > /dev/null <<'EOL'
#!/bin/bash

# مراقبة بسيطة للنظام
echo "$(date): System Status" >> /var/log/system-monitor.log
echo "Memory: $(free -m | awk 'NR==2{printf "%.2f%%", $3*100/$2 }')" >> /var/log/system-monitor.log
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')" >> /var/log/system-monitor.log
echo "Disk: $(df -h | awk '$NF=="/"{printf "%s", $5}')" >> /var/log/system-monitor.log
echo "---" >> /var/log/system-monitor.log

# تنظيف اللوغ إذا كبر
if [ $(wc -l < /var/log/system-monitor.log) -gt 1000 ]; then
    tail -500 /var/log/system-monitor.log > /var/log/system-monitor.log.tmp
    mv /var/log/system-monitor.log.tmp /var/log/system-monitor.log
fi
EOL

sudo chmod +x /usr/local/bin/system-monitor.sh

# Cron job للمراقبة كل 5 دقائق
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/system-monitor.sh") | sudo crontab -

# ========================================
# 10. تعليمات النهاية
# ========================================
echo "✅ تم إعداد السيرفر بنجاح!"
echo ""
echo "📋 الخطوات التالية:"
echo "1. انسخ المشروع إلى /home/epgroup/ep-group"
echo "2. شغّل: cd /home/epgroup/ep-group && npm ci --production"
echo "3. شغّل: npm run build"
echo "4. شغّل: sudo -u epgroup pm2 start ecosystem.config.js"
echo "5. حدث domain في /etc/nginx/sites-available/ep-group"
echo "6. شغّل: sudo systemctl reload nginx"
echo "7. للـ SSL: sudo certbot --nginx -d your-domain.com"
echo ""
echo "🔍 مراقبة:"
echo "- PM2: sudo -u epgroup pm2 status"
echo "- Logs: sudo -u epgroup pm2 logs"
echo "- System: tail -f /var/log/system-monitor.log"
echo ""
echo "🎉 السيرفر جاهز للاستخدام!"