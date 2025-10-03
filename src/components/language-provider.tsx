"use client";

import { useEffect, ReactNode, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    // Initialize i18n if not already initialized
    if (!i18n.isInitialized) {
      i18n.init().then(() => {
        setIsI18nReady(true);
      }).catch((error) => {
        console.error('Failed to initialize i18n:', error);
        setIsI18nReady(true); // Continue even if initialization fails
      });
    } else {
      setIsI18nReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isI18nReady) return;

    const updateDirectionAndLanguage = () => {
      try {
        const htmlElement = document.documentElement;
        const currentDir = i18n.dir();
        const currentLang = i18n.language || 'ar';

        // Update direction
        htmlElement.setAttribute('dir', currentDir);
        htmlElement.setAttribute('lang', currentLang);

        // Add a class to body for additional styling hooks
        document.body.className = document.body.className.replace(/\b(rtl|ltr)\b/g, '');
        document.body.classList.add(currentDir);
        
        console.log(`Language updated to: ${currentLang}, Direction: ${currentDir}`);
      } catch (error) {
        console.error('Error updating language direction:', error);
      }
    };

    // Initial setup
    updateDirectionAndLanguage();

    // Listen for language changes
    const handleLanguageChange = (lng: string) => {
      console.log('Language change event:', lng);
      updateDirectionAndLanguage();
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [isI18nReady]);

  if (!isI18nReady) {
    return <>{children}</>; // Return children while i18n is loading
  }

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}
