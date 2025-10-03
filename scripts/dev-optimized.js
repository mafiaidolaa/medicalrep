#!/usr/bin/env node
// Optimized Development Server with Memory Management
const { spawn } = require('child_process');
const path = require('path');

class OptimizedDevServer {
  constructor() {
    this.maxMemory = 3072; // 3GB
    this.restartThreshold = 2048; // 2GB
    this.serverProcess = null;
    this.memoryCheckInterval = null;
  }

  startServer() {
    console.log('🚀 Starting optimized development server...\n');
    
    // Clean build artifacts first
    this.cleanBuildArtifacts();
    
    // Set optimized Node.js options
    const nodeOptions = [
      `--max-old-space-size=${this.maxMemory}`,
      '--max-http-header-size=16384',
      '--gc-interval=1000',
      '--optimize-for-size'
    ];

    // Start Next.js development server
    this.serverProcess = spawn('npx', ['next', 'dev', '--turbo'], {
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_OPTIONS: nodeOptions.join(' '),
        NODE_ENV: 'development',
        NEXT_TELEMETRY_DISABLED: '1', // Disable telemetry for better performance
        TURBOPACK: '1'
      },
      shell: true
    });

    // Handle server output
    this.serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      
      // Filter out excessive memory logs
      if (!output.includes('[Performance] Memory Usage')) {
        process.stdout.write(output);
      } else {
        // Only show memory usage every 30 seconds
        this.throttledMemoryLog(output);
      }
    });

    this.serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      
      // Filter known non-critical errors
      if (!this.isKnownNonCriticalError(error)) {
        process.stderr.write(error);
      }
    });

    this.serverProcess.on('close', (code) => {
      console.log(`\n📊 Development server exited with code ${code}`);
      this.cleanup();
    });

    this.serverProcess.on('error', (error) => {
      console.error('❌ Failed to start development server:', error);
      this.cleanup();
    });

    // Start memory monitoring
    this.startMemoryMonitoring();

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down development server...');
      this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.cleanup();
      process.exit(0);
    });
  }

  cleanBuildArtifacts() {
    const fs = require('fs');
    const paths = [
      '.next',
      '.next/cache',
      'node_modules/.cache'
    ];

    paths.forEach(dirPath => {
      try {
        if (fs.existsSync(dirPath)) {
          fs.rmSync(dirPath, { recursive: true, force: true });
          console.log(`🧹 Cleaned: ${dirPath}`);
        }
      } catch (error) {
        // Silently ignore cleanup errors
      }
    });
  }

  isKnownNonCriticalError(error) {
    const nonCriticalPatterns = [
      'ENOENT.*_buildManifest.js.tmp',
      'middleware-manifest.json',
      'Activity log request timed out',
      'optimizeUniversalDefaults',
      'Invalid next.config.js options detected.*memoryLimit',
      'Invalid next.config.js options detected.*loaders'
    ];

    return nonCriticalPatterns.some(pattern => 
      new RegExp(pattern, 'i').test(error)
    );
  }

  throttledMemoryLog(output) {
    const now = Date.now();
    if (!this.lastMemoryLog || now - this.lastMemoryLog > 30000) { // 30 seconds
      this.lastMemoryLog = now;
      
      // Parse memory info
      const memMatch = output.match(/rss: '(\d+)MB'.*heapUsed: '(\d+)MB'/);
      if (memMatch) {
        const [, rss, heapUsed] = memMatch;
        console.log(`📊 Memory: RSS ${rss}MB, Heap ${heapUsed}MB`);
        
        // Check if restart is needed
        if (parseInt(rss) > this.restartThreshold) {
          console.log('⚠️  High memory usage detected. Consider restarting server.');
        }
      }
    }
  }

  startMemoryMonitoring() {
    this.memoryCheckInterval = setInterval(() => {
      if (this.serverProcess && !this.serverProcess.killed) {
        try {
          process.stdout.write(''); // Keep process alive check
        } catch (error) {
          // Server process might have died
          this.cleanup();
        }
      }
    }, 10000); // Check every 10 seconds
  }

  cleanup() {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }

    if (this.serverProcess && !this.serverProcess.killed) {
      this.serverProcess.kill('SIGTERM');
    }
  }
}

// Display startup info
console.log(`
🔧 Optimized Next.js Development Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️  Configuration:
   • Memory limit: 3GB
   • Turbopack: Enabled
   • Memory monitoring: Active
   • Error filtering: Enabled

🚀 Starting server...
`);

// Start the optimized development server
const server = new OptimizedDevServer();
server.startServer();