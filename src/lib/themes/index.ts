// @ts-nocheck
import { supabase } from '../supabase';

// Types for themes and UI
export interface Theme {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  category: 'modern' | 'classic' | 'minimal' | 'creative' | 'corporate' | 'dark' | 'custom';
  
  // Color palette
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      disabled: string;
      inverse: string;
    };
    border: string;
    shadow: string;
  };
  
  // Typography
  typography: {
    fontFamily: {
      primary: string;
      secondary: string;
      monospace: string;
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
    };
    fontWeight: {
      light: number;
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  
  // Spacing & Layout
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  
  // Border Radius
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  
  // Shadows
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  
  // Animations
  animations: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      linear: string;
      easeIn: string;
      easeOut: string;
      easeInOut: string;
      bounce: string;
    };
  };
  
  // Component-specific styles
  components: {
    button: {
      borderRadius: string;
      paddingX: string;
      paddingY: string;
      fontSize: string;
      fontWeight: number;
      transition: string;
    };
    card: {
      backgroundColor: string;
      borderRadius: string;
      boxShadow: string;
      border: string;
      padding: string;
    };
    input: {
      borderRadius: string;
      border: string;
      backgroundColor: string;
      fontSize: string;
      padding: string;
      focusBorder: string;
    };
    modal: {
      backgroundColor: string;
      borderRadius: string;
      boxShadow: string;
      backdropBlur: string;
    };
  };
  
  // Custom properties
  customProperties?: Record<string, string>;
  
  // Metadata
  is_default: boolean;
  is_premium: boolean;
  preview_image?: string;
  usage_count: number;
  rating: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface UserThemeSettings {
  id: string;
  user_id: string;
  current_theme_id: string;
  custom_colors?: Partial<Theme['colors']>;
  custom_typography?: Partial<Theme['typography']>;
  custom_spacing?: Partial<Theme['spacing']>;
  dark_mode_enabled: boolean;
  high_contrast_enabled: boolean;
  reduce_motion_enabled: boolean;
  font_size_scale: number; // 0.8 to 1.5
  animation_speed: number; // 0.5 to 2.0
  created_at: string;
  updated_at: string;
}

export interface AnimationPreset {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  
  // CSS Animation properties
  keyframes: Record<string, Record<string, string>>;
  duration: string;
  timing: string;
  iteration: string;
  direction: string;
  fillMode: string;
  
  // Usage context
  contexts: ('hover' | 'focus' | 'click' | 'load' | 'scroll' | 'transition')[];
  
  // Performance considerations
  gpu_accelerated: boolean;
  performance_impact: 'low' | 'medium' | 'high';
  
  created_at: string;
}

export interface LanguageSupport {
  id: string;
  code: string; // ISO 639-1 (ar, en, fr, etc.)
  name: string;
  native_name: string;
  direction: 'ltr' | 'rtl';
  flag_emoji: string;
  
  // Translation status
  translations: Record<string, string>;
  completion_percentage: number;
  
  // Locale settings
  date_format: string;
  time_format: string;
  number_format: {
    decimal_separator: string;
    thousands_separator: string;
    currency_symbol: string;
    currency_position: 'before' | 'after';
  };
  
  // Font support
  fonts: string[];
  
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

class ThemeService {
  private currentTheme: Theme | null = null;
  private animationObserver: IntersectionObserver | null = null;
  
