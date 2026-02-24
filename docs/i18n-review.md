# i18n 実装レビュー

## 1. getLocales() の取得方法

### 現状
- `locales?.[0]?.languageTag` を取得し、`tag.split('-')[0]` で言語部分を取得している。
- `Localization.locale` をフォールバックに使用。

### 問題点
- expo-localization の `Locale` 型には **`languageCode`** が公式にあり（地域なしの言語コード例: `'en'`, `'ja'`）、こちらを使う方が意図に合う。
- `languageCode` は `string | null` のため、null の場合は tag パースにフォールバックすべき。
- `Localization.locale` は単一の locale 文字列で、getLocales() と挙動が異なる可能性がある。取得は **getLocales() に統一** した方が安全。

### 推奨
- 優先: `locales?.[0]?.languageCode ?? locales?.[0]?.languageTag?.split('-')[0] ?? ''`
- フォールバックは空文字のまま `FALLBACK` に落とす。

---

## 2. t() のキー管理（型安全性）

### 現状
- `TranslationKeys = keyof typeof ja` で、`en` は `Record<TranslationKeys, string>` により ja のキーをすべて持つことを強制している。**型安全。**

### 残リスク
- 新言語（例: `fr`）を追加したとき、`translations.fr` に `Record<TranslationKeys, string>` を付け忘れると、欠落キーが実行時まで検出されない。
- `t()` に `string` を渡すとキーが widen され、存在しないキーでもコンパイルが通る（呼び出し側の型付けで防止可能）。

### 推奨
- 新言語追加時は `translations` を `Record<AppLocale, Record<TranslationKeys, string>>` のようにし、`AppLocale` が増えたら各 locale のオブジェクトが全キーを持つことを型で強制する。
- あるいは `const translations: Record<AppLocale, Record<TranslationKeys, string>> = { ja, en }` とし、将来 `fr` を追加するときも同じ型を満たす必要が出る。

---

## 3. 翻訳キー欠落時のフォールバック

### 現状
- `translations[locale][key] ?? translations.en[key] ?? key`
- 表示言語 → 英語 → **キーそのもの** の順でフォールバック。

### 問題点
- キー欠落時に `key`（例: `deletePhoto`）がそのまま画面に出る。本番では望ましくない。
- `translations[locale]` が undefined（未対応 locale）の場合、`translations[locale][key]` で **ランタイムエラー** になる。

### 推奨
- フォールバック順を **表示言語 → en → ja → key** にし、少なくとも文言は出るようにする。
- `translations[locale]` が存在しない場合は、最初から `locale = 'en'` 相当で扱う（`t()` 内で `const dict = translations[locale] ?? translations.en`）。
- 本番では key を表示しないオプション（例: 最後のフォールバックを `translations.en[key] ?? ''` にする）も検討可能。

---

## 4. {{count}} の扱い

### 現状
- `replaceParams` で `{{count}}` のみ対応。`params` は `{ count?: number }`。

### 問題点
- 将来「こんにちは {{name}}、{{count}} 件です」のように **複数プレースホルダー** や **異なる名前** が必要になると拡張できない。

### 推奨
- `params?: Record<string, string | number>` とし、`str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params?.[k] ?? ''))` のように **任意のキー** を置換する。
- 既存の `t('totalItems', { count: n })` はそのまま動作する。

---

## 5. locale を引数で渡す設計（hotelData）

### 現状
- `getRegionDisplayName(regionId, locale?)` / `getCountryDisplayName(code, locale?)` で、コンポーネントが `useI18n()` の `locale` を渡している。

### 評価
- **利点**: テストや SSR で locale を差し替えやすい。データ層が「現在の言語」に明示的に依存しており分かりやすい。
- **欠点**: データ層が `AppLocale` 型（i18n 由来）を参照しており、i18n と結合がやや強い。
- 将来、表示名をすべて UI 層の `t('region.asia')` のようにする場合は、hotelData から locale を消す設計もあり得る。現状規模では **現設計のままで問題なし**。多言語が増えても、表示名マップを増やすだけなので拡張可能。

---

## 6. 実行時エラー耐性

### 問題点
1. **未対応 locale**: `translations['fr']` を追加し忘れた状態で `locale === 'fr'` になると、`translations[locale]` が undefined で `translations[locale][key]` が **ランタイムエラー**。
2. **Context 外での useI18n()**: 既に throw しており適切。
3. **getDeviceLocale()**: try-catch で FALLBACK を返しており適切。

### 推奨
- `t()` 内で **必ず** `const dict = translations[locale] ?? translations.en` のようにし、`translations[locale]` がなくてもオブジェクトを参照する。
- `AppLocale` と `translations` のキーを型で一致させ、`translations` の型を `Record<AppLocale, Record<TranslationKeys, string>>` にし、存在しない locale で `translations[locale]` にアクセスしないようにする（または実行時にも存在チェックする）。

---

## 7. 多言語拡張（フランス語・イタリア語など）

### 現状
- `getDeviceLocale()` が `lang === 'ja' ? 'ja' : 'en'` の2分岐のみ。新言語を足すたびにここを修正する必要がある。

### 推奨
- **サポート言語リスト** を定数化: `const SUPPORTED_LOCALES: AppLocale[] = ['ja', 'en']`、`const FALLBACK_LOCALE: AppLocale = 'en'`。
- `getDeviceLocale()` では、`getLocales()` の先頭から順に `languageCode`（または tag の先頭部分）が `SUPPORTED_LOCALES` に含まれるか確認し、**最初に一致した** locale を返す。一致がなければ `FALLBACK_LOCALE`。
- 新言語追加時は、(1) `AppLocale` に `'fr'` を追加、(2) `SUPPORTED_LOCALES` に `'fr'` を追加、(3) `translations.fr` を `Record<TranslationKeys, string>` で追加、の3点で済む。`getDeviceLocale()` の分岐は触らなくてよい。

---

## 8. まとめ：実施する改善

| 項目 | 対応 |
|------|------|
| getLocales | `languageCode` を優先し、null 時は tag パース。getLocales() に統一。 |
| キー欠落フォールバック | 表示 locale → en → key の順。`translations[locale]` 未定義時は `translations.en` を使用。 |
| パラメータ | `params` を `Record<string, string \| number>` に拡張し、任意の `{{key}}` を置換。 |
| 多言語拡張 | `SUPPORTED_LOCALES` と `FALLBACK_LOCALE` を導入し、`getDeviceLocale()` をループでサポート言語を検索。 |
| 型 | `translations` を `Record<AppLocale, Record<TranslationKeys, string>>` で保証（将来 fr 追加時も同型を要求）。 |

---

## 9. 実施した修正（要約）

- **locale.ts**: `languageCode` を優先し、null 時は `languageTag` をパース。`SUPPORTED_LOCALES` と `FALLBACK_LOCALE` を定義し、`getDeviceLocale()` はループでサポート言語を検索するように変更（新言語追加時に分岐を触らない）。
- **I18nContext.tsx**: `getTranslation(locale, key)` を導入し、`translations[locale]` 未定義時は `FALLBACK_LOCALE` の辞書を使用。`params` を `Record<string, string | number>` に拡張し、任意の `{{key}}` を置換。`TParams` を export し、呼び出し側で複数パラメータを使いやすくした。
- **translations.ts**: `translations` の型を `Record<AppLocale, Record<TranslationKeys, string>>` にし、新言語追加時に全キーを持つことを型で保証。`AppLocale` は `locale.ts` から import。
- **hotelData.ts**: `AppLocale` の定義を削除し、`../i18n/locale` から import して一元化。
