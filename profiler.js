const v8 = require('v8');
const os = require('os');
const fs = require('fs');

class AdvancedProfiler {
  constructor() {
    this.startTime = Date.now();
    this.initialMemory = process.memoryUsage();
    this.samples = [];
  }

  // Memory profiling
  getMemoryStats() {
    const usage = process.memoryUsage();
    const v8Stats = v8.getHeapStatistics();
    
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      heapLimit: Math.round(v8Stats.heap_size_limit / 1024 / 1024), // MB
      heapAvailable: Math.round((v8Stats.heap_size_limit - v8Stats.used_heap_size) / 1024 / 1024), // MB
    };
  }

  // System stats
  getSystemStats() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpuCount: cpus.length,
      cpuModel: cpus[0].model,
      totalMemoryGB: Math.round(totalMem / 1024 / 1024 / 1024 * 100) / 100,
      freeMemoryGB: Math.round(freeMem / 1024 / 1024 / 1024 * 100) / 100,
      usedMemoryPercent: Math.round((1 - freeMem / totalMem) * 100),
    };
  }

  // Webpack bundle analysis simulation
  analyzeBundle() {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const deps = Object.keys(packageJson.dependencies || {});
    
    const heavyDeps = deps.filter(dep => 
      dep.includes('capacitor') ||
      dep.includes('@react-pdf') ||
      dep.includes('recharts') ||
      dep.includes('@genkit-ai') ||
      dep.includes('@radix-ui')
    );

    const estimatedSize = {
      '@capacitor': 150, // MB
      '@react-pdf': 20,
      'recharts': 12,
      '@genkit-ai': 10,
      '@radix-ui': deps.filter(d => d.includes('@radix-ui')).length * 2,
      'next': 25,
      'react': 5,
    };

    let totalEstimatedSize = 0;
    const breakdown = {};

    Object.keys(estimatedSize).forEach(key => {
      const matchingDeps = deps.filter(dep => dep.includes(key.replace('@', '')));
      if (matchingDeps.length > 0) {
        breakdown[key] = estimatedSize[key];
        totalEstimatedSize += estimatedSize[key];
      }
    });

    return {
      totalDependencies: deps.length,
      heavyDependencies: heavyDeps.length,
      estimatedBundleSize: totalEstimatedSize,
      breakdown,
      recommendations: this.getOptimizationRecommendations(heavyDeps)
    };
  }

  getOptimizationRecommendations(heavyDeps) {
    const recommendations = [];
    
    if (heavyDeps.some(d => d.includes('capacitor'))) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Remove Capacitor dependencies',
        savings: '~150MB',
        reason: 'Only needed for mobile apps'
      });
    }
    
    if (heavyDeps.some(d => d.includes('@react-pdf'))) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Use dynamic import for PDF renderer',
        savings: '~20MB',
        reason: 'Load only when needed'
      });
    }
    
    if (heavyDeps.some(d => d.includes('recharts'))) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Consider lighter chart library',
        savings: '~12MB',
        reason: 'Recharts is heavy for simple charts'
      });
    }

    const radixCount = heavyDeps.filter(d => d.includes('@radix-ui')).length;
    if (radixCount > 15) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Optimize Radix UI imports',
        savings: `~${Math.round(radixCount * 0.5)}MB`,
        reason: 'Too many UI components imported'
      });
    }

    return recommendations;
  }

  // Performance test
  async runPerformanceTest() {
    console.log('🔥 Advanced Performance Profiler\n');
    
    // System analysis
    const system = this.getSystemStats();
    console.log('💻 System Information:');
    console.log(`   Platform: ${system.platform} ${system.arch}`);
    console.log(`   CPU: ${system.cpuModel} (${system.cpuCount} cores)`);
    console.log(`   Memory: ${system.totalMemoryGB}GB total, ${system.freeMemoryGB}GB free (${system.usedMemoryPercent}% used)`);
    
    // Memory analysis
    const memory = this.getMemoryStats();
    console.log('\n🧠 Node.js Memory Usage:');
    console.log(`   RSS: ${memory.rss}MB`);
    console.log(`   Heap Used: ${memory.heapUsed}MB / ${memory.heapTotal}MB`);
    console.log(`   Heap Limit: ${memory.heapLimit}MB`);
    console.log(`   Available: ${memory.heapAvailable}MB`);
    
    // Memory pressure analysis
    const memoryPressure = (memory.heapUsed / memory.heapLimit) * 100;
    if (memoryPressure > 80) {
      console.log(`   🔴 HIGH memory pressure (${Math.round(memoryPressure)}%)`);
    } else if (memoryPressure > 60) {
      console.log(`   🟡 MEDIUM memory pressure (${Math.round(memoryPressure)}%)`);
    } else {
      console.log(`   🟢 LOW memory pressure (${Math.round(memoryPressure)}%)`);
    }
    
    // Bundle analysis
    const bundle = this.analyzeBundle();
    console.log('\n📦 Bundle Analysis:');
    console.log(`   Total Dependencies: ${bundle.totalDependencies}`);
    console.log(`   Heavy Dependencies: ${bundle.heavyDependencies}`);
    console.log(`   Estimated Bundle Size: ~${bundle.estimatedBundleSize}MB`);
    
    console.log('\n📊 Size Breakdown:');
    Object.entries(bundle.breakdown).forEach(([lib, size]) => {
      console.log(`   ${lib}: ~${size}MB`);
    });
    
    // Recommendations
    console.log('\n🚀 Optimization Recommendations:');
    bundle.recommendations.forEach((rec, i) => {
      const priority = rec.priority === 'HIGH' ? '🔥' : 
                      rec.priority === 'MEDIUM' ? '🟡' : '🔵';
      console.log(`   ${priority} ${rec.priority}: ${rec.action}`);
      console.log(`      Savings: ${rec.savings} - ${rec.reason}`);
    });

    // Performance score
    let score = 100;
    if (bundle.heavyDependencies > 5) score -= 20;
    if (bundle.estimatedBundleSize > 100) score -= 30;
    if (memoryPressure > 60) score -= 20;
    if (system.freeMemoryGB < 2) score -= 15;
    if (system.totalMemoryGB < 8) score -= 15;

    console.log('\n🎯 Performance Score:');
    const scoreColor = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
    console.log(`   ${scoreColor} ${score}/100`);
    
    if (score >= 80) {
      console.log('   Excellent! Your setup is well optimized.');
    } else if (score >= 60) {
      console.log('   Good, but there\'s room for improvement.');
    } else {
      console.log('   Needs optimization. Follow the recommendations above.');
    }

    // Next steps
    console.log('\n📋 Immediate Action Items:');
    if (bundle.recommendations.length > 0) {
      const highPriority = bundle.recommendations.filter(r => r.priority === 'HIGH');
      if (highPriority.length > 0) {
        console.log(`   1. ${highPriority[0].action} (save ${highPriority[0].savings})`);
      }
    }
    
    if (memory.heapAvailable < 500) {
      console.log('   2. Increase NODE_OPTIONS memory limit');
    }
    
    if (system.freeMemoryGB < 2) {
      console.log('   3. Close other applications to free memory');
    }

    return {
      score,
      system,
      memory,
      bundle,
      timestamp: new Date().toISOString()
    };
  }

  // Save report
  async saveReport(data) {
    const report = {
      ...data,
      runtime: Date.now() - this.startTime
    };
    
    fs.writeFileSync('performance-report.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Report saved to performance-report.json');
  }
}

// Run profiler if called directly
if (require.main === module) {
  const profiler = new AdvancedProfiler();
  profiler.runPerformanceTest().then(data => {
    profiler.saveReport(data);
  });
}

module.exports = AdvancedProfiler;