#!/bin/bash

# 🚀 نشر سريع للمشروع على AWS EC2
# يُنفذ بعد إعداد السيرفر

set -e

SERVER_IP="${1:-your-server-ip}"
DOMAIN="${2:-your-domain.com}"
PROJECT_NAME="ep-group"

echo "🚀 بدء نشر EP Group System على AWS..."
echo "🌐 Server IP: $SERVER_IP"
echo "🌐 Domain: $DOMAIN"

if [ "$SERVER_IP" = "your-server-ip" ]; then
    echo "❌ يرجى تمرير IP السيرفر كأول parameter"
    echo "استخدام: ./deploy-to-aws.sh YOUR_SERVER_IP your-domain.com"
    exit 1
fi

# ========================================
# 1. إعداد المشروع للنشر
# ========================================
echo "📦 إعداد المشروع للنشر..."

# نسخ config الإنتاج
echo "⚙️ تطبيق إعدادات الإنتاج..."
cp aws-optimized-config.js next.config.js
cp .env.production .env.local

# تنظيف المشروع
echo "🧹 تنظيف المشروع..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

# بناء المشروع محلياً للتأكد
echo "🔨 بناء المشروع للتحقق..."
NODE_ENV=production npm run build

echo "✅ المشروع جاهز للنشر!"

# ========================================
# 2. رفع المشروع للسيرفر
# ========================================
echo "📤 رفع المشروع للسيرفر..."

# إنشاء أرشيف مضغوط (بدون node_modules و .next)
echo "📋 إنشاء أرشيف المشروع..."
tar -czf ep-group-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.turbo' \
    --exclude='coverage' \
    --exclude='dist' \
    .

# رفع للسيرفر
echo "📤 رفع للسيرفر..."
scp ep-group-deploy.tar.gz ubuntu@$SERVER_IP:/tmp/

# ========================================
# 3. تثبيت على السيرفر
# ========================================
echo "⚙️ تثبيت على السيرفر..."

ssh ubuntu@$SERVER_IP << EOF
    set -e
    
    echo "📋 إعداد مجلد المشروع..."
    sudo mkdir -p /home/epgroup/$PROJECT_NAME
    sudo chown -R epgroup:epgroup /home/epgroup
    
    echo "📦 استخراج المشروع..."
    cd /home/epgroup
    sudo -u epgroup tar -xzf /tmp/ep-group-deploy.tar.gz -C $PROJECT_NAME
    
    echo "📦 تثبيت dependencies..."
    cd /home/epgroup/$PROJECT_NAME
    sudo -u epgroup npm ci --omit=dev --no-audit
    
    echo "🔨 بناء المشروع على السيرفر..."
    sudo -u epgroup NODE_ENV=production npm run build
    
    echo "⚙️ إعداد متغيرات البيئة..."
    # تحديث NEXTAUTH_URL
    sudo -u epgroup sed -i "s|https://your-domain.com|https://$DOMAIN|g" .env.local
    
    echo "🚀 بدء التطبيق مع PM2..."
    cd /home/epgroup
    sudo -u epgroup pm2 delete $PROJECT_NAME || true
    sudo -u epgroup pm2 start ecosystem.config.js
    sudo -u epgroup pm2 save
    
    echo "✅ التطبيق يعمل الآن!"
EOF

# ========================================
# 4. إعداد Nginx والDomain
# ========================================
echo "🌐 إعداد Nginx والدومين..."

ssh ubuntu@$SERVER_IP << EOF
    set -e
    
    echo "⚙️ تحديث إعدادات Nginx..."
    sudo sed -i "s|your-domain.com|$DOMAIN|g" /etc/nginx/sites-available/ep-group
    sudo nginx -t
    sudo systemctl reload nginx
    
    echo "🔐 إعداد SSL Certificate..."
    sudo certbot --nginx --non-interactive --agree-tos -m admin@$DOMAIN -d $DOMAIN
    
    echo "✅ SSL Certificate تم تثبيته!"
EOF

# ========================================
# 5. التحقق من النشر
# ========================================
echo "🔍 التحقق من النشر..."

ssh ubuntu@$SERVER_IP << 'EOF'
    echo "📊 حالة النظام:"
    echo "PM2 Status:"
    sudo -u epgroup pm2 status
    
    echo ""
    echo "Memory Usage:"
    free -h
    
    echo ""
    echo "Nginx Status:"
    sudo systemctl status nginx --no-pager -l
    
    echo ""
    echo "Application Health Check:"
    curl -s http://localhost:3000/health || echo "❌ Health check failed"
EOF

# ========================================
# 6. تنظيف
# ========================================
echo "🧹 تنظيف الملفات المؤقتة..."
rm -f ep-group-deploy.tar.gz
ssh ubuntu@$SERVER_IP "sudo rm -f /tmp/ep-group-deploy.tar.gz"

echo ""
echo "🎉 تم النشر بنجاح!"
echo ""
echo "📋 معلومات النشر:"
echo "🌐 Website: https://$DOMAIN"
echo "🌐 Health Check: https://$DOMAIN/health"
echo "🖥️  Server IP: $SERVER_IP"
echo ""
echo "🔍 أوامر المراقبة:"
echo "ssh ubuntu@$SERVER_IP 'sudo -u epgroup pm2 status'"
echo "ssh ubuntu@$SERVER_IP 'sudo -u epgroup pm2 logs'"
echo "ssh ubuntu@$SERVER_IP 'tail -f /var/log/system-monitor.log'"
echo ""
echo "🎯 التطبيق يعمل الآن على AWS Free Tier بأقصى سرعة!"