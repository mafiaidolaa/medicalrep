const fs = require('fs');
const { execSync } = require('child_process');

class RealTimePerformanceMonitor {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      memoryUsage: [],
      cpuUsage: [],
      bundleSize: 0,
      buildTime: 0,
      hotReloadTime: [],
      apiResponseTimes: [],
    };
    
    this.isMonitoring = false;
  }
  
  // بدء المراقبة
  startMonitoring() {
    if (this.isMonitoring) return;
    
    console.log('🔍 بدء مراقبة الأداء في الوقت الفعلي...\n');
    this.isMonitoring = true;
    
    // مراقبة الذاكرة كل 5 ثواني
    this.memoryInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 5000);
    
    // مراقبة Bundle size كل دقيقة
    this.bundleInterval = setInterval(() => {
      this.checkBundleSize();
    }, 60000);
    
    // تقرير دوري كل 30 ثانية
    this.reportInterval = setInterval(() => {
      this.generateLiveReport();
    }, 30000);
  }
  
  // إيقاف المراقبة
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    clearInterval(this.memoryInterval);
    clearInterval(this.bundleInterval);
    clearInterval(this.reportInterval);
    
    console.log('⏹️  تم إيقاف مراقبة الأداء');
  }
  
  // فحص استخدام الذاكرة
  checkMemoryUsage() {
    try {
      const used = process.memoryUsage();
      const memoryMB = Math.round(used.heapUsed / 1024 / 1024);
      
      this.metrics.memoryUsage.push({
        timestamp: Date.now(),
        heapUsed: memoryMB,
        heapTotal: Math.round(used.heapTotal / 1024 / 1024),
        external: Math.round(used.external / 1024 / 1024)
      });
      
      // احتفظ بآخر 100 قراءة
      if (this.metrics.memoryUsage.length > 100) {
        this.metrics.memoryUsage.shift();
      }
      
      // تحذير إذا استخدام الذاكرة عالي
      if (memoryMB > 1500) {
        console.log(`⚠️  استخدام ذاكرة عالي: ${memoryMB}MB`);
      }
      
    } catch (error) {
      console.error('خطأ في فحص الذاكرة:', error.message);
    }
  }
  
  // فحص حجم Bundle
  checkBundleSize() {
    try {
      const nextPath = './.next';
      if (fs.existsSync(nextPath)) {
        const stat = execSync(`dir "${nextPath}" /-c | findstr "bytes"`, { encoding: 'utf8' });
        const sizeMatch = stat.match(/([0-9,]+) bytes/);
        
        if (sizeMatch) {
          const sizeBytes = parseInt(sizeMatch[1].replace(/,/g, ''));
          const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
          this.metrics.bundleSize = parseFloat(sizeMB);
          
          if (this.metrics.bundleSize > 50) {
            console.log(`⚠️  حجم Bundle كبير: ${sizeMB}MB`);
          }
        }
      }
    } catch (error) {
      // تجاهل الأخطاء في فحص Bundle
    }
  }
  
  // قياس وقت Hot Reload
  measureHotReload() {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.metrics.hotReloadTime.push(duration);
      
      if (this.metrics.hotReloadTime.length > 20) {
        this.metrics.hotReloadTime.shift();
      }
      
      if (duration > 3000) {
        console.log(`⚠️  Hot Reload بطيء: ${duration}ms`);
      }
      
      return duration;
    };
  }
  
  // قياس وقت استجابة API
  measureApiCall(endpoint) {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.metrics.apiResponseTimes.push({
        endpoint,
        duration,
        timestamp: Date.now()
      });
      
      if (this.metrics.apiResponseTimes.length > 50) {
        this.metrics.apiResponseTimes.shift();
      }
      
      if (duration > 2000) {
        console.log(`⚠️  API بطيء: ${endpoint} - ${duration}ms`);
      }
      
      return duration;
    };
  }
  
  // تقرير مباشر
  generateLiveReport() {
    const uptime = Math.floor((Date.now() - this.metrics.startTime) / 1000);
    const currentMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
    
    console.clear();
    console.log('📊 تقرير الأداء المباشر - EP Group System');
    console.log('='.repeat(50));
    console.log(`⏱️  وقت التشغيل: ${this.formatTime(uptime)}`);
    
    if (currentMemory) {
      console.log(`🧠 الذاكرة: ${currentMemory.heapUsed}MB / ${currentMemory.heapTotal}MB`);
    }
    
    if (this.metrics.bundleSize > 0) {
      console.log(`📦 حجم Bundle: ${this.metrics.bundleSize}MB`);
    }
    
    // إحصائيات Hot Reload
    if (this.metrics.hotReloadTime.length > 0) {
      const avgHotReload = this.metrics.hotReloadTime.reduce((a, b) => a + b, 0) / this.metrics.hotReloadTime.length;
      console.log(`🔥 متوسط Hot Reload: ${avgHotReload.toFixed(0)}ms`);
    }
    
    // إحصائيات API
    if (this.metrics.apiResponseTimes.length > 0) {
      const avgApi = this.metrics.apiResponseTimes.reduce((a, b) => a + b.duration, 0) / this.metrics.apiResponseTimes.length;
      console.log(`🌐 متوسط استجابة API: ${avgApi.toFixed(0)}ms`);
    }
    
    // نصائح الأداء
    this.showPerformanceTips();
    
    console.log('\\n' + '='.repeat(50));
    console.log('اضغط Ctrl+C لإيقاف المراقبة');
  }
  
  // نصائح الأداء الديناميكية
  showPerformanceTips() {
    const tips = [];
    
    if (this.metrics.memoryUsage.length > 0) {
      const currentMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
      if (currentMemory.heapUsed > 1000) {
        tips.push('💡 قلل استخدام الذاكرة بإغلاق التبويبات غير الضرورية');
      }
    }
    
    if (this.metrics.bundleSize > 30) {
      tips.push('💡 حجم Bundle كبير - استخدم code splitting');
    }
    
    if (this.metrics.hotReloadTime.length > 0) {
      const avgHotReload = this.metrics.hotReloadTime.reduce((a, b) => a + b, 0) / this.metrics.hotReloadTime.length;
      if (avgHotReload > 2000) {
        tips.push('💡 Hot Reload بطيء - نظف cache أو استخدم Turbopack');
      }
    }
    
    if (tips.length > 0) {
      console.log('\\n🚀 نصائح التحسين:');
      tips.forEach(tip => console.log(`   ${tip}`));
    }
  }
  
  // تنسيق الوقت
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}س ${minutes}د ${secs}ث`;
    } else if (minutes > 0) {
      return `${minutes}د ${secs}ث`;
    } else {
      return `${secs}ث`;
    }
  }
  
  // حفظ التقرير النهائي
  saveFinalReport() {
    const report = {
      sessionDuration: Date.now() - this.metrics.startTime,
      memoryStats: this.calculateMemoryStats(),
      bundleSize: this.metrics.bundleSize,
      hotReloadStats: this.calculateHotReloadStats(),
      apiStats: this.calculateApiStats(),
      recommendations: this.generateRecommendations()
    };
    
    const filename = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    
    console.log(`\\n📄 تم حفظ التقرير النهائي: ${filename}`);
  }
  
  // حساب إحصائيات الذاكرة
  calculateMemoryStats() {
    if (this.metrics.memoryUsage.length === 0) return null;
    
    const memories = this.metrics.memoryUsage.map(m => m.heapUsed);
    return {
      average: memories.reduce((a, b) => a + b, 0) / memories.length,
      min: Math.min(...memories),
      max: Math.max(...memories),
      current: memories[memories.length - 1]
    };
  }
  
  // حساب إحصائيات Hot Reload
  calculateHotReloadStats() {
    if (this.metrics.hotReloadTime.length === 0) return null;
    
    return {
      average: this.metrics.hotReloadTime.reduce((a, b) => a + b, 0) / this.metrics.hotReloadTime.length,
      min: Math.min(...this.metrics.hotReloadTime),
      max: Math.max(...this.metrics.hotReloadTime),
      count: this.metrics.hotReloadTime.length
    };
  }
  
  // حساب إحصائيات API
  calculateApiStats() {
    if (this.metrics.apiResponseTimes.length === 0) return null;
    
    const times = this.metrics.apiResponseTimes.map(a => a.duration);
    return {
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      count: times.length
    };
  }
  
  // إنتاج توصيات
  generateRecommendations() {
    const recommendations = [];
    
    const memoryStats = this.calculateMemoryStats();
    if (memoryStats && memoryStats.average > 800) {
      recommendations.push('تقليل استخدام الذاكرة بتحسين Components');
    }
    
    if (this.metrics.bundleSize > 25) {
      recommendations.push('تطبيق code splitting لتقليل Bundle size');
    }
    
    const hotReloadStats = this.calculateHotReloadStats();
    if (hotReloadStats && hotReloadStats.average > 1500) {
      recommendations.push('تحسين Hot Reload بتفعيل Turbopack');
    }
    
    return recommendations;
  }
}

// إنشاء monitor instance
const monitor = new RealTimePerformanceMonitor();

// معالجة إيقاف النظام
process.on('SIGINT', () => {
  console.log('\\n🔄 جاري حفظ التقرير النهائي...');
  monitor.saveFinalReport();
  monitor.stopMonitoring();
  process.exit(0);
});

// بدء المراقبة
monitor.startMonitoring();

// Export للاستخدام في مكان آخر
module.exports = RealTimePerformanceMonitor;