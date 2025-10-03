// Advanced Bundle Analysis and Optimization Tool
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class AdvancedBundleAnalyzer {
  constructor() {
    this.reportPath = './analyze';
    this.thresholds = {
      maxChunkSize: 244000, // 244KB
      maxTotalSize: 2000000, // 2MB
      maxAssets: 100
    };
  }

  async analyzeBundles() {
    console.log('🔍 Starting advanced bundle analysis...\n');
    
    try {
      // 1. Build with analysis
      console.log('📦 Building with bundle analyzer...');
      await this.runCommand('npm run build:analyze');
      
      // 2. Check bundle sizes
      console.log('📊 Analyzing bundle sizes...');
      await this.checkBundleSizes();
      
      // 3. Identify optimization opportunities
      console.log('⚡ Identifying optimization opportunities...');
      await this.identifyOptimizations();
      
      // 4. Generate recommendations
      console.log('💡 Generating optimization recommendations...');
      await this.generateRecommendations();
      
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message);
    }
  }

  async runCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        console.log(stdout);
        if (stderr) console.warn(stderr);
        resolve(stdout);
      });
    });
  }

  async checkBundleSizes() {
    const buildPath = './.next';
    if (!fs.existsSync(buildPath)) {
      throw new Error('Build directory not found. Run npm run build first.');
    }

    // Check static files
    const staticPath = path.join(buildPath, 'static');
    if (fs.existsSync(staticPath)) {
      const chunks = this.getAllFiles(staticPath, '.js');
      
      console.log('📈 Bundle Size Analysis:');
      console.log('=' .repeat(50));
      
      const analysis = chunks.map(chunk => {
        const size = fs.statSync(chunk).size;
        const relativePath = path.relative(buildPath, chunk);
        return { path: relativePath, size, sizeKB: Math.round(size / 1024) };
      });

      // Sort by size descending
      analysis.sort((a, b) => b.size - a.size);
      
      const totalSize = analysis.reduce((sum, item) => sum + item.size, 0);
      
      console.log(`Total bundle size: ${Math.round(totalSize / 1024)} KB`);
      console.log(`Number of chunks: ${analysis.length}`);
      console.log('\nLargest chunks:');
      
      analysis.slice(0, 10).forEach((item, index) => {
        const status = item.size > this.thresholds.maxChunkSize ? '🔴' : '🟢';
        console.log(`${status} ${index + 1}. ${item.path} - ${item.sizeKB} KB`);
      });

      return analysis;
    }
  }

  getAllFiles(dir, extension) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getAllFiles(fullPath, extension));
      } else if (path.extname(item) === extension) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  async identifyOptimizations() {
    const recommendations = [];

    // Check for common optimization opportunities
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // 1. Large libraries check
    const largeDeps = [
      '@radix-ui', 'recharts', 'i18next', '@emotion', '@supabase'
    ];

    largeDeps.forEach(dep => {
      const matchingDeps = Object.keys(dependencies).filter(d => d.includes(dep));
      if (matchingDeps.length > 0) {
        recommendations.push({
          type: 'library',
          severity: 'medium',
          dependency: matchingDeps,
          suggestion: `Consider lazy loading ${dep} components or using tree-shaking`
        });
      }
    });

    // 2. Multiple UI library check
    const uiLibraries = Object.keys(dependencies).filter(dep => 
      dep.includes('ui') || dep.includes('radix') || dep.includes('headless')
    );

    if (uiLibraries.length > 5) {
      recommendations.push({
        type: 'dependencies',
        severity: 'high',
        suggestion: 'Consider consolidating UI libraries to reduce bundle size'
      });
    }

    return recommendations;
  }

  async generateRecommendations() {
    const recommendations = `
# 📊 Bundle Optimization Recommendations

## 🎯 High Priority Optimizations

### 1. **Dynamic Imports for Heavy Components**
\`\`\`javascript
// Instead of direct imports
import { Calendar } from '@radix-ui/react-calendar';

// Use dynamic imports
const Calendar = dynamic(() => import('@radix-ui/react-calendar'), {
  loading: () => <div>Loading calendar...</div>
});
\`\`\`

### 2. **Tree Shaking Optimization**
\`\`\`javascript
// Bad - imports entire library
import * as Icons from 'lucide-react';

// Good - import only what you need
import { Home, Settings, User } from 'lucide-react';
\`\`\`

### 3. **Lazy Load Route Components**
\`\`\`javascript
// In your Next.js pages
const DashboardPage = dynamic(() => import('../components/Dashboard'), {
  loading: () => <LoadingSkeleton />
});
\`\`\`

## 🔧 Medium Priority Optimizations

### 1. **Image Optimization**
- Use Next.js Image component everywhere
- Implement WebP/AVIF formats
- Add proper image sizing

### 2. **Font Optimization**
\`\`\`javascript
// In next.config.js
experimental: {
  fontLoaders: [
    { loader: '@next/font/google', options: { subsets: ['latin'] } },
  ],
}
\`\`\`

### 3. **API Route Optimization**
- Implement response caching
- Use API route handlers efficiently
- Add request deduplication

## 📈 Performance Monitoring

### Bundle Size Tracking Commands:
\`\`\`bash
# Analyze current bundle
npm run build:analyze

# Check bundle sizes
npm run size:check

# Performance profiling
npm run perf:test
\`\`\`

### Recommended Size Limits:
- ✅ First Load JS: < 130 KB
- ✅ Route JS: < 244 KB  
- ✅ Total JS: < 2 MB

## 🚀 Advanced Optimizations

### 1. **Service Worker Implementation**
- Cache static assets
- Implement background sync
- Add offline functionality

### 2. **ISR (Incremental Static Regeneration)**
- Cache API responses
- Implement stale-while-revalidate
- Use on-demand revalidation

### 3. **Edge Runtime Usage**
- Move simple API routes to Edge
- Use Edge-compatible libraries
- Reduce cold start times
`;

    const reportsDir = './reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir);
    }

    fs.writeFileSync(
      path.join(reportsDir, 'optimization-recommendations.md'),
      recommendations
    );

    console.log('✅ Optimization recommendations saved to ./reports/optimization-recommendations.md');
  }
}

// Run analyzer if called directly
if (require.main === module) {
  const analyzer = new AdvancedBundleAnalyzer();
  analyzer.analyzeBundles().then(() => {
    console.log('🎉 Bundle analysis complete!');
  }).catch(console.error);
}

module.exports = AdvancedBundleAnalyzer;