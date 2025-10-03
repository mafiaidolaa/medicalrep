
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import arTranslation from '../locales/ar.json';
import enTranslation from '../locales/en.json';

// Configure direction mapping for RTL support
const languageRtlMap: Record<string, boolean> = {
  ar: true,
  en: false,
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: arTranslation },
      en: { translation: enTranslation },
    },
    fallbackLng: 'ar', // Fallback to Arabic if language detection fails
    supportedLngs: ['ar', 'en'],
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
  });

// Extend i18n with direction helper
(i18n as any).dir = (lng?: string) => {
  const language = lng || i18n.language;
  return languageRtlMap[language] ? 'rtl' : 'ltr';
};

// Add isRTL helper
(i18n as any).isRTL = (lng?: string) => {
  return i18n.dir(lng) === 'rtl';
};

export default i18n;
