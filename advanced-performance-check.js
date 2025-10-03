#!/usr/bin/env node

/**
 * فحص شامل للأداء والتحسينات المتقدمة
 * يحلل النظام ويقترح تحسينات إضافية للسرعة
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

console.log(`${colors.bold}${colors.cyan}🔬 فحص الأداء المتقدم - EP Group System${colors.reset}\n`);

let recommendations = [];
let currentScore = 0;
let maxScore = 0;

function addRecommendation(category, item, impact, current, optimal) {
  recommendations.push({ category, item, impact, current, optimal });
}

function updateScore(points, max) {
  currentScore += points;
  maxScore += max;
}

async function checkBundleSize() {
  console.log(`${colors.blue}1. تحليل حجم Bundle...${colors.reset}`);
  
  try {
    // فحص .next folder إذا كان موجود
    const nextPath = path.join('.next', 'static');
    if (fs.existsSync(nextPath)) {
      const { stdout } = await execAsync(`dir "${nextPath}" /s /-c 2>nul || du -sh ${nextPath} 2>/dev/null || echo "Size check unavailable"`);
      console.log(`${colors.green}✅ .next folder موجود${colors.reset}`);
      
      // فحص حجم الملفات الكبيرة
      const largeBundles = [];
      if (fs.existsSync(path.join('.next', 'static', 'chunks'))) {
        const chunksDir = path.join('.next', 'static', 'chunks');
        const files = fs.readdirSync(chunksDir);
        files.forEach(file => {
          const filePath = path.join(chunksDir, file);
          const stats = fs.statSync(filePath);
          const sizeKB = Math.round(stats.size / 1024);
          if (sizeKB > 500) {
            largeBundles.push({ file, size: sizeKB });
          }
        });
      }
      
      if (largeBundles.length > 0) {
        console.log(`${colors.yellow}⚠️  ملفات Bundle كبيرة الحجم:${colors.reset}`);
        largeBundles.forEach(bundle => {
          console.log(`   • ${bundle.file}: ${bundle.size}KB`);
        });
        addRecommendation('Bundle', 'تحسين حجم Bundle', 'عالي', `${largeBundles.length} ملف كبير`, 'تقسيم الكود');
        updateScore(2, 5);
      } else {
        console.log(`${colors.green}✅ أحجام Bundle محسنة${colors.reset}`);
        updateScore(5, 5);
      }
    } else {
      console.log(`${colors.yellow}⚠️  لم يتم البناء بعد - قم بتشغيل npm run build${colors.reset}`);
      updateScore(0, 5);
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠️  تعذر فحص Bundle size${colors.reset}`);
    updateScore(2, 5);
  }
}

async function checkDependencies() {
  console.log(`\n${colors.blue}2. تحليل Dependencies...${colors.reset}`);
  
  if (!fs.existsSync('package.json')) return;
  
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = pkg.dependencies || {};
  const devDeps = pkg.devDependencies || {};
  
  const totalDeps = Object.keys(deps).length + Object.keys(devDeps).length;
  console.log(`${colors.blue}📦 إجمالي Dependencies: ${totalDeps}${colors.reset}`);
  
  // Dependencies ثقيلة معروفة
  const heavyDeps = [
    '@emotion/react', '@emotion/styled',
    'framer-motion', 'three', '@react-spring/web',
    'lodash', 'moment', 'rxjs', 'date-fns'
  ];
  
  const foundHeavyDeps = heavyDeps.filter(dep => deps[dep]);
  if (foundHeavyDeps.length > 0) {
    console.log(`${colors.yellow}⚠️  Dependencies ثقيلة موجودة:${colors.reset}`);
    foundHeavyDeps.forEach(dep => {
      console.log(`   • ${dep}: ${deps[dep]}`);
    });
    addRecommendation('Dependencies', 'استبدال Dependencies ثقيلة', 'متوسط', `${foundHeavyDeps.length} مكتبة ثقيلة`, 'مكتبات أخف');
    updateScore(3, 5);
  } else {
    console.log(`${colors.green}✅ لا توجد dependencies ثقيلة${colors.reset}`);
    updateScore(5, 5);
  }
  
  // فحص Unused dependencies
  try {
    const nodeModulesSize = await execAsync('dir node_modules /s /-c 2>nul | find "File(s)" | tail -1 || echo "Size check unavailable"');
    console.log(`${colors.blue}📁 node_modules حالي${colors.reset}`);
    updateScore(3, 5);
  } catch (error) {
    updateScore(2, 5);
  }
}

async function checkImports() {
  console.log(`\n${colors.blue}3. تحليل Imports...${colors.reset}`);
  
  const badImports = [];
  const checkImportsInFile = (filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // فحص imports سيئة
      const badPatterns = [
        { pattern: /import \* as .* from ['"].+['"]/, issue: 'استيراد كامل بدلاً من محدد' },
        { pattern: /import .* from ['"]lodash['"]/, issue: 'استيراد lodash كامل' },
        { pattern: /import .* from ['"]@mui\/material['"]/, issue: 'استيراد MUI كامل' },
        { pattern: /import .* from ['"]react-icons\/fa['"]/, issue: 'استيراد أيقونات كامل' }
      ];
      
      badPatterns.forEach(({ pattern, issue }) => {
        if (pattern.test(content)) {
          badImports.push({ file: filePath, issue });
        }
      });
      
    } catch (error) {
      // تجاهل الأخطاء
    }
  };
  
  // فحص ملفات src
  const walkDir = (dir) => {
    if (!fs.existsSync(dir)) return;
    
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && file !== 'node_modules' && file !== '.next') {
        walkDir(fullPath);
      } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
        checkImportsInFile(fullPath);
      }
    });
  };
  
  walkDir('src');
  
  if (badImports.length > 0) {
    console.log(`${colors.yellow}⚠️  Imports غير محسنة (${badImports.length}):${colors.reset}`);
    badImports.slice(0, 3).forEach(imp => {
      const fileName = path.basename(imp.file);
      console.log(`   • ${fileName}: ${imp.issue}`);
    });
    addRecommendation('Imports', 'تحسين استيرادات المكتبات', 'عالي', `${badImports.length} import غير محسن`, 'imports محددة');
    updateScore(2, 5);
  } else {
    console.log(`${colors.green}✅ Imports محسنة${colors.reset}`);
    updateScore(5, 5);
  }
}

async function checkImages() {
  console.log(`\n${colors.blue}4. تحليل الصور...${colors.reset}`);
  
  const publicDir = 'public';
  let totalImages = 0;
  let largeImages = 0;
  let unoptimizedImages = 0;
  
  const checkImagesInDir = (dir) => {
    if (!fs.existsSync(dir)) return;
    
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        checkImagesInDir(fullPath);
      } else if (file.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
        totalImages++;
        const sizeKB = Math.round(stat.size / 1024);
        
        if (sizeKB > 500) {
          largeImages++;
        }
        
        if (file.match(/\.(jpg|jpeg|png)$/i) && sizeKB > 100) {
          unoptimizedImages++;
        }
      }
    });
  };
  
  checkImagesInDir(publicDir);
  
  console.log(`${colors.blue}🖼️  إجمالي الصور: ${totalImages}${colors.reset}`);
  
  if (largeImages > 0) {
    console.log(`${colors.yellow}⚠️  صور كبيرة الحجم: ${largeImages}${colors.reset}`);
    addRecommendation('Images', 'ضغط الصور الكبيرة', 'متوسط', `${largeImages} صورة كبيرة`, 'صور مضغوطة + WebP');
    updateScore(2, 5);
  }
  
  if (unoptimizedImages > 0) {
    console.log(`${colors.yellow}⚠️  صور غير محسنة: ${unoptimizedImages}${colors.reset}`);
    updateScore(2, 5);
  }
  
  if (totalImages === 0 || (largeImages === 0 && unoptimizedImages === 0)) {
    console.log(`${colors.green}✅ الصور محسنة${colors.reset}`);
    updateScore(5, 5);
  }
}

async function checkNextConfig() {
  console.log(`\n${colors.blue}5. تحليل Next.js Configuration...${colors.reset}`);
  
  if (!fs.existsSync('next.config.js')) {
    console.log(`${colors.red}❌ next.config.js مفقود${colors.reset}`);
    updateScore(0, 5);
    return;
  }
  
  const configContent = fs.readFileSync('next.config.js', 'utf8');
  
  const optimizations = [
    { feature: 'swcMinify', check: /swcMinify:\s*true/, points: 1 },
    { feature: 'experimental.optimizePackageImports', check: /optimizePackageImports/, points: 1 },
    { feature: 'images optimization', check: /images:\s*{/, points: 1 },
    { feature: 'webpack optimization', check: /webpack.*optimization/, points: 1 },
    { feature: 'compiler optimizations', check: /compiler:\s*{/, points: 1 }
  ];
  
  let configScore = 0;
  optimizations.forEach(opt => {
    if (opt.check.test(configContent)) {
      console.log(`${colors.green}✅ ${opt.feature}${colors.reset}`);
      configScore += opt.points;
    } else {
      console.log(`${colors.yellow}⚠️  ${opt.feature} غير مفعل${colors.reset}`);
      addRecommendation('Config', `تفعيل ${opt.feature}`, 'عالي', 'غير مفعل', 'مفعل');
    }
  });
  
  updateScore(configScore, 5);
}

async function checkEnvironment() {
  console.log(`\n${colors.blue}6. فحص بيئة التطوير...${colors.reset}`);
  
  try {
    // فحص Node.js version
    const { stdout: nodeVersion } = await execAsync('node --version');
    const version = nodeVersion.trim();
    const majorVersion = parseInt(version.replace('v', '').split('.')[0]);
    
    console.log(`${colors.blue}📦 Node.js: ${version}${colors.reset}`);
    
    if (majorVersion >= 18) {
      console.log(`${colors.green}✅ Node.js version حديث${colors.reset}`);
      updateScore(5, 5);
    } else {
      console.log(`${colors.yellow}⚠️  Node.js version قديم${colors.reset}`);
      addRecommendation('Environment', 'ترقية Node.js', 'عالي', version, 'Node.js 18+');
      updateScore(2, 5);
    }
    
    // فحص npm version
    const { stdout: npmVersion } = await execAsync('npm --version');
    console.log(`${colors.blue}📦 npm: v${npmVersion.trim()}${colors.reset}`);
    
    // فحص available memory
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = Math.round((usedMem / totalMem) * 100);
    
    console.log(`${colors.blue}💾 استخدام الذاكرة: ${memUsagePercent}%${colors.reset}`);
    
    if (memUsagePercent > 80) {
      console.log(`${colors.yellow}⚠️  استخدام ذاكرة عالي${colors.reset}`);
      addRecommendation('Memory', 'تحسين استخدام الذاكرة', 'متوسط', `${memUsagePercent}%`, '< 70%');
      updateScore(2, 5);
    } else {
      updateScore(5, 5);
    }
    
  } catch (error) {
    console.log(`${colors.yellow}⚠️  تعذر فحص بيئة النظام${colors.reset}`);
    updateScore(3, 5);
  }
}

async function generateOptimizedConfig() {
  console.log(`\n${colors.blue}7. إنشاء إعدادات محسنة...${colors.reset}`);
  
  const optimizedConfig = `const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // تحسينات الكومبايلر
  swcMinify: true,
  reactStrictMode: !isDev,
  
  // تحسين TypeScript في التطوير
  typescript: {
    ignoreBuildErrors: isDev,
  },
  eslint: {
    ignoreDuringBuilds: isDev,
  },
  
  // تحسينات تجريبية
  experimental: {
    // تحسين استيراد الحزم
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'date-fns',
      'clsx'
    ],
    
    // تحسينات Turbopack
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // تحسين الصور
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 86400,
  },
  
  // تحسين Webpack
  webpack: (config, { buildId, dev, isServer }) => {
    // تحسين الإنتاج
    if (!dev && !isServer) {
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }
    
    // تحسين Development
    if (dev) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }
    
    return config;
  },
  
  // تعطيل header
  poweredByHeader: false,
  
  // تفعيل compression
  compress: true,
  
  // تحسين on-demand entries
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;`;

  // حفظ في ملف منفصل
  fs.writeFileSync('next.config.optimized.js', optimizedConfig);
  console.log(`${colors.green}✅ تم إنشاء next.config.optimized.js${colors.reset}`);
}

async function generatePerformanceReport() {
  const percentage = Math.round((currentScore / maxScore) * 100);
  const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : 'D';
  const gradeColor = percentage >= 80 ? colors.green : percentage >= 60 ? colors.yellow : colors.red;
  
  console.log(`\n${colors.bold}=== تقرير الأداء ===${colors.reset}`);
  console.log(`${colors.bold}النتيجة: ${gradeColor}${percentage}% (${grade})${colors.reset}`);
  console.log(`النقاط: ${currentScore}/${maxScore}\n`);
  
  if (recommendations.length > 0) {
    console.log(`${colors.bold}${colors.yellow}🔧 توصيات التحسين:${colors.reset}\n`);
    
    const grouped = recommendations.reduce((acc, rec) => {
      if (!acc[rec.category]) acc[rec.category] = [];
      acc[rec.category].push(rec);
      return acc;
    }, {});
    
    Object.entries(grouped).forEach(([category, recs]) => {
      console.log(`${colors.bold}${colors.blue}${category}:${colors.reset}`);
      recs.forEach(rec => {
        const impactColor = rec.impact === 'عالي' ? colors.red : rec.impact === 'متوسط' ? colors.yellow : colors.green;
        console.log(`  • ${rec.item}`);
        console.log(`    التأثير: ${impactColor}${rec.impact}${colors.reset} | الحالي: ${rec.current} → المقترح: ${rec.optimal}`);
      });
      console.log();
    });
  } else {
    console.log(`${colors.green}🎉 لا توجد توصيات - النظام محسن بالكامل!${colors.reset}\n`);
  }
  
  // توصيات سريعة للتحسين
  console.log(`${colors.bold}${colors.cyan}⚡ تحسينات سريعة مقترحة:${colors.reset}`);
  console.log(`1. استخدم: ${colors.yellow}cp next.config.optimized.js next.config.js${colors.reset}`);
  console.log(`2. قم بتشغيل: ${colors.yellow}npm run build${colors.reset} لاختبار التحسينات`);
  console.log(`3. راجع حجم Bundle: ${colors.yellow}npm run build:analyze${colors.reset}`);
  console.log(`4. استخدم: ${colors.yellow}npm run dev:rocket${colors.reset} للتطوير المحسن\n`);
}

// تشغيل الفحوصات
async function runAllChecks() {
  try {
    await checkBundleSize();
    await checkDependencies();
    await checkImports();
    await checkImages();
    await checkNextConfig();
    await checkEnvironment();
    await generateOptimizedConfig();
    await generatePerformanceReport();
  } catch (error) {
    console.error(`${colors.red}خطأ في الفحص: ${error.message}${colors.reset}`);
  }
}

runAllChecks();