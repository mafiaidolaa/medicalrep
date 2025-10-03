const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 تحسين Dependencies - نظام ذكي\n');

// قائمة Dependencies الثقيلة وبدائلها
const HEAVY_DEPS_ALTERNATIVES = {
  '@emotion/react': {
    alternative: 'className + tailwind',
    weight: '120KB',
    suggestion: 'استخدام Tailwind CSS بدلاً من Emotion'
  },
  '@emotion/styled': {
    alternative: 'className + tailwind', 
    weight: '85KB',
    suggestion: 'استخدام Tailwind CSS بدلاً من styled components'
  },
  'date-fns': {
    alternative: 'date-fns/esm + tree shaking',
    weight: '200KB',
    suggestion: 'استيراد محدد من date-fns/esm فقط للدوال المطلوبة'
  },
  'recharts': {
    alternative: 'chart.js + react-chartjs-2',
    weight: '400KB', 
    suggestion: 'Chart.js أخف وأسرع للرسوم البيانية البسيطة'
  },
  '@react-pdf/renderer': {
    alternative: 'jsPDF + html2canvas',
    weight: '600KB',
    suggestion: 'jsPDF أخف لإنتاج PDF بسيط'
  }
};

// فحص حجم node_modules
function checkNodeModulesSize() {
  try {
    const nodeModulesPath = './node_modules';
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('❌ مجلد node_modules غير موجود');
      return;
    }

    const stats = execSync(`dir "${nodeModulesPath}" /-c | findstr "bytes"`, { encoding: 'utf8' });
    const sizeMatch = stats.match(/([0-9,]+) bytes/);
    if (sizeMatch) {
      const sizeBytes = parseInt(sizeMatch[1].replace(/,/g, ''));
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
      console.log(`📦 حجم node_modules: ${sizeMB} MB`);
      
      if (sizeMB > 500) {
        console.log('⚠️  حجم Dependencies كبير جداً - يحتاج تحسين');
      }
    }
  } catch (error) {
    console.log('⚠️  لا يمكن قياس حجم node_modules');
  }
}

// تحليل Dependencies المستخدمة فعلياً
function analyzeUsedDependencies() {
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  console.log('🔍 تحليل Dependencies الثقيلة:\n');
  
  let heavyDepsFound = 0;
  let totalPotentialSavings = 0;
  
  Object.keys(dependencies).forEach(dep => {
    if (HEAVY_DEPS_ALTERNATIVES[dep]) {
      const info = HEAVY_DEPS_ALTERNATIVES[dep];
      console.log(`🔴 ${dep} (${info.weight})`);
      console.log(`   💡 اقتراح: ${info.suggestion}`);
      console.log(`   ✅ البديل: ${info.alternative}\n`);
      
      heavyDepsFound++;
      totalPotentialSavings += parseInt(info.weight.replace('KB', ''));
    }
  });
  
  if (heavyDepsFound === 0) {
    console.log('✅ لا توجد Dependencies ثقيلة معروفة');
  } else {
    console.log(`📊 إجمالي Dependencies الثقيلة: ${heavyDepsFound}`);
    console.log(`💾 توفير محتمل: ~${totalPotentialSavings}KB\n`);
  }
}

// إنشاء ملف تحسين Dependencies
function createOptimizationGuide() {
  const guide = `# 🚀 دليل تحسين Dependencies

## Dependencies الثقيلة الموجودة:

${Object.entries(HEAVY_DEPS_ALTERNATIVES).map(([dep, info]) => `
### ${dep}
- **الحجم:** ${info.weight}
- **المشكلة:** dependency ثقيل
- **الحل المقترح:** ${info.suggestion}
- **البديل:** ${info.alternative}
`).join('')}

## خطوات التحسين:

### 1. تحسين date-fns:
\`\`\`javascript
// ❌ سيء - يحمل كل المكتبة
import * as dateFns from 'date-fns';
import { format } from 'date-fns';

// ✅ جيد - استيراد محدد
import format from 'date-fns/format';
import isToday from 'date-fns/isToday';
\`\`\`

### 2. استبدال @emotion بـ Tailwind:
\`\`\`jsx
// ❌ سيء - emotion
const StyledButton = styled.button\`
  background: blue;
  color: white;
\`;

// ✅ جيد - tailwind
<button className="bg-blue-500 text-white">
\`\`\`

### 3. تحسين recharts:
\`\`\`javascript
// فقط عند الحاجة للرسوم البيانية المعقدة
// للرسوم البسيطة، استخدم chart.js
\`\`\`

## الأوامر المفيدة:

\`\`\`bash
# فحص حجم Dependencies
npm ls --depth=0

# فحص Dependencies غير المستخدمة  
npx depcheck

# تحليل Bundle
npm run build:analyze
\`\`\`
`;

  fs.writeFileSync('./DEPENDENCIES_OPTIMIZATION.md', guide);
  console.log('✅ تم إنشاء دليل تحسين Dependencies: DEPENDENCIES_OPTIMIZATION.md');
}

// إنشاء إعدادات Tree Shaking محسنة
function createTreeShakingConfig() {
  const config = `// Tree Shaking Configuration
// استخدم هذا في next.config.js

const treeShakingOptimizations = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons', 
      'date-fns',
      'lodash-es',
      'ramda',
      'clsx',
      'class-variance-authority'
    ],
  },
  
  webpack: (config) => {
    // تحسين Tree Shaking
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: false,
      providedExports: true,
    };
    
    return config;
  }
};

module.exports = treeShakingOptimizations;`;

  fs.writeFileSync('./tree-shaking.config.js', config);
  console.log('✅ تم إنشاء إعدادات Tree Shaking: tree-shaking.config.js');
}

// تشغيل كل التحليلات
function runOptimization() {
  console.log('🚀 بدء تحسين Dependencies...\n');
  
  checkNodeModulesSize();
  console.log('');
  
  analyzeUsedDependencies();
  
  createOptimizationGuide();
  createTreeShakingConfig();
  
  console.log('\n🎉 تم تحسين Dependencies!');
  console.log('\n📋 الخطوات التالية:');
  console.log('1. راجع ملف DEPENDENCIES_OPTIMIZATION.md');
  console.log('2. طبق التحسينات المقترحة');
  console.log('3. شغل npm run build:analyze لقياس التحسن');
}

// تشغيل النظام
runOptimization();