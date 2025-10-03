const fs = require('fs');
const path = require('path');

console.log('🔬 Advanced Bundle Analysis\n');

// Read package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const deps = packageJson.dependencies;

// Heavy dependencies analysis
const heavyDependencies = {
  '@capacitor/android': { size: '50MB+', removable: true, reason: 'Mobile app only' },
  '@capacitor/ios': { size: '45MB+', removable: true, reason: 'Mobile app only' },
  '@capacitor/cli': { size: '30MB+', removable: true, reason: 'Development only' },
  '@capacitor/core': { size: '25MB+', removable: true, reason: 'Mobile app only' },
  '@react-pdf/renderer': { size: '20MB+', replaceable: true, reason: 'Use dynamic import' },
  '@supabase/supabase-js': { size: '15MB+', optimizable: true, reason: 'Tree-shake unused parts' },
  'recharts': { size: '12MB+', replaceable: true, reason: 'Use lighter charting library' },
  '@genkit-ai/googleai': { size: '10MB+', optimizable: true, reason: 'Dynamic import for AI features' },
  'next-auth': { size: '8MB+', optimizable: true, reason: 'Configure providers only when needed' },
  'i18next': { size: '6MB+', optimizable: true, reason: 'Load languages dynamically' },
  'date-fns': { size: '5MB+', optimizable: true, reason: 'Import specific functions only' }
};

// Radix UI analysis
const radixComponents = Object.keys(deps).filter(dep => dep.startsWith('@radix-ui/'));
const radixSize = radixComponents.length * 2; // Approximate 2MB per component

console.log('🐘 Heavy Dependencies Analysis:');
console.log('==========================================');

let totalPotentialSavings = 0;

Object.entries(heavyDependencies).forEach(([dep, info]) => {
  if (deps[dep]) {
    const sizeNum = parseInt(info.size);
    totalPotentialSavings += sizeNum;
    
    console.log(`📦 ${dep}`);
    console.log(`   Size: ${info.size}`);
    console.log(`   Status: ${info.removable ? '🔴 Removable' : info.replaceable ? '🟡 Replaceable' : '🟢 Optimizable'}`);
    console.log(`   Action: ${info.reason}`);
    console.log('');
  }
});

console.log(`📊 Radix UI Components: ${radixComponents.length} (~${radixSize}MB)`);
console.log(`💾 Potential Savings: ~${totalPotentialSavings}MB`);

// Unused dependencies detection
console.log('\n🔍 Potentially Unused Dependencies:');
const potentiallyUnused = [
  'critters',
  'pnpm', // Should be global
  'yarn', // Should be global
  'dotenv', // Often unused in Next.js
];

potentiallyUnused.forEach(dep => {
  if (deps[dep]) {
    console.log(`⚠️  ${dep} - Consider removing if not used`);
  }
});

// Performance recommendations
console.log('\n🚀 Advanced Optimization Recommendations:');
console.log('1. Remove Capacitor dependencies (save ~150MB)');
console.log('2. Replace recharts with a lighter alternative');
console.log('3. Use dynamic imports for PDF generation');
console.log('4. Optimize Radix UI imports');
console.log('5. Implement code splitting for AI features');
console.log('6. Use Next.js Image optimization');
console.log('7. Enable experimental features in Next.js 15');

// Check for optimization opportunities
const hasCapacitor = radixComponents.some(dep => deps[dep]);
const hasPDF = deps['@react-pdf/renderer'];
const hasCharts = deps['recharts'];

console.log('\n🎯 Priority Actions:');
if (Object.keys(deps).some(dep => dep.startsWith('@capacitor/'))) {
  console.log('🔥 HIGH: Remove Capacitor (save 150MB+)');
}
if (hasPDF) {
  console.log('🔥 HIGH: Dynamic import for PDF renderer');
}
if (hasCharts) {
  console.log('🟡 MEDIUM: Consider lighter chart library');
}
if (radixComponents.length > 10) {
  console.log('🟡 MEDIUM: Optimize Radix UI imports');
}