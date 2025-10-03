/**
 * Dynamic Theme CSS Loader
 * محمل CSS الثيمات الديناميكي
 * 
 * يدير تطبيق متغيرات CSS للثيمات بشكل ديناميكي
 */

// @ts-nocheck

'use client';

import { useState, useEffect } from 'react';

interface ThemeLoaderHook {
  loadTheme: (themeId: string) => Promise<void>;
  activeTheme: string | null;
  loading: boolean;
  error: string | null;
}

let currentStyleElement: HTMLStyleElement | null = null;

/**
 * تحميل متغيرات CSS للثيم
 * Load CSS variables for theme
 */
export async function loadThemeCSS(themeId: string): Promise<string> {
  try {
    const response = await fetch(`/api/themes?action=css-variables&themeId=${themeId}`);
    const data = await response.json();
    
    if (!data.cssVariables) {
      throw new Error('فشل في تحميل متغيرات CSS');
    }
    
    return data.cssVariables;
  } catch (error) {
    console.error('Error loading theme CSS:', error);
    throw error;
  }
}

/**
 * تطبيق CSS الثيم على الصفحة
 * Apply theme CSS to page
 */
export function applyThemeCSS(cssVariables: string): void {
  try {
    // إزالة الثيم السابق إن وجد
    if (currentStyleElement) {
      currentStyleElement.remove();
    }
    
    // إنشاء عنصر style جديد
    currentStyleElement = document.createElement('style');
    currentStyleElement.id = 'dynamic-theme-variables';
    currentStyleElement.textContent = cssVariables;
    
    // إضافة العنصر إلى head
    document.head.appendChild(currentStyleElement);
    
    // Theme applied successfully
    
    console.log('✅ تم تطبيق الثيم بنجاح');
  } catch (error) {
    console.error('خطأ في تطبيق CSS الثيم:', error);
    throw error;
  }
}

/**
 * إزالة الثيم المطبق حالياً
 * Remove currently applied theme
 */
export function removeCurrentTheme(): void {
  if (currentStyleElement) {
    currentStyleElement.remove();
    currentStyleElement = null;
    console.log('✅ تم إزالة الثيم');
  }
}

/**
 * Hook لإدارة تحميل الثيمات
 * Hook for managing theme loading
 */
export function useThemeLoader(): ThemeLoaderHook {
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTheme = async (themeId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const cssVariables = await loadThemeCSS(themeId);
      applyThemeCSS(cssVariables);
      
      setActiveTheme(themeId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في تحميل الثيم';
      setError(errorMessage);
      console.error('خطأ في تحميل الثيم:', err);
    } finally {
      setLoading(false);
    }
  };

  // Theme initialization removed

  return {
    loadTheme,
    activeTheme,
    loading,
    error
  };
}

/**
 * دالة مساعدة لتحديث متغير CSS واحد
 * Helper function to update a single CSS variable
 */
export function updateCSSVariable(property: string, value: string): void {
  document.documentElement.style.setProperty(property, value);
}

/**
 * دالة مساعدة للحصول على قيمة متغير CSS
 * Helper function to get CSS variable value
 */
export function getCSSVariable(property: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(property).trim();
}

/**
 * تطبيق إعدادات ثيم مؤقتة للمعاينة
 * Apply temporary theme settings for preview
 */
export function applyPreviewSettings(settings: Record<string, string>): void {
  Object.entries(settings).forEach(([key, value]) => {
    const cssVar = `--${key.replace(/\./g, '-').replace(/_/g, '-')}`;
    updateCSSVariable(cssVar, value);
  });
}

/**
 * إزالة إعدادات المعاينة والعودة للثيم الأصلي
 * Remove preview settings and return to original theme
 */
export function removePreviewSettings(themeId: string): Promise<void> {
  return loadThemeCSS(themeId).then(applyThemeCSS);
}

/**
 * تصدير الثيم الحالي كـ CSS
 * Export current theme as CSS
 */
export function exportCurrentThemeCSS(): string {
  if (!currentStyleElement) {
    throw new Error('لا يوجد ثيم مطبق حالياً');
  }
  
  return currentStyleElement.textContent || '';
}

/**
 * التحقق من دعم متغيرات CSS
 * Check CSS variables support
 */
export function checkCSSVariablesSupport(): boolean {
  return window.CSS && window.CSS.supports && window.CSS.supports('color', 'var(--test)');
}

export default {
  loadThemeCSS,
  applyThemeCSS,
  removeCurrentTheme,
  useThemeLoader,
  updateCSSVariable,
  getCSSVariable,
  applyPreviewSettings,
  removePreviewSettings,
  exportCurrentThemeCSS,
  checkCSSVariablesSupport
};