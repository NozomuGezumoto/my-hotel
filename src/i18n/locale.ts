// 端末のロケールから表示言語を決定
// 多言語追加時: AppLocale と SUPPORTED_LOCALES に追加し、translations に辞書を足すだけにする
import * as Localization from 'expo-localization';

export type AppLocale = 'ja' | 'en';

/** サポートする言語（getDeviceLocale の検索順） */
export const SUPPORTED_LOCALES: readonly AppLocale[] = ['ja', 'en'];

/** 端末言語がサポート外のときのフォールバック */
export const FALLBACK_LOCALE: AppLocale = 'en';

function normalizeLanguageTag(tag: string): string {
  return (tag.split('-')[0] || '').toLowerCase();
}

export function getDeviceLocale(): AppLocale {
  try {
    const locales = Localization.getLocales();
    const first = locales?.[0];
    const lang = (first?.languageCode ?? (first?.languageTag && normalizeLanguageTag(first.languageTag)) ?? '').toLowerCase();
    const found = SUPPORTED_LOCALES.find((supported) => supported === lang);
    return found ?? FALLBACK_LOCALE;
  } catch {
    return FALLBACK_LOCALE;
  }
}
