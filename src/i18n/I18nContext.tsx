import React, { createContext, useContext, useMemo } from 'react';
import { getDeviceLocale, FALLBACK_LOCALE, type AppLocale } from './locale';
import { translations, type TranslationKeys } from './translations';

/** プレースホルダー置換用。{{count}} のほか、将来 {{name}} など任意キーに対応 */
export type TParams = Record<string, string | number>;

type TFunc = (key: TranslationKeys, params?: TParams) => string;

function replaceParams(str: string, params?: TParams): string {
  if (!params || typeof params !== 'object') return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    key in params ? String(params[key]) : ''
  );
}

/** 翻訳文案を取得。locale 未対応時は FALLBACK_LOCALE、キー欠落時は en → key の順でフォールバック */
function getTranslation(locale: AppLocale, key: TranslationKeys): string {
  const dict = translations[locale] ?? translations[FALLBACK_LOCALE];
  return dict[key] ?? translations[FALLBACK_LOCALE][key] ?? key;
}

const defaultLocale = getDeviceLocale();
const defaultT: TFunc = (key, params) =>
  replaceParams(getTranslation(defaultLocale, key), params);

type I18nValue = { locale: AppLocale; t: TFunc };

const I18nContext = createContext<I18nValue>({
  locale: defaultLocale,
  t: defaultT,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<I18nValue>(() => {
    const locale = getDeviceLocale();
    const t: TFunc = (key, params) =>
      replaceParams(getTranslation(locale, key), params);
    return { locale, t };
  }, []);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
