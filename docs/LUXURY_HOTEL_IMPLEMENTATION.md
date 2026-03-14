# My Luxury Hotel 統合実装メモ

## 変更したファイル一覧

| ファイル | 内容 |
|----------|------|
| `src/types/index.ts` | `HotelPin` に `brand?`, `description?`, `image?` を追加。`HotelUserState` 型を追加。 |
| `src/store/useStore.ts` | Dream/Stay 用の永続 state と actions を追加。 |
| `src/data/hotelData.ts` | `getBrandForHotel(hotel)` を追加（名前からブランド導出）。 |
| `src/data/completion.ts` | **新規**。Brand/Country Completion 集計。 |
| `src/components/HotelDetail.tsx` | Dream Plan・Stay Record、**マスタ画像・概要表示**（`hotel.image` / `hotel.description`）を追加。 |
| `src/components/HotelMap.tsx` | **World Map Progress**: 訪問国オーバーレイ（Countries Visited X / Y）を追加。Visited/Dream ピン区別は既存のまま。 |
| `src/i18n/translations.ts` | Dream Plan / Stay Record / Completion / Brand Explorer / World Map / 概要 の文言を追加。 |
| `app/(tabs)/_layout.tsx` | Brand Explorer タブを追加。Map / Brands / Completion の3タブに。 |
| `app/(tabs)/completion.tsx` | **新規**。Brand Completion・Country Completion 画面。 |
| `app/(tabs)/brand-explorer/_layout.tsx` | **新規**。Stack（index + [brand]）。 |
| `app/(tabs)/brand-explorer/index.tsx` | **新規**。ブランド一覧（Completion・Dream 件数）、タップでブランド詳細へ。 |
| `app/(tabs)/brand-explorer/[brand].tsx` | **新規**。ブランド別ホテル一覧・Visited/Dream バッジ。 |

---

## 追加した型

- **`HotelUserState`**（`src/types/index.ts`）
  - `hotelId`, `isDream`, `isVisited`, `deadline?`, `savingGoal?`, `savedAmount?`, `visitedDate?`
- **`BrandCompletionItem`**（`src/data/completion.ts`）
  - `brand`, `total`, `visited`, `percent`
- **`CountryCompletionItem`**
  - `countryCode`, `countryName`, `total`, `visited`, `percent`

---

## 保存データ構造（Zustand + AsyncStorage）

既存に加え、以下を永続化しています。

- `hotelDeadlines: Record<string, string>` … 期限（YYYY-MM-DD）
- `hotelSavingGoals: Record<string, number>`
- `hotelSavedAmounts: Record<string, number>`
- `hotelVisitedDates: Record<string, string>` … 宿泊日（YYYY-MM-DD）

`isDream` = `wantToGoHotels` に含まれるか、`isVisited` = `visitedHotels` に含まれるかで判定。

---

## Completion の集計ロジック

- **対象**: 全ホテルマスタ（`getLuxuryHotelPins()`）に対し、**isVisited のホテルのみ**を「行った」として集計。Dream は集計に含めない。
- **Brand Completion**: `getBrandForHotel(hotel)` でブランドを取得（マスタに `brand` が無い場合はホテル名のプレフィックスで導出）。ブランドごとに `total` と `visited` を集計し、`percent = visited / total`。
- **Country Completion**: `hotel.countryCode` で国ごとに `total` と `visited` を集計し、`percent` を算出。
- 集計関数: `src/data/completion.ts` の `getBrandCompletion()`, `getCountryCompletion()`。

---

## Dream Plan 計算仕様（実装済み）

- **進捗率**: `savedAmount / savingGoal`。0〜100% に clamp。`savingGoal` 未設定時は表示しない。
- **残り日数**: `deadline - today`（日単位）。過去の場合は「期限切れ」表示。
- **月あたり必要額**: `deadline` と `savingGoal` が両方あるときのみ。`remainingAmount / max(1, remainingDays/30)`。0除算・負数はガード済み。

---

## Brand Explorer の拡張ポイント

- **実装済み**: ブランド一覧（Completion・Dream 件数）、ブランド詳細でホテル一覧。
- 拡張: ブランド説明文の API/静的データ、ブランド詳細からホテル詳細への遷移（Map タブで開く等）。

---

## World Map Progress の拡張ポイント

- **実装済み**: 地図上で Visited（緑）/ Dream（ピンク）/ 通常（青）ピンで区別、左下に「訪問国 X / Y 国」オーバーレイ。
- 拡張: 国境界 GeoJSON での色分け、ピンのクラスタリング強化、Dream 一覧からの地図連携。

---

## 今後追加しやすい画面候補

- Dream 一覧（`wantToGoHotels` の ID リストからホテルを表示し、期限・貯金進捗を一覧）
- Brand Explorer（上記）
- World Map（国別達成・Visited/Dream ピン）
- Country 詳細（国をタップでその国のホテル一覧）
- City Completion（仕様の任意機能）

---

## エラーハンドリング・安全性（対応済み）

- `deadline` / `savingGoal` / `savedAmount` 未設定時もクラッシュしない。
- 進捗率は 0〜100% に clamp、0除算防止。
- 過去 deadline は「期限切れ」表示。
- 数値入力は空文字を許容し、`onBlur` で store に反映。