  // Theme Management
  async getThemes(category?: string): Promise<Theme[]> {
    try {
      let query = supabase
        .from('themes')
        .select('*')
        .order('usage_count', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get themes failed:', error);
      return [];
    }
  }

  async getThemeById(themeId: string): Promise<Theme | null> {
    try {
      const { data, error } = await supabase
        .from('themes')
        .select('*')
        .eq('id', themeId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get theme by ID failed:', error);
      return null;
    }
  }

  async createCustomTheme(themeData: Omit<Theme, 'id' | 'created_at' | 'updated_at' | 'usage_count' | 'rating'>): Promise<Theme | null> {
    try {
      const customTheme = {
        ...themeData,
        category: 'custom' as const,
        usage_count: 0,
        rating: 0,
      };

      const { data, error } = await supabase
        .from('themes')
        .insert(customTheme)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create custom theme failed:', error);
      return null;
    }
  }

  // Apply theme to the UI
  async applyTheme(themeId: string, userId?: string): Promise<boolean> {
    try {
      const theme = await this.getThemeById(themeId);
      if (!theme) return false;

      // Apply CSS custom properties
      this.applyCSSVariables(theme);
      
      // Update body classes
      this.updateBodyClasses(theme);
      
      // Store current theme
      this.currentTheme = theme;
      
      // Save user preference
      if (userId) {
        await this.updateUserThemeSettings(userId, { current_theme_id: themeId });
      }
      
      // Increment theme usage
      await supabase
        .from('themes')
        .update({ usage_count: theme.usage_count + 1 })
        .eq('id', themeId);

      // Trigger theme change event
      this.dispatchThemeChangeEvent(theme);
      
      return true;
    } catch (error) {
      console.error('Apply theme failed:', error);
      return false;
    }
  }

  private applyCSSVariables(theme: Theme): void {
    const root = document.documentElement;
    
    // Colors
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-success', theme.colors.success);
    root.style.setProperty('--color-warning', theme.colors.warning);
    root.style.setProperty('--color-error', theme.colors.error);
    root.style.setProperty('--color-info', theme.colors.info);
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-text-primary', theme.colors.text.primary);
    root.style.setProperty('--color-text-secondary', theme.colors.text.secondary);
    root.style.setProperty('--color-text-disabled', theme.colors.text.disabled);
    root.style.setProperty('--color-text-inverse', theme.colors.text.inverse);
    root.style.setProperty('--color-border', theme.colors.border);
    root.style.setProperty('--color-shadow', theme.colors.shadow);

    // Typography
    root.style.setProperty('--font-primary', theme.typography.fontFamily.primary);
    root.style.setProperty('--font-secondary', theme.typography.fontFamily.secondary);
    root.style.setProperty('--font-monospace', theme.typography.fontFamily.monospace);
    
    Object.entries(theme.typography.fontSize).forEach(([size, value]) => {
      root.style.setProperty(`--font-size-${size}`, value);
    });
    
    Object.entries(theme.typography.fontWeight).forEach(([weight, value]) => {
      root.style.setProperty(`--font-weight-${weight}`, value.toString());
    });

    // Spacing
    Object.entries(theme.spacing).forEach(([size, value]) => {
      root.style.setProperty(`--spacing-${size}`, value);
    });

    // Border Radius
    Object.entries(theme.borderRadius).forEach(([size, value]) => {
      root.style.setProperty(`--radius-${size}`, value);
    });

    // Shadows
    Object.entries(theme.shadows).forEach(([size, value]) => {
      root.style.setProperty(`--shadow-${size}`, value);
    });

    // Animations
    Object.entries(theme.animations.duration).forEach(([speed, value]) => {
      root.style.setProperty(`--duration-${speed}`, value);
    });
    
    Object.entries(theme.animations.easing).forEach(([type, value]) => {
      root.style.setProperty(`--easing-${type}`, value);
    });

    // Custom properties
    if (theme.customProperties) {
      Object.entries(theme.customProperties).forEach(([property, value]) => {
        root.style.setProperty(`--${property}`, value);
      });
    }
  }

  private updateBodyClasses(theme: Theme): void {
    const body = document.body;
    
    // Remove existing theme classes
    body.classList.forEach(className => {
      if (className.startsWith('theme-')) {
        body.classList.remove(className);
      }
    });
    
    // Add new theme classes
    body.classList.add(`theme-${theme.name}`);
    body.classList.add(`theme-category-${theme.category}`);
  }

  private dispatchThemeChangeEvent(theme: Theme): void {
    const event = new CustomEvent('themeChanged', {
      detail: { theme }
    });
    window.dispatchEvent(event);
  }

  // User Theme Settings
  async getUserThemeSettings(userId: string): Promise<UserThemeSettings | null> {
    try {
      const { data, error } = await supabase
        .from('user_theme_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        return await this.createDefaultUserSettings(userId);
      }

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get user theme settings failed:', error);
      return null;
    }
  }

  async createDefaultUserSettings(userId: string): Promise<UserThemeSettings | null> {
    try {
      // Get default theme
      const { data: defaultTheme } = await supabase
        .from('themes')
        .select('id')
        .eq('is_default', true)
        .single();

      const defaultSettings = {
        user_id: userId,
        current_theme_id: defaultTheme?.id || 'default',
        dark_mode_enabled: false,
        high_contrast_enabled: false,
        reduce_motion_enabled: false,
        font_size_scale: 1.0,
        animation_speed: 1.0,
      };

      const { data, error } = await supabase
        .from('user_theme_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create default user settings failed:', error);
      return null;
    }
  }

  async updateUserThemeSettings(userId: string, updates: Partial<UserThemeSettings>): Promise<UserThemeSettings | null> {
    try {
      const { data, error } = await supabase
        .from('user_theme_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      
      // Apply settings immediately
      await this.applyUserSettings(data);
      
      return data;
    } catch (error) {
      console.error('Update user theme settings failed:', error);
      return null;
    }
  }

  private async applyUserSettings(settings: UserThemeSettings): Promise<void> {
    const root = document.documentElement;
    
    // Apply font scale
    root.style.setProperty('--font-scale', settings.font_size_scale.toString());
    
    // Apply animation speed
    root.style.setProperty('--animation-speed', settings.animation_speed.toString());
    
    // Apply accessibility settings
    if (settings.high_contrast_enabled) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    if (settings.reduce_motion_enabled) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
    
    // Apply dark mode
    if (settings.dark_mode_enabled) {
      root.classList.add('dark-mode');
    } else {
      root.classList.remove('dark-mode');
    }
  }

  // Animation System
  async getAnimationPresets(): Promise<AnimationPreset[]> {
    try {
      const { data, error } = await supabase
        .from('animation_presets')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get animation presets failed:', error);
      return [];
    }
  }

  registerAnimation(element: HTMLElement, animationName: string, trigger: 'hover' | 'click' | 'scroll' | 'load' = 'load'): void {
    if (trigger === 'scroll') {
      this.setupScrollAnimation(element, animationName);
    } else if (trigger === 'hover') {
      element.addEventListener('mouseenter', () => this.playAnimation(element, animationName));
    } else if (trigger === 'click') {
      element.addEventListener('click', () => this.playAnimation(element, animationName));
    } else if (trigger === 'load') {
      // Play immediately
      this.playAnimation(element, animationName);
    }
  }

  private setupScrollAnimation(element: HTMLElement, animationName: string): void {
    if (!this.animationObserver) {
      this.animationObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const animName = entry.target.getAttribute('data-animation');
              if (animName) {
                this.playAnimation(entry.target as HTMLElement, animName);
              }
            }
          });
        },
        { threshold: 0.1 }
      );
    }
    
