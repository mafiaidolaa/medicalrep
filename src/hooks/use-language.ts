"use client";

import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export function useLanguage() {
  const { t, i18n } = useTranslation();

  const changeLanguage = useCallback((lng: string) => {
    console.log('Changing language to:', lng);
    try {
      i18n.changeLanguage(lng);
      // Store the selected language in localStorage for persistence
      localStorage.setItem('preferred-language', lng);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  }, [i18n]);

  const currentLanguage = i18n.language || 'ar';
  const isRTL = (i18n as any).isRTL ? (i18n as any).isRTL() : currentLanguage === 'ar';
  const direction = (i18n as any).dir ? (i18n as any).dir() : (isRTL ? 'rtl' : 'ltr');

  return {
    t,
    i18n,
    changeLanguage,
    currentLanguage,
    isRTL,
    direction,
    supportedLanguages: [
      { code: 'ar', name: 'العربية', nativeName: 'العربية' },
      { code: 'en', name: 'English', nativeName: 'English' }
    ]
  };
}