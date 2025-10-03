/**
 * Theme Effects Utilities
 * Programmatic helpers for managing theme effects and animations
 */

export interface ThemeEffectConfig {
  id: string;
  animations: {
    entrance?: string;
    hover?: string;
    exit?: string;
  };
  particles?: boolean;
  background?: string;
  glowColor?: string;
}

/**
 * Theme-specific effect configurations
 */
export const THEME_EFFECT_CONFIGS: Record<string, ThemeEffectConfig> = {
  'professional': {
    id: 'professional',
    animations: {
      entrance: 'fadeIn',
      hover: 'scale',
      exit: 'fadeOut',
    },
    particles: false,
    glowColor: '59, 130, 246',
  },
  'emerald-garden': {
    id: 'emerald-garden',
    animations: {
      entrance: 'slideInRight',
      hover: 'float',
      exit: 'fadeOut',
    },
    particles: true,
    background: 'nature',
    glowColor: '16, 185, 129',
  },
  'royal-purple': {
    id: 'royal-purple',
    animations: {
      entrance: 'scaleIn',
      hover: 'glow',
      exit: 'fadeOut',
    },
    particles: true,
    background: 'sparkle',
    glowColor: '168, 85, 247',
  },
  'sunset-bliss': {
    id: 'sunset-bliss',
    animations: {
      entrance: 'fadeIn',
      hover: 'glow',
      exit: 'fadeOut',
    },
    particles: false,
    background: 'rays',
    glowColor: '251, 113, 133',
  },
  'ocean-deep': {
    id: 'ocean-deep',
    animations: {
      entrance: 'slideInRight',
      hover: 'float',
      exit: 'fadeOut',
    },
    particles: false,
    background: 'wave',
    glowColor: '6, 182, 212',
  },
  'orange-neon': {
    id: 'orange-neon',
    animations: {
      entrance: 'fadeIn',
      hover: 'glow',
      exit: 'fadeOut',
    },
    particles: false,
    background: 'neon',
    glowColor: '251, 146, 60',
  },
  'glassy': {
    id: 'glassy',
    animations: {
      entrance: 'scaleIn',
      hover: 'glass',
      exit: 'fadeOut',
    },
    particles: false,
    glowColor: '167, 139, 250',
  },
  'dark': {
    id: 'dark',
    animations: {
      entrance: 'fadeIn',
      hover: 'glow',
      exit: 'fadeOut',
    },
    particles: false,
    glowColor: '88, 166, 255',
  },
  'blue-sky': {
    id: 'blue-sky',
    animations: {
      entrance: 'slideInRight',
      hover: 'float',
      exit: 'fadeOut',
    },
    particles: false,
    glowColor: '56, 189, 248',
  },
  'ios-like': {
    id: 'ios-like',
    animations: {
      entrance: 'scaleIn',
      hover: 'scale',
      exit: 'fadeOut',
    },
    particles: false,
    glowColor: '90, 200, 250',
  },
};

/**
 * Get effect configuration for a theme
 */
export function getThemeEffectConfig(themeId: string): ThemeEffectConfig | undefined {
  return THEME_EFFECT_CONFIGS[themeId];
}

/**
 * Apply entrance animation to element
 */
export function applyEntranceAnimation(element: HTMLElement, themeId: string): void {
  const config = getThemeEffectConfig(themeId);
  if (config?.animations.entrance) {
    element.classList.add(`theme-${config.animations.entrance}`);
  }
}

/**
 * Intersection Observer for scroll-triggered animations
 */
export function initScrollAnimations(): void {
  if (typeof window === 'undefined') return;

  const observerOptions: IntersectionObserverInit = {
    root: null,
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px',
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        // Optional: stop observing after animation
        // observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all elements with reveal classes
  const revealElements = document.querySelectorAll(
    '.theme-reveal, .theme-reveal-left, .theme-reveal-right, .theme-reveal-scale, .reveal-on-scroll, .reveal-from-left, .reveal-from-right, .reveal-scale'
  );

  revealElements.forEach((el) => observer.observe(el));
}

/**
 * Create particle effect for themes
 */
export function createParticleEffect(themeId: string, container: HTMLElement): void {
  const config = getThemeEffectConfig(themeId);
  if (!config?.particles) return;

  const particleCount = 15;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'theme-particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 15}s`;
    particle.style.animationDuration = `${10 + Math.random() * 10}s`;
    container.appendChild(particle);
  }
}

/**
 * Add spotlight effect with mouse tracking
 */
export function initSpotlightEffect(element: HTMLElement): () => void {
  const handleMouseMove = (e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    element.style.setProperty('--mouse-x', `${x}%`);
    element.style.setProperty('--mouse-y', `${y}%`);
  };

  element.addEventListener('mousemove', handleMouseMove);

  // Return cleanup function
  return () => {
    element.removeEventListener('mousemove', handleMouseMove);
  };
}

/**
 * Add magnetic effect with mouse tracking
 */
