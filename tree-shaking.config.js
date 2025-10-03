// Tree Shaking Configuration
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

module.exports = treeShakingOptimizations;