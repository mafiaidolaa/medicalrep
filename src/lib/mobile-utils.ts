// Mobile utilities - Web-only implementation to avoid Capacitor build errors
// This version works without any Capacitor dependencies

// Check if running on mobile device
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Check if running in Capacitor (always false in web-only build)
export function isCapacitor(): boolean {
  return false;
}

// Platform detection
export function getPlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web';
  
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod')) {
    return 'ios';
  } else if (userAgent.includes('android')) {
    return 'android';
  }
  return 'web';
}

// Web-based vibration
export async function vibrate(type: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
  if (navigator.vibrate) {
    const duration = type === 'light' ? 50 : type === 'medium' ? 100 : 200;
    navigator.vibrate(duration);
  }
}

// Status bar management - web fallback
export async function setupStatusBar(): Promise<void> {
  // Web implementation - set theme color meta tag
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (!themeColor) {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#2563eb';
    document.head.appendChild(meta);
  }
}

// Splash screen management - web fallback
export async function hideSplashScreen(): Promise<void> {
  // Hide any loading screens in web
  const loadingScreens = document.querySelectorAll('.loading-screen, #splash-screen');
  loadingScreens.forEach(screen => {
    if (screen instanceof HTMLElement) {
      screen.style.display = 'none';
    }
  });
}

// Keyboard management - web version
export function setupKeyboard(): void {
  if (typeof window === 'undefined') return;

  const handleViewportResize = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  window.addEventListener('resize', handleViewportResize);
  handleViewportResize();

  // Handle focus/blur for better mobile experience
  document.addEventListener('focusin', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      document.body.classList.add('keyboard-is-open');
    }
  });

  document.addEventListener('focusout', () => {
    document.body.classList.remove('keyboard-is-open');
  });
}

// Network status monitoring - web version
export function setupNetworkListener(callback: (connected: boolean) => void): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
  callback(navigator.onLine);
}

// App lifecycle listeners - web version
export function setupAppListeners(): void {
  if (typeof window === 'undefined') return;

  // Handle visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      document.body.classList.add('app-background');
      document.dispatchEvent(new CustomEvent('app-paused'));
    } else {
      document.body.classList.remove('app-background');
      document.dispatchEvent(new CustomEvent('app-resumed'));
    }
  });

  // Handle browser back button
  window.addEventListener('popstate', () => {
    document.dispatchEvent(new CustomEvent('hardware-back-button'));
  });
}

// Touch optimizations
export function optimizeForTouch(): void {
  if (typeof window === 'undefined') return;

  // Add CSS for better touch interactions
  const style = document.createElement('style');
  style.textContent = `
    /* Mobile touch optimizations */
    .keyboard-is-open {
      --keyboard-height: 0px;
    }
    
    .app-background {
      filter: blur(3px);
      pointer-events: none;
    }
    
    /* Better touch targets */
    button, 
    [role="button"], 
    .clickable {
      min-height: 44px;
      min-width: 44px;
      touch-action: manipulation;
    }
    
    /* Prevent text selection on UI elements */
    .ui-element {
      -webkit-user-select: none;
      user-select: none;
    }
    
    /* Smooth scrolling */
    .scroll-smooth {
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }
    
    /* Mobile-specific styles */
    @media (max-width: 768px) {
      .mobile-hide { display: none !important; }
      .mobile-full-width { width: 100% !important; }
      .mobile-text-sm { font-size: 0.875rem !important; }
      .mobile-p-2 { padding: 0.5rem !important; }
      .mobile-m-1 { margin: 0.25rem !important; }
    }
    
    /* Responsive font sizes */
    @media (max-width: 640px) {
      html { font-size: 14px; }
    }
    
    @media (max-width: 480px) {
      html { font-size: 13px; }
    }
    
    /* CSS custom properties for viewport height */
    :root {
      --vh: 1vh;
    }
    
    .full-height {
      height: 100vh; /* Fallback for older browsers */
      height: calc(var(--vh, 1vh) * 100);
    }
  `;
  
  document.head.appendChild(style);

  // Add viewport meta tag if not exists
  if (!document.querySelector('meta[name="viewport"]')) {
    const viewport = document.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover';
    document.head.appendChild(viewport);
  }

  // Prevent zoom on input focus (iOS) - Less aggressive approach
  if (getPlatform() === 'ios') {
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input instanceof HTMLElement) {
        input.style.fontSize = '16px';
      }
    });
  }
}

// Performance optimizations
export function optimizePerformance(): void {
  if (typeof window === 'undefined') return;

  // Lazy load images
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }

  // Optimize scrolling
  let ticking = false;
  const optimizeScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        // Perform scroll-related updates here
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', optimizeScroll, { passive: true });

  // Memory management
  const cleanupUnusedResources = () => {
    // Clean up event listeners
    const unusedElements = document.querySelectorAll('[data-cleanup]');
    unusedElements.forEach(element => {
      element.remove();
    });

    // Clear caches if needed
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('old-') || name.includes('temp-')) {
            caches.delete(name);
          }
        });
      });
    }
  };

  // Run cleanup periodically
  setInterval(cleanupUnusedResources, 5 * 60 * 1000); // Every 5 minutes
}

// Initialize all mobile optimizations
export async function initializeMobile(): Promise<void> {
  console.log('🚀 Initializing mobile optimizations (web-only)...');
  
  try {
    // Basic setup
    await setupStatusBar();
    setupKeyboard();
    setupAppListeners();
    optimizeForTouch();
    optimizePerformance();

    // Hide splash screen after everything is ready
    await hideSplashScreen();

    // Setup network monitoring
    setupNetworkListener((connected) => {
      document.body.classList.toggle('offline', !connected);
      document.dispatchEvent(new CustomEvent('network-status-change', { 
        detail: { connected } 
      }));
    });

    console.log('✅ Mobile optimizations initialized successfully');
    console.log('📱 Platform:', getPlatform());
    console.log('📲 Is Capacitor:', isCapacitor());
    console.log('📴 Is Mobile:', isMobile());
    
  } catch (error) {
    console.error('❌ Failed to initialize mobile optimizations:', error);
  }
}

// Export utilities
export const MobileUtils = {
  isMobile,
  isCapacitor,
  getPlatform,
  vibrate,
  setupStatusBar,
  hideSplashScreen,
  setupKeyboard,
  setupNetworkListener,
  setupAppListeners,
  optimizeForTouch,
  optimizePerformance,
  initializeMobile
};

export default MobileUtils;