/**
 * 🧹 سكريبت تنظيف شامل وذكي للمشروع
 * يحذف الملفات غير المستخدمة ويحسن الأداء
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectCleaner {
  constructor() {
    this.deletedFiles = [];
    this.cleanedBytes = 0;
    this.errors = [];
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m', 
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}[CLEANUP] ${message}${colors.reset}`);
  }

  /**
   * حذف الملفات المكررة والنسخ الاحتياطية
   */
  cleanDuplicatesAndBackups() {
    this.log('🔍 البحث عن الملفات المكررة والنسخ الاحتياطية...');
    
    const patterns = [
      // ملفات النسخ الاحتياطية
      /\.backup$/,
      /\.bak$/,
      /\.old$/,
      /\.orig$/,
      /\.copy$/,
      /\.clone$/,
      
      // ملفات مؤقتة
      /~$/,
      /\.tmp$/,
      /\.temp$/,
      
      // ملفات التحكم بالإصدارات القديمة
      /\.git\.bak$/,
      /\.svn$/,
      
      // Next.js configs مكررة
      /next\.config\.(backup|bak|old|copy|clone|fixed|clean|final|optimized|professional|ultra|performance|production)\.js$/,
      
      // Package.json مكررة  
      /package\.(backup|bak|old|copy|clone|fixed|optimized|professional|windows-fixed)\.json$/,
      
      // TSConfig مكررة
      /tsconfig\.(backup|bak|old|copy|clone|production)\.json$/
    ];

    this.cleanByPatterns('.', patterns, {
      excludeDirs: ['node_modules', '.git', '.next'],
      maxDepth: 3
    });
  }

  /**
   * تنظيف ملفات الوثائق المكررة
   */
  cleanDocumentationFiles() {
    this.log('📚 تنظيف ملفات الوثائق المكررة...');
    
    const docsToKeep = [
      'README.md',
      'package.json',
      'next.config.js',
      'tsconfig.json',
      '.env.example'
    ];

    const patterns = [
      // ملفات README مكررة
      /README_.*\.md$/,
      /readme.*\.md$/i,
      
      // ملفات الإرشادات المكررة
      /_guide\.md$/i,
      /_instructions\.md$/i,
      /_summary\.md$/i,
      /_report\.md$/i,
      /_fixes?\.md$/i,
      /_documentation\.md$/i,
      
      // ملفات SQL Scripts مكررة (نحتفظ بالأساسية فقط)
      /fix.*\.sql$/,
      /quick.*\.sql$/,
      /test.*\.sql$/,
      /debug.*\.sql$/,
      /urgent.*\.sql$/,
      
      // Scripts مكررة
      /\.bat$/,
      /\.cmd$/,
      /\.ps1$/,
      /\.php$/
    ];

    this.cleanByPatterns('.', patterns, {
      excludeDirs: ['node_modules', '.git', '.next', 'src'],
      keepFiles: docsToKeep
    });
  }

  /**
   * تنظيف cache والملفات المؤقتة
   */
  cleanCacheAndTemp() {
    this.log('🗑️ تنظيف ملفات الكاش والملفات المؤقتة...');
    
    const cacheDirs = [
      '.next/cache',
      '.next/static/development',
      'node_modules/.cache',
      '.tsbuildinfo'
    ];

    cacheDirs.forEach(dir => {
      try {
        if (fs.existsSync(dir)) {
          const size = this.getDirSize(dir);
          this.removeDir(dir);
          this.cleanedBytes += size;
          this.log(`✅ تم حذف: ${dir} (${this.formatBytes(size)})`);
        }
      } catch (error) {
        this.errors.push(`خطأ في حذف ${dir}: ${error.message}`);
      }
    });
  }

  /**
   * حذف الملفات حسب الأنماط
   */
  cleanByPatterns(rootDir, patterns, options = {}) {
    const {
      excludeDirs = [],
      keepFiles = [],
      maxDepth = 5
    } = options;

    const scanDir = (dir, depth = 0) => {
      if (depth > maxDepth) return;
      
      try {
        const items = fs.readdirSync(dir);
        
        items.forEach(item => {
          const itemPath = path.join(dir, item);
          const relativePath = path.relative('.', itemPath);
          
          // تجاهل المجلدات المستثناة
          if (excludeDirs.some(exclude => relativePath.includes(exclude))) {
            return;
          }
          
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory()) {
            scanDir(itemPath, depth + 1);
          } else if (stat.isFile()) {
            // تحقق من الأنماط
            const shouldDelete = patterns.some(pattern => 
              pattern.test(item) || pattern.test(relativePath)
            );
            
            // تحقق من الملفات المحفوظة
            const isKeptFile = keepFiles.some(keep => 
              item === keep || relativePath.endsWith(keep)
            );
            
            if (shouldDelete && !isKeptFile) {
              try {
                fs.unlinkSync(itemPath);
                this.deletedFiles.push(relativePath);
                this.cleanedBytes += stat.size;
                this.log(`🗑️ حذف: ${relativePath} (${this.formatBytes(stat.size)})`, 'warning');
              } catch (error) {
                this.errors.push(`فشل حذف ${relativePath}: ${error.message}`);
              }
            }
          }
        });
      } catch (error) {
        this.errors.push(`فشل في قراءة المجلد ${dir}: ${error.message}`);
      }
    };

    scanDir(rootDir);
  }

  /**
   * إزالة مجلد بالكامل
   */
  removeDir(dirPath) {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  }

  /**
   * حساب حجم المجلد
   */
  getDirSize(dirPath) {
    let size = 0;
    
    const scanDir = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory()) {
            scanDir(itemPath);
          } else {
            size += stat.size;
          }
        });
      } catch (error) {
        // تجاهل الأخطاء
      }
    };
    
    if (fs.existsSync(dirPath)) {
      scanDir(dirPath);
    }
    
    return size;
  }

  /**
   * تنسيق حجم الملفات
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * تنظيف npm packages غير المستخدمة
   */
  cleanUnusedDependencies() {
    this.log('📦 البحث عن التبعيات غير المستخدمة...');
    
    try {
      // تشغيل npm audit لتنظيف الثغرات
      this.log('🔒 تشغيل npm audit للأمان...');
      execSync('npm audit fix --force', { stdio: 'ignore' });
      
      this.log('✅ تم إصلاح الثغرات الأمنية');
    } catch (error) {
      this.log('⚠️ تعذر تشغيل npm audit', 'warning');
    }
  }

  /**
   * إنشاء تقرير التنظيف
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      deletedFiles: this.deletedFiles.length,
      cleanedBytes: this.cleanedBytes,
      cleanedSize: this.formatBytes(this.cleanedBytes),
      errors: this.errors.length,
      files: this.deletedFiles.slice(0, 20), // أول 20 ملف فقط
      errorDetails: this.errors
    };

    const reportPath = 'cleanup-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`📊 تم إنشاء تقرير التنظيف: ${reportPath}`);
    
    return report;
  }

  /**
   * تشغيل عملية التنظيف الكاملة
   */
  async run() {
    this.log('🚀 بدء عملية التنظيف الشاملة...', 'info');
    console.log('=' .repeat(50));

    const startTime = Date.now();

    try {
      // 1. تنظيف النسخ المكررة
      this.cleanDuplicatesAndBackups();
      
      // 2. تنظيف الوثائق المكررة  
      this.cleanDocumentationFiles();
      
      // 3. تنظيف الكاش
      this.cleanCacheAndTemp();
      
      // 4. تنظيف التبعيات
      this.cleanUnusedDependencies();
      
      // 5. إنشاء التقرير
      const report = this.generateReport();
      
      const duration = (Date.now() - startTime) / 1000;
      
      console.log('=' .repeat(50));
      this.log(`✅ انتهت عملية التنظيف بنجاح!`, 'success');
      this.log(`📁 ملفات محذوفة: ${report.deletedFiles}`, 'success');
      this.log(`💾 مساحة محررة: ${report.cleanedSize}`, 'success');
      this.log(`⏱️ وقت التنظيف: ${duration}s`, 'success');
      
      if (this.errors.length > 0) {
        this.log(`⚠️ أخطاء: ${this.errors.length}`, 'warning');
        this.errors.forEach(error => {
          this.log(`   - ${error}`, 'error');
        });
      }
      
    } catch (error) {
      this.log(`❌ خطأ في عملية التنظيف: ${error.message}`, 'error');
      throw error;
    }
  }
}

// تشغيل السكريبت
if (require.main === module) {
  const cleaner = new ProjectCleaner();
  cleaner.run().catch(error => {
    console.error('❌ خطأ عام:', error);
    process.exit(1);
  });
}

module.exports = ProjectCleaner;