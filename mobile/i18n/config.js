/**
 * Internationalization (i18n) Configuration
 * Supports multiple languages with automatic device locale detection
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Import translations
import en from './locales/en.json';
import es from './locales/es.json';
import zh from './locales/zh.json';
import hi from './locales/hi.json';
import fr from './locales/fr.json';

// Get device locale (e.g., "en-US", "es-MX", "zh-CN")
const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';

// Configure i18next
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      zh: { translation: zh },
      hi: { translation: hi },
      fr: { translation: fr },
    },
    lng: deviceLocale, // Auto-detect device language
    fallbackLng: 'en', // Fallback to English if translation missing
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    compatibilityJSON: 'v3', // Support older i18next format
  });

export default i18n;