export function initMagneticEffect(element: HTMLElement, strength: number = 0.3): () => void {
  const handleMouseMove = (e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;
    
    element.style.setProperty('--mouse-offset-x', `${deltaX}px`);
    element.style.setProperty('--mouse-offset-y', `${deltaY}px`);
  };

  const handleMouseLeave = () => {
    element.style.setProperty('--mouse-offset-x', '0px');
    element.style.setProperty('--mouse-offset-y', '0px');
  };

  element.addEventListener('mousemove', handleMouseMove);
  element.addEventListener('mouseleave', handleMouseLeave);

  // Return cleanup function
  return () => {
    element.removeEventListener('mousemove', handleMouseMove);
    element.removeEventListener('mouseleave', handleMouseLeave);
  };
}

/**
 * Add ripple effect on click
 */
export function initRippleEffect(element: HTMLElement): () => void {
  const handleClick = (e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-circle';
    ripple.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.5);
      transform: translate(-50%, -50%);
      pointer-events: none;
      animation: ripple-animation 0.6s ease-out;
    `;

    element.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  element.addEventListener('click', handleClick);

  // Return cleanup function
  return () => {
    element.removeEventListener('click', handleClick);
  };
}

/**
 * Parallax scrolling effect
 */
export function initParallaxEffect(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleScroll = () => {
    const scrollY = window.scrollY;
    document.documentElement.style.setProperty('--scroll-y', scrollY.toString());
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  // Return cleanup function
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}

/**
 * Theme transition animation
 */
export function animateThemeTransition(element: HTMLElement, callback: () => void): void {
  element.classList.add('theme-transitioning');

  setTimeout(() => {
    callback();
    element.classList.remove('theme-transitioning');
  }, 500);
}

/**
 * Create background effect based on theme
 */
export function createBackgroundEffect(themeId: string, container: HTMLElement): void {
  const config = getThemeEffectConfig(themeId);
  if (!config?.background) return;

  // Remove existing background effects
  const existing = container.querySelector('.theme-background-effect');
  if (existing) existing.remove();

  const bgEffect = document.createElement('div');
  bgEffect.className = 'theme-background-effect';

  switch (config.background) {
    case 'nature':
      // Emerald Garden - subtle nature effect
      bgEffect.innerHTML = '<div class="theme-particle"></div>'.repeat(10);
      break;

    case 'sparkle':
      // Royal Purple - sparkle effect
      bgEffect.innerHTML = '<div class="theme-sparkle"></div>'.repeat(20);
      Array.from(bgEffect.children).forEach((sparkle, i) => {
        (sparkle as HTMLElement).style.left = `${Math.random() * 100}%`;
        (sparkle as HTMLElement).style.top = `${Math.random() * 100}%`;
        (sparkle as HTMLElement).style.animationDelay = `${i * 0.1}s`;
      });
      break;

    case 'rays':
      // Sunset Bliss - sun rays
      bgEffect.className = 'theme-rays';
      break;

    case 'wave':
      // Ocean Deep - wave effect
      bgEffect.className = 'theme-wave';
      break;

    case 'neon':
      // Orange Neon - glow effect
      bgEffect.style.cssText = `
        position: fixed;
        inset: 0;
        pointer-events: none;
        background: radial-gradient(circle at 50% 50%, rgba(${config.glowColor}, 0.05), transparent 60%);
        z-index: -1;
      `;
      break;
  }

  container.appendChild(bgEffect);
}

/**
 * Initialize all theme effects
 */
export function initThemeEffects(themeId: string): () => void {
  const cleanupFunctions: Array<() => void> = [];

  // Init scroll animations
  initScrollAnimations();

  // Init parallax
  const cleanupParallax = initParallaxEffect();
  cleanupFunctions.push(cleanupParallax);

  // Init spotlight effects
  const spotlightElements = document.querySelectorAll('.theme-spotlight, .card-spotlight');
  spotlightElements.forEach((el) => {
    const cleanup = initSpotlightEffect(el as HTMLElement);
    cleanupFunctions.push(cleanup);
  });

  // Init magnetic effects
  const magneticElements = document.querySelectorAll('.theme-magnetic, .theme-cursor-magnetic');
  magneticElements.forEach((el) => {
    const cleanup = initMagneticEffect(el as HTMLElement);
    cleanupFunctions.push(cleanup);
  });

  // Init ripple effects
  const rippleElements = document.querySelectorAll('.theme-ripple, .effect-ripple, .btn-enhanced');
  rippleElements.forEach((el) => {
    const cleanup = initRippleEffect(el as HTMLElement);
    cleanupFunctions.push(cleanup);
  });

  // Create particles if needed
  const particleContainer = document.querySelector('body');
  if (particleContainer) {
    createParticleEffect(themeId, particleContainer as HTMLElement);
  }

  // Add ripple animation keyframes if not exists
  if (!document.getElementById('ripple-animation-styles')) {
    const style = document.createElement('style');
    style.id = 'ripple-animation-styles';
    style.textContent = `
      @keyframes ripple-animation {
        to {
          width: 300px;
          height: 300px;
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Return master cleanup function
  return () => {
    cleanupFunctions.forEach((cleanup) => cleanup());
  };
}

/**
 * Utility to check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Conditionally apply animations based on user preferences
 */
export function applyAnimationClass(element: HTMLElement, className: string): void {
  if (!prefersReducedMotion()) {
    element.classList.add(className);
  }
}