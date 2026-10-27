import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLanguage, LanguageInfo, Translations } from './types';
import { en } from './locales/en';
import { ar } from './locales/ar';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { de } from './locales/de';
import { zh } from './locales/zh';
import { ja } from './locales/ja';
import { ru } from './locales/ru';
import { pt } from './locales/pt';
import { it } from './locales/it';
import { tr } from './locales/tr';
import { hi } from './locales/hi';
import { ko } from './locales/ko';

export * from './types';

export const LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', isRTL: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
];

const TRANSLATIONS_MAP: Record<SupportedLanguage, Translations> = {
  en,
  ar,
  es,
  fr,
  de,
  zh,
  ja,
  ru,
  pt,
  it,
  tr,
  hi,
  ko,
};

interface I18nContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: Translations;
  isRTL: boolean;
  format: (template: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: en,
  isRTL: false,
  format: (tmpl) => tmpl,
});

function detectInitialLanguage(): SupportedLanguage {
  const saved = localStorage.getItem('godm_language') as SupportedLanguage;
  if (saved && TRANSLATIONS_MAP[saved]) {
    return saved;
  }
  const browser = navigator.language?.toLowerCase() || 'en';
  for (const lang of LANGUAGES) {
    if (browser.startsWith(lang.code)) {
      return lang.code;
    }
  }
  return 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(detectInitialLanguage);

  const setLanguage = (lang: SupportedLanguage) => {
    if (TRANSLATIONS_MAP[lang]) {
      setLanguageState(lang);
      localStorage.setItem('godm_language', lang);
    }
  };

  const currentInfo = LANGUAGES.find((l) => l.code === language);
  const isRTL = !!currentInfo?.isRTL;
  const currentTranslations = TRANSLATIONS_MAP[language] || en;

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  const format = (template: string, vars?: Record<string, string | number>): string => {
    if (!vars) return template;
    let result = template;
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
    return result;
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t: currentTranslations,
        isRTL,
        format,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
