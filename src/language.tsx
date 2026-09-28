import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type Language = 'zh' | 'en';

const STORAGE_KEY = 'tjad-language';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  pick: <T,>(chinese: T, english: T) => T;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Match the prerendered Chinese page during hydration, then restore the visitor's choice.
  const [language, setCurrentLanguage] = useState<Language>('zh');

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === 'en') setCurrentLanguage('en');
    } catch {
      // The switch remains usable when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setCurrentLanguage(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Keep the in-memory choice for this visit.
    }
  }, []);

  const pick = useCallback(<T,>(chinese: T, english: T): T => language === 'zh' ? chinese : english, [language]);
  const value = useMemo(() => ({ language, setLanguage, pick }), [language, setLanguage, pick]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