    element.setAttribute('data-animation', animationName);
    this.animationObserver.observe(element);
  }

  private playAnimation(element: HTMLElement, animationName: string): void {
    // Remove existing animation
    element.style.animation = '';
    
    // Force reflow
    element.offsetHeight;
    
    // Apply new animation
    element.style.animation = `${animationName} var(--duration-normal) var(--easing-easeOut)`;
    
    // Clean up after animation
    element.addEventListener('animationend', () => {
      element.style.animation = '';
    }, { once: true });
  }

  // Language Support
  async getSupportedLanguages(): Promise<LanguageSupport[]> {
    try {
      const { data, error } = await supabase
        .from('language_support')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get supported languages failed:', error);
      return [];
    }
  }

  async setLanguage(languageCode: string, userId?: string): Promise<boolean> {
    try {
      const { data: language } = await supabase
        .from('language_support')
        .select('*')
        .eq('code', languageCode)
        .eq('is_active', true)
        .single();

      if (!language) return false;

      // Update document language and direction
      document.documentElement.lang = language.code;
      document.documentElement.dir = language.direction;
      
      // Update body class for styling
      document.body.classList.remove('ltr', 'rtl');
      document.body.classList.add(language.direction);
      
      // Save user preference
      if (userId) {
        await supabase
          .from('users')
          .update({ 
            preferences: { language: language.code }
          })
          .eq('id', userId);
      }
      
      // Store in localStorage for persistence
      localStorage.setItem('preferred-language', language.code);
      
      // Dispatch language change event
      const event = new CustomEvent('languageChanged', {
        detail: { language }
      });
      window.dispatchEvent(event);
      
      return true;
    } catch (error) {
      console.error('Set language failed:', error);
      return false;
    }
  }

  translate(key: string, params?: Record<string, string>): string {
    try {
      const currentLang = document.documentElement.lang || 'ar';
      
      // Get translation from current language
      // In a real implementation, this would load from the language support table
      const translations = this.getTranslations(currentLang);
      let translation = translations[key] || key;
      
      // Replace parameters
      if (params) {
        Object.entries(params).forEach(([param, value]) => {
          translation = translation.replace(`{${param}}`, value);
        });
      }
      
      return translation;
    } catch (error) {
      console.error('Translate failed:', error);
      return key;
    }
  }

  private getTranslations(languageCode: string): Record<string, string> {
    // This would typically load from the database or a JSON file
    const translations: Record<string, Record<string, string>> = {
      'ar': {
        'welcome': 'مرحباً',
        'dashboard': 'لوحة التحكم',
        'expenses': 'المصروفات',
        'reports': 'التقارير',
        'settings': 'الإعدادات',
        'logout': 'تسجيل الخروج',
        // Add more translations
      },
      'en': {
        'welcome': 'Welcome',
        'dashboard': 'Dashboard',
        'expenses': 'Expenses',
        'reports': 'Reports',
        'settings': 'Settings',
        'logout': 'Logout',
        // Add more translations
      }
    };
    
    return translations[languageCode] || translations['ar'];
  }

  // Theme Generation & Customization
  generateColorPalette(baseColor: string): Theme['colors'] {
    // Convert hex to HSL for easier manipulation
    const hsl = this.hexToHsl(baseColor);
    
    return {
      primary: baseColor,
      secondary: this.hslToHex(hsl.h, Math.max(0, hsl.s - 20), Math.min(100, hsl.l + 10)),
      accent: this.hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l),
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      background: '#ffffff',
      surface: '#f8fafc',
      text: {
        primary: '#1f2937',
        secondary: '#6b7280',
        disabled: '#9ca3af',
        inverse: '#ffffff',
      },
      border: '#e5e7eb',
      shadow: 'rgba(0, 0, 0, 0.1)',
    };
  }

  private hexToHsl(hex: string): { h: number; s: number; l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  private hslToHex(h: number, s: number, l: number): string {
    h /= 360;
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 1/6) { r = c; g = x; b = 0; }
    else if (1/6 <= h && h < 1/3) { r = x; g = c; b = 0; }
    else if (1/3 <= h && h < 1/2) { r = 0; g = c; b = x; }
    else if (1/2 <= h && h < 2/3) { r = 0; g = x; b = c; }
    else if (2/3 <= h && h < 5/6) { r = x; g = 0; b = c; }
    else if (5/6 <= h && h < 1) { r = c; g = 0; b = x; }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  // Accessibility Features
  async enableHighContrast(userId: string): Promise<boolean> {
    try {
      await this.updateUserThemeSettings(userId, { high_contrast_enabled: true });
      return true;
    } catch (error) {
      console.error('Enable high contrast failed:', error);
      return false;
    }
  }

  async enableReducedMotion(userId: string): Promise<boolean> {
    try {
      await this.updateUserThemeSettings(userId, { reduce_motion_enabled: true });
      return true;
    } catch (error) {
      console.error('Enable reduced motion failed:', error);
      return false;
    }
  }

  async adjustFontSize(userId: string, scale: number): Promise<boolean> {
    try {
      const clampedScale = Math.max(0.8, Math.min(1.5, scale));
      await this.updateUserThemeSettings(userId, { font_size_scale: clampedScale });
      return true;
    } catch (error) {
      console.error('Adjust font size failed:', error);
      return false;
    }
  }

  // Performance optimizations
  preloadTheme(themeId: string): void {
    // Preload theme assets in the background
    this.getThemeById(themeId).then(theme => {
      if (theme?.preview_image) {
        const img = new Image();
        img.src = theme.preview_image;
      }
    });
  }

  cleanup(): void {
    if (this.animationObserver) {
      this.animationObserver.disconnect();
      this.animationObserver = null;
    }
  }
}

export const themeService = new ThemeService();
export default themeService;